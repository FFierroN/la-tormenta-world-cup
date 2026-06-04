# 🎯 Prompt 3 — Lista de partidos + Pronóstico + Timeline en vivo

> **Objetivo**: Pantalla principal de partidos con estética OneFootball, vista por fecha y por grupo, modal de pronóstico, y detalle del partido con timeline de eventos en realtime.
> **Tiempo estimado de validación**: 15-20 min.

---

## 📋 Cómo usar este prompt

1. Asegurate de que Prompts 1 y 2 funcionan.
2. Antes de pegar este prompt: cargá MANUALMENTE 5-10 partidos de prueba en `partidos` desde Supabase, asignándoles `grupo` (ej: 'A', 'B', 'C') y `fase` (ej: 'Grupos').
3. Pegá el bloque entre `---PROMPT---` como tercer mensaje.

---

## ✅ Checklist de validación

- [ ] Veo todos los partidos agrupados por fecha (vista default)
- [ ] Puedo cambiar a "Vista por grupo" con un toggle arriba
- [ ] En vista por grupo veo: equipos del grupo + sus 6 partidos + mini-tabla de grupo
- [ ] Cada fila de partido tiene banderas circulares (no emojis)
- [ ] Las filas se ven minimalistas, sin cards, solo separadores hairline
- [ ] Tap en un partido pendiente → abre modal de pronóstico
- [ ] Tap en un partido en vivo o finalizado → abre pantalla de detalle con timeline
- [ ] La timeline muestra los goles con minuto + nombre del jugador
- [ ] Los autogoles aparecen marcados visualmente como "(en contra)"
- [ ] Las tarjetas rojas se ven como contador en estadísticas del partido
- [ ] El badge "EN VIVO" pulsa en partidos con `estado_partido = 'en_vivo'`
- [ ] Si pasó el deadline (kickoff - 10 min) y no pronostiqué → bloqueado visualmente

---

---PROMPT---

Implementa la pantalla **"Partidos"** con vista por fecha y por grupo, modal de pronóstico, y pantalla de detalle con timeline de eventos.

## Layout general de la pantalla "Partidos"

### Header (sticky arriba)
```
┌────────────────────────────────────────┐
│ [Avatar]  Partidos    [📅] [⚙️]        │  ← iconos circulares
├────────────────────────────────────────┤
│ [Por fecha] [Por grupo]                │  ← toggle de vista
└────────────────────────────────────────┘
```
- Toggle: 2 pills, una activa con outline blanco
- Default: "Por fecha"

### Sub-header dinámico según vista activa

**Si vista = "Por fecha"**:
Pills horizontal scrolleable con fechas:
```
[📅 Calendario] [Ayer] [Hoy] [Mañana] [sáb 13 jun] [dom 14 jun] ...
```
- Pill activo: borde blanco 1px outline
- Pill inactivo: sin borde, texto gris
- Tap → filtra partidos por esa fecha

**Si vista = "Por grupo"**:
Pills horizontal scrolleable con grupos:
```
[Grupo A] [Grupo B] [Grupo C] [Grupo D] ... [Eliminatorias]
```

## Vista "Por fecha"

Lista de partidos de la fecha seleccionada. Sin cards, solo separadores hairline `#1F1F1F` entre filas.

### Estructura de cada fila de partido
```
┌────────────────────────────────────────┐
│ (🇦🇷) Argentina                          │
│                          17:00      ⭐  │
│ (🇲🇽) México                            │
└────────────────────────────────────────┘
   (← separador hairline ↓)
```

Elementos:
- **Banderas circulares 32px** (usar librería `flag-icons` con código ISO de `codigo_local` / `codigo_visitante`)
- Nombre del país: 17px semi-bold blanco
- Equipos apilados verticalmente (NO "vs", solo apilados)
- Hora 17px blanco a la derecha (formato 24h UTC-4)
- Estrella outline 24px gris a la extrema derecha (favorito, por ahora solo decorativo)
- Padding vertical generoso (~16px entre equipos)

### Badge de estado (arriba derecha de la fila)
- 🔴 **EN VIVO** (pulsante): si `estado_partido = 'en_vivo'` → badge rojo pequeño con animación
- 🟢 **FIN**: si `estado_partido = 'finalizado'` → badge verde pequeño
- 🟡 **CIERRA PRONTO**: si kickoff entre ahora y ahora+10min → badge amarillo
- 🔒 **CERRADO**: si pasó deadline y no pronosticaste → badge gris

### Marcador en vivo o final
Si `estado_partido = 'en_vivo'` o `'finalizado'`:
```
┌────────────────────────────────────────┐
│ (🇦🇷) Argentina               2       │
│                          🔴 EN VIVO    │
│ (🇲🇽) México                  1       │
└────────────────────────────────────────┘
```
- Reemplazar la hora por el marcador en grande
- Marcador en blanco bold 24px

### Pronóstico del usuario (debajo de cada fila, si existe)
Texto pequeño 12px gris debajo:
```
Tu pronóstico: 1-1 · 0 pts
```
Si todavía no pronosticó y el partido está abierto → texto en rojo:
```
Sin pronóstico · pulsá para predecir
```

## Vista "Por grupo"

Cuando el usuario selecciona un grupo (ej: "Grupo A"):

### Header del grupo
```
GRUPO A
4 selecciones · 6 partidos
```

### Mini-tabla del grupo
Tabla con: posición, bandera + país, PJ, G, E, P, GF, GC, DG, Pts.
Solo calcular con partidos finalizados:
- PJ = partidos jugados
- G = ganados, E = empatados, P = perdidos
- GF = goles a favor, GC = goles en contra
- DG = diferencia de gol
- Pts = puntos (3 por ganar, 1 por empate)

Estilo: fondo `#0F0F0F`, texto blanco, separadores hairline.

