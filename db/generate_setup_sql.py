"""Genera SETUP-SUPABASE.sql para La Tormenta World Cup.

Combina el schema/funciones/seguridad (plantilla estatica de abajo) con los
104 partidos leidos del fixture CSV. Reproducible: si cambia el fixture,
se vuelve a correr y listo.

Uso:  python generate_setup_sql.py
Salida:  SETUP-SUPABASE.sql  (pegar entero en Supabase -> SQL Editor -> Run)
"""
import csv
from pathlib import Path

AQUI = Path(__file__).resolve().parent
FIXTURE = AQUI / "fixture-FINAL-importar.csv"
SALIDA = AQUI / "SETUP-SUPABASE.sql"

JUGADORES = [
    ("Felipe Fierro", True),
    ("Victor Soto", False),
    ("Ignacio Contreras", False),
    ("Jaime Furió", False),
    ("Diego Galvez", False),
    ("Daniel Abreu", False),
    ("Benjamin Bustamante", False),
    ("Ignacio Gonzalez", False),
]


def sql_txt(valor: str) -> str:
    """Convierte a literal SQL: NULL si vacio, escapando comillas simples."""
    if valor is None or valor.strip() == "":
        return "NULL"
    return "'" + valor.strip().replace("'", "''") + "'"


HEADER = """-- =====================================================================
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
  goleador        text, mejor_jugador text, mejor_arquero text, mejor_joven text,
  puntos_campeon         int not null default 0,
  puntos_finalistas      int not null default 0,
  puntos_semifinalistas  int not null default 0,
  puntos_goleador        int not null default 0,
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
insert into configuracion (clave, valor)
values ('edicion_predicciones_habilitada', 'false')
on conflict (clave) do nothing;

-- Resultados reales para puntuar las predicciones especiales (los carga el
-- admin al final del Mundial). Vacios por defecto.
insert into configuracion (clave, valor) values
  ('real_campeon',''), ('real_finalista_1',''), ('real_finalista_2',''),
  ('real_semi_1',''), ('real_semi_2',''), ('real_semi_3',''), ('real_semi_4',''),
  ('real_goleador',''), ('real_mejor_jugador',''), ('real_mejor_arquero',''),
  ('real_mejor_joven','')
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
-- 2. CALCULO DE PUNTOS (3 niveles: EXACTO + bonus / ACIERTO / FALLA)
-- =====================================================================

create or replace function calcular_puntos_pronostico(
  pred_local int, pred_visita int, res_local int, res_visita int, p_fase text
) returns int as $$
declare
  pts_exacto int; pts_acierto int; bonus int := 0;
  maxg int; ming int;
begin
  if pred_local is null or pred_visita is null
     or res_local is null or res_visita is null then
    return 0;
  end if;

  if    p_fase in ('Grupos','Dieciseisavos') then pts_exacto:=6;  pts_acierto:=2;
  elsif p_fase in ('Octavos','Cuartos')      then pts_exacto:=8;  pts_acierto:=4;
  elsif p_fase = 'Semifinales'               then pts_exacto:=10; pts_acierto:=6;
  elsif p_fase = 'Tercer Puesto'             then pts_exacto:=8;  pts_acierto:=4;
  elsif p_fase = 'Final'                     then pts_exacto:=12; pts_acierto:=8;
  else  return 0;
  end if;

  -- 1) EXACTO: marcador clavado (+ bonus por riesgo segun cantidad de goles)
  if pred_local = res_local and pred_visita = res_visita then
    maxg := greatest(res_local,res_visita);
    ming := least(res_local,res_visita);
    if    (maxg>=4 and ming>=2) or (maxg>=5)          then bonus:=3;
    elsif (maxg=3 and ming=2) or (maxg=4 and ming<=1) then bonus:=2;
    elsif (maxg=2 and ming=2) or (maxg=3 and ming<=1) then bonus:=1;
    else bonus:=0;
    end if;
    return pts_exacto + bonus;
  end if;

  -- 2) ACIERTO: resultado correcto (ganador o empate), sin importar el marcador
  if (res_local > res_visita and pred_local > pred_visita)
     or (res_local < res_visita and pred_local < pred_visita)
     or (res_local = res_visita and pred_local = pred_visita) then
    return pts_acierto;
  end if;

  return 0;  -- 3) FALLA: ni el resultado
end;
$$ language plpgsql immutable;

-- Trigger: al marcar un partido como 'final' con goles, recalcula sus pronosticos
create or replace function tg_actualizar_puntos() returns trigger as $$
begin
  if new.estado = 'final'
     and new.goles_local is not null and new.goles_visita is not null then
    update pronosticos
       set puntos = calcular_puntos_pronostico(
             pred_local, pred_visita, new.goles_local, new.goles_visita, new.fase),
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
         pr.pred_local, pr.pred_visita, pr.puntos
  from pronosticos pr
  join jugadores j on j.id = pr.jugador_id
  where pr.partido_id = p_partido_id
    and (
      exists (select 1 from partidos p where p.id = p_partido_id
              and (p.estado <> 'programado' or p.fecha <= now()))
      or pr.jugador_id = p_jugador_id
    )
  order by pr.puntos desc, nombre;
$$;

-- Actualizar alias (jugadores esta cerrada al anon, por eso via RPC).
create or replace function actualizar_alias(p_jugador_id int, p_alias text)
returns void language sql security definer set search_path = public, extensions as $$
  update jugadores set alias = nullif(trim(p_alias), '') where id = p_jugador_id;
$$;

-- Guardar predicciones especiales. Solo si la ventana esta habilitada
-- (configuracion.edicion_predicciones_habilitada = 'true'). 'ok' | 'cerrado'.
create or replace function guardar_especiales(
  p_jugador_id int,
  p_campeon text, p_finalista_1 text, p_finalista_2 text,
  p_semi_1 text, p_semi_2 text, p_semi_3 text, p_semi_4 text,
  p_goleador text, p_mejor_jugador text, p_mejor_arquero text, p_mejor_joven text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare habil text;
begin
  select valor into habil from configuracion
    where clave = 'edicion_predicciones_habilitada';
  if coalesce(habil, 'false') <> 'true' then return 'cerrado'; end if;
  insert into predicciones_especiales (
    jugador_id, campeon, finalista_1, finalista_2,
    semifinalista_1, semifinalista_2, semifinalista_3, semifinalista_4,
    goleador, mejor_jugador, mejor_arquero, mejor_joven)
  values (p_jugador_id, p_campeon, p_finalista_1, p_finalista_2,
    p_semi_1, p_semi_2, p_semi_3, p_semi_4,
    p_goleador, p_mejor_jugador, p_mejor_arquero, p_mejor_joven)
  on conflict (jugador_id) do update set
    campeon = excluded.campeon,
    finalista_1 = excluded.finalista_1, finalista_2 = excluded.finalista_2,
    semifinalista_1 = excluded.semifinalista_1, semifinalista_2 = excluded.semifinalista_2,
    semifinalista_3 = excluded.semifinalista_3, semifinalista_4 = excluded.semifinalista_4,
    goleador = excluded.goleador, mejor_jugador = excluded.mejor_jugador,
    mejor_arquero = excluded.mejor_arquero, mejor_joven = excluded.mejor_joven;
  return 'ok';
end;
$$;

-- Recalcula los puntos de las predicciones especiales comparando contra los
-- resultados reales (configuracion.real_*). Puntajes:
--   Campeon 20 | cada Finalista 8 | cada Semifinalista 5
--   Goleador 10 | Mejor jugador 8 | Mejor arquero 6 | Mejor joven 6
-- Match sin distinguir mayusculas/espacios. Lo dispara el admin.
create or replace function recalcular_especiales()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  r_camp text; r_gol text; r_mj text; r_ma text; r_mjov text;
  v_fin text[]; v_semi text[];
begin
  select lower(trim(valor)) into r_camp from configuracion where clave='real_campeon';
  select lower(trim(valor)) into r_gol  from configuracion where clave='real_goleador';
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

  update predicciones_especiales pe set
    puntos_campeon = case when r_camp <> '' and lower(trim(coalesce(pe.campeon,'')))=r_camp then 20 else 0 end,
    puntos_finalistas =
      (case when lower(trim(coalesce(pe.finalista_1,''))) = any(v_fin) then 8 else 0 end) +
      (case when lower(trim(coalesce(pe.finalista_2,''))) = any(v_fin) then 8 else 0 end),
    puntos_semifinalistas =
      (case when lower(trim(coalesce(pe.semifinalista_1,''))) = any(v_semi) then 5 else 0 end) +
      (case when lower(trim(coalesce(pe.semifinalista_2,''))) = any(v_semi) then 5 else 0 end) +
      (case when lower(trim(coalesce(pe.semifinalista_3,''))) = any(v_semi) then 5 else 0 end) +
      (case when lower(trim(coalesce(pe.semifinalista_4,''))) = any(v_semi) then 5 else 0 end),
    puntos_goleador      = case when r_gol  <> '' and lower(trim(coalesce(pe.goleador,'')))=r_gol      then 10 else 0 end,
    puntos_mejor_jugador = case when r_mj   <> '' and lower(trim(coalesce(pe.mejor_jugador,'')))=r_mj   then 8  else 0 end,
    puntos_mejor_arquero = case when r_ma   <> '' and lower(trim(coalesce(pe.mejor_arquero,'')))=r_ma   then 6  else 0 end,
    puntos_mejor_joven   = case when r_mjov <> '' and lower(trim(coalesce(pe.mejor_joven,'')))=r_mjov   then 6  else 0 end;
end;
$$;

-- =====================================================================
-- 4. VISTAS PUBLICAS (lo unico que el frontend lee de jugadores)
-- =====================================================================

create or replace view jugadores_publico as
  select id, nombre, alias, es_admin, onboarding_completado,
         avatar_pos1, avatar_medio, avatar_pos8,
         coalesce(alias, nombre) as nombre_visible
  from jugadores;

create or replace view tabla_posiciones as
with base as (
  select
    j.id   as jugador_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    coalesce(sum(pr.puntos),0)
      + coalesce((
          select pe.puntos_campeon + pe.puntos_finalistas + pe.puntos_semifinalistas
               + pe.puntos_goleador + pe.puntos_mejor_jugador
               + pe.puntos_mejor_arquero + pe.puntos_mejor_joven
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
  group by j.id
)
select *, rank() over (order by puntos desc, exactos desc) as posicion
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
grant execute on function actualizar_alias(int,text)       to anon, authenticated;
grant execute on function guardar_especiales(int,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function recalcular_especiales()         to anon, authenticated;

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
"""

