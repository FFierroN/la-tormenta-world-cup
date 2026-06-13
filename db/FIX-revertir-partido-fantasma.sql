-- ============================================================================
-- FIX URGENTE: revertir partido dado por FINAL antes de empezar
-- ----------------------------------------------------------------------------
-- Contexto (2026-06-12): worldcup26.ir mando finished=true para Paraguay vs USA
-- ANTES del pitazo inicial. El Worker lo marco 'final' 0-0 y la vista
-- tabla_posiciones (que cuenta partidos con estado='final' y goles no nulos)
-- sumo puntos falsos a todos.
--
-- La tabla_posiciones es una VISTA: al revertir el partido a 'programado' con
-- goles en NULL, los puntos se RECALCULAN solos y los falsos DESAPARECEN.
-- No hay que deshacer puntos a mano.
--
-- IMPORTANTE: antes de correr esto, REDESPLEGAR el Worker con la Salvaguarda 0
-- (commit 5b40e9d). Si no, el Worker volveria a marcarlo 'final' en 1 minuto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- NOTA: el partido real resulto ser id=4 'Estados Unidos' (local) vs
-- 'Paraguay' (visita) -- USA es local, al reves de lo asumido. Por eso los
-- pasos de abajo filtran por id=4 (lo mas seguro). Ajusta el id si reusas
-- este script para otro partido fantasma.
-- ----------------------------------------------------------------------------

-- PASO 1 (verificar): mira el partido antes de tocarlo.
select id, equipo_local, equipo_visita, fecha, estado,
       goles_local, goles_visita, finalizado_at, enriquecido_at
from partidos
where id = 4;

-- PASO 2 (limpiar eventos por si se insertaron). Inofensivo si no hay.
delete from partido_eventos where partido_id = 4;

-- PASO 3 (revertir a programado, goles en NULL). Esto recalcula la tabla.
update partidos
set estado        = 'programado',
    goles_local   = null,
    goles_visita  = null,
    finalizado_at = null,
    enriquecido_at = null,
    minuto        = null,
    minuto_at     = null
where id = 4 and estado = 'final';   -- solo si quedo mal marcado

-- PASO 4 (confirmar): debe verse 'programado' con goles NULL.
select id, equipo_local, equipo_visita, fecha, estado,
       goles_local, goles_visita, finalizado_at
from partidos
where id = 4;

-- PASO 5 (opcional): revisa que la tabla ya no tenga los puntos falsos.
-- select nombre, puntos, exactos, aciertos, fallas, posicion
-- from tabla_posiciones order by posicion;