### Lista de los 6 partidos del grupo
Mismo formato que vista por fecha, pero solo los partidos de ese grupo.

## Modal de pronóstico

Tap en partido con `estado_partido = 'pendiente'` Y deadline NO pasado → abrir modal.

### Estructura
```
┌─────────────────────────────────────┐
│              ✕                      │
│                                     │
│      Tu pronóstico                  │
│  (🇦🇷) Argentina vs México (🇲🇽)      │
│  17:00 UTC-4 · Grupo A              │
│                                     │
│     [-]    2    [+]                 │
│     [-]    1    [+]                 │
│                                     │
│  ⏰ Cierra en 2h 15m                │
│                                     │
│  [ Guardar pronóstico ]             │
└─────────────────────────────────────┘
```

- Fondo del modal: `#0F0F0F`, bordes redondeados
- Steppers 0-15: botones circulares outline blanco
- Botón "Guardar": rojo `#E3000F`, ancho completo
- Countdown al deadline: actualizado cada segundo
- Si ya pronosticó → cargar valores existentes en los steppers
- Al guardar: UPSERT en `pronosticos`, toast "✅ Pronóstico guardado"

## Pantalla de detalle del partido

Tap en partido con `estado_partido = 'en_vivo'` o `'finalizado'` → abrir pantalla completa.

### Hero arriba
```
┌─────────────────────────────────────┐
│ [imagen cancha verde con overlay]   │
│ [←]                            [↗]  │
│                                     │
│  (🇦🇷)    EN VIVO         (🇲🇽)      │
│   ARG       2 - 1          MEX     │
│                                     │
│       ⚽ 23' Lozano (MEX)            │
│       ⚽ 52' Mbappé (ARG)            │
│       ⚽ 78' Messi (ARG)             │
└─────────────────────────────────────┘
```

- Imagen de fondo: cancha de fútbol verde (usar un placeholder verde sólido o una imagen de cancha si Lovable encuentra una libre)
- Overlay oscuro 70% para legibilidad
- Botones circulares back y compartir arriba (~40px, fondo `#0F0F0F` semitransparente)
- Banderas circulares grandes (~80px)
- Marcador gigante 56px bold
- Estado del partido encima del marcador: "Final del Partido" / "EN VIVO" / "Inicio: 17:00 UTC-4"
- Lista de goles con icono ⚽ + minuto + nombre del jugador
- Si es autogol: agregar "(en contra)" después del nombre

### Tabs del detalle
Pills horizontales scrolleables:
```
[Resumen] [Pronósticos] [Mi pronóstico]
```
- Pill activo: outline blanco
- Default: "Resumen"

### Tab "Resumen"

#### Sección "Acontecimientos clave"
Timeline con eventos del partido (consultar tabla `partido_eventos`):
```
─── Final del Partido 2-1 ───
                    ⚽ 78' Messi
                    ⚽ 52' Mbappé
                    ⚽ 23' Lozano (MEX)
─── Inicio del partido 17:00 ───
```

- Si el partido aún no terminó: NO mostrar "Final del Partido"
- Eventos ordenados por minuto descendente (los más recientes arriba)
- Eventos del equipo local: alineados a la izquierda
- Eventos del equipo visitante: alineados a la derecha
- Goles tipo "autogol_local" o "autogol_visitante": agregar "(en contra)" después del nombre del jugador
- **REALTIME**: suscribirse a cambios en `partido_eventos` para refrescar timeline automáticamente

#### Sección "Estadísticas"
Mostrar:
- Tarjetas rojas local vs visitante (de `partidos.tarjetas_rojas_local` y `tarjetas_rojas_visitante`)
- Total de goles

Si `ganador_penales` no es NULL:
```
🎯 Ganador por penales: México
(no afecta el puntaje del juego)
```

### Tab "Pronósticos" (visible solo si pasó el deadline)
Lista de los pronósticos de los 8 jugadores:
```
🥇 Felipe          2-1   ✅ Resultado
🥈 Victor          1-1   ❌
🥉 Ignacio C.      2-0   🎯 Diferencia
   ...
```
- Indicador visual según acierto: ✅ exacto / 🎯 diferencia / ✅ ganador / ❌ errado
- Ordenar por puntos obtenidos en este partido (desc)
- **Si el deadline NO pasó**: mostrar mensaje "Los pronósticos de los demás se revelan al cerrar la edición."

### Tab "Mi pronóstico"
Card grande con:
- Tu pronóstico: 2-1
- Resultado real (si finalizado): 2-1
- Puntos obtenidos: 6 pts (Resultado exacto)
- Si no pronosticaste: "Se te pasó este partido 😅"

## Lógica de deadline

- Deadline = `partido.fecha_hora - 10 minutos`
- Solo permitir crear/editar pronósticos si `NOW() < deadline`
- Si pasó deadline y no hay pronóstico → mostrar badge 🔒 CERRADO

## Visualización horarios

- Todas las fechas/horas en zona horaria **UTC-4**
- Formato: "MIÉ 17 JUN 2026 — 17:00"
- Para deadline countdown: formato dinámico "2h 15m" / "45 min" / "8 seg"

## Realtime

Suscribirse vía Supabase Realtime a:
- Cambios en `partido_eventos` (para timeline en vivo)
- Cambios en `partidos.resultado_local` / `resultado_visitante` / `estado_partido`
- Cambios en `pronosticos` propios

## Importante

- NO implementar cálculo de puntos aún (es Prompt 6, backend SQL)
- Los `puntos_obtenidos` por ahora se leen como están en DB (0 por defecto)
- Mobile-first, scrolling fluido
- Asegurar que el realtime no rompa la UX (transiciones suaves al aparecer nuevos eventos)

---PROMPT---
