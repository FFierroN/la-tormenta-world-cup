-- ============================================================
-- B0: SCHEMA EXTRAS — EJECUTAR ANTES DEL PROMPT 6 DE LOVABLE
-- La Tormenta Mundial 2026
-- ============================================================
-
--
-- CUÁNDO EJECUTARLO:
--   Después de que Lovable ejecutó el Prompt 1 (tablas base creadas)
--   ANTES de que Lovable ejecute el Prompt 6
--
-- IDEMPOTENTE: podés ejecutarlo varias veces sin romper nada.
-- ============================================================


-- ============================================================
-- 1. COLUMNAS DE AVATARES EN TABLA USUARIOS
-- ============================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS avatar_pos1_url  TEXT,
  ADD COLUMN IF NOT EXISTS avatar_medio_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_pos8_url  TEXT;


-- ============================================================
-- 2. TABLA DE CONFIGURACIÓN GLOBAL
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracion (
  clave  TEXT PRIMARY KEY,
  valor  TEXT NOT NULL DEFAULT 'false',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar el toggle de edición de predicciones (default: cerrado)
INSERT INTO configuracion (clave, valor)
VALUES ('edicion_predicciones_habilitada', 'false')
ON CONFLICT (clave) DO NOTHING;


-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Corré estas queries para confirmar que todo quedó bien:

-- Test 1: columnas de avatar en usuarios
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND column_name LIKE 'avatar%';
-- Esperado: 3 filas (avatar_pos1_url, avatar_medio_url, avatar_pos8_url)

-- Test 2: tabla configuracion existe y tiene el registro
SELECT * FROM configuracion;
-- Esperado: 1 fila con clave='edicion_predicciones_habilitada' y valor='false'
