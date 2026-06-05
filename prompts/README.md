# 📋 Índice de Prompts — La Tormenta Mundial 2026

> 6 prompts de FRONTEND para Lovable + 3 prompts de BACKEND para Supabase.

---

## 📊 Estado actual (junio 2026)

| # | Prompt | Foco | Estado |
|---|---|---|---|
| 1 | `txt/prompt-1.txt` | Setup + Design System + Login + Schema | ✅ EJECUTADO |
| 2 | `txt/prompt-2.txt` | Wizard predicciones especiales (8 pasos) | ✅ EJECUTADO |
| 3 | `txt/prompt-3.txt` | Partidos + Pronóstico + Timeline realtime | ✅ EJECUTADO |
| 4 | `txt/prompt-4.txt` | Tabla posiciones + Mi cuenta | ✅ EJECUTADO |
| 5 | `txt/prompt-5.txt` | Panel admin + PWA + Pulido final | ⏳ PENDIENTE |
| 6 | `txt/prompt-6.txt` | Puntos en vivo + Toggle predicciones + Avatares | ⏳ PENDIENTE |
| B1 | `backend/prompt-6.sql` | SQL: Cálculo automático de puntos + Trigger | ⏳ PENDIENTE |
| B2 | `backend/prompt-7.sql` | SQL: RLS + Realtime + Índices de performance | ⏳ PENDIENTE |
| B3 | `backend/prompt-8-fixture-csv.md` | Carga fixture: 104 partidos del Mundial | ⏳ PENDIENTE |

---

## ⚠️ Antes de empezar (si es nueva sesión)

