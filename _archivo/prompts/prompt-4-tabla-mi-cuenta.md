# 🎯 Prompt 4 — Tabla de posiciones + Mi cuenta

> **Objetivo**: Leaderboard global con criterios de desempate + perfil personal de cada jugador.
> **Tiempo estimado de validación**: 10 min.

---

## 📋 Cómo usar este prompt

1. Asegurate de que Prompts 1, 2 y 3 funcionan.
2. Para probar la tabla, insertá manualmente algunos `puntos_obtenidos` en `pronosticos` desde Supabase.
3. Pegá el bloque de abajo como cuarto mensaje.

---

## ✅ Checklist de validación

- [ ] Veo los 8 jugadores ordenados por puntos (desc)
- [ ] Top 3 con 🥇🥈🥉
- [ ] Tap en un jugador me muestra sus pronósticos pasados (no los actuales)
- [ ] En "Mi cuenta" veo mis stats personales y mis 8 predicciones especiales
- [ ] Puedo editar mi seudónimo desde "Mi cuenta"
- [ ] Hay botón "Cerrar sesión" funcional

---

---PROMPT---

Implementa las pantallas **"Tabla"** (tab 2) y **"Mi cuenta"** (tab 3).

---

# 🏆 Tab "Tabla" — Tabla de posiciones

## Header
- Título: "Tabla de Posiciones"
- Subtítulo: "Actualizada en tiempo real"
- Botón pequeño "ℹ️ Sistema de desempate" arriba derecha → abre modal con criterios

## Estructura de cada fila
Card horizontal por jugador, ordenado por puntos descendente:

```
┌──────────────────────────────────────────────┐
│ #1 🥇  Felipe (seudónimo)        125 pts  ↑2 │
│        ✓ 12 exactos · ✓ 18 dif · ✓ 24 gan    │
└──────────────────────────────────────────────┘
```

Datos a mostrar:
- **Posición**: #1, #2, ..., con medalla 🥇🥈🥉 en top 3
- **Nombre visible**: `seudonimo` si existe, sino `nombre_real`
- **Puntos totales**: suma de `puntos_obtenidos` en todos sus pronósticos + puntos de predicciones especiales
- **Variación**: flecha ↑2 verde, ↓3 roja, = gris (vs ranking previo guardado)
- **Stats compactas**: cantidad de marcadores exactos, diferencias acertadas, ganadores acertados

Estilos:
- Card del jugador logueado: borde rojo `#E3000F` para destacar
- Top 3: fondo ligeramente más claro `#222222`
- Resto: fondo `#1A1A1A`

## Ordenamiento (sistema de desempate)
Aplicar este orden en SQL:
1. `puntos_totales` DESC
2. Cantidad de marcadores exactos DESC
3. Cantidad de diferencias acertadas DESC
4. Cantidad de ganadores acertados DESC
5. Si sigue empate → comparten posición

## Tap en fila de jugador
Abrir pantalla de detalle con:
- Header: foto/avatar + nombre + puntos totales + posición
- Tabs: "Pronósticos" / "Predicciones especiales"
- En "Pronósticos": lista de pronósticos del jugador **solo de partidos cuyo deadline ya pasó** (no se pueden ver pronósticos activos)
- En "Predicciones especiales": las 8 predicciones (esto es público una vez iniciado el Mundial)

## Modal "Sistema de desempate"
Mostrar la siguiente lista:
1. Mayor cantidad de marcadores exactos
2. Mayor cantidad de diferencias de goles acertadas
3. Mayor cantidad de resultados acertados (ganador/empate)
4. Mejor pronóstico de la final (exacto > diferencia > ganador)
5. Si persiste el empate → comparten posición

---

# 👤 Tab "Mi cuenta" — Perfil personal

## Header
- Avatar circular (inicial del nombre con fondo rojo)
- Nombre real + seudónimo entre paréntesis
- Botón pequeño "✏️ Editar seudónimo" (abre modal con input)
- Posición actual y puntos totales

## Sección "Estadísticas"
Grid de 2x2 con cards:
- ✅ **Aciertos exactos**: X / Y partidos
- 🎯 **Diferencias acertadas**: X
- 🏆 **Ganadores acertados**: X
- 📊 **% de aciertos**: XX%

## Sección "Mis predicciones especiales"
Card con las 8 predicciones (lectura solamente):
- 🏆 Campeón: [equipo] — [X pts]
- 🥈 Finalistas: [equipo 1], [equipo 2] — [X pts]
- 🎯 Semifinalistas: [4 equipos] — [X pts]
- ⚽ Goleador: [nombre] — [X pts]
- 🌟 Mejor jugador: [nombre] — [X pts]
- 🧤 Mejor arquero: [nombre] — [X pts]
- 👶 Mejor joven: [nombre] — [X pts]

Si el Mundial NO empezó: mostrar texto "Estas predicciones se bloquean al iniciar el primer partido."

## Sección "Historial de pronósticos"
Lista colapsable con todos los pronósticos del usuario:
- Partido (equipos + fecha)
- Tu pronóstico vs resultado real
- Puntos obtenidos

## Sección inferior
- Botón "Cerrar sesión" (color rojo outline, NO sólido)
- Texto pequeño abajo: "La Tormenta Mundial 2026 ⚡ v1.0"

## Modal "Editar seudónimo"
- Input de texto (max 20 caracteres)
- Botones "Cancelar" y "Guardar"
- Al guardar → UPDATE en `usuarios.seudonimo` y refrescar UI

---

## Importante
- Todos los cálculos deben hacerse con queries SQL (no en frontend) para performance
- Usar Supabase Realtime para refrescar tabla cuando cambien puntos de algún jugador
- Mobile-first, scrolling vertical fluido
- NO implementar gráficos complejos aún (se evalúa en Prompt 5 si sobra margen)

---PROMPT---
