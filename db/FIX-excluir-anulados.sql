-- =====================================================================
-- FIX-excluir-anulados.sql  ·  Dejar los partidos anulados fuera, OFICIAL
-- =====================================================================
-- CAUSA RAIZ (confirmada leyendo el historial de fixes):
--   FIX-anular-australia-turquia.sql habia agregado el filtro
--   'and not p.puntaje_anulado' a la vista tabla_posiciones. Pero un fix
--   POSTERIOR (FIX-bandera-clasificado.sql) recreo la vista para sumar la
--   definicion del empate y, sin querer, OMITIO ese filtro. Resultado: la
--   tabla oficial volvio a contar Australia vs Turquia. Por eso reaparecieron
--   los "+4" y se compensaron a mano con ajuste_puntos = -4.
--
-- QUE HACE ESTE SCRIPT (idempotente, corre entero en el SQL Editor):
--   PASO 1  Recrea tabla_posiciones con el filtro de anulados de vuelta
--           (manteniendo la definicion del empate ya vigente).
--   PASO 2  Arregla las RPC mis_predicciones_detalle y predicciones_jugadas_todas
--           para que las METRICAS de la app tampoco cuenten los anulados.
--   PASO 3  (opcional) Resetea a 0 SOLO los ajustes manuales que compensaban
--           exactamente el partido anulado. No toca ajustes de otro motivo.
--
-- Efecto neto en el puntaje visible: CERO. Hoy la tabla ya mostraba el valor
-- correcto (por la compensacion +4/-4). Esto solo lo vuelve estructural.
--
-- Uso: Supabase -> SQL Editor -> pega TODO -> Run.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- PASO 1: tabla_posiciones OFICIAL, con el filtro de anulados recuperado.
-- ---------------------------------------------------------------------
create or replace view tabla_posiciones as
with base as (
  select
    j.id   as jugador_id,
    j.nombre, j.alias,
    j.avatar_pos1, j.avatar_medio, j.avatar_pos8,
    coalesce(sum(calcular_puntos_pronostico(
        pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
        contar_exactos(p.id))),0)
      + coalesce(sum(calcular_puntos_definicion(
          pr.pred_definicion, pr.pred_clasificado, pr.pred_def_local, pr.pred_def_visita,
          p.penales_local, p.penales_visita, p.alargue_local, p.alargue_visita)),0)
      + coalesce(j.ajuste_puntos, 0)
      + coalesce((
          select pe.puntos_pais + pe.puntos_goleador + pe.puntos_asistidor
               + pe.puntos_mejor_jugador + pe.puntos_mejor_arquero + pe.puntos_mejor_joven
          from predicciones_especiales pe where pe.jugador_id = j.id), 0) as puntos,
    count(*) filter (where p.estado='final'
        and pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita) as exactos,
    count(*) filter (where p.estado='final'
        and not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)=sign(p.goles_local-p.goles_visita)) as aciertos,
    count(*) filter (where p.estado='final'
        and not (pr.pred_local=p.goles_local and pr.pred_visita=p.goles_visita)
        and sign(pr.pred_local-pr.pred_visita)<>sign(p.goles_local-p.goles_visita)) as fallas
  from jugadores j
  left join pronosticos pr on pr.jugador_id = j.id
  left join partidos p on p.id = pr.partido_id
                      and p.estado='final' and p.goles_local is not null
                      and not p.puntaje_anulado    -- <-- FILTRO RECUPERADO
  where j.activo
  group by j.id
)
select *, row_number() over (
    order by puntos desc, exactos desc, aciertos desc, fallas asc, jugador_id asc
  ) as posicion
from base;

-- ---------------------------------------------------------------------
-- PASO 2: RPCs de metricas -> tambien excluyen anulados (coherencia total).
-- ---------------------------------------------------------------------
create or replace function mis_predicciones_detalle(p_jugador_id int)
returns table(
  partido_id int, fase text, grupo text, fecha timestamptz, estado text,
  equipo_local text, equipo_visita text, pais_local text, pais_visita text,
  goles_local int, goles_visita int,
  pred_local int, pred_visita int,
  puntos int, resultado text
)
language sql security definer set search_path = public, extensions as $$
  select
    p.id, p.fase, p.grupo, p.fecha, p.estado,
    p.equipo_local, p.equipo_visita, p.pais_local, p.pais_visita,
    p.goles_local, p.goles_visita,
    pr.pred_local, pr.pred_visita,
    calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
      p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos,
    case
      when p.estado <> 'final'
        or p.goles_local is null or p.goles_visita is null then null
      when pr.pred_local = p.goles_local
        and pr.pred_visita = p.goles_visita then 'exacto'
      when p.goles_local <> p.goles_visita
        and (p.goles_local - p.goles_visita)
          = (pr.pred_local - pr.pred_visita) then 'diferencia'
      when (p.goles_local > p.goles_visita and pr.pred_local > pr.pred_visita)
        or (p.goles_local < p.goles_visita and pr.pred_local < pr.pred_visita)
        or (p.goles_local = p.goles_visita and pr.pred_local = pr.pred_visita)
        then 'acierto'
      else 'falla'
    end as resultado
  from pronosticos pr
  join partidos p on p.id = pr.partido_id
  where pr.jugador_id = p_jugador_id
    and not p.puntaje_anulado            -- <-- no mostrar/sumar anulados
  order by p.fecha desc;
