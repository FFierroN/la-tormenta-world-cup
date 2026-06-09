# 🎯 Prompt 5 — Panel admin con modo en vivo + PWA + Pulido final

> **Objetivo**: Cerrar el frontend con panel admin completo (modo en vivo + modo rápido), configuración PWA y polish final.
> **Tiempo estimado de validación**: 20-30 min.

---

## 📋 Cómo usar este prompt

1. Asegurate de que Prompts 1, 2, 3 y 4 funcionan.
2. Loguéate con **Felipe Fierro** (admin) para probar el panel admin.
3. Pegá el bloque entre `---PROMPT---` como quinto mensaje.

---

## ✅ Checklist de validación

- [ ] Como Felipe veo el tab "Admin" (los demás NO lo ven)
- [ ] Puedo cargar resultado final rápido (sin eventos) → "Modo rápido"
- [ ] Puedo iniciar un partido "en vivo" y agregar goles uno a uno
- [ ] Cada gol carga: minuto + nombre del jugador
- [ ] Puedo cargar autogoles (suman al equipo contrario automáticamente)
- [ ] Puedo agregar/quitar tarjetas rojas (contador local/visitante)
- [ ] Puedo registrar "Ganador por penales" en eliminatorias
- [ ] Puedo borrar un evento si me equivoqué
- [ ] Al "Finalizar partido" se marca `estado_partido = 'finalizado'`
- [ ] Cada acción del admin queda en `admin_log` y se ve en el log público
- [ ] Puedo asignar puntos manuales (goleador/MVP/arquero/joven) con switches
- [ ] Puedo instalar la app en mi celular ("Agregar a pantalla de inicio")
- [ ] Toggle modo claro/oscuro funciona (default: oscuro)
- [ ] Hay loading states, empty states y toasts en toda la app

---

---PROMPT---

Implementa el panel admin completo + configuración PWA + pulido visual final.

---

# 🔧 Tab "Admin" (solo visible para `es_admin = true`)

## Estructura del tab Admin

Pestañas internas en el tab Admin:
```
[Partidos] [Predicciones especiales] [Jugadores] [Log]
```

---

## Sub-tab "Partidos"

Lista de todos los partidos del Mundial, agrupados por estado:

### Sección "🔴 En vivo" (partidos con `estado_partido = 'en_vivo'`)
Para cada partido en vivo, mostrar **panel de gestión en vivo** (ver más abajo).

### Sección "🕐 Próximos" (partidos pendientes ordenados por fecha)
Cada fila: equipos + fecha/hora + botones:
- `[▶️ Iniciar partido]` → cambia `estado_partido = 'en_vivo'` y abre panel de gestión
- `[⚡ Carga rápida]` → modal para cargar resultado final directo (sin eventos)

### Sección "✅ Finalizados" (partidos con `estado_partido = 'finalizado'`)
Cada fila: equipos + marcador + botones:
- `[✏️ Editar resultado]` → modal de edición con confirmación
- `[👁️ Ver eventos]` → muestra timeline de eventos cargados

---

## Panel de gestión en vivo de un partido

Cuando el admin inicia un partido o entra a uno ya en vivo:

```
┌─────────────────────────────────────────────┐
│ ← Volver                                    │
│                                             │
│  🇦🇷 Argentina        2  -  1     México 🇲🇽 │
│       🔴 EN VIVO                            │
│                                             │
│  ┌─────────────────┐ ┌─────────────────┐   │
│  │  + Gol ARG      │ │  + Gol MEX      │   │
│  └─────────────────┘ └─────────────────┘   │
│                                             │
│  ┌─────────────────┐ ┌─────────────────┐   │
│  │ + Autogol ARG   │ │ + Autogol MEX   │   │
│  │ (suma a MEX)    │ │ (suma a ARG)    │   │
│  └─────────────────┘ └─────────────────┘   │
│                                             │
│  Tarjetas rojas                             │
│  ARG: [- 0 +]   MEX: [- 1 +]               │
│                                             │
│  Ganador por penales (solo eliminatorias)   │
│  ( ) ARG  ( ) MEX  (•) Ninguno              │
│                                             │
│  ────── Timeline ──────                     │
│  ⚽ 78' Messi (ARG)                  [🗑️]    │
│  ⚽ 52' Mbappé (ARG)                 [🗑️]    │
│  ⚽ 23' Lozano (MEX)                 [🗑️]    │
│                                             │
│  [ 🏁 Finalizar partido ]                  │
└─────────────────────────────────────────────┘
```

### Botones de gol (4 botones)

Al tocar `[+ Gol ARG]` (o cualquier botón de gol/autogol), abrir modal pequeño:

