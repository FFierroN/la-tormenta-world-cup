-- =====================================================================
-- FIX-unificar-goleo.sql  ·  unifica grafias dobles de HL en partido_eventos
-- =====================================================================
-- HL escribe al MISMO jugador de 2 formas (abreviada del feed en vivo + completa
-- de Highlightly), lo que parte sus goles/asistencias en dos filas en la tabla
-- de goleo del front (obtenerEstadisticas agrupa por nombre crudo). Aca los
-- unificamos a UNA grafia (la misma que usamos de 'canonico' en el alias), igual
-- que ya se hizo con Mbappe (ver FIX-mbappe-nombre.sql).
--
-- El puntaje de especiales NO depende de esto (resuelve_jugador ya fusiona al
-- calcular), pero SI la tabla de goleo visible. Idempotente.
--
-- Uso: Supabase -> SQL Editor -> pega TODO -> Run. Re-correr tras cada partido
-- si el feed vuelve a escribir la grafia corta.
-- =====================================================================

-- ----- MESSI: "L. Messi" -> "Lionel Messi" -----
update partido_eventos set jugador = 'Lionel Messi'
where lower(replace(jugador, ' ', '')) in ('l.messi', 'messi');
update partido_eventos set asistencia = 'Lionel Messi'
where lower(replace(coalesce(asistencia, ''), ' ', '')) in ('l.messi', 'messi');

-- ----- MBAPPE: "K. Mbappe" -> "Kylian Mbappé" (por si el feed lo reescribe) -----
update partido_eventos set jugador = 'Kylian Mbappé'
where lower(replace(jugador, ' ', '')) in ('k.mbappé', 'k.mbappe');
update partido_eventos set asistencia = 'Kylian Mbappé'
where lower(replace(coalesce(asistencia, ''), ' ', '')) in ('k.mbappé', 'k.mbappe');

-- Verificacion: una sola fila por jugador, con el total sumado.
select jugador, count(*) as goles
from partido_eventos
where tipo = 'gol' and (jugador ilike '%messi%' or jugador ilike '%mbapp%')
group by jugador order by jugador;
