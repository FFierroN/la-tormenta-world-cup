-- FIX-penales-invertidos-75.sql
-- El partido 75 (Alemania-Paraguay) tiene la tanda de penales CARGADA AL REVES:
--   guardado: penales_local=4, penales_visita=3 (implicaria gano Alemania)
--   real (HL score.penalties "3 - 4"): Alemania 3, Paraguay 4 -> gano PARAGUAY
-- Corrige el marcador de la tanda y el ganador. El UPDATE dispara el trigger de
-- puntos de DEFINICION (recalcula quien acerto el clasificado/penales).
--
-- NOTA: los eventos individuales de la tanda (penal_tanda, para la UI del
-- timeline) los va a traer HL cuando corras ?recuperar= tras el deploy. Este
-- SQL solo corrige el MARCADOR (y por ende los puntos) de inmediato.
--
-- Idempotente: solo actua si sigue invertido (4-3). Correr en Supabase.

begin;

-- ANTES
select id, equipo_local, equipo_visita, goles_local, goles_visita,
       penales_local, penales_visita, ganador_penales
from partidos where id = 75;

update partidos
set penales_local = 3, penales_visita = 4, ganador_penales = 'visita'
where id = 75
  and penales_local = 4 and penales_visita = 3;

-- DESPUES: debe decir penales 3-4 y ganador 'visita' (Paraguay).
select id, equipo_local, equipo_visita, goles_local, goles_visita,
       penales_local, penales_visita, ganador_penales
from partidos where id = 75;

-- Si todo bien, deja el commit. Si algo raro, cambia por 'rollback;'.
commit;
-- rollback;