```
┌─────────────────────────┐
│  Gol de Argentina       │
│                         │
│  Minuto: [___]          │
│  Jugador: [___________] │
│                         │
│  [Cancelar] [Guardar]   │
└─────────────────────────┘
```

Al guardar:
1. INSERT en `partido_eventos` con `tipo = 'gol_local'` (o el que corresponda)
2. UPDATE `partidos.resultado_local += 1` (si es gol local o autogol visitante)
3. UPDATE `partidos.resultado_visitante += 1` (si es gol visitante o autogol local)
4. INSERT en `admin_log` con detalle: "Gol de [equipo] al minuto X — [jugador]"
5. Toast: "✅ Gol cargado"
6. Refrescar la UI (realtime se encarga de los jugadores)

### Steppers de tarjetas rojas

Stepper simple `[- N +]` para cada equipo.
Al cambiar: UPDATE directo en `partidos.tarjetas_rojas_local` o `tarjetas_rojas_visitante`.
INSERT en `admin_log`: "Tarjeta roja para [equipo]" o "Tarjeta roja removida de [equipo]".

### Selector "Ganador por penales"

Radio buttons con 3 opciones: ARG / MEX / Ninguno.
Solo visible si `fase != 'Grupos'` y `resultado_local == resultado_visitante` al finalizar.
Al cambiar: UPDATE `partidos.ganador_penales`.
Texto pequeño abajo: "⚠️ Solo display. NO afecta los puntos del juego."

### Timeline editable

Lista de eventos cargados, cada uno con icono 🗑️ a la derecha.
Tap en 🗑️ → confirmación → DELETE del evento + revertir marcador + log.

### Botón "Finalizar partido"

Al tocar:
1. Modal de confirmación: "¿Confirmás el resultado final [X-Y]? Esto disparará el cálculo de puntos de los pronósticos."
2. Si confirma:
   - UPDATE `partidos.estado_partido = 'finalizado'`
   - UPDATE `partidos.finalizado_at = NOW()`
   - INSERT en `admin_log`: "Partido finalizado: [equipo_local] X - Y [equipo_visitante]"
   - (El cálculo real de puntos lo hacemos en backend en otro prompt — por ahora solo marcar como finalizado)
   - Toast: "✅ Partido finalizado"
   - Volver al listado

---

## Modal "Carga rápida" (sin eventos)

Para partidos pendientes cuando el admin no quiere cargar eventos uno a uno:

```
┌─────────────────────────┐
│  Carga rápida           │
│                         │
│  🇦🇷 Argentina   [  2  ] │
│  🇲🇽 México      [  1  ] │
│                         │
│  Tarjetas rojas         │
│  ARG: [- 0 +]           │
│  MEX: [- 1 +]           │
│                         │
│  Ganador por penales    │
│  (si aplica)            │
│  ( ) ARG ( ) MEX (•) -- │
│                         │
│  [Cancelar] [Guardar]   │
└─────────────────────────┘
```

Al guardar:
- UPDATE `resultado_local`, `resultado_visitante`, `tarjetas_rojas_*`, `ganador_penales`
- UPDATE `estado_partido = 'finalizado'`, `finalizado_at = NOW()`
- INSERT en `admin_log`: "Carga rápida: [equipo_local] X - Y [equipo_visitante]"
- NO insertar eventos individuales en `partido_eventos` (timeline queda vacío)

---

## Modal "Editar resultado" (partidos ya finalizados)

```
┌──────────────────────────────────┐
│  ⚠️ Editar resultado ya cargado  │
│                                  │
│  Esto queda registrado en el log │
│  público. ¿Continuar?            │
│                                  │
│  [Cancelar] [Sí, continuar]      │
└──────────────────────────────────┘
```

Si confirma → form igual al de carga rápida con valores actuales.
Al guardar: INSERT en `admin_log` con `accion = 'editar_resultado'` y bandera 🚩.

---

## Sub-tab "Predicciones especiales"

4 secciones (Goleador / Mejor jugador / Mejor arquero / Mejor joven).

Para cada una, tabla:

| Jugador | Su respuesta | Acertó (+10 pts) |
|---|---|---|
| Felipe | "Messi" | [Switch ON/OFF] |
| Victor | "Mbappé" | [Switch ON/OFF] |
| ... | ... | ... |

Al activar switch: UPDATE en `predicciones_especiales.puntos_[campo] = 10`.
Al desactivar: volver a 0.
INSERT en `admin_log`: "Asignado punto de [categoría] a [jugador]" o "Removido punto..."

Texto explicativo arriba de cada sección: "Marcá a quién acertó. Cada acierto = 10 pts. Podés cambiar la asignación en cualquier momento."

