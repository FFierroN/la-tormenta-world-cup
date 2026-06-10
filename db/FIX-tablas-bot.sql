-- =====================================================================
-- FIX: crear las tablas que usa el robot (si faltan).
-- =====================================================================
-- Sintoma: el bot falla con "404 Not Found ... /rest/v1/api_cuota".
-- Causa: la base se creo con una version vieja del SETUP, sin estas tablas.
-- Este script las crea (idempotente, no borra nada) y refresca el cache
-- del API para que aparezcan al toque.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

-- Traduccion de nombres API-Football (ingles) -> nuestra base (espanol).
create table if not exists equipos_api_map (
  api_nombre text primary key,
  nombre     text not null,
  codigo     text
);

-- Guardia de cuota: cuenta requests por dia para no pasar de 100.
create table if not exists api_cuota (
  fecha  date primary key default current_date,
  usados int not null default 0
);

-- El robot entra con la service_role key (salta RLS), pero por prolijidad
-- dejamos RLS activado sin policies: nadie del frontend las toca.
alter table equipos_api_map enable row level security;
alter table api_cuota       enable row level security;

-- Refresca el cache de PostgREST para que las tablas nuevas se vean YA
-- (sin esto a veces el API sigue dando 404 por unos minutos).
notify pgrst, 'reload schema';

-- Verificacion: deberia devolver las dos tablas.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('api_cuota', 'equipos_api_map')
order by table_name;