FOOTER = """
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
"""


def bloque_jugadores() -> str:
    filas = []
    for nombre, admin in JUGADORES:
        filas.append(
            f"  ({sql_txt(nombre)}, null, extensions.crypt('1234', extensions.gen_salt('bf')), {str(admin).lower()})"
        )
    return (
        "insert into jugadores (nombre, alias, pin_hash, es_admin) values\n"
        + ",\n".join(filas)
        + "\non conflict (nombre) do nothing;\n"
    )


def bloque_avatares() -> str:
    """Asocia las 3 fotos de cada jugador (carpeta app/public/avatares).
    Idempotente y por nombre (no depende del id serial)."""
    lineas = ["-- Rutas de avatares (app/public/avatares/<n>-pos1|medio|pos8.png)."]
    for i, (nombre, _admin) in enumerate(JUGADORES, start=1):
        lineas.append(
            "update jugadores set "
            f"avatar_pos1='/avatares/{i}-pos1.png', "
            f"avatar_medio='/avatares/{i}-medio.png', "
            f"avatar_pos8='/avatares/{i}-pos8.png' "
            f"where nombre={sql_txt(nombre)};"
        )
    return "\n".join(lineas) + "\n"


def bloque_partidos() -> str:
    filas = []
    with FIXTURE.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            filas.append(
                "  ("
                + ", ".join([
                    sql_txt(row["fase"]),
                    sql_txt(row["grupo"]),
                    sql_txt(row["fecha_hora"]),
                    sql_txt(row["equipo_local"]),
                    sql_txt(row["equipo_visitante"]),
                    sql_txt(row["codigo_local"]),
                    sql_txt(row["codigo_visitante"]),
                    sql_txt(row["estadio"]),
                    sql_txt(row["ciudad"]),
                ])
                + ")"
            )
    cuerpo = (
        "    insert into partidos\n"
        "      (fase, grupo, fecha, equipo_local, equipo_visita,\n"
        "       pais_local, pais_visita, estadio, ciudad) values\n"
        + ",\n".join(filas)
        + ";\n"
    )
    return (
        "-- =====================================================================\n"
        "-- 8. FIXTURE: 104 partidos (solo si la tabla esta vacia -> idempotente)\n"
        "-- =====================================================================\n"
        "do $$\nbegin\n  if not exists (select 1 from partidos) then\n"
        + cuerpo
        + "  end if;\nend $$;\n"
    )


def main() -> None:
    if not FIXTURE.exists():
        raise SystemExit(f"No encuentro el fixture: {FIXTURE}")
    sql = HEADER + bloque_jugadores() + "\n" + bloque_avatares() + "\n" + bloque_partidos() + FOOTER
    SALIDA.write_text(sql, encoding="utf-8")
    print(f"OK -> {SALIDA.name} ({len(sql):,} chars)")


if __name__ == "__main__":
    main()
