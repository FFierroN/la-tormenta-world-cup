-- ============================================================
-- B5: REGLAS DE PUNTAJE EDITABLES POR EL ADMIN
-- La Tormenta Mundial 2026
-- ============================================================
-- Convierte el sistema de puntaje (antes fijo en el código) en
-- una tabla editable. El admin puede cambiar cuánto vale cada cosa.
--
-- INCLUYE RED DE SEGURIDAD:
--   - Se siembra con los valores ACTUALES (comportamiento idéntico)
--   - La función usa fallbacks si falta algún valor (no se rompe)
--   - Función recalcular_todos_los_puntos() para mantener consistencia
--
-- CUÁNDO EJECUTARLO:
--   Después de B1 (prompt-6.sql). Reemplaza la función de cálculo
--   por una versión que lee los puntos desde la tabla.
--
-- IDEMPOTENTE: podés ejecutarlo varias veces sin romper nada.
-- ============================================================


-- ============================================================
-- 1. TABLA DE REGLAS DE PUNTAJE
-- ============================================================

CREATE TABLE IF NOT EXISTS reglas_puntaje (
  clave        TEXT PRIMARY KEY,
  puntos       INTEGER NOT NULL,
  descripcion  TEXT NOT NULL,
  grupo_regla  TEXT NOT NULL,
  orden        INTEGER NOT NULL DEFAULT 0
);


-- ============================================================
-- 2. SEED CON LOS VALORES ACTUALES
-- (si ya existen, NO los pisa, para no borrar cambios del admin)
-- ============================================================

INSERT INTO reglas_puntaje (clave, puntos, descripcion, grupo_regla, orden) VALUES
  -- Fase de Grupos
  ('grupos_exacto',          6, 'Marcador exacto',        'Grupos', 1),
  ('grupos_diferencia',      4, 'Diferencia de goles',    'Grupos', 2),
  ('grupos_ganador',         2, 'Ganador o empate',       'Grupos', 3),
  -- Dieciseisavos
  ('dieciseisavos_exacto',     6, 'Marcador exacto',      'Dieciseisavos', 1),
  ('dieciseisavos_diferencia', 4, 'Diferencia de goles',  'Dieciseisavos', 2),
  ('dieciseisavos_ganador',    2, 'Ganador o empate',     'Dieciseisavos', 3),
  -- Octavos
  ('octavos_exacto',         8, 'Marcador exacto',        'Octavos', 1),
  ('octavos_diferencia',     6, 'Diferencia de goles',    'Octavos', 2),
  ('octavos_ganador',        4, 'Ganador o empate',       'Octavos', 3),
  -- Cuartos
  ('cuartos_exacto',         8, 'Marcador exacto',        'Cuartos', 1),
  ('cuartos_diferencia',     6, 'Diferencia de goles',    'Cuartos', 2),
  ('cuartos_ganador',        4, 'Ganador o empate',       'Cuartos', 3),
  -- Tercer Puesto
  ('tercer_puesto_exacto',     8, 'Marcador exacto',      'Tercer Puesto', 1),
  ('tercer_puesto_diferencia', 6, 'Diferencia de goles',  'Tercer Puesto', 2),
  ('tercer_puesto_ganador',    4, 'Ganador o empate',     'Tercer Puesto', 3),
  -- Semifinales
  ('semifinales_exacto',     10, 'Marcador exacto',       'Semifinales', 1),
  ('semifinales_diferencia',  8, 'Diferencia de goles',   'Semifinales', 2),
  ('semifinales_ganador',     6, 'Ganador o empate',      'Semifinales', 3),
  -- Final
  ('final_exacto',           12, 'Marcador exacto',       'Final', 1),
  ('final_diferencia',       10, 'Diferencia de goles',   'Final', 2),
  ('final_ganador',           8, 'Ganador o empate',      'Final', 3),
  -- Bonus por marcador de riesgo
  ('bonus_riesgo_1',          1, 'Bonus riesgo leve (2-2, 3-0, 3-1...)',   'Bonus de Riesgo', 1),
  ('bonus_riesgo_2',          2, 'Bonus riesgo medio (3-2, 4-0, 4-1...)',  'Bonus de Riesgo', 2),
  ('bonus_riesgo_3',          3, 'Bonus riesgo alto (4-2, 5-0 o mayor)',   'Bonus de Riesgo', 3)