---

## Sub-tab "Jugadores"

Lista de los 8 jugadores con:
- Nombre real + seudónimo
- Estado: onboarding completado / pendiente
- Botón `[🔑 Resetear PIN]` → confirmación → reset a "1234" + log

---

## Sub-tab "Log"

Lista cronológica descendente de TODAS las entradas de `admin_log`:
- Timestamp en UTC-4
- Icono según acción (📝 cargar / ✏️ editar / 🔑 resetear / ⚽ gol / 🟥 roja / 🏁 finalizar / 🌟 asignar punto)
- Texto descriptivo
- Si la acción es "editar_resultado" → bandera 🚩 visible

Esta es la versión completa para el admin. La versión pública (visible para todos los jugadores) está en la sección "Mi cuenta".

---

# 📜 Log público (visible para TODOS los jugadores, NO solo admin)

En el tab "Mi cuenta" agregar un link "Ver actividad del admin" → abre pantalla con:
- Mismo formato que el log del admin
- Solo lectura
- Sin posibilidad de editar nada
- Texto introductorio: "Acá ves todas las acciones que hizo el admin. Esto garantiza la transparencia del juego."

---

# 📱 Configuración PWA

## Manifest.json

```json
{
  "name": "La Tormenta Mundial 2026",
  "short_name": "La Tormenta",
  "description": "Pronósticos del Mundial FIFA 2026 entre amigos",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#E3000F",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## Service Worker

- Cachear assets estáticos
- Modo offline: pantalla "Sin conexión" con icono ⚡ y mensaje amigable
- NO cachear datos dinámicos (partidos, pronósticos) — siempre frescos

## Splash screen

- Fondo `#000000`
- Logo grande "La Tormenta Mundial 2026 ⚡" centrado
- Texto pequeño abajo: "Cargando..."

## Botón "Instalar app"

- Detectar evento `beforeinstallprompt`
- Mostrar banner discreto arriba: "📲 Instalá la app en tu celular"
- Botón "Instalar" rojo / "Más tarde" gris outline

---

# ✨ Pulido final

## Modo claro/oscuro

Toggle en "Mi cuenta" para alternar. Default: oscuro.

Modo claro:
- Fondo: `#FFFFFF`
- Cards: `#F5F5F5`
- Texto principal: `#0A0A0A`
- Separadores: `#E5E7EB`
- Rojo de marca `#E3000F` se mantiene igual
- **OneFootball también tiene modo claro, mantener consistencia minimalista**

Persistir preferencia en `localStorage`.

## Loading states

Skeleton screens (NO spinners genéricos):
- Tabla de posiciones: 8 filas skeleton
- Lista de partidos: 5 filas skeleton
- Detalle de partido: skeleton del hero + 3 cards de tabs

## Empty states

- "Aún no hay partidos cargados" (con icono ⚽)
- "Aún no hiciste ningún pronóstico" (en historial)
- "Aún no hay actividad del admin" (en log)
- "Este partido no tuvo eventos cargados" (en timeline si está vacía)

## Toasts

Posición: bottom center. Duración: 3 segundos.
- Éxito: fondo verde `#10B981`
- Error: fondo rojo `#E3000F`
- Info: fondo gris `#374151`

## Animaciones

- Transiciones entre tabs: fade 200ms
- Modales: slide-up desde abajo
- Cards al cargar: fade-in escalonado (50ms entre cada una)
- **Nuevo evento en timeline (realtime)**: el evento aparece con animación fade-in + slide-down + pulso sutil
- Cuando se asignan puntos: animación de números subiendo (count-up)

## Microinteracciones

- 🎉 Confetti animado cuando un jugador gana +10 pts o más en un partido
- 📳 Vibración háptica al guardar pronóstico (si el browser lo soporta)
- ⬇️ Pull-to-refresh en lista de partidos
- 🔴 Badge "EN VIVO" con pulso continuo (animate-pulse)

## Mensajes de error amigables

- En lugar de "Error 500" → "Algo salió mal, intentá de nuevo en un momento ⚽"
- Validaciones de form claras: "El PIN debe tener 4 dígitos"
- Si Supabase está caído: "No pudimos conectar al servidor. Revisá tu internet."

---

## Importante

- NO romper nada de lo que ya funciona
- Mantener consistencia visual con la estética OneFootball
- Mobile-first, asegurar que TODO funcione en pantallas de 360px de ancho
- Accesibilidad: contraste mínimo 4.5:1, tap targets de 44x44px mínimo
- Comentarios en español
- Todo en realtime: cuando el admin carga un evento, los jugadores lo ven en <2 segundos sin recargar

---PROMPT---
