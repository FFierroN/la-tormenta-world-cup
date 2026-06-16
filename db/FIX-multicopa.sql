-- =====================================================================
-- FIX-multicopa.sql  (ETAPA 1: base de datos)
-- =====================================================================
-- Convierte la app de UNA copa a VARIAS copas que comparten el mismo Mundial.
-- Ver diseno completo en MIPROYECTO/spec-multicopa.md.
--
-- Principios:
--   * GLOBAL (compartido por todas las copas): partidos, partido_eventos,
--     equipos_api_map, api_cuota, tabla_grupos. NO se tocan (el robot tampoco).
--   * POR COPA: jugadores, pronosticos, predicciones_especiales, configuracion.
--
-- Es IDEMPOTENTE (se puede correr varias veces) y hace BACKFILL a copa_id = 1,
-- asi la copa actual ("La Tormenta") sigue funcionando identico.
--
-- COMPATIBLE HACIA ATRAS: el frontend actual sigue andando despues de esta
-- migracion (las columnas nuevas se ignoran; las funciones cambiadas solo
-- agregan datos). La copa-conciencia del front llega en las etapas 2 y 3.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabla de copas + la copa actual (#1)
-- ---------------------------------------------------------------------
create table if not exists copas (
  id        serial primary key,
  nombre    text not null,
  slug      text unique,
  activa    boolean not null default true,
  creada_at timestamptz not null default now()
);

insert into copas (id, nombre, slug)
values (1, 'La Tormenta', 'tormenta')
on conflict (id) do nothing;

-- Mantiene el serial alineado por si insertamos copas a futuro.
select setval(pg_get_serial_sequence('copas','id'),
              greatest((select max(id) from copas), 1));

-- ---------------------------------------------------------------------
-- 2. copa_id + super-admin en jugadores
-- ---------------------------------------------------------------------
alter table jugadores add column if not exists copa_id int references copas(id) default 1;
update jugadores set copa_id = 1 where copa_id is null;
alter table jugadores alter column copa_id set not null;

alter table jugadores add column if not exists es_super_admin boolean not null default false;

-- El nombre es unico DENTRO de la copa (antes era global).
drop index if exists uq_jugadores_nombre;
create unique index if not exists uq_jugadores_copa_nombre on jugadores(copa_id, nombre);

-- ---------------------------------------------------------------------
-- 3. copa_id (denormalizado) en pronosticos y predicciones_especiales
--    Se hereda del jugador; acelera la vista de tabla sin joins extra.
-- ---------------------------------------------------------------------
alter table pronosticos add column if not exists copa_id int references copas(id) default 1;
update pronosticos pr set copa_id = j.copa_id
  from jugadores j where pr.jugador_id = j.id and pr.copa_id is distinct from j.copa_id;
alter table pronosticos alter column copa_id set not null;

alter table predicciones_especiales add column if not exists copa_id int references copas(id) default 1;
update predicciones_especiales pe set copa_id = j.copa_id
  from jugadores j where pe.jugador_id = j.id and pe.copa_id is distinct from j.copa_id;
alter table predicciones_especiales alter column copa_id set not null;

-- ---------------------------------------------------------------------
-- 4. configuracion por copa (PK compuesta copa_id + clave)
-- ---------------------------------------------------------------------
alter table configuracion add column if not exists copa_id int references copas(id) default 1;
update configuracion set copa_id = 1 where copa_id is null;
alter table configuracion alter column copa_id set not null;

-- Cambia la PK a (copa_id, clave) solo si todavia no es compuesta (idempotente).
do $$
declare n_cols int;
begin
  select count(*) into n_cols
  from pg_constraint
  where conrelid = 'configuracion'::regclass and contype = 'p';
  -- si existe una PK, ver cuantas columnas tiene
  if exists (select 1 from pg_constraint
             where conrelid='configuracion'::regclass and contype='p') then
    select cardinality(conkey) into n_cols
    from pg_constraint
    where conrelid='configuracion'::regclass and contype='p';
  end if;

  if n_cols is distinct from 2 then
    alter table configuracion drop constraint if exists configuracion_pkey;
    alter table configuracion add constraint configuracion_pkey primary key (copa_id, clave);
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 5. Vistas con copa_id
-- ---------------------------------------------------------------------

-- jugadores_publico: lo que el login lee (sin pin_hash). Ahora trae copa_id.
drop view if exists jugadores_publico cascade;
create view jugadores_publico as
  select id, copa_id, nombre, alias, es_admin, es_super_admin, onboarding_completado,
         avatar_pos1, avatar_medio, avatar_pos8,
         coalesce(alias, nombre) as nombre_visible
  from jugadores
  where activo;   -- los dados de baja no aparecen en el login

-- tabla_posiciones: igual que antes, pero con copa_id y posicion POR COPA.
drop view if exists tabla_posiciones cascade;
create view tabla_posiciones as
with base as (
  select
    j.id   as jugador_id,
    j.copa_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
      + coalesce(j.ajuste_puntos, 0)
      + coalesce((
          select pe.puntos_pais + pe.puntos_goleador + pe.puntos_asistidor
               + pe.puntos_mejor_jugador + pe.puntos_mejor_arquero + pe.puntos_mejor_joven
          from predicciones_especiales pe where pe.jugador_id = j.id), 0) as puntos,
    count(*) filter (where p.estado='final'
        and pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita) as exactos,
    count(*) filter (where p.estado='final'
        and not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)=sign(p.goles_local-p.goles_visita)) as aciertos,
    count(*) filter (where p.estado='final'
        and not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)<>sign(p.goles_local-p.goles_visita)) as fallas
  from jugadores j
  left join pronosticos pr on pr.jugador_id = j.id
  left join partidos p on p.id = pr.partido_id
                      and p.estado='final' and p.goles_local is not null
                      and not p.puntaje_anulado
  where j.activo
  group by j.id   -- copa_id depende de j.id (PK), Postgres lo permite
)
select *, row_number() over (
    partition by copa_id     -- <<< posicion separada por copa
    order by puntos desc, exactos desc, aciertos desc, fallas asc, jugador_id asc
  ) as posicion
