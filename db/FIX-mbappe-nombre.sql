-- =====================================================================
-- FIX: unificar las dos grafias de Mbappe en goleadores.
-- =====================================================================
-- Sus goles estaban repartidos entre 'Kylian Mbappe' (nombre completo, lo trae
-- Highlightly al enriquecer) y 'K. Mbappe' (abreviado, lo trae el feed gratis
-- en vivo) -> la tabla los cuenta como dos jugadores. Unificamos a la grafia
-- completa para que sume el total.
--
-- El replace+lower hace el WHERE tolerante a espacios ("K.Mbappe"/"K. Mbappe")
-- y la verificacion final usa ilike, asi que cubre con o sin tilde.
-- Idempotente: si ya quedo unificado, no cambia nada.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

-- Goleador
update partido_eventos
set jugador = 'Kylian Mbappé'
where lower(replace(jugador, ' ', '')) in ('k.mbappé', 'k.mbappe');

-- Por si tambien aparece como asistidor con la grafia corta
update partido_eventos
set asistencia = 'Kylian Mbappé'
where lower(replace(coalesce(asistencia, ''), ' ', '')) in ('k.mbappé', 'k.mbappe');

-- Verificacion 1: ahora deberia haber UNA sola fila de Mbappe con el total sumado.
select jugador, count(*) as goles
from partido_eventos
where tipo = 'gol' and jugador ilike '%mbapp%'
group by jugador;

-- Verificacion 2 (chequeo de duplicado real): si alguna fila comparte
-- partido + minuto + adicional, seria un gol duplicado (NO deberia pasar).
select partido_id, minuto, minuto_adicional, count(*) as filas
from partido_eventos
where tipo = 'gol' and jugador = 'Kylian Mbappé'
group by partido_id, minuto, minuto_adicional
having count(*) > 1;
