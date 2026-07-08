-- =====================================================================
-- FIX-argentina-egipto-pronosticos-invertidos.sql
--   Contexto (partido 95, octavo ARG vs EGI, 2026-07-07):
--   El partido se cargo manualmente con un orden de equipos, y TODOS los
--   jugadores pronosticaron viendo ESE orden (pred_local/pred_visita y
--   pred_clasificado quedaron atados a las posiciones de entonces).
--   Despues se dieron vuelta los equipos (swap equipo_local <-> equipo_visita)
--   para corregir quien clasificaba. Ese swap dejo los equipos y goles
--   correctos, PERO los pronosticos siguieron apuntando al orden VIEJO:
--   quedaron invertidos y a quien habia sumado puntos se le restaron.
--
--   SOLUCION: dar vuelta en la tabla pronosticos, SOLO para este partido,
--   los campos que dependen del orden local/visita:
--     * pred_local          <-> pred_visita
--     * pred_def_local      <-> pred_def_visita
--     * pred_clasificado    'local' <-> 'visita'
--     (pred_definicion NO se toca: 'penales'/'alargue' es independiente
--      del orden local/visita.)
--   Luego recalcular pronosticos.puntos y pronosticos.puntos_definicion
--   usando las funciones oficiales (calcular_puntos_pronostico y
--   calcular_puntos_definicion) contra el marcador ACTUAL del partido.
--   Esto vuelve a sumar/restar los puntos correctos automaticamente.
--
--   NOTA: el fix es simetrico -> funciona sea cual sea la orientacion
--   final de los equipos, siempre que los equipos y goles del partido 95
--   YA esten correctos (Argentina gana y clasifica). Verificalo en 0.a.
--
--   Idempotencia: se apoya en un flag textual persistente
--     (configuracion.clave = 'fix_arg_egi_octavo_pronosticos_swapeado')
--   para NO invertir dos veces. Si ya se aplico antes, el bloque de swap
--   se salta y solo re-refresca los puntos (seguro correrlo N veces).
--
--   ANTES DE CORRER:
--     1) Query 0.a: confirma que en el partido 95 los equipos y goles YA
--        reflejan el resultado real (Argentina gana, clasifica Argentina).
--     2) El partido_id esta fijado en 95 (bloque DO). Si en tu base es
--        otro, cambia la constante v_partido_id.
--
--   Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0) DIAGNOSTICO: ubica el partido y muestra su estado actual.
--    Si no sabes el id, corre PRIMERO solo estas dos queries.
-- ---------------------------------------------------------------------
-- 0.a) Ver el partido y sus goles (chequeo visual del marcador real):
select id, fase, fecha, equipo_local, equipo_visita,
       goles_local, goles_visita, estado
from partidos where id = 95;
-- >>> Confirma: los equipos y goles YA deben reflejar el resultado real
--     (Argentina gana y clasifica). Los pronosticos son los que estan
--     desalineados, NO el partido.

-- 0.b) Estado actual de los pronosticos de ese partido (ANTES).
--     Descomenta para inspeccionar antes de tocar nada:
-- select jugador_id, pred_local, pred_visita, pred_clasificado,
--        pred_definicion, pred_def_local, pred_def_visita, puntos, puntos_definicion
-- from pronosticos where partido_id = 95 order by jugador_id;

-- ---------------------------------------------------------------------
-- 1) Bloque principal. El id del partido esta fijado en 95 (octavo
--    Argentina-Egipto del 2026-07-07). Doble check de sanidad: aborta
--    si el partido 95 NO tiene a Argentina y Egipto como rivales.
-- ---------------------------------------------------------------------
do $$
declare
  v_partido_id  constant int := 95;
  v_local       text;
  v_visita      text;
  v_ya_hecho    boolean;
  v_afectados   int;