from base;

-- copas_publico: lista para el selector de copa del login.
drop view if exists copas_publico cascade;
create view copas_publico as
  select id, nombre, slug from copas where activa order by id;

-- ---------------------------------------------------------------------
-- 6. RPCs ajustados / nuevos
-- ---------------------------------------------------------------------

-- login_jugador: ahora devuelve copa_id y es_super_admin (cambia el tipo de
-- retorno -> hay que DROP + CREATE). El front viejo ignora las columnas extra.
drop function if exists login_jugador(int, text);
create function login_jugador(p_jugador_id int, p_pin text)
returns table(id int, nombre text, alias text, es_admin boolean,
              es_super_admin boolean, copa_id int, onboarding_completado boolean)
language sql security definer set search_path = public, extensions as $$
  select j.id, j.nombre, j.alias, j.es_admin, j.es_super_admin, j.copa_id,
         j.onboarding_completado
  from jugadores j
  where j.id = p_jugador_id
    and j.activo
    and j.pin_hash = crypt(p_pin, j.pin_hash);
$$;

-- guardar_especiales: misma firma, pero lee la ventana de la COPA del jugador
-- y graba copa_id. (Antes leia la unica fila global.)
create or replace function guardar_especiales(
  p_jugador_id int,
  p_campeon text, p_finalista_1 text, p_finalista_2 text,
  p_semi_1 text, p_semi_2 text, p_semi_3 text, p_semi_4 text,
  p_goleador text, p_asistidor text, p_mejor_jugador text, p_mejor_arquero text, p_mejor_joven text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare habil text; v_copa int;
begin
  select copa_id into v_copa from jugadores where id = p_jugador_id;
  if v_copa is null then return 'invalido'; end if;

  select valor into habil from configuracion
    where copa_id = v_copa and clave = 'edicion_predicciones_habilitada';
  if coalesce(habil, 'false') <> 'true' then return 'cerrado'; end if;

  insert into predicciones_especiales (
    jugador_id, copa_id, campeon, finalista_1, finalista_2,
    semifinalista_1, semifinalista_2, semifinalista_3, semifinalista_4,
    goleador, asistidor, mejor_jugador, mejor_arquero, mejor_joven)
  values (p_jugador_id, v_copa, p_campeon, p_finalista_1, p_finalista_2,
    p_semi_1, p_semi_2, p_semi_3, p_semi_4,
    p_goleador, p_asistidor, p_mejor_jugador, p_mejor_arquero, p_mejor_joven)
  on conflict (jugador_id) do update set
    campeon = excluded.campeon,
    finalista_1 = excluded.finalista_1, finalista_2 = excluded.finalista_2,
    semifinalista_1 = excluded.semifinalista_1, semifinalista_2 = excluded.semifinalista_2,
    semifinalista_3 = excluded.semifinalista_3, semifinalista_4 = excluded.semifinalista_4,
    goleador = excluded.goleador, asistidor = excluded.asistidor,
    mejor_jugador = excluded.mejor_jugador,
    mejor_arquero = excluded.mejor_arquero, mejor_joven = excluded.mejor_joven;
  return 'ok';
end;
$$;

-- listar_jugadores_admin(copa): version nueva por copa (overload; la version
-- sin argumentos se conserva intacta para no romper el front actual).
create or replace function listar_jugadores_admin(p_copa_id int)
returns table(id int, nombre text, alias text, es_admin boolean,
              activo boolean, ajuste_puntos int, ajuste_motivo text)
language sql security definer set search_path = public, extensions as $$
  select id, nombre, alias, es_admin, activo, ajuste_puntos, ajuste_motivo
  from jugadores where copa_id = p_copa_id order by id;
$$;

-- crear_copa: inserta la copa y siembra su configuracion (toggles + real_*).
-- Devuelve el id de la copa nueva.
create or replace function crear_copa(p_nombre text, p_slug text)
returns int language plpgsql security definer set search_path = public, extensions as $$
declare v_id int;
begin
  if coalesce(trim(p_nombre),'') = '' then
    raise exception 'El nombre de la copa es obligatorio';
  end if;
  insert into copas (nombre, slug)
  values (trim(p_nombre), nullif(trim(p_slug), ''))
  returning id into v_id;

  insert into configuracion (copa_id, clave, valor) values
    (v_id,'edicion_predicciones_habilitada','false'),
    (v_id,'foto_ultimo_habilitada','false'),
    (v_id,'real_campeon',''),(v_id,'real_finalista_1',''),(v_id,'real_finalista_2',''),
    (v_id,'real_semi_1',''),(v_id,'real_semi_2',''),(v_id,'real_semi_3',''),(v_id,'real_semi_4',''),
    (v_id,'real_tercer',''),
    (v_id,'real_goleador',''),(v_id,'real_asistidor',''),(v_id,'real_mejor_jugador',''),
    (v_id,'real_mejor_arquero',''),(v_id,'real_mejor_joven','')
  on conflict (copa_id, clave) do nothing;

  return v_id;
end;
$$;

-- crear_jugador: alta de un jugador en una copa (PIN de 4 digitos, hasheado).
-- Para que el organizador sume gente sin entrar al panel de Supabase.
-- Acepta las 3 URLs de avatar (pos1/medio/pos8 desde Supabase Storage); son
-- opcionales: si quedan en null, la app muestra la inicial como fallback.
create or replace function crear_jugador(
  p_copa_id int, p_nombre text, p_alias text, p_pin text,
  p_es_admin boolean default false,
  p_avatar_pos1 text default null,
  p_avatar_medio text default null,
  p_avatar_pos8 text default null)
returns int language plpgsql security definer set search_path = public, extensions as $$
declare v_id int;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN invalido: deben ser 4 digitos';
  end if;
  if coalesce(trim(p_nombre),'') = '' then
    raise exception 'El nombre es obligatorio';
  end if;
  insert into jugadores (copa_id, nombre, alias, pin_hash, es_admin,
                         avatar_pos1, avatar_medio, avatar_pos8)
  values (p_copa_id, trim(p_nombre), nullif(trim(p_alias), ''),
          crypt(p_pin, gen_salt('bf')), coalesce(p_es_admin, false),
          nullif(trim(p_avatar_pos1), ''),
          nullif(trim(p_avatar_medio), ''),
          nullif(trim(p_avatar_pos8), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- set_avatares: editar las 3 URLs de avatar de un jugador ya creado (por si
-- las fotos llegan despues del alta). Las deja en null si se mandan vacias.
create or replace function set_avatares(
  p_jugador_id int, p_pos1 text, p_medio text, p_pos8 text)
returns void language sql security definer set search_path = public, extensions as $$
  update jugadores set
    avatar_pos1  = nullif(trim(p_pos1), ''),
    avatar_medio = nullif(trim(p_medio), ''),
    avatar_pos8  = nullif(trim(p_pos8), '')
  where id = p_jugador_id;
$$;

-- ---------------------------------------------------------------------
-- 7. PENDIENTES (otras etapas / vistas en archivos FIX aparte)
-- ---------------------------------------------------------------------
-- AVATARES de copas nuevas (decision con Felipe): 3 fotos por jugador
--   (pos1/medio/pos8) subidas a SUPABASE STORAGE, bucket publico 'avatares',
--   una CARPETA POR COPA para evitar choques de nombre (ej. copa2/victor-pos1.jpg).
--   La URL publica se guarda en jugadores.avatar_* via crear_jugador (alta) o
--   set_avatares (edicion posterior). NO van en app/public (eso es solo copa 1
--   y requiere redeploy). Trabajo manual de Felipe: juntar y subir las fotos.
--
-- * desglose_tormenta (FIX-desglose-tormenta.sql): agregarle copa_id y filtrar
--   por copa (la pestana "La Tormenta" del detalle de partido). Se hara junto
--   con la etapa de front para no romper esa pantalla.
-- * RLS: hoy es permisiva (la app valida). Multi-copa de un grupo de confianza
--   funciona, pero si se quiere endurecer (que una copa no lea datos de otra),
--   es una etapa de seguridad aparte.
