-- =====================================================================
-- SETUP COMPLETO - La Tormenta World Cup (Supabase / Postgres)
-- =====================================================================
-- GENERADO AUTOMATICAMENTE por generate_setup_sql.py  (NO editar a mano).
--
-- COMO USAR:  Supabase -> SQL Editor -> New query -> pegar TODO -> Run.
-- SEGURO:     Idempotente. Se puede re-ejecutar sin romper ni duplicar.
--             Los 104 partidos solo se insertan si la tabla esta vacia.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;  -- para hashear los PIN (bcrypt). En Supabase vive en el esquema 'extensions'.

-- =====================================================================
-- 1. TABLAS  (nombres de columnas alineados al frontend Vite)
-- =====================================================================

create table if not exists jugadores (
  id                     serial primary key,
  nombre                 text not null,
  alias                  text,
  pin_hash               text not null,
  es_admin               boolean not null default false,
  onboarding_completado  boolean not null default false,
  avatar_pos1            text,   -- foto cuando va 1ro
  avatar_medio           text,   -- foto puestos 2-7
  avatar_pos8            text,   -- foto ultimo
  created_at             timestamptz not null default now()
);
create unique index if not exists uq_jugadores_nombre on jugadores(nombre);

-- Columnas agregadas despues de la 1ra version (idempotentes para bases ya creadas):
--   activo        -> baja blanda: si es false, no puede entrar ni aparece en tabla/galeria.
--   ajuste_puntos -> ajuste manual del admin (se SUMA al total, no pisa lo calculado).
--   ajuste_motivo -> nota opcional del por que del ajuste.
alter table jugadores add column if not exists activo        boolean not null default true;
alter table jugadores add column if not exists ajuste_puntos int     not null default 0;
alter table jugadores add column if not exists ajuste_motivo text;

create table if not exists partidos (
  id              serial primary key,
  api_fixture_id  bigint unique,   -- id del partido en API-Football (lo llena el robot)
  fase            text not null,
  grupo           text,
  fecha           timestamptz not null,
  equipo_local    text not null,
  equipo_visita   text not null,
  pais_local      text,   -- codigo ISO (para bandera)
  pais_visita     text,
  estadio         text,
  ciudad          text,
  goles_local     int,
  goles_visita    int,
  minuto          int,    -- minuto en vivo (lo llena el robot)
  minuto_at       timestamptz,  -- ancla: cuando se midio 'minuto' (para el reloj local de la app)
  penales_local   int,    -- tanda de penales (solo llaves)
  penales_visita  int,
  ganador_penales text,   -- 'local' | 'visita' (solo si hubo penales)
  rojas_local     int not null default 0,
  rojas_visita    int not null default 0,
  -- estado: programado | en_vivo | entretiempo | alargue | penales | final | suspendido
  estado          text not null default 'programado',
  finalizado_at   timestamptz
);
create index if not exists idx_partidos_fecha  on partidos(fecha);
create index if not exists idx_partidos_estado on partidos(estado);
-- Idempotente para bases ya creadas: ancla del cronometro en vivo.
alter table partidos add column if not exists minuto_at timestamptz;

create table if not exists partido_eventos (
  id          serial primary key,
  partido_id  int references partidos(id) on delete cascade,
  tipo        text not null,   -- gol | amarilla | roja
  equipo      text not null,   -- local | visita
  minuto      int not null,
  jugador     text,            -- quien hizo el gol / recibio la tarjeta
  asistencia  text,            -- quien asistio (solo goles)
  detalle     text,            -- 'penal' | 'autogol' | 'normal' | etc
  created_at  timestamptz not null default now()
);
create index if not exists idx_eventos_partido on partido_eventos(partido_id);

create table if not exists pronosticos (
  id          serial primary key,
  jugador_id  int references jugadores(id) on delete cascade,
  partido_id  int references partidos(id) on delete cascade,
  pred_local  int not null,
  pred_visita int not null,
  puntos      int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(jugador_id, partido_id)
);
create index if not exists idx_pronosticos_partido on pronosticos(partido_id);
create index if not exists idx_pronosticos_jugador on pronosticos(jugador_id);

