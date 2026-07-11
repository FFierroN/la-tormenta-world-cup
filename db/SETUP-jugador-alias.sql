-- =====================================================================
-- SETUP-jugador-alias.sql
-- =====================================================================
-- Entity resolution para los picks de GOLEADOR / ASISTIDOR (texto libre).
-- Distintos participantes escriben el mismo futbolista distinto ("mbappe",
-- "Kylian Mbappe", "Mbappé"...). Aca centralizamos:
--
--   1) normaliza_jugador(txt): minusculas, sin acentos, sin espacios dobles.
--   2) jugador_alias(alias_norm -> canonico): mapa curado. El 'canonico' es el
--      nombre OFICIAL de la API Highlightly (el mismo que llega a
--      partido_eventos.jugador / .asistencia).
--   3) canonico_jugador(txt): devuelve el nombre canonico BONITO, o
--      'Desconocido' si el pick no esta en el mapa (no es jugador reconocido).
--
-- El SEED de alias (los INSERT con lo que escribio cada participante) va en
-- SEED-jugador-alias.sql, que se genera una vez que Felipe pase la lista.
-- Idempotente.
-- =====================================================================

-- unaccent vive en el schema extensions (igual que pgcrypto en este proyecto).
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------
-- 1) Normalizador. IMMUTABLE para poder indexar si hiciera falta.
--    "Kylian Mbappé " -> "kylian mbappe"
-- ---------------------------------------------------------------------
create or replace function normaliza_jugador(txt text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select nullif(
    regexp_replace(
      lower(trim(unaccent(coalesce(txt, '')))),
      '\s+', ' ', 'g'
    ),
    ''
  );
$$;

-- ---------------------------------------------------------------------
-- 2) Tabla de alias curada (pool chico: se llena a mano con SEED).
--    alias_norm = clave normalizada del texto que escribieron.
--    canonico   = nombre oficial HL bonito (para mostrar y comparar).
-- ---------------------------------------------------------------------
create table if not exists jugador_alias (
  alias_norm text primary key,
  canonico   text not null
);

alter table jugador_alias enable row level security;
do $$
begin
  drop policy if exists p_jugador_alias_read on jugador_alias;
  create policy p_jugador_alias_read on jugador_alias for select using (true);
end $$;
grant select on jugador_alias to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Resolucion: pick -> nombre canonico bonito, o 'Desconocido'.
-- ---------------------------------------------------------------------
create or replace function canonico_jugador(txt text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select coalesce(
    (select a.canonico from jugador_alias a
      where a.alias_norm = normaliza_jugador(txt)),
    'Desconocido'
  );
$$;

grant execute on function normaliza_jugador(text) to anon, authenticated;
grant execute on function canonico_jugador(text)  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3b) resuelve_jugador(txt): clave de MATCHING (no de display).
--     Devuelve la forma NORMALIZADA del canonico si el texto esta mapeado; si
--     no, la forma normalizada del propio texto. Sirve para 2 cosas:
--       * Unificar las variantes con que HL escribe al MISMO jugador en los
--         eventos (ej. "L. Messi" y "Lionel Messi" -> ambas a "lionel messi"),
--         asi sus goles NO se parten y el liderato se calcula bien.
--       * Cruzar el pick del participante contra esos eventos ya unificados.
--     A diferencia de canonico_jugador, los NO mapeados NO caen en 'Desconocido'
--     (se quedan con su nombre normalizado), para no mezclar a todos los
--     desconocidos en un mismo cubo y romper el conteo.
-- ---------------------------------------------------------------------
create or replace function resuelve_jugador(txt text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select normaliza_jugador(coalesce(
    (select a.canonico from jugador_alias a
      where a.alias_norm = normaliza_jugador(txt)),
    txt
  ));
$$;

grant execute on function resuelve_jugador(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Ayuda para armar el SEED: distintos textos que escribieron (con su forma
-- normalizada). Copia el resultado y lo convertimos en INSERTs.
--   select distinct campo, texto, normaliza_jugador(texto) as norma from (
--     select 'goleador'  as campo, goleador  as texto from predicciones_especiales
--     union all
--     select 'asistidor' as campo, asistidor as texto from predicciones_especiales
--   ) s where texto is not null and trim(texto) <> '' order by campo, norma;
-- ---------------------------------------------------------------------
