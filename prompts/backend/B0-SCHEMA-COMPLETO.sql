-- ============================================================
-- SCHEMA COMPLETO — LA TORMENTA MUNDIAL 2026
-- ============================================================
-- Úsalo si conectaste un proyecto NUEVO de Supabase a Lovable y el
-- Table Editor está VACÍO (sin tablas). Recrea TODO el schema base:
--   6 tablas + extras de avatares + tabla configuracion + seed.
--
-- DÓNDE:  Supabase -> SQL Editor -> + New query -> pegar -> Run
-- SEGURO: 100% IDEMPOTENTE. Podés correrlo varias veces sin romper nada.
--         Si las tablas ya existen, no las toca.
-- ============================================================


-- ============================================================
-- 1. TABLAS BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre_real TEXT NOT NULL,
  seudonimo TEXT,
  pin_hash TEXT NOT NULL,
  es_admin BOOLEAN DEFAULT false,
  onboarding_completado BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partidos (
  id SERIAL PRIMARY KEY,
  equipo_local TEXT NOT NULL,
  equipo_visitante TEXT NOT NULL,
  codigo_local TEXT,
  codigo_visitante TEXT,
  fecha_hora TIMESTAMP NOT NULL,
  fase TEXT NOT NULL,
  grupo TEXT,
  estadio TEXT,
  ciudad TEXT,
  estado_partido TEXT DEFAULT 'pendiente',
  resultado_local INTEGER,
  resultado_visitante INTEGER,
  tarjetas_rojas_local INTEGER DEFAULT 0,
  tarjetas_rojas_visitante INTEGER DEFAULT 0,
  ganador_penales TEXT,
  finalizado_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partido_eventos (
  id SERIAL PRIMARY KEY,
  partido_id INTEGER REFERENCES partidos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  minuto INTEGER NOT NULL,
  jugador_nombre TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pronosticos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  partido_id INTEGER REFERENCES partidos(id),
  prediccion_local INTEGER NOT NULL,
  prediccion_visitante INTEGER NOT NULL,
  puntos_obtenidos INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, partido_id)
);

CREATE TABLE IF NOT EXISTS predicciones_especiales (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER UNIQUE REFERENCES usuarios(id),
  campeon TEXT,
  finalista_1 TEXT,
  finalista_2 TEXT,
  semifinalista_1 TEXT,
  semifinalista_2 TEXT,
  semifinalista_3 TEXT,
  semifinalista_4 TEXT,
  goleador TEXT,
  mejor_jugador TEXT,
  mejor_arquero TEXT,
  mejor_joven TEXT,
  puntos_campeon INTEGER DEFAULT 0,
  puntos_finalistas INTEGER DEFAULT 0,
  puntos_semifinalistas INTEGER DEFAULT 0,
  puntos_goleador INTEGER DEFAULT 0,
  puntos_mejor_jugador INTEGER DEFAULT 0,
  puntos_mejor_arquero INTEGER DEFAULT 0,
  puntos_mejor_joven INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_log (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES usuarios(id),
  accion TEXT NOT NULL,
  detalle TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- 2. EXTRAS (ex-B0): COLUMNAS DE AVATAR + TABLA CONFIGURACION
-- ============================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS avatar_pos1_url  TEXT,
  ADD COLUMN IF NOT EXISTS avatar_medio_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_pos8_url  TEXT;

CREATE TABLE IF NOT EXISTS configuracion (
  clave  TEXT PRIMARY KEY,
  valor  TEXT NOT NULL DEFAULT 'false',
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO configuracion (clave, valor)
VALUES ('edicion_predicciones_habilitada', 'false')
ON CONFLICT (clave) DO NOTHING;


-- ============================================================
-- 3. SEED DE LOS 8 JUGADORES (PIN 1234)
-- ============================================================
-- IMPORTANTE sobre el pin_hash:
--   Lovable hashea el PIN con bcrypt del lado de la app. Si dejás que
--   sea LOVABLE quien cree los usuarios, NO corras este bloque (te
--   duplicaría usuarios o pondría un hash que la app no valida).
--
--   Este seed usa un placeholder de texto plano '1234'. Sirve SOLO si
--   tu app valida el PIN en texto plano. Si usás bcrypt, dejá que
--   Lovable los cree o reemplazá los valores por hashes bcrypt reales.
--
--   ON CONFLICT evita duplicar si ya existen (por nombre_real único).
-- ============================================================

-- Garantiza que no se dupliquen por nombre
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_nombre ON usuarios(nombre_real);

INSERT INTO usuarios (nombre_real, pin_hash, es_admin, onboarding_completado) VALUES
  ('Felipe Fierro',        '1234', true,  false),
  ('Victor Soto',          '1234', false, false),
  ('Ignacio Contreras',    '1234', false, false),
  ('Jaime Furió',          '1234', false, false),
  ('Diego Galvez',         '1234', false, false),
  ('Daniel Abreu',         '1234', false, false),
  ('Benjamin Bustamante',  '1234', false, false),
  ('Ignacio Gonzalez',     '1234', false, false)
ON CONFLICT (nombre_real) DO NOTHING;


-- ============================================================
-- 4. VERIFICACIÓN (corré esto al final)
-- ============================================================

-- Test 1: deben existir las 6 tablas + configuracion (7 nombres)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('usuarios','partidos','partido_eventos',
                     'pronosticos','predicciones_especiales',
                     'admin_log','configuracion')
ORDER BY table_name;
-- Esperado: 7 filas.

-- Test 2: columnas de avatar en usuarios (3 filas)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'usuarios' AND column_name LIKE 'avatar%';

-- Test 3: los 8 jugadores
SELECT id, nombre_real, es_admin FROM usuarios ORDER BY id;
-- Esperado: 8 filas, Felipe Fierro con es_admin = true.

-- Test 4: el toggle de configuracion
SELECT * FROM configuracion;
-- Esperado: 1 fila clave='edicion_predicciones_habilitada' valor='false'.