begin
  -- Sanity check: el partido 95 debe ser ARG-EGI (en cualquier orden).
  select equipo_local, equipo_visita
    into v_local, v_visita
  from partidos where id = v_partido_id;

  if v_local is null then
    raise exception 'Partido % no existe.', v_partido_id;
  end if;

  if not ( (v_local = 'Argentina' and v_visita = 'Egipto')
        or (v_local = 'Egipto'    and v_visita = 'Argentina') ) then
    raise exception 'Partido % NO es ARG-EGI (es % vs %). Aborto.',
                    v_partido_id, v_local, v_visita;
  end if;

  raise notice 'Partido % confirmado: % (local) vs % (visita).',
               v_partido_id, v_local, v_visita;

  -- Idempotencia: comprobamos flag.
  select coalesce((select valor::boolean from configuracion
                   where clave = 'fix_arg_egi_octavo_pronosticos_swapeado'), false)
    into v_ya_hecho;

  if v_ya_hecho then
    raise notice 'Swap ya aplicado antes -> solo refresco de puntos (seguro).';
  else
    -- -----------------------------------------------------------------
    -- 2) BACKUP (dentro de la misma transaccion). Si algo sale mal y
    --    haces ROLLBACK, esto tambien se revierte. Si haces COMMIT y
    --    luego te arrepientes, puedes restaurar desde esta tabla.
    -- -----------------------------------------------------------------
    execute format($f$
      create table if not exists pronosticos_backup_arg_egi_20260707 as
      select *, now() as backup_at from pronosticos where partido_id = %L
    $f$, v_partido_id);

    -- -----------------------------------------------------------------
    -- 3) SWAP de los 3 campos direccionales en pronosticos.
    --    Postgres evalua el RHS con el snapshot pre-update -> el swap
    --    directo pred_local=pred_visita, pred_visita=pred_local funciona
    --    en una sola sentencia. Idem pred_def_local/pred_def_visita.
    -- -----------------------------------------------------------------
    update pronosticos
       set pred_local        = pred_visita,
           pred_visita       = pred_local,
           pred_def_local    = pred_def_visita,
           pred_def_visita   = pred_def_local,
           pred_clasificado  = case pred_clasificado
                                 when 'local'  then 'visita'
                                 when 'visita' then 'local'
                                 else pred_clasificado
                               end,
           updated_at        = now()
     where partido_id = v_partido_id;

    get diagnostics v_afectados = row_count;
    raise notice 'Pronosticos swapeados: %', v_afectados;

    -- -----------------------------------------------------------------
    -- 4) Marca el flag para que no se vuelva a invertir jamas.
    -- -----------------------------------------------------------------
    insert into configuracion (clave, valor, updated_at)
    values ('fix_arg_egi_octavo_pronosticos_swapeado', 'true', now())
    on conflict (clave) do update
       set valor = 'true', updated_at = now();
  end if;

  -- -------------------------------------------------------------------
  -- 5) RECALCULO de puntos y puntos_definicion (siempre, sea o no la
  --    primera corrida). Usa exactamente las mismas funciones que la
  --    vista tabla_posiciones y el trigger tg_actualizar_puntos.
  -- -------------------------------------------------------------------
  update pronosticos pr
     set puntos = calcular_puntos_pronostico(
           pr.pred_local, pr.pred_visita,
           p.goles_local, p.goles_visita, p.fase,
           contar_exactos(p.id)),
         puntos_definicion = calcular_puntos_definicion(
           pr.pred_definicion, pr.pred_clasificado,
           pr.pred_def_local, pr.pred_def_visita,
           p.penales_local, p.penales_visita,
           p.alargue_local, p.alargue_visita,
           contar_exactos_definicion(p.id)),
         updated_at = now()
    from partidos p
   where p.id = pr.partido_id
     and p.id = v_partido_id;

  get diagnostics v_afectados = row_count;
  raise notice 'Puntos recalculados en % pronosticos', v_afectados;
end $$;

-- ---------------------------------------------------------------------
-- 6) VERIFICACION (DESPUES): mira los pronosticos ya corregidos.
-- ---------------------------------------------------------------------
-- select jugador_id, pred_local, pred_visita, pred_clasificado,
--        pred_definicion, pred_def_local, pred_def_visita,
--        puntos, puntos_definicion
-- from pronosticos where partido_id = 95 order by puntos desc, jugador_id;

-- 6.b) Delta por jugador (backup vs actual): quien recupero cuantos puntos.
-- select b.jugador_id,
--        j.nombre,
--        b.puntos            as puntos_antes,
--        pr.puntos           as puntos_despues,
--        (pr.puntos - b.puntos) as delta_puntos,
--        b.puntos_definicion as pdef_antes,
--        pr.puntos_definicion as pdef_despues,
--        (pr.puntos_definicion - b.puntos_definicion) as delta_pdef
-- from pronosticos_backup_arg_egi_20260707 b
-- join pronosticos pr on pr.jugador_id = b.jugador_id
--                    and pr.partido_id = b.partido_id
-- join jugadores  j  on j.id = b.jugador_id
-- order by (pr.puntos + pr.puntos_definicion)
--        - (b.puntos + b.puntos_definicion) desc;

-- 6.c) Refresca tabla de posiciones (materializada? es vista comun, se
--     recalcula al leer; nada que refrescar). El front la levanta al
--     entrar. Si tienes cache en el edge, invalidalo.
-- select * from tabla_posiciones order by posicion limit 10;

-- Si todo se ve bien -> mantener el commit. Si algo raro -> cambiar a
-- rollback; (borra tambien el backup, ojo).
commit;
-- rollback;

-- ---------------------------------------------------------------------
-- ROLLBACK MANUAL (si ya hiciste commit y quieres deshacer):
--   begin;
--   -- restaurar los pronosticos afectados desde el backup:
--   update pronosticos pr
--      set pred_local        = b.pred_local,
--          pred_visita       = b.pred_visita,
--          pred_def_local    = b.pred_def_local,
--          pred_def_visita   = b.pred_def_visita,
--          pred_clasificado  = b.pred_clasificado,
--          pred_definicion   = b.pred_definicion,
--          puntos            = b.puntos,
--          puntos_definicion = b.puntos_definicion,
--          updated_at        = now()
--     from pronosticos_backup_arg_egi_20260707 b
--    where b.jugador_id = pr.jugador_id
--      and b.partido_id = pr.partido_id;
--   -- limpiar flag para permitir re-aplicar:
--   delete from configuracion where clave = 'fix_arg_egi_octavo_pronosticos_swapeado';
--   -- (opcional) borrar backup:
--   -- drop table pronosticos_backup_arg_egi_20260707;
--   commit;
-- ---------------------------------------------------------------------
