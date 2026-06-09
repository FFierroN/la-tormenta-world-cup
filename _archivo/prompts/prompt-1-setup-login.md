# 🎯 Prompt 1 — Setup + Design System (OneFootball) + Login + Navegación

> **Objetivo**: Shell de la app con sistema de diseño OneFootball-style, login funcional, navegación principal y base de datos completa.
> **Tiempo estimado de validación**: 10-15 min después de que Lovable termine.

---

## 📋 Cómo usar este prompt

1. Abrí Lovable.dev y creá un nuevo proyecto.
2. Conectá Supabase desde el panel de Lovable (botón "Connect Supabase", 1 click).
3. Pegá TODO el bloque entre `---PROMPT---` como primer mensaje.
4. Esperá que Lovable termine. Validá con el checklist.

---

## ✅ Checklist de validación

- [ ] Veo pantalla de login con fondo negro puro
- [ ] Hay dropdown con los 8 nombres reales y el orden correcto
- [ ] Input de PIN acepta solo 4 dígitos
- [ ] El logo "La Tormenta Mundial 2026 ⚡" se ve grande arriba
- [ ] Después de login veo bottom nav con 4 tabs (Admin solo si soy Felipe)
- [ ] El diseño se ve oscuro, minimalista, tipo OneFootball (NO pastel, NO mucho rojo)
- [ ] En Supabase aparecen las 6 tablas: `usuarios`, `partidos`, `pronosticos`, `predicciones_especiales`, `admin_log`, `partido_eventos`
- [ ] Los 8 usuarios están seedeados con `onboarding_completado = false`

---

---PROMPT---

Crea una PWA llamada **"La Tormenta Mundial 2026"** para que 8 amigos hagan pronósticos del Mundial FIFA 2026.

## Stack técnico
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Supabase (ya conectado)
- Mobile-first, responsive
- Iconos: Lucide React
- Banderas: usá la librería `flag-icons` (CSS de banderas circulares con códigos ISO)

## Sistema de diseño (estética OneFootball — minimalista y oscuro)

### Paleta de colores
- Fondo principal: `#000000` (negro puro)
- Fondo de cards/secciones destacadas: `#0F0F0F`
- Separadores hairline: `#1F1F1F`
- Bordes de pills/botones activos: `#FFFFFF` (outline blanco)
- Texto principal: `#FFFFFF`
- Texto secundario: `#9CA3AF`
- Texto deshabilitado: `#6B7280`
- **Rojo de marca** `#E3000F` (USAR SOLO en: botón "Entrar" del login, botón "Guardar pronóstico", badge "ADMIN", highlight de la fila del usuario logueado en la tabla, logo)
- Verde para "ganador local" en votaciones: `#22C55E`
- Rojo para "ganador visitante" en votaciones: `#EF4444`

### Tipografía
- Fuente: **Inter** (Google Fonts)
- Título de pantalla: 28px bold
- Nombre de equipo: 17px semi-bold
- Hora: 17px regular
- Marcador grande (en detalle de partido): 56px bold
- Tabs activos/inactivos: 14px medium

### Principios visuales
- MUY minimalista: nada de gradientes, nada de sombras pesadas
- Separadores hairline `#1F1F1F` entre filas (NO cards visibles en listas)
- Pills/tabs activos = solo outline blanco 1px, sin fill
- Pills inactivos = fondo `#1A1A1A` sutil
- Mucho espacio (padding generoso, line-height respirado)
- Botones flat, sin gradientes

## Schema completo de base de datos

Ejecutá este SQL en Supabase:

