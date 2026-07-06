-- =====================================================================
-- FORZAR-pronostico-benjamin-mex-eng.sql  ·  EXCEPCION MANUAL (admin)
-- =====================================================================
-- CONTEXTO: Benjamin Bustamante no pudo conectarse para cargar su
-- pronostico y el partido Mexico vs Inglaterra (ELIMINATORIA) se
-- SUSPENDIO antes de empezar. Se acordo, como EXCEPCION a la regla de
-- "no se cargan pronosticos tras la hora de inicio", ingresar su
-- prediccion a mano.
--
-- Prediccion de Benjamin:
--   90'      : 1 - 1
--   Clasifica: Mexico
--   Modo     : alargue
--   Alargue  : Mexico 1 - 0 Inglaterra
--
-- Se hace con INSERT DIRECTO (no via guardar_pronostico) a proposito:
-- el RPC devolveria 'cerrado' porque la hora original ya paso. Aqui
-- saltamos esa validacion de forma deliberada y controlada.
--
-- El script detecta SOLO de que lado esta Mexico (local/visita) y
-- asigna clasificado + marcador de alargue en consecuencia. Usa ILIKE
-- sin tildes ('xico' / 'nglaterra' / 'bustamante') para ser tolerante.
--
-- Idempotente: si Benjamin ya tuviera fila para ese partido, la ACTUALIZA
-- (on conflict). Uso: Supabase -> SQL Editor -> pega TODO -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PASO 1 (VERIFICACION): confirma que matchea EXACTAMENTE 1 jugador y
-- 1 partido, y muestra lo que se va a escribir. CORRE ESTO PRIMERO.
-- ---------------------------------------------------------------------
with j as (
  select id as jugador_id, nombre
  from jugadores
  where nombre ilike '%bustamante%' and activo
),
p as (
  select id as partido_id, fase, estado, fecha, equipo_local, equipo_visita
  from partidos
  where grupo is null                 -- eliminatoria
    and estado <> 'final'             -- no jugado / suspendido / programado
    and (
      (equipo_local ilike '%xico%'      and equipo_visita ilike '%nglaterra%')
      or (equipo_local ilike '%nglaterra%' and equipo_visita ilike '%xico%')
    )
)
select
  j.jugador_id, j.nombre,
  p.partido_id, p.fase, p.estado, p.fecha,
  p.equipo_local, p.equipo_visita,
  1 as pred_local, 1 as pred_visita,
  'alargue' as pred_definicion,
  case when p.equipo_local ilike '%xico%' then 'local' else 'visita' end as pred_clasificado,
  case when p.equipo_local ilike '%xico%' then 1 else 0 end as pred_def_local,
  case when p.equipo_local ilike '%xico%' then 0 else 1 end as pred_def_visita
from j cross join p;

-- ---------------------------------------------------------------------
-- PASO 2 (INSERT/UPDATE): SOLO si el PASO 1 devolvio 1 sola fila con
-- los datos correctos, corre este bloque.
-- ---------------------------------------------------------------------
with j as (
  select id as jugador_id
  from jugadores
  where nombre ilike '%bustamante%' and activo
),
p as (
  select id as partido_id, equipo_local
  from partidos
  where grupo is null
    and estado <> 'final'
    and (
      (equipo_local ilike '%xico%'      and equipo_visita ilike '%nglaterra%')
      or (equipo_local ilike '%nglaterra%' and equipo_visita ilike '%xico%')
    )
),
datos as (
  select
    j.jugador_id,
    p.partido_id,
    1 as pred_local,
    1 as pred_visita,
    'alargue'::text as pred_definicion,
    case when p.equipo_local ilike '%xico%' then 'local' else 'visita' end as pred_clasificado,
    case when p.equipo_local ilike '%xico%' then 1 else 0 end as pred_def_local,
    case when p.equipo_local ilike '%xico%' then 0 else 1 end as pred_def_visita
  from j cross join p
)
insert into pronosticos (
  jugador_id, partido_id, pred_local, pred_visita,
  pred_definicion, pred_def_local, pred_def_visita, pred_clasificado
)
select
  jugador_id, partido_id, pred_local, pred_visita,
  pred_definicion, pred_def_local, pred_def_visita, pred_clasificado
from datos
on conflict (jugador_id, partido_id) do update
  set pred_local       = excluded.pred_local,
      pred_visita      = excluded.pred_visita,
      pred_definicion  = excluded.pred_definicion,
      pred_def_local   = excluded.pred_def_local,
      pred_def_visita  = excluded.pred_def_visita,
      pred_clasificado = excluded.pred_clasificado,
      updated_at       = now()
returning jugador_id, partido_id, pred_local, pred_visita,
          pred_definicion, pred_clasificado, pred_def_local, pred_def_visita;
