-- =====================================================================
-- FIX: deteccion de tramo ROBUSTA (evita quedarse pegado en Entretiempo)
-- =====================================================================
-- Bug: la ventana de deteccion del 2do tiempo se anclaba a la hora PROGRAMADA
-- del kickoff. Si el partido arrancaba tarde o el 1er tiempo tenia descuento
-- largo, el 2do tiempo empezaba fuera de la ventana y el partido se quedaba
-- pegado en 'entretiempo' hasta el pitazo final.
--
-- Solucion: 'tramo_at' marca CUANDO el worker fijo el tramo actual. Las
-- ventanas se anclan a ese momento real (no a la hora programada) y ademas hay
-- un fallback por tiempo: si lleva >=18 min en entretiempo, se fuerza el 2do
-- tiempo aunque Highlightly no confirme.
--
-- Idempotente. Uso: Supabase -> SQL Editor -> pega TODO -> Run.
-- =====================================================================

alter table partidos add column if not exists tramo_at timestamptz;

-- Flag: ya enriquecimos (HL) al arrancar el 2do tiempo. Permite traer
-- asistencias/tarjetas/cambios del 1er tiempo a la pestana Detalles sin esperar
-- al final (HL suele tener events[] vacio durante el entretiempo).
alter table partidos add column if not exists enriquecido_2t_at timestamptz;

-- Sembrar tramo_at en los que esten en vivo ahora (para que el fallback
-- tenga referencia). Si no hay, no hace nada.
update partidos set tramo_at = coalesce(tramo_at, now())
 where estado in ('en_vivo','entretiempo') and tramo is not null;

select id, equipo_local, equipo_visita, estado, tramo, tramo_at
from partidos where estado in ('en_vivo','entretiempo');
