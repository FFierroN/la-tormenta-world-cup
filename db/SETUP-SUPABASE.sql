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
-- 2. CALCULO DE PUNTOS (puntaje por marcador + bonus por riesgo)
-- =====================================================================

create or replace function calcular_puntos_pronostico(
  pred_local int, pred_visita int, res_local int, res_visita int, p_fase text
) returns int as $$
declare
  pts_exacto int; pts_dif int; pts_gan int; bonus int := 0;
  maxg int; ming int;
begin
  if pred_local is null or pred_visita is null
     or res_local is null or res_visita is null then
    return 0;
  end if;

  if    p_fase in ('Grupos','Dieciseisavos') then pts_exacto:=6;  pts_dif:=4;  pts_gan:=2;
  elsif p_fase in ('Octavos','Cuartos')      then pts_exacto:=8;  pts_dif:=6;  pts_gan:=4;
  elsif p_fase = 'Semifinales'               then pts_exacto:=10; pts_dif:=8;  pts_gan:=6;
  elsif p_fase = 'Tercer Puesto'             then pts_exacto:=8;  pts_dif:=6;  pts_gan:=4;
  elsif p_fase = 'Final'                     then pts_exacto:=12; pts_dif:=10; pts_gan:=8;
  else  return 0;
  end if;

  -- 1) Marcador EXACTO (+ bonus por riesgo segun cantidad de goles)
  if pred_local = res_local and pred_visita = res_visita then
    maxg := greatest(res_local,res_visita);
    ming := least(res_local,res_visita);
    if    (maxg>=4 and ming>=2) or (maxg>=5)        then bonus:=3;
    elsif (maxg=3 and ming=2) or (maxg=4 and ming<=1) then bonus:=2;
    elsif (maxg=2 and ming=2) or (maxg=3 and ming<=1) then bonus:=1;
    else bonus:=0;
    end if;
    return pts_exacto + bonus;
  end if;

  -- 2) Diferencia de goles correcta (y no fue empate)
  if res_local <> res_visita
     and (res_local - res_visita) = (pred_local - pred_visita) then
    return pts_dif;
  end if;

  -- 3) Solo ganador/empate acertado
  if (res_local > res_visita and pred_local > pred_visita)
     or (res_local < res_visita and pred_local < pred_visita)
     or (res_local = res_visita and pred_local = pred_visita) then
    return pts_gan;
  end if;

  return 0;  -- 4) nada acertado
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
  foreach t in array array['partidos','partido_eventos','pronosticos',
                           'predicciones_especiales','configuracion']
  loop
    execute format('drop policy if exists %I on %I', 'p_'||t||'_all', t);
    execute format('create policy %I on %I for all using (true) with check (true)',
                   'p_'||t||'_all', t);
  end loop;
end $$;

grant select on jugadores_publico, tabla_posiciones, tabla_grupos to anon, authenticated;
grant execute on function login_jugador(int,text)        to anon, authenticated;
grant execute on function cambiar_pin(int,text,text)      to anon, authenticated;
grant execute on function set_onboarding(int,boolean)     to anon, authenticated;

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

