-- =====================================================================
-- FIX: RPC para la pantalla "Mis predicciones" (Mi cuenta).
-- =====================================================================
-- Devuelve TODAS las predicciones del jugador (las que el ya hizo), con el
-- detalle del partido, los puntos (reusando calcular_puntos_pronostico) y la
-- categoria del resultado. Las pendientes (sin prediccion) NO aparecen porque
-- no existe fila en 'pronosticos'.
--
-- security definer: lee solo las predicciones del propio jugador (filtro por
-- p_jugador_id), asi no expone marcadores ajenos antes del pitazo.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

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
  order by p.fecha desc;
$$;

grant execute on function mis_predicciones_detalle(int) to anon, authenticated;

-- Refresca el cache de PostgREST para que el front vea la funcion YA.
notify pgrst, 'reload schema';

-- Verificacion (cambia el 1 por tu jugador_id):
-- select * from mis_predicciones_detalle(1);
