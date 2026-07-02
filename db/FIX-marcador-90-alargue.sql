-- FIX-marcador-90-alargue.sql
-- Corrige el marcador REGLAMENTARIO (90') de partidos de eliminatoria donde el
-- bot HL escribio el marcador TOTAL (120', con alargue) en goles_local/visita.
--
-- CAUSA: marcadorDesdeHl lee state.score.current de HL = marcador con alargue.
-- Para Belgica-Senegal (81): HL current 3-2 (120'), alargue real 1-0 => 90' = 2-2.
-- El alargue YA estaba bien cargado (alargue_local=1, alargue_visita=0), solo
-- hay que devolver el 90' a 2-2. El UPDATE dispara el trigger de recalculo de
-- puntos, asi que los puntajes se corrigen solos (vuelven tus 2 puntos).
--
-- Confirmado por DIAG-puntajes-movidos.sql QUERY 1:
--   id 81 | Belgica vs Senegal | guardado 3-2 | 90' reconstruido 2-2 | alargue 1-0

begin;

-- 1) Foto ANTES (para tu registro).
select id, equipo_local, equipo_visita,
       goles_local, goles_visita, alargue_local, alargue_visita, penales_local, penales_visita
from partidos
where id = 81;

-- 2) Correccion: 90' real = 2-2. Guarda: solo si sigue corrupto (3-2).
update partidos
set goles_local = 2, goles_visita = 2
where id = 81
  and goles_local = 3 and goles_visita = 2;

-- 3) Foto DESPUES: debe decir 2-2 en goles y 1-0 en alargue.
select id, equipo_local, equipo_visita,
       goles_local, goles_visita, alargue_local, alargue_visita, penales_local, penales_visita
from partidos
where id = 81;

-- 4) Puntos del partido 81 por jugador, tras el recalculo (verificacion).
select j.nombre,
       pr.pred_local || '-' || pr.pred_visita as pronostico,
       calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
         p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos_90
from partidos p
join pronosticos pr on pr.partido_id = p.id
join jugadores j    on j.id = pr.jugador_id
where p.id = 81 and j.activo
order by puntos_90 desc, j.nombre;

-- Revisa las 3 salidas. Si el DESPUES muestra 2-2 / 1-0 y los puntos cuadran,
-- confirma el COMMIT. Si algo se ve raro, ROLLBACK y me avisas.
commit;
-- rollback;  -- <- descomenta esta y comenta 'commit;' si preferis abortar.