create table if not exists predicciones_especiales (
  id              serial primary key,
  jugador_id      int unique references jugadores(id) on delete cascade,
  campeon         text,
  finalista_1     text, finalista_2 text,
  semifinalista_1 text, semifinalista_2 text, semifinalista_3 text, semifinalista_4 text,
  goleador        text, asistidor text, mejor_jugador text, mejor_arquero text, mejor_joven text,
  -- puntos_pais: campeon/finalista/semi/3er ya con dedup por equipo (ronda mas alta).
  puntos_pais            int not null default 0,
  puntos_goleador        int not null default 0,
  puntos_asistidor       int not null default 0,
  puntos_mejor_jugador   int not null default 0,
  puntos_mejor_arquero   int not null default 0,
  puntos_mejor_joven     int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists configuracion (
  clave      text primary key,
  valor      text not null default 'false',
  updated_at timestamptz not null default now()
);
insert into configuracion (clave, valor) values
  ('edicion_predicciones_habilitada', 'false'),
  ('foto_ultimo_habilitada', 'false')
on conflict (clave) do nothing;

-- Resultados reales para puntuar las predicciones especiales (los carga el
-- admin al final del Mundial). Vacios por defecto.
insert into configuracion (clave, valor) values
  ('real_campeon',''), ('real_finalista_1',''), ('real_finalista_2',''),
  ('real_semi_1',''), ('real_semi_2',''), ('real_semi_3',''), ('real_semi_4',''),
  ('real_tercer',''),
  ('real_goleador',''), ('real_asistidor',''), ('real_mejor_jugador',''),
  ('real_mejor_arquero',''), ('real_mejor_joven','')
on conflict (clave) do nothing;

-- Traduccion de nombres: API-Football usa ingles, nuestra base usa espanol.
-- El robot la usa para emparejar partidos. Se rellena/ajusta segun haga falta.
create table if not exists equipos_api_map (
  api_nombre text primary key,   -- nombre tal cual lo manda API-Football
  nombre     text not null,      -- nuestro nombre en espanol (coincide con partidos)
  codigo     text                -- codigo ISO opcional
);

-- Guardia de cuota: cuenta requests por dia para no pasar de 100.
create table if not exists api_cuota (
  fecha  date primary key default current_date,
  usados int not null default 0
);

-- =====================================================================
-- 2. CALCULO DE PUNTOS (4 niveles: EXACTO+bonus / DIFERENCIA / ACIERTO / FALLA)
-- =====================================================================

-- Cambia la firma (ahora recibe n_exactos), por eso eliminamos la version vieja.
drop function if exists calcular_puntos_pronostico(int,int,int,int,text);
create or replace function calcular_puntos_pronostico(
  pred_local int, pred_visita int, res_local int, res_visita int, p_fase text, n_exactos int
) returns int as $$
declare
  pts_unico int; pts_x2 int; pts_x3 int; pts_dif int; pts_gan int;
begin
  if pred_local is null or pred_visita is null
     or res_local is null or res_visita is null then
    return 0;
  end if;

  -- Puntos por fase: [exacto unico, exacto x2, exacto x3+, diferencia, acierto]
  if    p_fase in ('Grupos','Dieciseisavos')      then pts_unico:=6;  pts_x2:=5;  pts_x3:=4;  pts_dif:=3; pts_gan:=2;
  elsif p_fase in ('Octavos','Cuartos')           then pts_unico:=9;  pts_x2:=7;  pts_x3:=6;  pts_dif:=4; pts_gan:=3;
  elsif p_fase in ('Semifinales','Tercer Puesto') then pts_unico:=12; pts_x2:=10; pts_x3:=8;  pts_dif:=6; pts_gan:=4;
  elsif p_fase = 'Final'                          then pts_unico:=15; pts_x2:=12; pts_x3:=10; pts_dif:=7; pts_gan:=5;
  else  return 0;
  end if;

  -- 1) EXACTO: marcador clavado. El valor depende de cuantos lo clavaron (rareza).
  --    n_exactos = total de jugadores que acertaron el exacto (incluido este). Aplica
  --    igual en empates (1-1, etc.).
  if pred_local = res_local and pred_visita = res_visita then
    if    coalesce(n_exactos,1) <= 1 then return pts_unico;  -- solo yo
    elsif n_exactos = 2             then return pts_x2;     -- otra persona tambien
    else                                return pts_x3;     -- 3 o mas
    end if;
  end if;

  -- 2) DIFERENCIA: misma diferencia de goles y NO fue empate (en empate no existe).
  if res_local <> res_visita
     and (res_local - res_visita) = (pred_local - pred_visita) then
    return pts_dif;
  end if;

  -- 3) ACIERTO: solo el resultado (ganador correcto, o empate predicho como empate).
  if (res_local > res_visita and pred_local > pred_visita)
     or (res_local < res_visita and pred_local < pred_visita)
     or (res_local = res_visita and pred_local = pred_visita) then
    return pts_gan;
  end if;

  return 0;  -- 4) FALLA: ni el resultado
end;
$$ language plpgsql immutable;

-- Cuenta cuantos jugadores clavaron el marcador EXACTO de un partido ya final.
-- Define el tier (unico/x2/x3+). Estable: tras el pitazo los pronosticos no cambian.
create or replace function contar_exactos(p_partido_id int)
returns int language sql stable security definer set search_path = public, extensions as $$
  select count(*)::int
  from pronosticos pr
  join partidos p on p.id = pr.partido_id
  where pr.partido_id = p_partido_id
    and p.goles_local is not null and p.goles_visita is not null
    and pr.pred_local = p.goles_local and pr.pred_visita = p.goles_visita;
$$;

-- Trigger: al marcar un partido como 'final' con goles, recalcula sus pronosticos
create or replace function tg_actualizar_puntos() returns trigger as $$
declare n int;
begin
  if new.estado = 'final'
     and new.goles_local is not null and new.goles_visita is not null then
    -- cuantos clavaron el exacto (define el tier unico/x2/x3+)
    select count(*) into n from pronosticos
      where partido_id = new.id
        and pred_local = new.goles_local and pred_visita = new.goles_visita;
    update pronosticos
       set puntos = calcular_puntos_pronostico(
             pred_local, pred_visita, new.goles_local, new.goles_visita, new.fase, n),
           updated_at = now()
     where partido_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_actualizar_puntos on partidos;
create trigger trg_actualizar_puntos
  after insert or update of estado, goles_local, goles_visita on partidos
  for each row execute function tg_actualizar_puntos();

-- Ancla del cronometro: cada vez que cambia 'minuto' (robot o admin), guardamos
-- CUANDO cambio. La app usa (minuto + minuto_at) para tickear el reloj local
-- sin depender de la API entre polls. now() es UTC en Supabase (timezone-safe).
create or replace function tg_anclar_minuto()
returns trigger language plpgsql as $$
begin
  if new.minuto is distinct from old.minuto then
    new.minuto_at := case when new.minuto is null then null else now() end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_anclar_minuto on partidos;
create trigger trg_anclar_minuto
  before update of minuto on partidos
  for each row execute function tg_anclar_minuto();

-- =====================================================================
-- 3. LOGIN POR PIN (seguro: el pin_hash NUNCA viaja al frontend)
-- =====================================================================

create or replace function login_jugador(p_jugador_id int, p_pin text)
returns table(id int, nombre text, alias text,
              es_admin boolean, onboarding_completado boolean)
language sql security definer set search_path = public, extensions as $$
  select j.id, j.nombre, j.alias, j.es_admin, j.onboarding_completado
  from jugadores j
  where j.id = p_jugador_id
    and j.activo                              -- baja blanda: bloquea el ingreso
    and j.pin_hash = crypt(p_pin, j.pin_hash);
$$;

