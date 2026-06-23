-- =====================================================================
-- FIX: RPC para la pestana "Casi" de Mis predicciones.
-- =====================================================================
-- Devuelve las predicciones de partidos YA JUGADOS (final) de TODOS los
-- jugadores, con el dueno (jugador_id) y el mismo detalle que
-- mis_predicciones_detalle. La pestana "Casi" la usa para:
--   1. armar el ranking de cuantas veces cada uno quedo a 1 gol del exacto, y
--   2. mostrar el detalle del jugador seleccionado.
--
-- Por que solo finales: asi NO expone pronosticos de partidos por jugar de
-- otros (se podrian espiar desde el navegador). Tras el pitazo ya son publicos.
--
-- El conteo "casi" (a 1 gol y ambos victoria) se calcula en el FRONT
-- (app/src/lib/casi.ts); aca solo entregamos los datos crudos.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

-- Limpia la version anterior (de 1 solo jugador), por si llego a crearse.
drop function if exists predicciones_jugadas_de(int);

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
  order by p.fecha desc;
$$;

grant execute on function predicciones_jugadas_todas() to anon, authenticated;

-- Refresca el cache de PostgREST para que el front vea la funcion YA.
notify pgrst, 'reload schema';

-- Verificacion:
-- select * from predicciones_jugadas_todas();
