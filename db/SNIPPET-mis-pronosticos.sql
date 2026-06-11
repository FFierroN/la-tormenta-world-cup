-- =====================================================================
-- SNIPPET: mis_pronosticos (etiqueta Pronosticado / Pendiente)
-- =====================================================================
-- Que hace: crea SOLO la funcion mis_pronosticos(p_jugador_id), que
-- devuelve los IDs de partidos que ese jugador YA pronostico. La app la
-- usa para mostrar la etiqueta verde 'Pronosticado' o roja 'Pendiente'
-- en la lista de partidos. NO expone marcadores ajenos (solo IDs propios).
--
-- No toca datos. Es idempotente (create or replace) y reversible.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

create or replace function mis_pronosticos(p_jugador_id int)
returns table(partido_id int)
language sql security definer set search_path = public, extensions as $$
  select pr.partido_id from pronosticos pr where pr.jugador_id = p_jugador_id;
$$;

grant execute on function mis_pronosticos(int) to anon, authenticated;

-- Verificacion (cambia el 1 por tu id de jugador): lista de partidos pronosticados.
select * from mis_pronosticos(1);