ON CONFLICT (clave) DO NOTHING;


-- ============================================================
-- 3. FUNCIÓN DE CÁLCULO (versión que LEE de la tabla)
-- Reemplaza la versión con valores fijos de prompt-6.sql
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_puntos_pronostico(
  pred_local INTEGER,
  pred_visitante INTEGER,
  res_local INTEGER,
  res_visitante INTEGER,
  p_fase TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_prefijo TEXT;
  pts_exacto INTEGER;
  pts_diferencia INTEGER;
  pts_ganador INTEGER;
  bonus_riesgo INTEGER := 0;
  v_bonus1 INTEGER;
  v_bonus2 INTEGER;
  v_bonus3 INTEGER;
  max_goles INTEGER;
  min_goles INTEGER;
BEGIN
  -- Si falta algún dato, devolver 0
  IF pred_local IS NULL OR pred_visitante IS NULL
     OR res_local IS NULL OR res_visitante IS NULL THEN
    RETURN 0;
  END IF;

  -- Mapear la fase del partido al prefijo de la clave en la tabla
  v_prefijo := CASE p_fase
    WHEN 'Grupos'         THEN 'grupos'
    WHEN 'Dieciseisavos'  THEN 'dieciseisavos'
    WHEN 'Octavos'        THEN 'octavos'
    WHEN 'Cuartos'        THEN 'cuartos'
    WHEN 'Tercer Puesto'  THEN 'tercer_puesto'
    WHEN 'Semifinales'    THEN 'semifinales'
    WHEN 'Final'          THEN 'final'
    ELSE NULL
  END;

  -- Fase desconocida → 0 puntos
  IF v_prefijo IS NULL THEN
    RETURN 0;
  END IF;

  -- Leer los puntos desde la tabla de reglas
  SELECT puntos INTO pts_exacto     FROM reglas_puntaje WHERE clave = v_prefijo || '_exacto';
  SELECT puntos INTO pts_diferencia FROM reglas_puntaje WHERE clave = v_prefijo || '_diferencia';
  SELECT puntos INTO pts_ganador    FROM reglas_puntaje WHERE clave = v_prefijo || '_ganador';

  -- Fallbacks defensivos (si la tabla no tuviera el valor, no se rompe)
  pts_exacto     := COALESCE(pts_exacto, 0);
  pts_diferencia := COALESCE(pts_diferencia, 0);
  pts_ganador    := COALESCE(pts_ganador, 0);

  -- Leer valores de bonus de riesgo
  SELECT puntos INTO v_bonus1 FROM reglas_puntaje WHERE clave = 'bonus_riesgo_1';
  SELECT puntos INTO v_bonus2 FROM reglas_puntaje WHERE clave = 'bonus_riesgo_2';
  SELECT puntos INTO v_bonus3 FROM reglas_puntaje WHERE clave = 'bonus_riesgo_3';
  v_bonus1 := COALESCE(v_bonus1, 1);
  v_bonus2 := COALESCE(v_bonus2, 2);
  v_bonus3 := COALESCE(v_bonus3, 3);

  -- ========================================
  -- 1. ACIERTO EXACTO (+ bonus por riesgo)
  -- ========================================
  IF pred_local = res_local AND pred_visitante = res_visitante THEN
    max_goles := GREATEST(res_local, res_visitante);
    min_goles := LEAST(res_local, res_visitante);

    IF (max_goles >= 4 AND min_goles >= 2) OR (max_goles >= 5) THEN
      bonus_riesgo := v_bonus3;
    ELSIF (max_goles = 3 AND min_goles = 2)
       OR (max_goles = 4 AND min_goles <= 1) THEN
      bonus_riesgo := v_bonus2;
    ELSIF (max_goles = 2 AND min_goles = 2)
       OR (max_goles = 3 AND min_goles <= 1) THEN
      bonus_riesgo := v_bonus1;
    ELSE
      bonus_riesgo := 0;
    END IF;

    RETURN pts_exacto + bonus_riesgo;
  END IF;

  -- ========================================
  -- 2. DIFERENCIA DE GOLES CORRECTA (no empate)
  -- ========================================
  IF res_local != res_visitante
     AND (res_local - res_visitante) = (pred_local - pred_visitante) THEN
    RETURN pts_diferencia;
  END IF;

  -- ========================================
  -- 3. SOLO GANADOR / EMPATE ACERTADO
  -- ========================================
  IF (res_local > res_visitante AND pred_local > pred_visitante)
     OR (res_local < res_visitante AND pred_local < pred_visitante)
     OR (res_local = res_visitante AND pred_local = pred_visitante) THEN
    RETURN pts_ganador;
  END IF;

  -- ========================================
  -- 4. NADA ACERTADO
  -- ========================================
  RETURN 0;
END;
$$ LANGUAGE plpgsql;
-- NOTA: ya NO es IMMUTABLE porque ahora lee de una tabla.


-- ============================================================
-- 4. FUNCIÓN PARA RECALCULAR TODOS LOS PUNTOS
-- El admin la dispara después de cambiar una regla, para que
-- los partidos ya jugados queden con el puntaje actualizado.
-- ============================================================

CREATE OR REPLACE FUNCTION recalcular_todos_los_puntos()
RETURNS INTEGER AS $$
DECLARE
  v_actualizados INTEGER;
BEGIN
  UPDATE pronosticos p
  SET puntos_obtenidos = calcular_puntos_pronostico(
        p.prediccion_local,
        p.prediccion_visitante,
        pa.resultado_local,
        pa.resultado_visitante,
        pa.fase
      ),
      updated_at = NOW()
  FROM partidos pa
  WHERE p.partido_id = pa.id
    AND pa.estado_partido = 'finalizado'
    AND pa.resultado_local IS NOT NULL
    AND pa.resultado_visitante IS NOT NULL;

  GET DIAGNOSTICS v_actualizados = ROW_COUNT;
  RETURN v_actualizados;  -- devuelve cuántos pronósticos se recalcularon
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 5. PERMITIR LECTURA/ESCRITURA DE LA TABLA (RLS)
-- ============================================================

ALTER TABLE reglas_puntaje ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica reglas_puntaje" ON reglas_puntaje;
CREATE POLICY "Lectura publica reglas_puntaje" ON reglas_puntaje
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Escritura abierta reglas_puntaje" ON reglas_puntaje;
CREATE POLICY "Escritura abierta reglas_puntaje" ON reglas_puntaje
  FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Test 1: ver todas las reglas sembradas (esperado: 24 filas)
SELECT grupo_regla, descripcion, puntos
FROM reglas_puntaje
ORDER BY grupo_regla, orden;

-- Test 2: el cálculo sigue funcionando igual que antes
-- Exacto en grupos = 6 (esperado)
SELECT calcular_puntos_pronostico(2, 1, 2, 1, 'Grupos');

-- Test 3: probar que un cambio de regla se refleja
-- (cambiamos grupos_exacto a 10, calculamos, y lo dejamos en 6 de nuevo)
-- UPDATE reglas_puntaje SET puntos = 10 WHERE clave = 'grupos_exacto';
-- SELECT calcular_puntos_pronostico(2, 1, 2, 1, 'Grupos');  -- esperado: 10
-- UPDATE reglas_puntaje SET puntos = 6 WHERE clave = 'grupos_exacto';

-- Test 4: recalcular todos los puntos (devuelve cuántos actualizó)
-- SELECT recalcular_todos_los_puntos();
