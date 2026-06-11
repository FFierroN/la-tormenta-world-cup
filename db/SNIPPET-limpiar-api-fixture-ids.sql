-- =====================================================================
-- SNIPPET: limpiar api_fixture_id (migracion a football-data.org)
-- =====================================================================
-- Los IDs de API-Football no calzan con los de football-data.org. El robot
-- nuevo igual matchea por nombre+fecha la primera vez y aprende el ID nuevo,
-- pero si dejamos los viejos podriamos chocar (improbable, pero limpio mejor).
--
-- Seguro de correr: solo nullea una columna. No borra partidos ni eventos.
-- Uso: Supabase -> SQL Editor -> Run.
-- =====================================================================

update partidos set api_fixture_id = null;
