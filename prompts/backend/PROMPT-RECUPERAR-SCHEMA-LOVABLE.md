#  Prompt de RECUPERACIÓN DE SCHEMA — pegar en Lovable

> **Cuándo usar esto:** conectaste un proyecto de Supabase NUEVO (vacío,
> sin tablas) a un proyecto de Lovable que YA tiene el frontend hecho
> (Prompts 1-5 ejecutados). Este prompt recrea SOLO la base de datos,
> sin tocar ni regenerar el frontend.
>
> **Por qué no re-pegar el Prompt 1 completo:** el Prompt 1 también arma
> el design system, login, navegación y pantallas. Re-ejecutarlo entero
> arriesga pisar el trabajo de los Prompts 2-5. Este prompt es quirúrgico.

---

##  Checklist post-ejecución
- [ ] En Supabase → Table Editor veo las 6 tablas: `usuarios`, `partidos`,
      `partido_eventos`, `pronosticos`, `predicciones_especiales`, `admin_log`
- [ ] La tabla `usuarios` tiene los 8 jugadores seedeados
- [ ] Puedo loguearme en la app con cualquier jugador + PIN `1234`

---

---PROMPT---

NO modifiques ni regeneres ningún componente, pantalla, estilo ni lógica
del frontend. Tu única tarea es (re)crear el schema de la base de datos en
el proyecto de Supabase que está conectado actualmente, porque la base está
vacía. No toques el código de React.

Ejecutá este SQL en Supabase (es idempotente, usa IF NOT EXISTS):

```sql
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

-- Extras (avatares + configuracion)
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
```

Después de crear las tablas, seedea los 8 usuarios. IMPORTANTE: el campo
`pin_hash` debe guardarse usando EXACTAMENTE el mismo método de hashing
(bcrypt) que usa la pantalla de login para validar, de modo que el PIN
`1234` funcione al iniciar sesión. Usá el PIN `1234` para los 8 jugadores
y `onboarding_completado = false`. No dupliques usuarios si ya existen.

Orden y datos de los 8 jugadores:
1. Felipe Fierro — es_admin = true
2. Victor Soto — es_admin = false
3. Ignacio Contreras — es_admin = false
4. Jaime Furió — es_admin = false
5. Diego Galvez — es_admin = false
6. Daniel Abreu — es_admin = false
7. Benjamin Bustamante — es_admin = false
8. Ignacio Gonzalez — es_admin = false

Al terminar, confirmame que las 6 tablas existen en Supabase y que los 8
usuarios quedaron seedeados con el PIN 1234 funcionando.

---PROMPT---
