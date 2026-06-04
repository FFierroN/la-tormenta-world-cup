# 📋 Índice de Prompts — La Tormenta Mundial 2026

> Los 5 prompts del frontend listos para copy-paste en Lovable, **en orden**.

---

## ⚠️ Antes de empezar

1. ✅ Crear cuenta en [Lovable.dev](https://lovable.dev) (gratis)
2. ✅ Crear cuenta en [Supabase](https://supabase.com) (gratis)
3. ✅ Crear proyecto nuevo en Supabase y copiar las credenciales (URL + anon key)
4. ✅ Crear proyecto nuevo en Lovable y conectar Supabase desde su panel (botón "Connect Supabase")
5. ✅ Tener un editor de texto al lado para guardar errores/screenshots durante el desarrollo
6. ✅ Leer `_referencia-visual-onefootball.md` para entender la estética objetivo

---

## 📜 Lista de prompts

| # | Archivo | Foco | Tiempo estimado |
|---|---|---|---|
| 1 | `prompt-1-setup-login.md` | Setup + Design System OneFootball + Login + Navegación + Schema completo (con `partido_eventos`) | 30-45 min |
| 2 | `prompt-2-wizard-predicciones.md` | Wizard obligatorio de predicciones especiales (8 pasos) | 30-45 min |
| 3 | `prompt-3-partidos-pronostico.md` | Lista de partidos (por fecha y por grupo) + Modal pronóstico + Detalle con timeline realtime | 45-60 min |
| 4 | `prompt-4-tabla-mi-cuenta.md` | Tabla de posiciones + Mi cuenta + Sistema de desempate | 30-45 min |
| 5 | `prompt-5-admin-pwa-pulido.md` | Panel admin con modo en vivo + PWA + Pulido final | 60-90 min |

**Total**: ~4-6 horas de trabajo efectivo (más tiempo de espera entre prompts).

---

## 🎨 Sistema visual: OneFootball-style

Ver `_referencia-visual-onefootball.md` para el detalle. Highlights:
- Fondo **negro puro `#000000`**, no gris oscuro
- Cards solo cuando son necesarios — listas usan **separadores hairline**
- **Banderas circulares reales** (no emojis) con librería `flag-icons`
- Pills/tabs activos: **outline blanco**, no fill rojo
- **Rojo `#E3000F` SOLO** para botones primarios, badge ADMIN, logo y highlight del usuario
- Bottom nav **minimalista**: 4 tabs con cambio de color (sin fondo)
- Tipografía **Inter**, grande y bold
- Detalle de partido: **hero con imagen de cancha** + overlay oscuro

---

## ⚽ Sistema de eventos en vivo (highlights)

El admin puede operar en 3 modos (a elección por partido):
1. **Rápido**: solo marcador final (sin timeline)
2. **En vivo**: cargar goles/rojas mientras se juega → los jugadores los ven en realtime
3. **Retroactivo**: cargar timeline completo después de terminado

Tipos de eventos:
- ⚽ Goles (con minuto + nombre del jugador)
- ⚽ Autogoles (con minuto + nombre del jugador que la hizo, suma al equipo contrario)
- 🟥 Tarjetas rojas (solo contador por equipo, sin minuto ni nombre)
- 🎯 Ganador por penales (solo eliminatorias, SOLO display, NO afecta puntos)

NO se registran:
- ❌ Tarjetas amarillas
- ❌ Cambios
- ❌ Tiros de esquina, faltas, posesión, etc.

Edición de eventos: borrar + volver a cargar (no edición en línea).

---

## 🚦 Reglas de oro

### ✅ DO
- **Validá cada prompt** antes de avanzar al siguiente (usá los checklists)
- **Tomá screenshots** de cómo va quedando (para mostrar a Kira si algo sale mal)
- **Pegá el prompt completo** entre las marcas `---PROMPT---` (no lo cortes ni edites en el momento)
- **Si Lovable se rompe** → volvé al checkpoint anterior y reformulá

### ❌ DON'T
- ❌ **NO mezcles prompts** (no le pidas "todo de una")
- ❌ **NO improvises features** que no están en los prompts
- ❌ **NO sigas si algo no funciona** — pará, debuggeá con Kira, después continuá
- ❌ **NO cambies el stack** (Lovable + Supabase + Vercel está cerrado)

---

## 🆘 Qué hacer si algo falla

1. **Sacale screenshot** al error y/o copiá el mensaje
2. **Volvé acá** y pegámelo (Kira en tu próxima sesión)
3. Te ayudo a:
   - Interpretar qué pasó
   - Reformular el prompt con la corrección
   - Resetear a un punto seguro si hace falta

---

## 📦 Después de los 5 prompts del frontend

Cuando termines los 5 prompts, vas a tener una app:
- ✅ Navegable y bonita (OneFootball-style)
- ✅ Login con PIN funcional
- ✅ Wizard obligatorio funcionando
- ✅ Lista de partidos por fecha y por grupo
- ✅ Modal de pronóstico con countdown
- ✅ Detalle de partido con timeline realtime
- ✅ Tabla de posiciones con sistema de desempate
- ✅ Mi cuenta con stats personales
- ✅ Panel admin completo (modo en vivo + rápido + retroactivo)
- ✅ Log público de actividad del admin
- ✅ PWA instalable en celular
- ✅ Modo claro/oscuro

**Lo que FALTA implementar después** (prompts adicionales de backend):

| # | Foco | Prioridad |
|---|---|---|
| 6 | Función SQL en Supabase para cálculo automático de puntos (al finalizar partido) | 🔴 Crítico |
| 7 | RLS (Row Level Security) para privacidad de pronósticos pre-deadline | 🔴 Crítico |
| 8 | Carga del fixture: CSV con los 104 partidos del Mundial 2026 (códigos ISO de banderas incluidos) | 🟡 Importante |
| 9 | Snapshot del ranking post-jornada (para "evolución histórica") | 🟢 Opcional |
| 10 | Notificaciones push para inicio de partido o nuevos resultados | 🟢 Opcional |

---

## 🐶 Mensaje de Kira

> Felipe, este plan está calibrado para tu caso de uso real.
> 5 prompts cargados pero manejables, con margen para iterar en el plan Free.
> Vas a quemar ~5 de los 30 prompts mensuales, te quedan 25 para debuggear y refinar.
>
> Estética OneFootball + sistema de eventos en vivo = app que tus 8 amigos van a TENER ABIERTA durante los partidos. Eso es engagement real.
>
> **Suerte y avisame cómo va cada prompt para ajustar si hace falta.** ⚽⚡