$$;
grant execute on function mis_predicciones_detalle(int) to anon, authenticated;

create or replace function predicciones_jugadas_todas()
returns table(
  jugador_id int,
  partido_id int, fase text, grupo text, fecha timestamptz, estado text,
  equipo_local text, equipo_visita text, pais_local text, pais_visita text,
  goles_local int, goles_visita int,
  pred_local int, pred_visita int,
  puntos int, resultado text
)
language sql security definer set search_path = public, extensions as $$
  select
    pr.jugador_id,
    p.id, p.fase, p.grupo, p.fecha, p.estado,
    p.equipo_local, p.equipo_visita, p.pais_local, p.pais_visita,
    p.goles_local, p.goles_visita,
    pr.pred_local, pr.pred_visita,
    calcular_puntos_pronostico(pr.pred_local, pr.pred_visita,
      p.goles_local, p.goles_visita, p.fase, contar_exactos(p.id)) as puntos,
    case
      when pr.pred_local = p.goles_local
        and pr.pred_visita = p.goles_visita then 'exacto'
      when p.goles_local <> p.goles_visita
        and (p.goles_local - p.goles_visita)
          = (pr.pred_local - pr.pred_visita) then 'diferencia'
      when (p.goles_local > p.goles_visita and pr.pred_local > pr.pred_visita)
        or (p.goles_local < p.goles_visita and pr.pred_local < pr.pred_visita)
        or (p.goles_local = p.goles_visita and pr.pred_local = pr.pred_visita)
        then 'acierto'
      else 'falla'
    end as resultado
  from pronosticos pr
  join partidos p on p.id = pr.partido_id
  where p.estado = 'final'
    and p.goles_local is not null
    and p.goles_visita is not null
    and not p.puntaje_anulado            -- <-- no contar anulados
  order by p.fecha desc;
$$;
grant execute on function predicciones_jugadas_todas() to anon, authenticated;

-- ---------------------------------------------------------------------
-- PASO 3 (OPCIONAL pero recomendado): reset preciso de ajustes.
--   Pone ajuste_puntos = 0 SOLO a quienes su ajuste actual sea exactamente el
--   negativo de lo que les daba el partido anulado (o sea, el parche del -4).
--   NO toca ajustes por otros motivos. Hacerlo aca (misma transaccion) evita
--   que la tabla se vea 4 puntos abajo entre "recrear vista" y "resetear".
--
--   Si preferis resetearlos vos a mano desde el panel admin, comenta este
--   bloque (desde 'update' hasta el ';').
-- ---------------------------------------------------------------------
update jugadores j
   set ajuste_puntos = 0,
       ajuste_motivo = null
 where j.ajuste_puntos <> 0
   and j.ajuste_puntos = -(
     select coalesce(sum(calcular_puntos_pronostico(
         pr.pred_local, pr.pred_visita, p.goles_local, p.goles_visita, p.fase,
         contar_exactos(p.id))),0)
     from pronosticos pr
     join partidos p on p.id = pr.partido_id
     where pr.jugador_id = j.id
       and p.puntaje_anulado
       and p.estado='final' and p.goles_local is not null
   );

commit;

-- Refresca el cache de PostgREST para que el front vea las funciones nuevas YA.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- VERIFICACION (corre despues; deberia dar la tabla ya limpia):
--   select nombre, puntos, exactos, aciertos, fallas, posicion
--   from tabla_posiciones order by posicion;
--   -- y que no quede ningun ajuste del parche:
--   select id, nombre, ajuste_puntos, ajuste_motivo
--   from jugadores where ajuste_puntos <> 0;
-- ---------------------------------------------------------------------
