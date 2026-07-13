-- ---------------------------------------------------------------------------
-- FIX: recalcular_especiales() ahora COPIA la vista especiales_puntos (que ya
-- deriva todo bien: pais con dedup + resuelve_jugador en goleador/asistidor +
-- las 3 distinciones manuales) a las columnas GUARDADAS de predicciones_especiales.
--
-- Motivo: la version vieja leia pais/goleador/asistidor de configuracion
-- (real_campeon, real_goleador...), campos que el admin YA NO llena (se derivan
-- de las llaves y los eventos). Resultado: al cerrar el Mundial, pais y goleador
-- sumaban 0 en la tabla. Ahora el "cierre oficial" = snapshot de la vista viva.
--
-- La tabla_posiciones suma esas columnas guardadas, asi que:
--   * ANTES de correr esto -> especiales en 0 (provisional, no ensucia la tabla).
--   * DESPUES de correr esto -> especiales oficiales sumados a la tabla.
--
-- Idempotente. Se corre desde el boton de admin "Cerrar Mundial y sumar
-- especiales" (RPC recalcular_especiales), tipicamente tras la final.
-- ---------------------------------------------------------------------------
create or replace function recalcular_especiales()
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  update predicciones_especiales pe set
    puntos_pais          = ep.puntos_pais,
    puntos_goleador      = ep.puntos_goleador,
    puntos_asistidor     = ep.puntos_asistidor,
    puntos_mejor_jugador = ep.puntos_mejor_jugador,
    puntos_mejor_arquero = ep.puntos_mejor_arquero,
    puntos_mejor_joven   = ep.puntos_mejor_joven
  from especiales_puntos ep
  where ep.jugador_id = pe.jugador_id;
end;
$$;

grant execute on function recalcular_especiales() to anon, authenticated;

-- Revertir: vuelve la tabla a PROVISIONAL (especiales en 0). Por si el admin
-- cerro antes de tiempo o quiere reabrir.
create or replace function revertir_especiales()
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  update predicciones_especiales set
    puntos_pais=0, puntos_goleador=0, puntos_asistidor=0,
    puntos_mejor_jugador=0, puntos_mejor_arquero=0, puntos_mejor_joven=0;
end;
$$;

grant execute on function revertir_especiales() to anon, authenticated;

-- Para DESHACER (volver la tabla a provisional, especiales en 0) por si el admin
-- se adelanto: correr manualmente ->
--   update predicciones_especiales set
--     puntos_pais=0, puntos_goleador=0, puntos_asistidor=0,
--     puntos_mejor_jugador=0, puntos_mejor_arquero=0, puntos_mejor_joven=0;
