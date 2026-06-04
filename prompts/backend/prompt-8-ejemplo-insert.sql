-- ============================================================
-- EJEMPLO: INSERT MANUAL DE PARTIDOS
-- La Tormenta Mundial 2026
-- ============================================================
-- Usá este archivo como base si preferís cargar partidos con SQL
-- en lugar de importar el CSV.
--
-- IMPORTANTE: estos son DATOS DE EJEMPLO con fechas plausibles.
-- Reemplazá con el calendario oficial cuando salga.
-- ============================================================


-- Ejemplo: 3 partidos de fase de grupos del Grupo A (México)

INSERT INTO partidos (
  equipo_local, equipo_visitante,
  codigo_local, codigo_visitante,
  fecha_hora, fase, grupo, estadio, ciudad
) VALUES
  -- Partido inaugural en Azteca
  ('México', 'Marruecos', 'MX', 'MA', '2026-06-11 20:00:00', 'Grupos', 'A', 'Estadio Azteca', 'Ciudad de México'),
  ('Argentina', 'Australia', 'AR', 'AU', '2026-06-12 18:00:00', 'Grupos', 'C', 'MetLife Stadium', 'New Jersey'),
  ('Brasil', 'Japón',      'BR', 'JP', '2026-06-13 21:00:00', 'Grupos', 'E', 'Mercedes-Benz Stadium', 'Atlanta');


-- Ejemplo: 1 partido de Octavos (con campo grupo NULL)
INSERT INTO partidos (
  equipo_local, equipo_visitante,
  codigo_local, codigo_visitante,
  fecha_hora, fase, grupo, estadio, ciudad
) VALUES
  ('Argentina', 'México', 'AR', 'MX', '2026-07-04 21:00:00', 'Octavos', NULL, 'AT&T Stadium', 'Dallas');


-- Ejemplo: La final (sin grupo)
INSERT INTO partidos (
  equipo_local, equipo_visitante,
  codigo_local, codigo_visitante,
  fecha_hora, fase, grupo, estadio, ciudad
) VALUES
  ('Por definir', 'Por definir', 'XX', 'XX', '2026-07-19 20:00:00', 'Final', NULL, 'MetLife Stadium', 'New Jersey');


-- ============================================================
-- TIP: si querés validar que el cálculo de puntos funciona,
-- ejecutá este partido de prueba después de cargar el fixture:
-- ============================================================

-- 1. Crear pronóstico de Felipe (id=1) para el partido id=1
-- INSERT INTO pronosticos (usuario_id, partido_id, prediccion_local, prediccion_visitante)
-- VALUES (1, 1, 2, 1);

-- 2. Marcar partido como finalizado con resultado real
-- UPDATE partidos
-- SET estado_partido = 'finalizado', resultado_local = 2, resultado_visitante = 1
-- WHERE id = 1;

-- 3. Verificar que Felipe sacó 6 pts (acierto exacto en grupos)
-- SELECT puntos_obtenidos FROM pronosticos WHERE usuario_id = 1 AND partido_id = 1;
