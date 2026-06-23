-- =====================================================================
-- FIX: RPC para la pestana "Casi" de Mis predicciones.
-- =====================================================================
-- Devuelve las predicciones de partidos YA JUGADOS (final) de CUALQUIER
-- jugador, con el mismo detalle que mis_predicciones_detalle.
--
-- Por que una RPC aparte y no reusar mis_predicciones_detalle:
--   mis_predicciones_detalle trae TODAS las predicciones (incluidas las de
--   partidos por jugar). Si se llamara con el id de OTRO jugador, expondria sus
--   pronosticos antes del pitazo (se podrian espiar desde el navegador). Esta
--   funcion filtra a estado='final' -> esos pronosticos ya son publicos, asi que
--   es segura para ver el conteo de "casi" de cualquier participante.
--
-- "Casi" (a 1 gol del exacto) se calcula en el FRONT (app/src/lib/casi.ts) con
-- los goles reales vs el pronostico; aca solo entregamos los datos crudos.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

create or replace function predicciones_jugadas_de(p_jugador_id int)
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
    and p.estado = 'final'
    and p.goles_local is not null
    and p.goles_visita is not null
  order by p.fecha desc;
$$;

grant execute on function predicciones_jugadas_de(int) to anon, authenticated;

-- Refresca el cache de PostgREST para que el front vea la funcion YA.
notify pgrst, 'reload schema';

-- Verificacion (cambia el 1 por un jugador_id):
-- select * from predicciones_jugadas_de(1);