```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre_real TEXT NOT NULL,
  seudonimo TEXT,
  pin_hash TEXT NOT NULL,
  es_admin BOOLEAN DEFAULT false,
  onboarding_completado BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE partidos (
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

CREATE TABLE partido_eventos (
  id SERIAL PRIMARY KEY,
  partido_id INTEGER REFERENCES partidos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  minuto INTEGER NOT NULL,
  jugador_nombre TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pronosticos (
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

CREATE TABLE predicciones_especiales (
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

CREATE TABLE admin_log (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES usuarios(id),
  accion TEXT NOT NULL,
  detalle TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### Valores válidos en `partidos.estado_partido`
- `'pendiente'` (default, todavía no empezó)
- `'en_vivo'` (admin lo marcó como en juego)
- `'finalizado'` (admin lo cerró, dispara cálculo de puntos)

### Valores válidos en `partido_eventos.tipo`
- `'gol_local'`, `'gol_visitante'`
- `'autogol_local'` (jugador del equipo local hace gol en contra → suma al visitante)
- `'autogol_visitante'` (jugador del visitante hace gol en contra → suma al local)

### Valores válidos en `partidos.ganador_penales`
- NULL (no aplicable o aún no decidido)
- `'local'`, `'visitante'`, `'ninguno'`
- **IMPORTANTE**: este campo es SOLO DISPLAY. No afecta los puntos (los puntos siempre se calculan sobre `resultado_local` y `resultado_visitante` a los 90 min).

## Seed inicial de usuarios

Insertá los 8 usuarios con PIN `1234` (hasheado con bcrypt) y `onboarding_completado = false`:

1. Felipe Fierro — `es_admin = true`
2. Victor Soto
3. Ignacio Contreras
4. Jaime Furió
5. Diego Galvez
6. Daniel Abreu
7. Benjamin Bustamante
8. Ignacio Gonzalez

## Pantalla de Login

- Fondo `#000000` completo
- Logo centrado arriba: **"La Tormenta Mundial 2026"** con icono ⚡ al lado del texto, tipografía bold 32px
- Subtítulo: "Prode entre amigos" en gris `#9CA3AF` 14px
- Dropdown con los 8 nombres reales (texto blanco, fondo `#0F0F0F`)
- Input numérico de 4 dígitos para el PIN (texto blanco grande, centrado)
- Botón "Entrar" rojo `#E3000F` ancho completo, texto blanco bold
- Validación contra tabla `usuarios` con PIN hasheado
- Error toast si PIN incorrecto
- Persistir sesión en `localStorage`

## Navegación principal (post-login)

Bottom tab bar **minimalista** con 4 tabs. Estilo OneFootball:
- Fondo `#000000` con borde superior hairline `#1F1F1F`
- Cada tab: icono outline arriba + label abajo
- Tab activo: icono y texto en blanco `#FFFFFF`
- Tab inactivo: icono y texto en gris `#9CA3AF`
- **NO usar fondo distinto para el activo** (solo cambio de color)

Los 4 tabs (con iconos Lucide):
1. ⚽ **Partidos** (`Calendar`)
2. 🏆 **Tabla** (`Trophy`)
3. 👤 **Mi cuenta** (`User`)
4. 🔧 **Admin** (`Settings`) — visible SOLO si `es_admin = true`

## Pantallas placeholder (las llenamos en prompts siguientes)

Crea las 4 pantallas con un header grande y texto centrado "Próximamente":
- Partidos
- Tabla de Posiciones
- Mi Cuenta
- Admin (solo si es admin)

Header de cada pantalla:
```
[Avatar circular]  Partidos        [icono] [icono]
```
- Avatar circular `~48px` arriba izquierda (inicial del usuario sobre fondo rojo `#E3000F`)
- Título 28px bold
- Iconos circulares fondo `#0F0F0F` arriba derecha (~40px)

## Importante

- NO implementes lógica de cálculo de puntos aún
- NO implementes el wizard de predicciones especiales (eso es Prompt 2)
- NO implementes carga de eventos (eso es Prompt 5)
- Mantené el código limpio, modular y comentado en español
- Mobile-first: probá que se vea bien en pantallas de 360px
- Asegurate de que el contraste cumpla WCAG AA mínimo (4.5:1 para texto)

---PROMPT---
