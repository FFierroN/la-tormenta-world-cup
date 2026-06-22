-- =====================================================================
-- FIX: gol faltante en Austria vs Jordania (penal 90+12 de Arnautovic).
-- =====================================================================
-- worldcup26 (feed gratis) solo trajo 3 de los 4 goles del 3-1: le falta el
-- penal de Marko Arnautovic en el 90+12. Como no esta en la fuente, lo
-- insertamos a mano. CERO Highlightly: es 100% SQL local en Supabase.
--
-- El marcador (3-1) YA esta correcto (viene de home_score/away_score); aca
-- solo completamos el TIMELINE de eventos (faltaba 1 fila en partido_eventos).
--
-- Idempotente: el "not exists" evita duplicar el gol si corres esto dos veces.
--
-- ANTES de correr, ejecuta db/DIAG-austria-jordania.sql para confirmar que hoy
-- hay 2 goles de Austria (local) + 1 de Jordania (visita) = 3, y que falta este.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

insert into partido_eventos
       (partido_id, tipo, equipo, minuto, minuto_adicional, jugador, asistencia, detalle)
select p.id, 'gol', 'local', 90, 12, 'Marko Arnautović', null, 'penal'
from partidos p
where p.equipo_local = 'Austria'
  and p.equipo_visita = 'Jordania'
  and not exists (
    select 1
    from partido_eventos e
    where e.partido_id = p.id
      and e.tipo = 'gol'
      and e.equipo = 'local'
      and e.minuto = 90
      and coalesce(e.minuto_adicional, -1) = 12
  );

-- Verificacion: deberian quedar 4 goles (3 Austria local + 1 Jordania visita).
select e.equipo, e.minuto, e.minuto_adicional, e.jugador, e.detalle
from partidos p
join partido_eventos e on e.partido_id = p.id and e.tipo = 'gol'
where p.equipo_local = 'Austria' and p.equipo_visita = 'Jordania'
order by e.minuto, e.minuto_adicional nulls first;
