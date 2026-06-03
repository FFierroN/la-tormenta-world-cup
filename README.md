# ⚽ Prode Mundial 2026 — Proyecto Personal

> App de pronósticos del Mundial de Fútbol 2026 para jugar entre 8 amigos.

---

## 📖 Cómo leer esta documentación

> **⚠️ Si volves después de tiempo o sos una IA en nueva sesión: leé `contexto-proximas-sesiones.md` PRIMERO.**

### Orden recomendado de lectura:
1. 📄 **`README.md`** ← estás acá (visión general)
2. 🧠 **`contexto-proximas-sesiones.md`** (handover para nuevas sesiones)
3. ✅ **`decisiones-tomadas.md`** (todo lo cerrado, no re-discutir)
4. ❓ **`pendientes.md`** (lo que falta decidir)
5. 📋 **`plan-15-prompts.md`** (plan de desarrollo detallado)
6. 🧠 **`faq-tecnico.md`** (aprendizajes técnicos clave)
7. 📝 **`decisiones-clave.md`** (template original con preguntas)

---

## 🎯 ¿Qué es?

Una aplicación móvil (PWA) donde 8 amigos pueden:
- 📝 Pronosticar los resultados de todos los partidos del Mundial 2026
- 🏆 Acumular puntos según reglas predefinidas
- 📊 Ver una tabla de posiciones actualizada en tiempo real
- 🥇 Determinar un ganador al final del torneo

---

## 📋 Características clave

- 👥 **Usuarios**: 8 amigos (cerrado, no público)
- 📱 **Plataforma**: PWA (Progressive Web App) — funciona en iOS y Android sin App Store / Play Store
- ⏱️ **Vida útil**: Mundial 2026 (11 jun - 19 jul)
- 💰 **Costo**: $0 - $20 USD
- 🔧 **Admin**: 1 jugador (Felipe) con permisos extra para cargar resultados

---

## 🛠️ Stack técnico

| Componente | Herramienta | Plan |
|---|---|---|
| Generador con IA | [Lovable.dev](https://lovable.dev) | Free → Pro si hace falta |
| Backend + DB | [Supabase](https://supabase.com) | Free (suficiente) |
| Hosting | [Vercel](https://vercel.com) | Hobby (gratis) |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────┐
│  📱 PWA generada por Lovable        │
│  - Login con PIN                    │
│  - Lista de partidos                │
│  - Ingreso de pronósticos           │
│  - Tabla de posiciones (realtime)   │
│  - Panel admin (solo Felipe)        │
└─────────────────────────────────────┘
              ↕️
┌─────────────────────────────────────┐
│  ⚙️ Supabase                        │
│  - Tablas: usuarios, partidos,      │
│    pronósticos, admin_log           │
│  - Row Level Security (privacidad)  │
│  - Realtime para leaderboard        │
│  - Cálculo de puntos automático     │
└─────────────────────────────────────┘
              ↕️
┌─────────────────────────────────────┐
│  🌐 Hosting: Vercel                 │
└─────────────────────────────────────┘
```

---

## 📅 Plan de ejecución: 15 prompts en 3 días

| Día | Foco | Prompts | Estado al final |
|---|---|---|---|
| 1 | 🏗️ Cimientos | 5 | Login + DB + UI base |
| 2 | ⚙️ Features core | 5 | Pronósticos + puntos + leaderboard |
| 3 | ✨ Pulido + PWA | 5 | App instalable + admin panel |

Detalle completo en `plan-15-prompts.md`.

---

## ✅ Decisiones cerradas (highlights)

- ✅ **PWA**, no app nativa
- ✅ **Stack Lovable + Supabase + Vercel**
- ✅ **Carga manual de resultados** vía panel admin en la app
- ✅ **Admin = cuenta jugador con permisos extra** (Opción B)
- ✅ **Pronósticos privados hasta deadline** (regla crítica)
- ✅ **Sistema antitrampa con log público**
- ✅ **15 prompts en 3 días**

Detalle completo en `decisiones-tomadas.md`.

---

## ❓ Decisiones pendientes (resumen)

Antes de poder armar los 5 prompts del Día 1, falta:
1. Nombre y estética de la app
2. Nombres de los 8 jugadores
3. Sistema de puntuación exacto
4. Deadline en minutos
5. Cómo cargar el fixture
6. Idioma y zona horaria

Detalle completo y formato para responder en `pendientes.md`.

---

## 🚨 Notas importantes

- 🏠 **El código real de la app vive en PC personal**, no en máquina corporativa
- 🔐 Nunca subir credenciales, API keys ni PINs a repositorios públicos
- 💾 Backupear regularmente la base de datos de Supabase durante el mundial
- 📂 Esta carpeta tiene solo **planificación**, no código del proyecto

---

## 🐶 Generado y mantenido con Kira (Code Puppy)

Mentoría conversacional para no-coders construyendo proyectos personales con IA.
Esta carpeta es el "cerebro externo" del proyecto entre sesiones.

¡Mucho éxito con el mundial! ⚽🏆
