-- =====================================================================
-- FIX: partidos FINAL con marcador en NULL -> deben ser 0 (ej. 0:0).
-- =====================================================================
-- Sintoma: en el panel de Admin un partido terminado se ve "-:-" en vez de
-- "0:0". El front pinta `goles_local ?? "-"`, asi que "-:-" = ambos en NULL.
--
-- Causa raiz: cuando un 0:0 termina, worldcup26 a veces manda score=null y la
-- salvaguarda "no pisar valor real con null" dejaba el campo en NULL para
-- siempre. Un partido FINAL siempre tiene marcador: si no hay numero, es 0.
-- (Bug detectado en RD Congo, 2026-06-21. Los robots ya quedaron parchados
--  para no repetirlo; este script repara los datos viejos.)
--
-- Sin Highlightly, sin tocar la cuota: es 100% SQL local en Supabase.
-- Idempotente: solo toca finales con NULL; no pisa ningun marcador real.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

-- 1) ANTES: mira que partidos finales tienen el marcador incompleto.
select id, equipo_local, equipo_visita, estado, goles_local, goles_visita
from partidos
where estado = 'final'
  and (goles_local is null or goles_visita is null)
order by fecha;

-- 2) FIX: rellena con 0 lo que falte SOLO en partidos finales.
update partidos
set goles_local  = coalesce(goles_local, 0),
    goles_visita = coalesce(goles_visita, 0)
where estado = 'final'
  and (goles_local is null or goles_visita is null);

-- 3) DESPUES: deberia devolver 0 filas (ya no queda ningun final en NULL).
select id, equipo_local, equipo_visita, estado, goles_local, goles_visita
from partidos
where estado = 'final'
  and (goles_local is null or goles_visita is null)
order by fecha;
