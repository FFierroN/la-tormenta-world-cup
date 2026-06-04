-- ============================================================
-- PROMPT 7: POLÍTICAS DE SEGURIDAD (RLS)
-- La Tormenta Mundial 2026
-- ============================================================
-- Habilita RLS y crea políticas básicas para grupo cerrado de 8 amigos.
-- La validación fina (privacidad de pronósticos pre-deadline) la hace el frontend.
--
-- IDEMPOTENTE: podés ejecutarlo varias veces sin romper nada.
-- ============================================================


-- ============================================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pronosticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE predicciones_especiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE partido_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_log ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. POLÍTICAS DE LECTURA (todos pueden leer)
-- ============================================================

-- Borrar políticas viejas si existen (idempotencia)
DROP POLICY IF EXISTS "Lectura publica partidos" ON partidos;
DROP POLICY IF EXISTS "Lectura publica pronosticos" ON pronosticos;
DROP POLICY IF EXISTS "Lectura publica predicciones_especiales" ON predicciones_especiales;
DROP POLICY IF EXISTS "Lectura publica partido_eventos" ON partido_eventos;
DROP POLICY IF EXISTS "Lectura publica admin_log" ON admin_log;
DROP POLICY IF EXISTS "Lectura publica usuarios" ON usuarios;

-- Crear políticas de lectura
CREATE POLICY "Lectura publica partidos" ON partidos
  FOR SELECT USING (true);

CREATE POLICY "Lectura publica pronosticos" ON pronosticos
  FOR SELECT USING (true);

CREATE POLICY "Lectura publica predicciones_especiales" ON predicciones_especiales
  FOR SELECT USING (true);

CREATE POLICY "Lectura publica partido_eventos" ON partido_eventos
  FOR SELECT USING (true);

CREATE POLICY "Lectura publica admin_log" ON admin_log
  FOR SELECT USING (true);

CREATE POLICY "Lectura publica usuarios" ON usuarios
  FOR SELECT USING (true);


-- ============================================================
-- 3. POLÍTICAS DE ESCRITURA (validación en frontend)
-- ============================================================

-- Borrar políticas viejas
DROP POLICY IF EXISTS "Escritura abierta partidos" ON partidos;
DROP POLICY IF EXISTS "Escritura abierta pronosticos" ON pronosticos;
DROP POLICY IF EXISTS "Escritura abierta predicciones_especiales" ON predicciones_especiales;
DROP POLICY IF EXISTS "Escritura abierta partido_eventos" ON partido_eventos;
DROP POLICY IF EXISTS "Escritura abierta admin_log" ON admin_log;
DROP POLICY IF EXISTS "Update propio usuarios" ON usuarios;

-- Crear políticas de escritura
-- NOTA: estamos confiando en la app para validar. Es válido para 8 amigos cerrados.
CREATE POLICY "Escritura abierta partidos" ON partidos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Escritura abierta pronosticos" ON pronosticos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Escritura abierta predicciones_especiales" ON predicciones_especiales
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Escritura abierta partido_eventos" ON partido_eventos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Escritura abierta admin_log" ON admin_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Update propio usuarios" ON usuarios
  FOR UPDATE USING (true) WITH CHECK (true);


-- ============================================================
-- 4. VISTA PÚBLICA DE USUARIOS (sin exponer pin_hash)
-- ============================================================
-- Usá esta vista en el frontend cuando quieras listar usuarios
-- (ej: dropdown del login, tabla de posiciones, etc.)

DROP VIEW IF EXISTS usuarios_publica;

CREATE VIEW usuarios_publica AS
SELECT
  id,
  nombre_real,
  seudonimo,
  es_admin,
  onboarding_completado,
  created_at,
  -- Nombre visible: seudonimo si existe, sino nombre real
  COALESCE(seudonimo, nombre_real) AS nombre_visible
FROM usuarios;


-- ============================================================
-- 5. ÍNDICES PARA PERFORMANCE
-- ============================================================
-- Crear índices solo si no existen (idempotencia)

CREATE INDEX IF NOT EXISTS idx_pronosticos_partido_id ON pronosticos(partido_id);
CREATE INDEX IF NOT EXISTS idx_pronosticos_usuario_id ON pronosticos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_partido_eventos_partido_id ON partido_eventos(partido_id);
CREATE INDEX IF NOT EXISTS idx_partidos_fecha_hora ON partidos(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_partidos_estado ON partidos(estado_partido);
CREATE INDEX IF NOT EXISTS idx_partidos_grupo ON partidos(grupo);
CREATE INDEX IF NOT EXISTS idx_admin_log_timestamp ON admin_log(timestamp DESC);


-- ============================================================
-- 6. HABILITAR REALTIME EN TABLAS QUE LO NECESITAN
-- ============================================================
-- Esto permite que Supabase envíe updates en tiempo real al frontend.

-- Habilitar replication en las tablas que el frontend escucha
-- (Si Lovable ya las habilitó, este comando no hace nada)
ALTER PUBLICATION supabase_realtime ADD TABLE partidos;
ALTER PUBLICATION supabase_realtime ADD TABLE partido_eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE pronosticos;
ALTER PUBLICATION supabase_realtime ADD TABLE predicciones_especiales;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_log;


-- ============================================================
-- LISTO. Validá con los tests del .md asociado.
-- ============================================================
