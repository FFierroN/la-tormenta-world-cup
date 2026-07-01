-- =====================================================================
-- DIAG-goleadores.sql  ·  Radiografia de la tabla de goleadores/asistidores
-- =====================================================================
-- POR QUE se desincroniza (causa raiz, confirmada en el codigo):
--   * En vivo (worker index.js) los goles entran con nombre ABREVIADO:
--     "K. Mbappé".
--   * Al terminar, enriquecer.js (Highlightly) borra+reinserta los eventos con
--     nombre COMPLETO ("Kylian Mbappé") -- PERO solo si Highlightly trae al
--     menos tantos goles como el marcador (guarda golesHl >= golesReales).
--   * Si HL nunca completa ese partido, sus goles quedan con el nombre corto,
--     mientras otros partidos del mismo jugador quedaron con el largo.
--   * obtenerGoleo() agrupa por el texto 'jugador' tal cual -> cuenta la misma
--     persona dos veces y los totales no cuadran con los oficiales.
--
-- Este script SOLO LEE. Corre cada bloque y pegame los resultados.
-- =====================================================================

-- Helper de normalizacion inline (sin depender de la extension unaccent):
-- minusculas + saca tildes comunes. Se usa para agrupar grafias.
--   translate(...) mapea vocales acentuadas -> sin acento.


-- QUERY 1) Ranking actual tal como lo ve la app (goles, sin autogoles) --------
select jugador, count(*) as goles
from partido_eventos
where tipo = 'gol' and coalesce(detalle,'') <> 'autogol' and jugador is not null
group by jugador
order by goles desc, jugador;


-- QUERY 2) *** DETECTOR DE FRAGMENTACION *** ---------------------------------
--   Agrupa por "apellido" = ultima palabra normalizada. Si un mismo apellido
--   aparece con 2+ grafias distintas, casi seguro es el MISMO jugador partido
--   en dos. Esas son las filas a unificar.
with base as (
  select
    jugador,
    lower(translate(
      split_part(trim(jugador), ' ', array_length(string_to_array(trim(jugador),' '),1)),
      'áàäâãéèëêíìïîóòöôõúùüûñÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑ',
      'aaaaaeeeeiiiiooooouuuunAAAAAEEEEIIIIOOOOOUUUUN'
    )) as apellido_norm,
    count(*) as goles
  from partido_eventos
  where tipo = 'gol' and coalesce(detalle,'') <> 'autogol' and jugador is not null
  group by jugador
)
select apellido_norm,
       count(*)                       as grafias_distintas,
       sum(goles)                     as goles_totales_reales,
       string_agg(jugador || ' (' || goles || ')', ' | ' order by goles desc) as variantes
from base
group by apellido_norm
having count(*) > 1                     -- solo apellidos con mas de una grafia
order by goles_totales_reales desc;


-- QUERY 3) *** PARTIDOS NO ENRIQUECIDOS (nombres abreviados) *** --------------
--   Detecta partidos cuyos goles siguen con formato "X. Apellido" (inicial +
--   punto) = quedaron con el feed en vivo porque Highlightly no los completo.
--   Son los candidatos a re-enriquecer o corregir a mano.
select p.id,
       p.equipo_local || ' vs ' || p.equipo_visita as partido,
       p.estado, p.enriquecido_at,
       count(*) filter (where e.jugador ~ '^[A-Za-zÀ-ÿ]\. ') as goles_nombre_corto,
       count(*)                                              as goles_totales,
       string_agg(e.jugador, ', ' order by e.minuto)          as goleadores
from partidos p
join partido_eventos e on e.partido_id = p.id
where e.tipo = 'gol' and coalesce(e.detalle,'') <> 'autogol'
group by p.id, p.equipo_local, p.equipo_visita, p.estado, p.enriquecido_at
having count(*) filter (where e.jugador ~ '^[A-Za-zÀ-ÿ]\. ') > 0
order by p.fecha;


-- QUERY 4) Lo mismo para asistidores (por si tambien estan fragmentados) ------
select asistencia as asistidor, count(*) as asistencias
from partido_eventos
where tipo = 'gol' and asistencia is not null
group by asistencia
order by asistencias desc, asistidor;


-- =====================================================================
-- QUERY 5) DIAGNOSTICO DEL PARTIDO Inglaterra vs RD Congo --------------
--   Ver como quedo cargado, si tiene api_fixture_id y sus eventos.
select id, fase, grupo, fecha, estado,
       equipo_local, equipo_visita, goles_local, goles_visita,
       api_fixture_id, puntaje_anulado, enriquecido_at
from partidos
where (equipo_local ilike '%congo%' or equipo_visita ilike '%congo%')
   or (equipo_local ilike '%inglaterra%' and equipo_visita ilike '%congo%')
order by fecha;

-- Eventos de ese partido (cambia el 999 por el id que devuelva la query de arriba):
-- select tipo, equipo, minuto, jugador, asistencia, detalle
-- from partido_eventos where partido_id = 999 order by minuto;
