-- ============================================================
-- PROMPT 6: CÁLCULO AUTOMÁTICO DE PUNTOS
-- La Tormenta Mundial 2026
-- ============================================================
-- Este script crea:
--   1. Función calcular_puntos_pronostico(...) - puntaje individual
--   2. Función actualizar_puntos_partido() - trigger handler
--   3. Trigger trigger_actualizar_puntos_partido - dispara al finalizar partido
--   4. Función calcular_puntos_especiales(...) - puntos de predicciones especiales
--
-- IDEMPOTENTE: podés ejecutarlo varias veces sin romper nada.
-- ============================================================


-- ============================================================
-- 1. FUNCIÓN PRINCIPAL: calcular puntos de UN pronóstico
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_puntos_pronostico(
  pred_local INTEGER,
  pred_visitante INTEGER,
  res_local INTEGER,
  res_visitante INTEGER,
  p_fase TEXT
) RETURNS INTEGER AS $$
DECLARE
  pts_exacto INTEGER;
  pts_diferencia INTEGER;
  pts_ganador INTEGER;
  bonus_riesgo INTEGER := 0;
  max_goles INTEGER;
  min_goles INTEGER;
BEGIN
  -- Si falta algún dato, devolver 0
  IF pred_local IS NULL OR pred_visitante IS NULL
     OR res_local IS NULL OR res_visitante IS NULL THEN
    RETURN 0;
  END IF;

  -- Determinar puntos base según fase
  IF p_fase IN ('Grupos', 'Dieciseisavos') THEN
    pts_exacto := 6;
    pts_diferencia := 4;
    pts_ganador := 2;
  ELSIF p_fase IN ('Octavos', 'Cuartos') THEN
    pts_exacto := 8;
    pts_diferencia := 6;
    pts_ganador := 4;
  ELSIF p_fase = 'Semifinales' THEN
    pts_exacto := 10;
    pts_diferencia := 8;
    pts_ganador := 6;
  ELSIF p_fase = 'Tercer Puesto' THEN
    pts_exacto := 8;
    pts_diferencia := 6;
    pts_ganador := 4;
  ELSIF p_fase = 'Final' THEN
    pts_exacto := 12;
    pts_diferencia := 10;
    pts_ganador := 8;
  ELSE
    -- Fase desconocida, devolver 0
    RETURN 0;
  END IF;

  -- ========================================
  -- 1. ACIERTO EXACTO (+ bonus por riesgo)
  -- ========================================
  IF pred_local = res_local AND pred_visitante = res_visitante THEN
    max_goles := GREATEST(res_local, res_visitante);
    min_goles := LEAST(res_local, res_visitante);

    -- Bonus +3: 4-2/2-4, 5-X, o más extremo
    IF (max_goles >= 4 AND min_goles >= 2) OR (max_goles >= 5) THEN
      bonus_riesgo := 3;
    -- Bonus +2: 3-2/2-3, 4-0/0-4, 4-1/1-4
    ELSIF (max_goles = 3 AND min_goles = 2)
       OR (max_goles = 4 AND min_goles <= 1) THEN
      bonus_riesgo := 2;
    -- Bonus +1: 2-2, 3-0/0-3, 3-1/1-3
    ELSIF (max_goles = 2 AND min_goles = 2)
       OR (max_goles = 3 AND min_goles <= 1) THEN
      bonus_riesgo := 1;
    -- Bonus +0: 0-0, 1-0, 0-1, 1-1, 2-0, 0-2, 2-1, 1-2
    ELSE
      bonus_riesgo := 0;
    END IF;

    RETURN pts_exacto + bonus_riesgo;
  END IF;

  -- ========================================
  -- 2. DIFERENCIA DE GOLES CORRECTA
  -- (solo si NO es empate, porque empate igual sería "ganador")
  -- ========================================
  IF res_local != res_visitante
     AND (res_local - res_visitante) = (pred_local - pred_visitante) THEN
    RETURN pts_diferencia;
  END IF;

  -- ========================================
  -- 3. SOLO GANADOR / EMPATE ACERTADO (sin marcador exacto)
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
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- 2. FUNCIÓN TRIGGER: recalcular puntos de todos los pronósticos del partido
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_puntos_partido()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si:
  -- - El partido está finalizado
  -- - Tiene resultado cargado
  IF NEW.estado_partido = 'finalizado'
     AND NEW.resultado_local IS NOT NULL
     AND NEW.resultado_visitante IS NOT NULL THEN

    UPDATE pronosticos
    SET puntos_obtenidos = calcular_puntos_pronostico(
          prediccion_local,
          prediccion_visitante,
          NEW.resultado_local,
          NEW.resultado_visitante,
          NEW.fase
        ),
        updated_at = NOW()
    WHERE partido_id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 3. TRIGGER: dispara recálculo al finalizar o editar resultado
