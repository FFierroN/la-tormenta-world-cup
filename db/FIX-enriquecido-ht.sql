-- =====================================================================
-- FIX: columna para el enriquecido de MEDIO TIEMPO (Highlightly HT).
-- =====================================================================
-- El enriquecedor ahora corre dentro de Cloudflare (worker-vivo/enriquecer.js)
-- y llama a Highlightly DOS veces por partido:
--   - HT (entretiempo): datos del 1er tiempo.  Flag: enriquecido_ht_at
--   - FT (final + gracia): datos completos.     Flag: enriquecido_at (ya existe)
--
-- Esta columna evita repetir la llamada de HT durante los ~15' de descanso.
-- Idempotente, no borra nada.
--
-- Uso: Supabase -> SQL Editor -> New query -> pega TODO -> Run.
-- =====================================================================

alter table partidos add column if not exists enriquecido_ht_at timestamptz;

-- Refresca el cache de PostgREST para que el Worker vea la columna YA.
notify pgrst, 'reload schema';

-- Verificacion: deberia listar la columna nueva.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'partidos'
  and column_name = 'enriquecido_ht_at';