create or replace function cambiar_pin(p_jugador_id int, p_pin_actual text, p_pin_nuevo text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare ok boolean;
begin
  select (pin_hash = crypt(p_pin_actual, pin_hash)) into ok
  from jugadores where id = p_jugador_id;
  if not coalesce(ok,false) then return false; end if;
  update jugadores set pin_hash = crypt(p_pin_nuevo, gen_salt('bf'))
  where id = p_jugador_id;
  return true;
end;
$$;

create or replace function set_onboarding(p_jugador_id int, p_valor boolean)
returns void language sql security definer set search_path = public, extensions as $$
  update jugadores set onboarding_completado = p_valor where id = p_jugador_id;
$$;

-- Guardar/actualizar un pronostico. SOLO si el partido sigue 'programado' y
-- aun no empezo (regla anti-trampa, validada en el servidor).
-- Devuelve: 'ok' | 'cerrado' | 'invalido'.
create or replace function guardar_pronostico(
  p_jugador_id int, p_partido_id int, p_local int, p_visita int)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare est text; fch timestamptz;
begin
  if p_local is null or p_visita is null
     or p_local < 0 or p_visita < 0 or p_local > 99 or p_visita > 99 then
    return 'invalido';
  end if;
  select estado, fecha into est, fch from partidos where id = p_partido_id;
  if not found then return 'invalido'; end if;
  if est <> 'programado' or fch <= now() then
    return 'cerrado';
  end if;
  insert into pronosticos (jugador_id, partido_id, pred_local, pred_visita)
  values (p_jugador_id, p_partido_id, p_local, p_visita)
  on conflict (jugador_id, partido_id) do update
    set pred_local = excluded.pred_local,
        pred_visita = excluded.pred_visita,
        updated_at = now();
  return 'ok';
end;
$$;

-- Pronosticos de un partido. Si el partido YA empezo, devuelve los de TODOS.
-- Si aun no empieza, devuelve solo el del jugador que pregunta (oculta ajenos).
create or replace function pronosticos_partido(p_partido_id int, p_jugador_id int)
returns table(jugador_id int, nombre text, pred_local int, pred_visita int, puntos int)
language sql security definer set search_path = public, extensions as $$
  select pr.jugador_id,
         coalesce(j.alias, j.nombre) as nombre,
         pr.pred_local, pr.pred_visita,
         calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
           p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos
  from pronosticos pr
  join jugadores j on j.id = pr.jugador_id
  join partidos  p on p.id = pr.partido_id
  where pr.partido_id = p_partido_id
    and (
      exists (select 1 from partidos p2 where p2.id = p_partido_id
              and (p2.estado <> 'programado' or p2.fecha <= now()))
      or pr.jugador_id = p_jugador_id
    )
  order by puntos desc nulls last, nombre;
$$;

-- Devuelve los IDs de partidos que el jugador YA pronostico (para marcar
-- 'Pronosticado'/'Pendiente' en la lista). No expone los marcadores ajenos.
create or replace function mis_pronosticos(p_jugador_id int)
returns table(partido_id int)
language sql security definer set search_path = public, extensions as $$
  select pr.partido_id from pronosticos pr where pr.jugador_id = p_jugador_id;
$$;

-- Actualizar alias (jugadores esta cerrada al anon, por eso via RPC).
create or replace function actualizar_alias(p_jugador_id int, p_alias text)
returns void language sql security definer set search_path = public, extensions as $$
  update jugadores set alias = nullif(trim(p_alias), '') where id = p_jugador_id;
$$;

-- Guardar predicciones especiales. Solo si la ventana esta habilitada
-- (configuracion.edicion_predicciones_habilitada = 'true'). 'ok' | 'cerrado'.
-- Cambia la firma (agrega p_asistidor), por eso eliminamos la version vieja.
drop function if exists guardar_especiales(int,text,text,text,text,text,text,text,text,text,text,text);
create or replace function guardar_especiales(
  p_jugador_id int,
  p_campeon text, p_finalista_1 text, p_finalista_2 text,
  p_semi_1 text, p_semi_2 text, p_semi_3 text, p_semi_4 text,
  p_goleador text, p_asistidor text, p_mejor_jugador text, p_mejor_arquero text, p_mejor_joven text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare habil text;
begin
  select valor into habil from configuracion
    where clave = 'edicion_predicciones_habilitada';
  if coalesce(habil, 'false') <> 'true' then return 'cerrado'; end if;
  insert into predicciones_especiales (
    jugador_id, campeon, finalista_1, finalista_2,
    semifinalista_1, semifinalista_2, semifinalista_3, semifinalista_4,
    goleador, asistidor, mejor_jugador, mejor_arquero, mejor_joven)
  values (p_jugador_id, p_campeon, p_finalista_1, p_finalista_2,
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

-- Recalcula los puntos de las predicciones especiales comparando contra los
-- resultados reales (configuracion.real_*). Puntajes:
--   PAIS (dedup por equipo, ronda mas alta lograda): Campeon 30 | Finalista 12
--         | 3er lugar 8 | Semifinalista 6
--   DISTINCION (cada una aparte): Goleador 15 | Asistidor 10 | Mejor jugador 10
--         | Mejor arquero 10 | Mejor joven 10
-- Match sin distinguir mayusculas/espacios. Lo dispara el admin.
create or replace function recalcular_especiales()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  r_camp text; r_ter text; r_gol text; r_asi text; r_mj text; r_ma text; r_mjov text;
  v_fin text[]; v_semi text[];
begin
  select lower(trim(valor)) into r_camp from configuracion where clave='real_campeon';
  select lower(trim(valor)) into r_ter  from configuracion where clave='real_tercer';
  select lower(trim(valor)) into r_gol  from configuracion where clave='real_goleador';
  select lower(trim(valor)) into r_asi  from configuracion where clave='real_asistidor';
  select lower(trim(valor)) into r_mj   from configuracion where clave='real_mejor_jugador';
  select lower(trim(valor)) into r_ma   from configuracion where clave='real_mejor_arquero';
  select lower(trim(valor)) into r_mjov from configuracion where clave='real_mejor_joven';
  select array_remove(array[
    lower(trim((select valor from configuracion where clave='real_finalista_1'))),
    lower(trim((select valor from configuracion where clave='real_finalista_2')))], '')
    into v_fin;
  select array_remove(array[
    lower(trim((select valor from configuracion where clave='real_semi_1'))),
    lower(trim((select valor from configuracion where clave='real_semi_2'))),
    lower(trim((select valor from configuracion where clave='real_semi_3'))),
    lower(trim((select valor from configuracion where clave='real_semi_4')))], '')
    into v_semi;

  -- DISTINCIONES individuales: cada una suma por separado.
  update predicciones_especiales pe set
    puntos_goleador      = case when r_gol  <> '' and lower(trim(coalesce(pe.goleador,'')))=r_gol      then 15 else 0 end,
    puntos_asistidor     = case when r_asi  <> '' and lower(trim(coalesce(pe.asistidor,'')))=r_asi     then 10 else 0 end,
    puntos_mejor_jugador = case when r_mj   <> '' and lower(trim(coalesce(pe.mejor_jugador,'')))=r_mj   then 10 else 0 end,
    puntos_mejor_arquero = case when r_ma   <> '' and lower(trim(coalesce(pe.mejor_arquero,'')))=r_ma   then 10 else 0 end,
    puntos_mejor_joven   = case when r_mjov <> '' and lower(trim(coalesce(pe.mejor_joven,'')))=r_mjov   then 10 else 0 end;

  -- PAIS: por cada equipo DISTINTO que elegiste (en cualquier slot), cobras su
  -- ronda mas alta REALMENTE lograda. Un mismo equipo paga una sola vez (dedup).
  update predicciones_especiales pe set
    puntos_pais = coalesce((
      select sum(valor_equipo) from (
        select t.equipo,
          max(case
            when r_camp <> '' and t.equipo = r_camp  then 30
            when t.equipo = any(v_fin)               then 12
            when r_ter  <> '' and t.equipo = r_ter   then 8
            when t.equipo = any(v_semi)              then 6
            else 0 end) as valor_equipo
        from (
          select lower(trim(x)) as equipo from unnest(array[
            pe.campeon, pe.finalista_1, pe.finalista_2,
            pe.semifinalista_1, pe.semifinalista_2, pe.semifinalista_3, pe.semifinalista_4
          ]) as x
          where x is not null and trim(x) <> ''
        ) t
        group by t.equipo
      ) s
    ), 0);
end;
$$;

-- =====================================================================
-- 3b. ADMIN: gestion de participantes (baja blanda + ajuste manual)
-- =====================================================================
-- La tabla jugadores esta bloqueada por RLS, asi que el admin la toca solo
-- via estas funciones security definer. La app gatea el acceso por es_admin.

-- Lista TODOS los jugadores (incluidos los dados de baja) con sus campos de
-- gestion. Es lo que ve el panel de admin (la vista publica oculta inactivos).
create or replace function listar_jugadores_admin()
returns table(id int, nombre text, alias text, es_admin boolean,
              activo boolean, ajuste_puntos int, ajuste_motivo text)
language sql security definer set search_path = public, extensions as $$
  select id, nombre, alias, es_admin, activo, ajuste_puntos, ajuste_motivo
  from jugadores order by id;
$$;

-- Da de baja / re-activa a un jugador.
create or replace function set_jugador_activo(p_jugador_id int, p_activo boolean)
returns void language sql security definer set search_path = public, extensions as $$
  update jugadores set activo = p_activo where id = p_jugador_id;
$$;

-- Ajuste manual de puntos (se SUMA al total en la tabla; puede ser negativo).
create or replace function set_ajuste_puntos(p_jugador_id int, p_puntos int, p_motivo text)
returns void language sql security definer set search_path = public, extensions as $$
  update jugadores
     set ajuste_puntos = coalesce(p_puntos, 0),
         ajuste_motivo = nullif(trim(coalesce(p_motivo,'')), '')
   where id = p_jugador_id;
$$;

-- =====================================================================
-- 4. VISTAS PUBLICAS (lo unico que el frontend lee de jugadores)
-- =====================================================================

create or replace view jugadores_publico as
  select id, nombre, alias, es_admin, onboarding_completado,
         avatar_pos1, avatar_medio, avatar_pos8,
         coalesce(alias, nombre) as nombre_visible
  from jugadores
  where activo;   -- los dados de baja no aparecen en el login

create or replace view tabla_posiciones as
with base as (
  select
    j.id   as jugador_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    -- Puntos calculados EN VIVO (misma funcion que el trigger). Asi los puntos
    -- nunca quedan desincronizados de exactos/aciertos aunque se cargue el
    -- pronostico despues del resultado.
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
      + coalesce(j.ajuste_puntos, 0)            -- ajuste manual del admin (suma/resta)
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
  where j.activo                                -- los dados de baja salen de la tabla
  group by j.id
)
-- DESEMPATE: row_number() => nunca hay dos en la misma posicion.
-- Orden: puntos -> exactos -> aciertos -> MENOS fallas -> orden de inscripcion (id).
-- Antes del 1er partido todos estan en 0 y quedan por id (inofensivo).
select *, row_number() over (
    order by puntos desc, exactos desc, aciertos desc, fallas asc, jugador_id asc
  ) as posicion
from base;

-- Tabla de posiciones de cada GRUPO del Mundial (A..L).
-- Se calcula sola desde los resultados de 'partidos' (cero consumo de API).
-- Muestra los equipos desde ya (en 0) y va sumando con cada partido final.
create or replace view tabla_grupos as
with equipos as (
  select grupo, equipo_local as equipo, pais_local as pais
    from partidos where grupo is not null and equipo_local <> 'Por definir'
  union
  select grupo, equipo_visita as equipo, pais_visita as pais
    from partidos where grupo is not null and equipo_visita <> 'Por definir'
),
resultados as (
  select grupo, equipo_local as equipo, goles_local as gf, goles_visita as gc
    from partidos where grupo is not null and estado='final' and goles_local is not null
  union all
  select grupo, equipo_visita as equipo, goles_visita as gf, goles_local as gc
    from partidos where grupo is not null and estado='final' and goles_local is not null
),
agg as (
  select e.grupo, e.equipo, e.pais,
    count(r.equipo)                                          as pj,
    count(*) filter (where r.gf > r.gc)                      as pg,
    count(*) filter (where r.gf = r.gc)                      as pe,
    count(*) filter (where r.gf < r.gc)                      as pp,
    coalesce(sum(r.gf),0)                                    as gf,
    coalesce(sum(r.gc),0)                                    as gc,
    coalesce(sum(r.gf - r.gc),0)                             as dg,
    coalesce(sum(case when r.gf>r.gc then 3
                      when r.gf=r.gc then 1 else 0 end),0)   as pts
  from equipos e
  left join resultados r on r.grupo = e.grupo and r.equipo = e.equipo
  group by e.grupo, e.equipo, e.pais
)
select *, rank() over (partition by grupo
                       order by pts desc, dg desc, gf desc, equipo) as pos
from agg;

-- =====================================================================
-- 5. SEGURIDAD (RLS) - grupo cerrado de 8 amigos
-- =====================================================================
-- jugadores: BLOQUEADA al anon (protege pin_hash). Se accede solo via las
--   vistas/funciones de arriba. El admin gestiona jugadores desde el panel
--   de Supabase.
-- Resto de tablas: lectura y escritura abierta al grupo (la app valida).

alter table jugadores              enable row level security;
alter table partidos               enable row level security;
alter table partido_eventos        enable row level security;
alter table pronosticos            enable row level security;
alter table predicciones_especiales enable row level security;
alter table configuracion          enable row level security;
-- equipos_api_map y api_cuota: RLS activo SIN politicas = solo el robot
-- (service_role) puede tocarlas. El frontend ni las ve.
alter table equipos_api_map        enable row level security;
alter table api_cuota              enable row level security;

do $$
declare t text;
begin
  foreach t in array array['partidos','partido_eventos',
                           'predicciones_especiales','configuracion']
  loop
    execute format('drop policy if exists %I on %I', 'p_'||t||'_all', t);
    execute format('create policy %I on %I for all using (true) with check (true)',
                   'p_'||t||'_all', t);
  end loop;
end $$;

-- pronosticos: SIN politica permisiva. Se escribe/lee solo via las funciones
-- guardar_pronostico / pronosticos_partido (security definer). Si una corrida
-- anterior dejo la politica abierta, la quitamos aqui.
drop policy if exists p_pronosticos_all on pronosticos;

grant select on jugadores_publico, tabla_posiciones, tabla_grupos to anon, authenticated;
grant execute on function login_jugador(int,text)        to anon, authenticated;
grant execute on function cambiar_pin(int,text,text)      to anon, authenticated;
grant execute on function set_onboarding(int,boolean)     to anon, authenticated;
grant execute on function guardar_pronostico(int,int,int,int) to anon, authenticated;
grant execute on function pronosticos_partido(int,int)    to anon, authenticated;
grant execute on function contar_exactos(int)             to anon, authenticated;
grant execute on function mis_pronosticos(int)             to anon, authenticated;
grant execute on function actualizar_alias(int,text)       to anon, authenticated;
grant execute on function guardar_especiales(int,text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function recalcular_especiales()         to anon, authenticated;
grant execute on function listar_jugadores_admin()        to anon, authenticated;
grant execute on function set_jugador_activo(int,boolean)  to anon, authenticated;
grant execute on function set_ajuste_puntos(int,int,text)  to anon, authenticated;

-- =====================================================================
-- 6. REALTIME (la app escucha cambios en vivo)
-- =====================================================================
do $$
begin
  begin alter publication supabase_realtime add table partidos;        exception when others then null; end;
  begin alter publication supabase_realtime add table partido_eventos; exception when others then null; end;
  begin alter publication supabase_realtime add table pronosticos;     exception when others then null; end;
end $$;

-- =====================================================================
-- 7. SEED: los 8 jugadores (PIN inicial 1234, hasheado con bcrypt)
-- =====================================================================
insert into jugadores (nombre, alias, pin_hash, es_admin) values
  ('Felipe Fierro', null, extensions.crypt('1234', extensions.gen_salt('bf')), true),
  ('Victor Soto', null, extensions.crypt('1234', extensions.gen_salt('bf')), false),
  ('Ignacio Contreras', null, extensions.crypt('1234', extensions.gen_salt('bf')), false),
  ('Jaime Furió', null, extensions.crypt('1234', extensions.gen_salt('bf')), false),
  ('Diego Galvez', null, extensions.crypt('1234', extensions.gen_salt('bf')), false),
  ('Daniel Abreu', null, extensions.crypt('1234', extensions.gen_salt('bf')), false),
  ('Benjamin Bustamante', null, extensions.crypt('1234', extensions.gen_salt('bf')), false),
  ('Ignacio Gonzalez', null, extensions.crypt('1234', extensions.gen_salt('bf')), false)
on conflict (nombre) do nothing;

-- Rutas de avatares (app/public/avatares/<n>-pos1|medio|pos8.png).
update jugadores set avatar_pos1='/avatares/1-pos1.png', avatar_medio='/avatares/1-medio.png', avatar_pos8='/avatares/1-pos8.png' where nombre='Felipe Fierro';
update jugadores set avatar_pos1='/avatares/2-pos1.png', avatar_medio='/avatares/2-medio.png', avatar_pos8='/avatares/2-pos8.png' where nombre='Victor Soto';
update jugadores set avatar_pos1='/avatares/3-pos1.png', avatar_medio='/avatares/3-medio.png', avatar_pos8='/avatares/3-pos8.png' where nombre='Ignacio Contreras';
update jugadores set avatar_pos1='/avatares/4-pos1.png', avatar_medio='/avatares/4-medio.png', avatar_pos8='/avatares/4-pos8.png' where nombre='Jaime Furió';
update jugadores set avatar_pos1='/avatares/5-pos1.png', avatar_medio='/avatares/5-medio.png', avatar_pos8='/avatares/5-pos8.png' where nombre='Diego Galvez';
update jugadores set avatar_pos1='/avatares/6-pos1.png', avatar_medio='/avatares/6-medio.png', avatar_pos8='/avatares/6-pos8.png' where nombre='Daniel Abreu';
update jugadores set avatar_pos1='/avatares/7-pos1.png', avatar_medio='/avatares/7-medio.png', avatar_pos8='/avatares/7-pos8.png' where nombre='Benjamin Bustamante';
update jugadores set avatar_pos1='/avatares/8-pos1.png', avatar_medio='/avatares/8-medio.png', avatar_pos8='/avatares/8-pos8.png' where nombre='Ignacio Gonzalez';

-- =====================================================================
-- 8. FIXTURE: 104 partidos (solo si la tabla esta vacia -> idempotente)
-- =====================================================================
do $$
begin
  if not exists (select 1 from partidos) then
    insert into partidos
      (fase, grupo, fecha, equipo_local, equipo_visita,
       pais_local, pais_visita, estadio, ciudad) values
  ('Grupos', 'A', '2026-06-11 15:00:00-04', 'México', 'Sudáfrica', 'MX', 'ZA', 'Estadio Azteca', 'Ciudad de México'),
  ('Grupos', 'A', '2026-06-11 22:00:00-04', 'República de Corea', 'Chequia', 'KR', 'CZ', 'Estadio Akron', 'Guadalajara'),
  ('Grupos', 'B', '2026-06-12 15:00:00-04', 'Canadá', 'Bosnia y Herzegovina', 'CA', 'BA', 'BMO Field', 'Toronto'),
  ('Grupos', 'D', '2026-06-12 21:00:00-04', 'Estados Unidos', 'Paraguay', 'US', 'PY', 'SoFi Stadium', 'Los Ángeles (Inglewood)'),
  ('Grupos', 'B', '2026-06-13 15:00:00-04', 'Catar', 'Suiza', 'QA', 'CH', 'Levi''s Stadium', 'San Francisco (Santa Clara)'),
  ('Grupos', 'C', '2026-06-13 18:00:00-04', 'Brasil', 'Marruecos', 'BR', 'MA', 'MetLife Stadium', 'Nueva York (East Rutherford)'),
  ('Grupos', 'C', '2026-06-13 21:00:00-04', 'Haití', 'Escocia', 'HT', 'GB-SCT', 'Gillette Stadium', 'Boston (Foxborough)'),
  ('Grupos', 'D', '2026-06-14 12:00:00-04', 'Australia', 'Turquía', 'AU', 'TR', 'BC Place', 'Vancouver'),
  ('Grupos', 'E', '2026-06-14 13:00:00-04', 'Alemania', 'Curazao', 'DE', 'CW', 'NRG Stadium', 'Houston'),
  ('Grupos', 'F', '2026-06-14 16:00:00-04', 'Países Bajos', 'Japón', 'NL', 'JP', 'AT&T Stadium', 'Dallas (Arlington)'),
  ('Grupos', 'E', '2026-06-14 19:00:00-04', 'Costa de Marfil', 'Ecuador', 'CI', 'EC', 'Lincoln Financial Field', 'Filadelfia'),
  ('Grupos', 'F', '2026-06-14 22:00:00-04', 'Suecia', 'Túnez', 'SE', 'TN', 'Estadio BBVA', 'Monterrey'),
  ('Grupos', 'H', '2026-06-15 12:00:00-04', 'España', 'Cabo Verde', 'ES', 'CV', 'Mercedes-Benz Stadium', 'Atlanta'),
  ('Grupos', 'G', '2026-06-15 15:00:00-04', 'Bélgica', 'Egipto', 'BE', 'EG', 'Lumen Field', 'Seattle'),
  ('Grupos', 'H', '2026-06-15 18:00:00-04', 'Arabia Saudí', 'Uruguay', 'SA', 'UY', 'Hard Rock Stadium', 'Miami'),
  ('Grupos', 'G', '2026-06-15 21:00:00-04', 'RI de Irán', 'Nueva Zelanda', 'IR', 'NZ', 'SoFi Stadium', 'Los Ángeles (Inglewood)'),
  ('Grupos', 'I', '2026-06-16 15:00:00-04', 'Francia', 'Senegal', 'FR', 'SN', 'MetLife Stadium', 'Nueva York (East Rutherford)'),
  ('Grupos', 'I', '2026-06-16 18:00:00-04', 'Irak', 'Noruega', 'IQ', 'NO', 'Gillette Stadium', 'Boston (Foxborough)'),
  ('Grupos', 'J', '2026-06-16 21:00:00-04', 'Argentina', 'Argelia', 'AR', 'DZ', 'Arrowhead Stadium', 'Kansas City'),
  ('Grupos', 'J', '2026-06-17 00:00:00-04', 'Austria', 'Jordania', 'AT', 'JO', 'Levi''s Stadium', 'San Francisco (Santa Clara)'),
  ('Grupos', 'K', '2026-06-17 13:00:00-04', 'Portugal', 'RD Congo', 'PT', 'CD', 'NRG Stadium', 'Houston'),
  ('Grupos', 'L', '2026-06-17 16:00:00-04', 'Inglaterra', 'Croacia', 'GB-ENG', 'HR', 'AT&T Stadium', 'Dallas (Arlington)'),
  ('Grupos', 'L', '2026-06-17 19:00:00-04', 'Ghana', 'Panamá', 'GH', 'PA', 'BMO Field', 'Toronto'),
  ('Grupos', 'K', '2026-06-17 22:00:00-04', 'Uzbekistán', 'Colombia', 'UZ', 'CO', 'Estadio Azteca', 'Ciudad de México'),
  ('Grupos', 'A', '2026-06-18 12:00:00-04', 'Chequia', 'Sudáfrica', 'CZ', 'ZA', 'Mercedes-Benz Stadium', 'Atlanta'),
  ('Grupos', 'B', '2026-06-18 15:00:00-04', 'Suiza', 'Bosnia y Herzegovina', 'CH', 'BA', 'SoFi Stadium', 'Los Ángeles (Inglewood)'),
  ('Grupos', 'B', '2026-06-18 18:00:00-04', 'Canadá', 'Catar', 'CA', 'QA', 'BC Place', 'Vancouver'),
  ('Grupos', 'A', '2026-06-18 21:00:00-04', 'México', 'República de Corea', 'MX', 'KR', 'Estadio Akron', 'Guadalajara'),
  ('Grupos', 'D', '2026-06-19 15:00:00-04', 'Estados Unidos', 'Australia', 'US', 'AU', 'Lumen Field', 'Seattle'),
  ('Grupos', 'C', '2026-06-19 18:00:00-04', 'Escocia', 'Marruecos', 'GB-SCT', 'MA', 'Gillette Stadium', 'Boston (Foxborough)'),
  ('Grupos', 'C', '2026-06-19 20:30:00-04', 'Brasil', 'Haití', 'BR', 'HT', 'Lincoln Financial Field', 'Filadelfia'),
  ('Grupos', 'D', '2026-06-19 23:00:00-04', 'Turquía', 'Paraguay', 'TR', 'PY', 'Levi''s Stadium', 'San Francisco (Santa Clara)'),
  ('Grupos', 'F', '2026-06-20 13:00:00-04', 'Países Bajos', 'Suecia', 'NL', 'SE', 'NRG Stadium', 'Houston'),
  ('Grupos', 'E', '2026-06-20 16:00:00-04', 'Alemania', 'Costa de Marfil', 'DE', 'CI', 'BMO Field', 'Toronto'),
  ('Grupos', 'E', '2026-06-20 20:00:00-04', 'Ecuador', 'Curazao', 'EC', 'CW', 'Arrowhead Stadium', 'Kansas City'),
  ('Grupos', 'F', '2026-06-21 00:00:00-04', 'Túnez', 'Japón', 'TN', 'JP', 'Estadio BBVA', 'Monterrey'),
  ('Grupos', 'H', '2026-06-21 12:00:00-04', 'España', 'Arabia Saudí', 'ES', 'SA', 'Mercedes-Benz Stadium', 'Atlanta'),
  ('Grupos', 'G', '2026-06-21 15:00:00-04', 'Bélgica', 'RI de Irán', 'BE', 'IR', 'SoFi Stadium', 'Los Ángeles (Inglewood)'),
  ('Grupos', 'H', '2026-06-21 18:00:00-04', 'Uruguay', 'Cabo Verde', 'UY', 'CV', 'Hard Rock Stadium', 'Miami'),
  ('Grupos', 'G', '2026-06-21 21:00:00-04', 'Nueva Zelanda', 'Egipto', 'NZ', 'EG', 'BC Place', 'Vancouver'),
  ('Grupos', 'J', '2026-06-22 13:00:00-04', 'Argentina', 'Austria', 'AR', 'AT', 'AT&T Stadium', 'Dallas (Arlington)'),
  ('Grupos', 'I', '2026-06-22 17:00:00-04', 'Francia', 'Irak', 'FR', 'IQ', 'Lincoln Financial Field', 'Filadelfia'),
  ('Grupos', 'I', '2026-06-22 20:00:00-04', 'Noruega', 'Senegal', 'NO', 'SN', 'MetLife Stadium', 'Nueva York (East Rutherford)'),
  ('Grupos', 'J', '2026-06-22 23:00:00-04', 'Jordania', 'Argelia', 'JO', 'DZ', 'Levi''s Stadium', 'San Francisco (Santa Clara)'),
  ('Grupos', 'K', '2026-06-23 13:00:00-04', 'Portugal', 'Uzbekistán', 'PT', 'UZ', 'NRG Stadium', 'Houston'),
  ('Grupos', 'L', '2026-06-23 16:00:00-04', 'Inglaterra', 'Ghana', 'GB-ENG', 'GH', 'Gillette Stadium', 'Boston (Foxborough)'),
  ('Grupos', 'L', '2026-06-23 19:00:00-04', 'Panamá', 'Croacia', 'PA', 'HR', 'BMO Field', 'Toronto'),
  ('Grupos', 'K', '2026-06-23 22:00:00-04', 'Colombia', 'RD Congo', 'CO', 'CD', 'Estadio Akron', 'Guadalajara'),
  ('Grupos', 'B', '2026-06-24 15:00:00-04', 'Suiza', 'Canadá', 'CH', 'CA', 'BC Place', 'Vancouver'),
  ('Grupos', 'B', '2026-06-24 15:00:00-04', 'Bosnia y Herzegovina', 'Catar', 'BA', 'QA', 'Lumen Field', 'Seattle'),
  ('Grupos', 'C', '2026-06-24 18:00:00-04', 'Escocia', 'Brasil', 'GB-SCT', 'BR', 'Hard Rock Stadium', 'Miami'),
  ('Grupos', 'C', '2026-06-24 18:00:00-04', 'Marruecos', 'Haití', 'MA', 'HT', 'Mercedes-Benz Stadium', 'Atlanta'),
  ('Grupos', 'A', '2026-06-24 21:00:00-04', 'Chequia', 'México', 'CZ', 'MX', 'Estadio Azteca', 'Ciudad de México'),
  ('Grupos', 'A', '2026-06-24 21:00:00-04', 'Sudáfrica', 'República de Corea', 'ZA', 'KR', 'Estadio BBVA', 'Monterrey'),
  ('Grupos', 'E', '2026-06-25 16:00:00-04', 'Curazao', 'Costa de Marfil', 'CW', 'CI', 'Lincoln Financial Field', 'Filadelfia'),
  ('Grupos', 'E', '2026-06-25 16:00:00-04', 'Ecuador', 'Alemania', 'EC', 'DE', 'MetLife Stadium', 'Nueva York (East Rutherford)'),
  ('Grupos', 'F', '2026-06-25 19:00:00-04', 'Japón', 'Suecia', 'JP', 'SE', 'AT&T Stadium', 'Dallas (Arlington)'),
  ('Grupos', 'F', '2026-06-25 19:00:00-04', 'Túnez', 'Países Bajos', 'TN', 'NL', 'Arrowhead Stadium', 'Kansas City'),
  ('Grupos', 'D', '2026-06-25 22:00:00-04', 'Turquía', 'Estados Unidos', 'TR', 'US', 'SoFi Stadium', 'Los Ángeles (Inglewood)'),
  ('Grupos', 'D', '2026-06-25 22:00:00-04', 'Paraguay', 'Australia', 'PY', 'AU', 'Levi''s Stadium', 'San Francisco (Santa Clara)'),
  ('Grupos', 'I', '2026-06-26 15:00:00-04', 'Noruega', 'Francia', 'NO', 'FR', 'Gillette Stadium', 'Boston (Foxborough)'),
  ('Grupos', 'I', '2026-06-26 15:00:00-04', 'Senegal', 'Irak', 'SN', 'IQ', 'BMO Field', 'Toronto'),
  ('Grupos', 'H', '2026-06-26 20:00:00-04', 'Cabo Verde', 'Arabia Saudí', 'CV', 'SA', 'NRG Stadium', 'Houston'),
  ('Grupos', 'H', '2026-06-26 20:00:00-04', 'Uruguay', 'España', 'UY', 'ES', 'Estadio Akron', 'Guadalajara'),
  ('Grupos', 'G', '2026-06-26 23:00:00-04', 'Egipto', 'RI de Irán', 'EG', 'IR', 'Lumen Field', 'Seattle'),
  ('Grupos', 'G', '2026-06-26 23:00:00-04', 'Nueva Zelanda', 'Bélgica', 'NZ', 'BE', 'BC Place', 'Vancouver'),
  ('Grupos', 'L', '2026-06-27 17:00:00-04', 'Panamá', 'Inglaterra', 'PA', 'GB-ENG', 'MetLife Stadium', 'Nueva York (East Rutherford)'),
  ('Grupos', 'L', '2026-06-27 17:00:00-04', 'Croacia', 'Ghana', 'HR', 'GH', 'Lincoln Financial Field', 'Filadelfia'),
  ('Grupos', 'K', '2026-06-27 19:30:00-04', 'Colombia', 'Portugal', 'CO', 'PT', 'Hard Rock Stadium', 'Miami'),
  ('Grupos', 'K', '2026-06-27 19:30:00-04', 'RD Congo', 'Uzbekistán', 'CD', 'UZ', 'Mercedes-Benz Stadium', 'Atlanta'),
  ('Grupos', 'J', '2026-06-27 22:00:00-04', 'Argelia', 'Austria', 'DZ', 'AT', 'Arrowhead Stadium', 'Kansas City'),
  ('Grupos', 'J', '2026-06-27 22:00:00-04', 'Jordania', 'Argentina', 'JO', 'AR', 'AT&T Stadium', 'Dallas (Arlington)'),
  ('Dieciseisavos', NULL, '2026-06-28 15:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'SoFi Stadium', 'Los Ángeles (Inglewood)'),
  ('Dieciseisavos', NULL, '2026-06-29 13:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'NRG Stadium', 'Houston'),
  ('Dieciseisavos', NULL, '2026-06-29 16:30:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Gillette Stadium', 'Boston (Foxborough)'),
  ('Dieciseisavos', NULL, '2026-06-29 21:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio BBVA', 'Monterrey'),
  ('Dieciseisavos', NULL, '2026-06-30 13:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'AT&T Stadium', 'Dallas (Arlington)'),
  ('Dieciseisavos', NULL, '2026-06-30 17:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'MetLife Stadium', 'Nueva York (East Rutherford)'),
  ('Dieciseisavos', NULL, '2026-06-30 21:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Azteca', 'Ciudad de México'),
  ('Dieciseisavos', NULL, '2026-07-01 12:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Mercedes-Benz Stadium', 'Atlanta'),
  ('Dieciseisavos', NULL, '2026-07-01 16:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Lumen Field', 'Seattle'),
  ('Dieciseisavos', NULL, '2026-07-01 20:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Levi''s Stadium', 'San Francisco (Santa Clara)'),
  ('Dieciseisavos', NULL, '2026-07-02 15:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'SoFi Stadium', 'Los Ángeles (Inglewood)'),
  ('Dieciseisavos', NULL, '2026-07-02 19:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'BMO Field', 'Toronto'),
  ('Dieciseisavos', NULL, '2026-07-02 23:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'BC Place', 'Vancouver'),
  ('Dieciseisavos', NULL, '2026-07-03 14:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'AT&T Stadium', 'Dallas (Arlington)'),
  ('Dieciseisavos', NULL, '2026-07-03 18:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Hard Rock Stadium', 'Miami'),
  ('Dieciseisavos', NULL, '2026-07-03 21:30:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Arrowhead Stadium', 'Kansas City'),
  ('Octavos', NULL, '2026-07-04 13:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'NRG Stadium', 'Houston'),
  ('Octavos', NULL, '2026-07-04 17:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Lincoln Financial Field', 'Filadelfia'),
  ('Octavos', NULL, '2026-07-05 16:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'MetLife Stadium', 'Nueva York (East Rutherford)'),
  ('Octavos', NULL, '2026-07-05 20:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Azteca', 'Ciudad de México'),
  ('Octavos', NULL, '2026-07-06 15:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'AT&T Stadium', 'Dallas (Arlington)'),
  ('Octavos', NULL, '2026-07-06 20:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Lumen Field', 'Seattle'),
  ('Octavos', NULL, '2026-07-07 12:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Mercedes-Benz Stadium', 'Atlanta'),
  ('Octavos', NULL, '2026-07-07 16:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'BC Place', 'Vancouver'),
  ('Cuartos', NULL, '2026-07-09 16:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Gillette Stadium', 'Boston (Foxborough)'),
  ('Cuartos', NULL, '2026-07-10 15:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'SoFi Stadium', 'Los Ángeles (Inglewood)'),
  ('Cuartos', NULL, '2026-07-11 17:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Hard Rock Stadium', 'Miami'),
  ('Cuartos', NULL, '2026-07-11 21:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Arrowhead Stadium', 'Kansas City'),
  ('Semifinales', NULL, '2026-07-14 15:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'AT&T Stadium', 'Dallas (Arlington)'),
  ('Semifinales', NULL, '2026-07-15 15:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Mercedes-Benz Stadium', 'Atlanta'),
  ('Tercer Puesto', NULL, '2026-07-18 17:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'Hard Rock Stadium', 'Miami'),
  ('Final', NULL, '2026-07-19 15:00:00-04', 'Por definir', 'Por definir', 'XX', 'XX', 'MetLife Stadium', 'Nueva York (East Rutherford)');
  end if;
end $$;

-- =====================================================================
-- 9. VERIFICACION (deberias ver: 8 jugadores y 104 partidos)
-- =====================================================================
select 'jugadores' as tabla, count(*) from jugadores
union all
select 'partidos', count(*) from partidos
union all
select 'partidos_grupos', count(*) from partidos where fase='Grupos';
-- Prueba de login (debe devolver 1 fila = Felipe):
-- select * from login_jugador(1, '1234');
