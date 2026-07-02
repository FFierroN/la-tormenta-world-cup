-- DIAG-goleo-actual.sql
-- Muestra goleadores y asistidores TAL COMO estan en partido_eventos, para
-- comparar con la tabla objetivo y detectar nombres fragmentados/mal escritos.
-- Correr en el SQL Editor de Supabase y pegar el resultado.

-- ========================= 1) GOLEADORES (como esta) =========================
-- Excluye autogoles (no cuentan para el goleador). Agrupa por nombre EXACTO en
-- la DB: si un jugador aparece con 2 grafias, saldra en 2 filas (esa es la pista).
select
  e.jugador                                                        as jugador_en_db,
  case when e.equipo = 'local' then p.equipo_local else p.equipo_visita end as seleccion,
  count(*)                                                         as goles
from partido_eventos e
join partidos p on p.id = e.partido_id
where e.tipo = 'gol'
  and coalesce(e.detalle, '') <> 'autogol'
group by e.jugador, seleccion
order by goles desc, jugador_en_db;

-- ======================== 2) ASISTIDORES (como esta) =========================
select
  e.asistencia                                                     as asistidor_en_db,
  case when e.equipo = 'local' then p.equipo_local else p.equipo_visita end as seleccion,
  count(*)                                                         as asistencias
from partido_eventos e
join partidos p on p.id = e.partido_id
where e.tipo = 'gol'
  and e.asistencia is not null
  and btrim(e.asistencia) <> ''
group by e.asistencia, seleccion
order by asistencias desc, asistidor_en_db;