-- ============================================================

-- Borrar trigger viejo si existe (para que sea idempotente)
DROP TRIGGER IF EXISTS trigger_actualizar_puntos_partido ON partidos;

CREATE TRIGGER trigger_actualizar_puntos_partido
AFTER INSERT OR UPDATE OF estado_partido, resultado_local, resultado_visitante
ON partidos
FOR EACH ROW
EXECUTE FUNCTION actualizar_puntos_partido();


-- ============================================================
-- 4. FUNCIÓN: calcular puntos de PREDICCIONES ESPECIALES
-- (campeón / finalistas / semifinalistas)
--
-- USO: el admin la invoca al final del Mundial pasando los datos reales.
--
-- Ejemplo:
-- SELECT calcular_puntos_especiales(
--   'Argentina',                                          -- campeón real
--   ARRAY['Argentina', 'Francia'],                        -- 2 finalistas reales
--   ARRAY['Argentina', 'Francia', 'Brasil', 'España']     -- 4 semifinalistas reales
-- );
--
-- Los puntos de goleador/MVP/arquero/joven NO se calculan acá.
-- Esos los asigna el admin manualmente desde el panel admin del frontend.
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_puntos_especiales(
  p_campeon TEXT,
  p_finalistas TEXT[],
  p_semifinalistas TEXT[]
) RETURNS TABLE (
  usuario_id INTEGER,
  puntos_camp INTEGER,
  puntos_final INTEGER,
  puntos_semi INTEGER
) AS $$
DECLARE
  r RECORD;
  v_aciertos_final INTEGER;
  v_aciertos_semi INTEGER;
  v_pts_camp INTEGER;
  v_pts_final INTEGER;
  v_pts_semi INTEGER;
BEGIN
  FOR r IN SELECT * FROM predicciones_especiales LOOP

    -- ===== Campeón (30 pts) =====
    v_pts_camp := CASE WHEN r.campeon = p_campeon THEN 30 ELSE 0 END;

    -- ===== Finalistas (0/5/20 pts) =====
    v_aciertos_final := 0;
    IF r.finalista_1 = ANY(p_finalistas) THEN
      v_aciertos_final := v_aciertos_final + 1;
    END IF;
    IF r.finalista_2 = ANY(p_finalistas) AND r.finalista_2 != r.finalista_1 THEN
      v_aciertos_final := v_aciertos_final + 1;
    END IF;

    v_pts_final := CASE
      WHEN v_aciertos_final = 2 THEN 20
      WHEN v_aciertos_final = 1 THEN 5
      ELSE 0
    END;

    -- ===== Semifinalistas (0/2/5/10/15 pts) =====
    -- Contar aciertos únicos comparando los 4 elegidos vs los 4 reales
    SELECT COUNT(DISTINCT s.elegido)
    INTO v_aciertos_semi
    FROM (
      SELECT unnest(ARRAY[r.semifinalista_1, r.semifinalista_2, r.semifinalista_3, r.semifinalista_4]) AS elegido
    ) s
    WHERE s.elegido = ANY(p_semifinalistas);

    v_pts_semi := CASE
      WHEN v_aciertos_semi = 4 THEN 15
      WHEN v_aciertos_semi = 3 THEN 10
      WHEN v_aciertos_semi = 2 THEN 5
      WHEN v_aciertos_semi = 1 THEN 2
      ELSE 0
    END;

    -- Actualizar registro
    UPDATE predicciones_especiales
    SET puntos_campeon = v_pts_camp,
        puntos_finalistas = v_pts_final,
        puntos_semifinalistas = v_pts_semi
    WHERE id = r.id;

    -- Devolver para verificación
    usuario_id := r.usuario_id;
    puntos_camp := v_pts_camp;
    puntos_final := v_pts_final;
    puntos_semi := v_pts_semi;
    RETURN NEXT;

  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- LISTO. Ahora podés correr los tests del .md asociado.
-- ============================================================
