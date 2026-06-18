-- FIX-alineaciones.sql
-- Agrega la columna JSONB para guardar las alineaciones (formacion + 11 inicial
-- + banca) que trae Highlightly en GET /lineups/{matchId}.
-- Idempotente: se puede correr varias veces sin romper nada.
--
-- Como correrlo: pegar en el SQL Editor de Supabase y ejecutar.
--
-- Forma del JSON (lo llena el robot robot/alineaciones.py):
-- {
--   "local":  { "formacion": "4-4-2",
--               "titulares": [[{nombre,numero,posicion,id}], [..def..], [..mid..], [..fwd..]],
--               "suplentes": [{nombre,numero,posicion,id}, ...] },
--   "visita": { ... igual ... }
-- }

alter table partidos add column if not exists alineaciones jsonb;

comment on column partidos.alineaciones is
  'Alineaciones de Highlightly (/lineups): {local,visita} con formacion, titulares por lineas y suplentes. La API no trae foto -> el front usa avatar de iniciales.';
