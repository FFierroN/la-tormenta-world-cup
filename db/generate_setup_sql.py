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
  -- puntaje_anulado: el partido se juega y rellena normal, pero NO suma puntos
  -- (caso: se cargo mal y se decidio que ese partido no cuente para nadie).
  puntaje_anulado boolean not null default false,
  finalizado_at   timestamptz
);
create index if not exists idx_partidos_fecha  on partidos(fecha);
create index if not exists idx_partidos_estado on partidos(estado);
-- Idempotente para bases ya creadas: ancla del cronometro en vivo.
alter table partidos add column if not exists minuto_at timestamptz;
alter table partidos add column if not exists puntaje_anulado boolean not null default false;

create table if not exists partido_eventos (
  id          serial primary key,
  partido_id  int references partidos(id) on delete cascade,
  tipo        text not null,   -- gol | amarilla | roja
  equipo      text not null,   -- local | visita
  minuto      int not null,
  minuto_adicional int,         -- descuento/anadido (ej. 45+5 -> minuto=45, adicional=5)
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

-- Detalle de TODAS mis predicciones (pantalla "Mis predicciones"): partido +
-- puntos (calcular_puntos_pronostico) + categoria. Solo las que YO pronostique.
create or replace function mis_predicciones_detalle(p_jugador_id int)
returns table(
  partido_id int, fase text, grupo text, fecha timestamptz, estado text,
  equipo_local text, equipo_visita text, pais_local text, pais_visita text,
  goles_local int, goles_visita int,
  pred_local int, pred_visita int,
  puntos int, resultado text
)
language sql security definer set search_path = public, extensions as $$
  select
    p.id, p.fase, p.grupo, p.fecha, p.estado,
    p.equipo_local, p.equipo_visita, p.pais_local, p.pais_visita,
    p.goles_local, p.goles_visita,
    pr.pred_local, pr.pred_visita,
    calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
      p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos,
    case
      when p.estado <> 'final'
        or p.goles_local is null or p.goles_visita is null then null
      when pr.pred_local = p.goles_local
        and pr.pred_visita = p.goles_visita then 'exacto'
      when p.goles_local <> p.goles_visita
        and (p.goles_local - p.goles_visita)
          = (pr.pred_local - pr.pred_visita) then 'diferencia'
      when (p.goles_local > p.goles_visita and pr.pred_local > pr.pred_visita)
        or (p.goles_local < p.goles_visita and pr.pred_local < pr.pred_visita)
        or (p.goles_local = p.goles_visita and pr.pred_local = pr.pred_visita)
        then 'acierto'
      else 'falla'
    end as resultado
  from pronosticos pr
  join partidos p on p.id = pr.partido_id
  where pr.jugador_id = p_jugador_id
  order by p.fecha desc;
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
                      and not p.puntaje_anulado   -- partidos anulados no suman para nadie
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
grant execute on function mis_predicciones_detalle(int)   to anon, authenticated;
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
                    # El CSV trae la hora en UTC-4 (Chile). Le pegamos el offset
                    # '-04' para que Postgres guarde el instante UTC correcto en
                    # la columna timestamptz (sin depender de la zona de sesion).
                    sql_txt(row["fecha_hora"] + "-04"),
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
