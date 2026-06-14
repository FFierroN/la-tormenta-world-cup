-- =====================================================================
-- FIX URGENTE: anular Australia vs Turquia (14/06) y corregir su hora.
-- =====================================================================
-- Que paso: el partido se cargo con hora 2026-06-14 12:00 (mediodia) cuando
-- en realidad era 00:00 (medianoche) Chile. Error de AM/PM en el fixture.
-- Consecuencia: la app creyo que aun no empezaba -> nunca se puso en vivo,
-- siguio pronosticable y el marcador editable. Como ya se jugo y se conoce el
-- resultado, la decision es ANULARLO: nadie suma puntos por este partido.
--
-- Como se garantiza que "nadie sume":
--   tabla_posiciones SOLO cuenta partidos con estado='final' AND goles no nulos.
--   Al dejarlo en estado='anulado' con goles NULL, queda fuera del puntaje.
-- Como se garantiza que el robot NO lo reviva:
--   'anulado' tiene PRIORIDAD_ESTADO=99 en el Worker -> la API nunca lo pisa.
--
-- Idempotente. Uso: Supabase -> SQL Editor -> pega TODO -> Run.
-- =====================================================================

-- 1) Anular: estado terminal + limpiar marcador y rastros de vivo.
update partidos
   set estado          = 'anulado',
       goles_local     = null,
       goles_visita    = null,
       minuto          = null,
       minuto_at       = null,
       finalizado_at   = null
 where equipo_local  = 'Australia'
   and equipo_visita = 'Turquía'
   and fecha::date    = date '2026-06-14';

-- 2) Corregir la hora real (00:00 Chile = UTC-4), por prolijidad del dato.
--    (No afecta el puntaje porque ya quedo 'anulado', pero deja la fecha bien.)
update partidos
   set fecha = timestamptz '2026-06-14 00:00:00-04'
 where equipo_local  = 'Australia'
   and equipo_visita = 'Turquía'
   and fecha::date    = date '2026-06-14';

-- 3) Borrar eventos (goles/tarjetas) que el robot o el admin hayan cargado.
delete from partido_eventos
 where partido_id in (
   select id from partidos
    where equipo_local='Australia' and equipo_visita='Turquía'
      and fecha::date = date '2026-06-14'
 );

-- Verificacion:
select id, estado, fecha, goles_local, goles_visita
from partidos
where equipo_local='Australia' and equipo_visita='Turquía';
