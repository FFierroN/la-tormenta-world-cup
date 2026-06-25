-- =====================================================================
-- CARGA-TEMPLATE-LLAVES.sql  ·  Cuadro OFICIAL WC 2026 (Annex C FIFA)
-- =====================================================================
-- Rellena slot / origen_local / origen_visita en los 32 partidos de
-- eliminatoria que YA existen en 'partidos' (como 'Por definir').
--
-- Requisito: correr ANTES db/SETUP-LLAVES.sql (crea las columnas).
--
-- Como casa cada partido con su 'slot' oficial (P73..P104):
--   por ORDEN CRONOLOGICO dentro de cada fase (row_number por fecha).
--   Es a prueba de zona horaria: el orden de los instantes no cambia
--   aunque cambie el huso de visualizacion. Verificado contra el
--   fixture oficial (fecha+estadio unicos).
--
-- Lenguaje de origenes (ver SETUP-LLAVES.sql):
--   '1A'=ganador grupo A · '2B'=segundo B · '3ABCDF'=mejor tercero de
--   alguno de esos grupos (lo define la matriz) · 'GP73'=ganador del
--   partido P73 · 'PP101'=perdedor del P101 (para el 3er puesto).
--
-- Idempotente: se puede correr varias veces (sobrescribe el template).
-- NO toca equipos ya definidos por resultados (solo slot/origen).
-- Uso: Supabase -> SQL Editor -> pega TODO -> Run.
-- =====================================================================

with plantilla(fase, pos, slot, origen_local, origen_visita) as (
  values
  -- ---- Dieciseisavos (16), en orden cronologico ----
  ('Dieciseisavos', 1,  'P73', '2A',     '2B'),
  ('Dieciseisavos', 2,  'P76', '1C',     '2F'),
  ('Dieciseisavos', 3,  'P74', '1E',     '3ABCDF'),
  ('Dieciseisavos', 4,  'P75', '1F',     '2C'),
  ('Dieciseisavos', 5,  'P78', '2E',     '2I'),
  ('Dieciseisavos', 6,  'P77', '1I',     '3CDFGH'),
  ('Dieciseisavos', 7,  'P79', '1A',     '3CEFHI'),
  ('Dieciseisavos', 8,  'P80', '1L',     '3EHIJK'),
  ('Dieciseisavos', 9,  'P82', '1G',     '3AEHIJ'),
  ('Dieciseisavos', 10, 'P81', '1D',     '3BEFIJ'),
  ('Dieciseisavos', 11, 'P84', '1H',     '2J'),
  ('Dieciseisavos', 12, 'P83', '2K',     '2L'),
  ('Dieciseisavos', 13, 'P85', '1B',     '3EFGIJ'),
  ('Dieciseisavos', 14, 'P88', '2D',     '2G'),
  ('Dieciseisavos', 15, 'P86', '1J',     '2H'),
  ('Dieciseisavos', 16, 'P87', '1K',     '3DEIJL'),
  -- ---- Octavos (8) ----
  ('Octavos', 1, 'P90', 'GP73', 'GP75'),
  ('Octavos', 2, 'P89', 'GP74', 'GP77'),
  ('Octavos', 3, 'P91', 'GP76', 'GP78'),
  ('Octavos', 4, 'P92', 'GP79', 'GP80'),
  ('Octavos', 5, 'P93', 'GP83', 'GP84'),
  ('Octavos', 6, 'P94', 'GP81', 'GP82'),
  ('Octavos', 7, 'P95', 'GP86', 'GP88'),
  ('Octavos', 8, 'P96', 'GP85', 'GP87'),
  -- ---- Cuartos (4) ----
  ('Cuartos', 1, 'P97',  'GP89', 'GP90'),
  ('Cuartos', 2, 'P98',  'GP93', 'GP94'),
  ('Cuartos', 3, 'P99',  'GP91', 'GP92'),
  ('Cuartos', 4, 'P100', 'GP95', 'GP96'),
  -- ---- Semifinales (2) ----
  ('Semifinales', 1, 'P101', 'GP97', 'GP98'),
  ('Semifinales', 2, 'P102', 'GP99', 'GP100'),
  -- ---- Tercer Puesto (1) ----
  ('Tercer Puesto', 1, 'P103', 'PP101', 'PP102'),
  -- ---- Final (1) ----
  ('Final', 1, 'P104', 'GP101', 'GP102')
),
ordenados as (
  select id, fase,
         row_number() over (partition by fase order by fecha, id) as pos
  from partidos
  where grupo is null            -- solo eliminatoria
)
update partidos p
set slot          = pl.slot,
    origen_local  = pl.origen_local,
    origen_visita = pl.origen_visita
from ordenados o
join plantilla pl on pl.fase = o.fase and pl.pos = o.pos
where p.id = o.id;

-- ---------------------------------------------------------------------
-- VERIFICACION: deberia listar los 32 con su slot y origenes.
-- ---------------------------------------------------------------------
select slot, fase, to_char(fecha,'DD Mon HH24:MI') as cuando, estadio,
       origen_local, origen_visita, equipo_local, equipo_visita
from partidos
where grupo is null
order by slot;

-- Tras cargar el template, intenta rellenar lo que ya se pueda
-- (1o/2o de grupos cerrados, ganadores de llaves ya jugadas):
select propagar_llaves() as lados_rellenados;