-- =====================================================================
-- 8. FIXTURE: 104 partidos (solo si la tabla esta vacia -> idempotente)
-- =====================================================================
do $$
begin
  if not exists (select 1 from partidos) then
    insert into partidos
      (fase, grupo, fecha, equipo_local, equipo_visita,
       pais_local, pais_visita, estadio, ciudad) values
  ('Grupos', 'A', '2026-06-11 15:00:00', 'México', 'Sudáfrica', 'MX', 'ZA', 'Estadio Ciudad de México', 'Ciudad de México'),
  ('Grupos', 'A', '2026-06-11 22:00:00', 'República de Corea', 'Chequia', 'KR', 'CZ', 'Estadio Guadalajara', 'Guadalajara'),
  ('Grupos', 'B', '2026-06-12 15:00:00', 'Canadá', 'Bosnia y Herzegovina', 'CA', 'BA', 'Estadio Toronto', 'Toronto'),
  ('Grupos', 'D', '2026-06-12 21:00:00', 'Estados Unidos', 'Paraguay', 'US', 'PY', 'Estadio Los Ángeles', 'Los Ángeles'),
  ('Grupos', 'B', '2026-06-13 15:00:00', 'Catar', 'Suiza', 'QA', 'CH', 'Estadio Bahía de San Francisco', 'Área de la Bahía'),
  ('Grupos', 'C', '2026-06-13 18:00:00', 'Brasil', 'Marruecos', 'BR', 'MA', 'Estadio Nueva York Nueva Jersey', 'Nueva York / Nueva Jersey'),
  ('Grupos', 'C', '2026-06-13 21:00:00', 'Haití', 'Escocia', 'HT', 'GB-SCT', 'Estadio Boston', 'Boston'),
  ('Grupos', 'D', '2026-06-13 23:59:00', 'Australia', 'Turquía', 'AU', 'TR', 'Estadio BC Place Vancouver', 'Vancouver'),
  ('Grupos', 'E', '2026-06-14 13:00:00', 'Alemania', 'Curazao', 'DE', 'CW', 'Estadio Houston', 'Houston'),
  ('Grupos', 'F', '2026-06-14 16:00:00', 'Países Bajos', 'Japón', 'NL', 'JP', 'Estadio Dallas', 'Dallas'),
  ('Grupos', 'E', '2026-06-14 19:00:00', 'Costa de Marfil', 'Ecuador', 'CI', 'EC', 'Estadio Filadelfia', 'Filadelfia'),
  ('Grupos', 'F', '2026-06-14 22:00:00', 'Suecia', 'Túnez', 'SE', 'TN', 'Estadio Monterrey', 'Monterrey'),
  ('Grupos', 'H', '2026-06-15 12:00:00', 'España', 'Cabo Verde', 'ES', 'CV', 'Estadio Atlanta', 'Atlanta'),
  ('Grupos', 'G', '2026-06-15 15:00:00', 'Bélgica', 'Egipto', 'BE', 'EG', 'Estadio Seattle', 'Seattle'),
  ('Grupos', 'H', '2026-06-15 18:00:00', 'Arabia Saudí', 'Uruguay', 'SA', 'UY', 'Estadio Miami', 'Miami'),
  ('Grupos', 'G', '2026-06-15 21:00:00', 'RI de Irán', 'Nueva Zelanda', 'IR', 'NZ', 'Estadio Los Ángeles', 'Los Ángeles'),
  ('Grupos', 'I', '2026-06-16 15:00:00', 'Francia', 'Senegal', 'FR', 'SN', 'Estadio Nueva York Nueva Jersey', 'Nueva York / Nueva Jersey'),
  ('Grupos', 'I', '2026-06-16 18:00:00', 'Irak', 'Noruega', 'IQ', 'NO', 'Estadio Boston', 'Boston'),
  ('Grupos', 'J', '2026-06-16 21:00:00', 'Argentina', 'Argelia', 'AR', 'DZ', 'Estadio Kansas City', 'Kansas City'),
  ('Grupos', 'J', '2026-06-16 23:59:00', 'Austria', 'Jordania', 'AT', 'JO', 'Estadio Bahía de San Francisco', 'Área de la Bahía'),
  ('Grupos', 'K', '2026-06-17 13:00:00', 'Portugal', 'RD Congo', 'PT', 'CD', 'Estadio Houston', 'Houston'),
  ('Grupos', 'L', '2026-06-17 16:00:00', 'Inglaterra', 'Croacia', 'GB-ENG', 'HR', 'Estadio Dallas', 'Dallas'),
  ('Grupos', 'L', '2026-06-17 19:00:00', 'Ghana', 'Panamá', 'GH', 'PA', 'Estadio Toronto', 'Toronto'),
  ('Grupos', 'K', '2026-06-17 22:00:00', 'Uzbekistán', 'Colombia', 'UZ', 'CO', 'Estadio Ciudad de México', 'Ciudad de México'),
  ('Grupos', 'A', '2026-06-18 12:00:00', 'Chequia', 'Sudáfrica', 'CZ', 'ZA', 'Estadio Atlanta', 'Atlanta'),
  ('Grupos', 'B', '2026-06-18 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Kansas City', 'Kansas City'),
  ('Grupos', 'C', '2026-06-18 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Atlanta', 'Atlanta'),
  ('Grupos', 'A', '2026-06-18 21:00:00', 'México', 'República de Corea', 'MX', 'KR', 'Estadio Guadalajara', 'Guadalajara'),
  ('Grupos', 'C', '2026-06-19 21:00:00', 'Brasil', 'Haití', 'BR', 'HT', 'Estadio Filadelfia', 'Filadelfia'),
  ('Grupos', 'C', '2026-06-19 18:00:00', 'Escocia', 'Marruecos', 'GB-SCT', 'MA', 'Estadio Boston', 'Boston'),
  ('Grupos', 'D', '2026-06-19 23:59:00', 'Turquía', 'Paraguay', 'TR', 'PY', 'Estadio Bahía de San Francisco', 'Área de la Bahía'),
  ('Grupos', 'D', '2026-06-19 15:00:00', 'Estados Unidos', 'Australia', 'US', 'AU', 'Estadio Seattle', 'Seattle'),
  ('Grupos', 'I', '2026-06-18 19:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Guadalajara', 'Guadalajara'),
  ('Grupos', 'J', '2026-06-18 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Monterrey', 'Monterrey'),
  ('Grupos', 'K', '2026-06-18 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Toronto', 'Toronto'),
  ('Grupos', 'L', '2026-06-18 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Vancouver', 'Vancouver'),
  ('Grupos', 'A', '2026-06-19 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Los Ángeles', 'Los Ángeles'),
  ('Grupos', 'B', '2026-06-19 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Bahía de San Francisco', 'Área de la Bahía'),
  ('Grupos', 'C', '2026-06-19 22:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Seattle', 'Seattle'),
  ('Grupos', 'D', '2026-06-19 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Houston', 'Houston'),
  ('Grupos', 'E', '2026-06-20 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Dallas', 'Dallas'),
  ('Grupos', 'F', '2026-06-20 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Kansas City', 'Kansas City'),
  ('Grupos', 'G', '2026-06-20 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Atlanta', 'Atlanta'),
  ('Grupos', 'H', '2026-06-20 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Miami', 'Miami'),
  ('Grupos', 'I', '2026-06-21 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Boston', 'Boston'),
  ('Grupos', 'J', '2026-06-21 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Filadelfia', 'Filadelfia'),
  ('Grupos', 'K', '2026-06-21 22:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Nueva York Nueva Jersey', 'Nueva York / Nueva Jersey'),
  ('Grupos', 'L', '2026-06-21 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Ciudad de México', 'Ciudad de México'),
  ('Grupos', 'A', '2026-06-22 22:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Guadalajara', 'Guadalajara'),
  ('Grupos', 'B', '2026-06-22 19:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Monterrey', 'Monterrey'),
  ('Grupos', 'C', '2026-06-22 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Toronto', 'Toronto'),
  ('Grupos', 'D', '2026-06-22 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Vancouver', 'Vancouver'),
  ('Grupos', 'E', '2026-06-23 22:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Los Ángeles', 'Los Ángeles'),
  ('Grupos', 'F', '2026-06-23 19:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Bahía de San Francisco', 'Área de la Bahía'),
  ('Grupos', 'G', '2026-06-23 19:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Seattle', 'Seattle'),
  ('Grupos', 'H', '2026-06-23 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Houston', 'Houston'),
  ('Grupos', 'I', '2026-06-24 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Dallas', 'Dallas'),
  ('Grupos', 'J', '2026-06-24 19:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Kansas City', 'Kansas City'),
  ('Grupos', 'K', '2026-06-24 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Atlanta', 'Atlanta'),
  ('Grupos', 'L', '2026-06-24 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Miami', 'Miami'),
  ('Grupos', 'A', '2026-06-25 22:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Boston', 'Boston'),
  ('Grupos', 'B', '2026-06-25 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Filadelfia', 'Filadelfia'),
  ('Grupos', 'C', '2026-06-25 19:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Nueva York Nueva Jersey', 'Nueva York / Nueva Jersey'),
  ('Grupos', 'D', '2026-06-25 19:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Ciudad de México', 'Ciudad de México'),
  ('Grupos', 'E', '2026-06-26 19:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Guadalajara', 'Guadalajara'),
  ('Grupos', 'F', '2026-06-26 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Monterrey', 'Monterrey'),
  ('Grupos', 'G', '2026-06-26 22:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Toronto', 'Toronto'),
  ('Grupos', 'H', '2026-06-26 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Vancouver', 'Vancouver'),
  ('Grupos', 'I', '2026-06-27 22:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Los Ángeles', 'Los Ángeles'),
  ('Grupos', 'J', '2026-06-27 13:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Bahía de San Francisco', 'Área de la Bahía'),
  ('Grupos', 'K', '2026-06-27 19:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Seattle', 'Seattle'),
  ('Grupos', 'L', '2026-06-27 19:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Houston', 'Houston'),
  ('Dieciseisavos', NULL, '2026-06-28 21:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Dallas', 'Dallas'),
  ('Dieciseisavos', NULL, '2026-06-28 14:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Kansas City', 'Kansas City'),
  ('Dieciseisavos', NULL, '2026-06-28 21:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Atlanta', 'Atlanta'),
  ('Dieciseisavos', NULL, '2026-06-29 14:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Miami', 'Miami'),
  ('Dieciseisavos', NULL, '2026-06-29 14:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Boston', 'Boston'),
  ('Dieciseisavos', NULL, '2026-06-29 21:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Filadelfia', 'Filadelfia'),
  ('Dieciseisavos', NULL, '2026-06-30 14:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Nueva York Nueva Jersey', 'Nueva York / Nueva Jersey'),
  ('Dieciseisavos', NULL, '2026-06-30 17:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Ciudad de México', 'Ciudad de México'),
  ('Dieciseisavos', NULL, '2026-06-30 14:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Guadalajara', 'Guadalajara'),
  ('Dieciseisavos', NULL, '2026-07-01 14:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Monterrey', 'Monterrey'),
  ('Dieciseisavos', NULL, '2026-07-01 14:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Toronto', 'Toronto'),
  ('Dieciseisavos', NULL, '2026-07-01 17:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Vancouver', 'Vancouver'),
  ('Dieciseisavos', NULL, '2026-07-02 17:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Los Ángeles', 'Los Ángeles'),
  ('Dieciseisavos', NULL, '2026-07-02 17:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Bahía de San Francisco', 'Área de la Bahía'),
  ('Dieciseisavos', NULL, '2026-07-02 21:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Seattle', 'Seattle'),
  ('Dieciseisavos', NULL, '2026-07-03 17:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Houston', 'Houston'),
  ('Octavos', NULL, '2026-07-04 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Dallas', 'Dallas'),
  ('Octavos', NULL, '2026-07-04 20:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Kansas City', 'Kansas City'),
  ('Octavos', NULL, '2026-07-05 20:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Atlanta', 'Atlanta'),
  ('Octavos', NULL, '2026-07-05 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Miami', 'Miami'),
  ('Octavos', NULL, '2026-07-06 20:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Boston', 'Boston'),
  ('Octavos', NULL, '2026-07-06 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Filadelfia', 'Filadelfia'),
  ('Octavos', NULL, '2026-07-07 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Nueva York Nueva Jersey', 'Nueva York / Nueva Jersey'),
  ('Octavos', NULL, '2026-07-07 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Ciudad de México', 'Ciudad de México'),
  ('Cuartos', NULL, '2026-07-09 20:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Guadalajara', 'Guadalajara'),
  ('Cuartos', NULL, '2026-07-10 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Monterrey', 'Monterrey'),
  ('Cuartos', NULL, '2026-07-11 20:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Toronto', 'Toronto'),
  ('Cuartos', NULL, '2026-07-12 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Vancouver', 'Vancouver'),
  ('Semifinales', NULL, '2026-07-14 20:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Dallas', 'Dallas'),
  ('Semifinales', NULL, '2026-07-15 20:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Atlanta', 'Atlanta'),
  ('Tercer Puesto', NULL, '2026-07-18 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Miami', 'Miami'),
  ('Final', NULL, '2026-07-19 16:00:00', 'Por definir', 'Por definir', 'XX', 'XX', 'Estadio Nueva York Nueva Jersey', 'Nueva York / Nueva Jersey');
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