1. ✅ Cuenta en [Lovable.dev](https://lovable.dev) — ya creada
2. ✅ Cuenta en [Supabase](https://supabase.com) — ya creada y conectada
3. ✅ Leer `_referencia-visual-onefootball.md` para recordar la estética objetivo
4. ✅ Los prompts 1-4 ya están ejecutados — no los volvás a correr

---

## 🎯 Flujo de trabajo recomendado

```
LOVABLE (frontend):
  → Prompt 5 (panel admin + PWA + pulido)
  → Prompt 6 (puntos en vivo + avatares + toggle predicciones)

MIENTRAS LOVABLE TRABAJA → ir a Supabase:
  → backend/prompt-6.sql (cálculo de puntos - CRÍTICO)
  → backend/prompt-7.sql (RLS + realtime + índices)

DATOS:
  → Subir 32 fotos de avatares a Supabase Storage
  → Pegar URLs en panel admin de la app
  → Completar fixture-template.csv con 104 partidos del Mundial
  → Importar CSV en Supabase

PRUEBA:
  → Test end-to-end con partido de prueba
  → Verificar cálculo de puntos con el SQL de test del backend/prompt-6-calculo-puntos.md

LANZAMIENTO:
  → Compartir URL a los 7 amigos con PIN 1234
```

---

## 🎨 Sistema visual: OneFootball-style

- Fondo **negro puro `#000000`**, no gris oscuro
- Listas con **separadores hairline `#1F1F1F`** (sin cards innecesarias)
- **Banderas circulares** con librería `flag-icons` (códigos ISO en tabla `partidos`)
- Pills/tabs activos: **outline blanco**, sin fill rojo
- **Rojo `#E3000F` SOLO** para botones primarios, logo y highlight del usuario logueado
- Bottom nav **minimalista** — solo cambio de color en tab activo, sin fondo
- Tipografía **Inter**, grande y bold, mucho espacio

---

## 🆕 Prompt 6 — Qué agrega (resumen)

**Puntos en vivo:**
- Sección "¿Quién acierta?" en el detalle del partido (en vivo y finalizado)
- Muestra los 8 pronósticos vs el resultado actual + puntos que sacaría cada uno ahora mismo
- Se actualiza en realtime con cada gol que carga el admin
- Incluye bonus por marcador de riesgo

**Toggle admin para predicciones especiales:**
- Switch en el panel admin para abrir/cerrar la edición de picks de campeón, finalistas, etc.
- Los jugadores ven botón "Editar mis predicciones" en "Mi cuenta" solo cuando está habilitado
- Usa tabla `configuracion` (clave/valor) en Supabase

**Avatares dinámicos por posición:**
- 4 avatares por jugador (32 fotos en total), subidos manualmente a Supabase Storage
- El avatar que se muestra depende de la posición actual en la tabla:
  - Posición 1 → avatar_pos1_url
  - Posición 2-4 → avatar_pos2_4_url
  - Posición 5-7 → avatar_pos5_7_url
  - Posición 8 → avatar_pos8_url
- Admin pega las URLs en el panel admin (Camino B — sin upload desde la app)
- Fallback a inicial con fondo rojo si no hay URL cargada

---

## ⚽ Sistema de eventos en vivo (resumen)

El admin puede operar en 3 modos por partido:
1. **Rápido** — solo marcador final, sin timeline
2. **En vivo** — carga goles/rojas mientras se juega (los jugadores ven realtime)
3. **Retroactivo** — carga timeline completo después de terminado

Tipos de eventos registrables:
- Goles (minuto + nombre del goleador)
- Autogoles (minuto + nombre, suma al equipo contrario)
- Tarjetas rojas (solo contador, sin minuto ni nombre)
- Ganador por penales (solo display en eliminatorias, NO afecta puntos)

NO se registran: tarjetas amarillas, cambios, corners, faltas.

---

## 🚦 Reglas de oro

### ✅ DO
- Validá cada prompt antes de avanzar al siguiente
- Tomá screenshots de lo que va saliendo
- Pegá el prompt completo de una sola vez (todo el .txt)
- Si Lovable se rompe → volvé al checkpoint anterior, reformulá más corto
- Las dudas técnicas → consultale a Kira (gratis), no a Lovable (gasta prompts)

### ❌ DON'T
- NO mezcles prompts
- NO improvises features no contempladas
- NO sigas si algo no funciona — pará y debuggeá
- NO cambies el stack (Lovable + Supabase + Vercel está cerrado)

---

## 🆘 Si algo falla

1. Screenshot del error + copiar el mensaje
2. Consultarle a Kira → te ayuda a reformular sin gastar prompts
3. Volvé al checkpoint anterior de Lovable si hace falta

---

## 📦 Qué vas a tener al terminar los 6 prompts

- ✅ App navegable y bonita (OneFootball-style)
- ✅ Login con PIN funcional (8 usuarios hardcodeados)
- ✅ Wizard obligatorio de predicciones especiales al primer login
- ✅ Lista de partidos por fecha y por grupo con mini-tabla de posiciones del grupo
- ✅ Modal de pronóstico con countdown al deadline (10 min antes del partido)
- ✅ Detalle de partido con timeline realtime de goles
- ✅ Sección "¿Quién acierta?" con puntos en vivo durante el partido
- ✅ Tabla de posiciones global con sistema de desempate
- ✅ Avatares dinámicos que cambian según la posición en la tabla
- ✅ Mi cuenta con stats, predicciones especiales y edición si el admin lo habilita
- ✅ Panel admin completo (modo en vivo + rápido + retroactivo + toggle predicciones + gestión de avatares)
- ✅ Log público de actividad del admin (transparencia anti-trampa)
- ✅ PWA instalable en celular (Android e iOS)
- ✅ Modo claro/oscuro con toggle

**Lo que se hace DESPUÉS en Supabase (backend):**
- Cálculo automático de puntos cuando el admin finaliza un partido (SQL trigger)
- RLS básico + índices de performance + realtime habilitado
- Carga del fixture de los 104 partidos del Mundial 2026 (CSV)

---

## 🐶 Nota de Kira

> Felipe, quedan 6 días para el mundial. Con Prompts 5 y 6 cerrás el frontend hoy.
> El backend SQL son 10 minutos en Supabase. El fixture lo cargás en 30 min.
> El 10 de junio la app está en manos de tus amigos.
> Dale que llegamos. ⚽⚡
