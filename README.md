# ⚽ Prode Mundial 2026 — Proyecto Personal

> App de pronósticos del Mundial de Fútbol 2026 para jugar entre 8 amigos.

## 🎯 Objetivo

Crear una aplicación móvil (PWA) donde 8 amigos puedan:
- Pronosticar los resultados de todos los partidos del Mundial 2026
- Acumular puntos según reglas predefinidas
- Ver una tabla de posiciones actualizada en tiempo real
- Determinar un ganador al final del torneo

## 📋 Características clave

- 👥 **Usuarios**: 8 amigos (cerrado, no público)
- 📱 **Plataforma**: PWA (Progressive Web App) — funciona en iOS y Android sin pasar por App Store / Play Store
- ⏱️ **Vida útil**: Desde el inicio hasta el final del Mundial 2026
- 💰 **Costo**: $0 (todo gratis con planes free de Vercel + Supabase)

## 🚨 Reality Check importante

### ❌ Stitch (Google) sola NO basta
Stitch genera **diseños UI bonitos**, pero NO genera apps funcionales con backend, base de datos ni lógica. Es un complemento, no la solución completa.

### ❌ App nativa = mala idea para este caso
Hacer una app descargable en App Store + Play Store implica:
- 💰 Apple Developer: $99 USD/año (obligatorio)
- 💰 Google Play: $25 USD una vez
- 📝 Aprender Swift/Kotlin o React Native/Flutter
- ⏳ Procesos de revisión que pueden tardar semanas
- 🔄 Actualizar = volver a publicar

**Para 8 amigos durante 1 mes, es matar moscas a cañonazos.**

### ✅ Solución: PWA (Progressive Web App)
- 🌐 Los amigos abren una URL en el celular
- 📲 Le dan "Agregar a pantalla de inicio" → ícono como app nativa
- 🚀 Sin tiendas, sin descargas, sin pagos
- 🔄 Actualizas y todos ven cambios al instante
- 📱 Funciona igual en iPhone y Android

## 🛠️ Stack técnico recomendado

| Componente | Herramienta | ¿Por qué? |
|---|---|---|
| **Generador de app con IA** | [Lovable.dev](https://lovable.dev) ⭐ | Diseñada para no-coders, genera apps completas con DB y auth |
| **Alternativas** | [Bolt.new](https://bolt.new) / [v0.dev](https://v0.dev) / [Replit Agent](https://replit.com) | Similares, según preferencia |
| **Diseño UI** | [Stitch de Google](https://stitch.withgoogle.com) | Para mockups visuales que luego pasas a Lovable |
| **Backend + Base de datos** | [Supabase](https://supabase.com) | Free tier generoso, perfecto para 8 usuarios |
| **Hosting** | [Vercel](https://vercel.com) | Deploy con 1 click, gratis, soporta PWA |
| **API de resultados (opcional)** | [API-Football](https://www.api-football.com) | Si quieres resultados automáticos. Si no, los cargas manualmente |

## 🏗️ Arquitectura

```
┌─────────────────────────────────────┐
│  📱 PWA (lo que ven tus amigos)     │
│  - Login simple (nombre + PIN)      │
│  - Ver fixture de partidos          │
│  - Ingresar pronósticos             │
│  - Ver tabla de posiciones          │
└─────────────────────────────────────┘
              ↕️
┌─────────────────────────────────────┐
│  ⚙️ Backend + DB (Supabase)         │
│  - Usuarios (8 amigos)              │
│  - Partidos (fixture mundial)       │
│  - Pronósticos                      │
│  - Resultados reales                │
│  - Puntos calculados                │
└─────────────────────────────────────┘
              ↕️
┌─────────────────────────────────────┐
│  🌐 Hosting: Vercel (gratis)        │
└─────────────────────────────────────┘
```

## 📅 Plan de acción

| Etapa | Tarea | Tiempo estimado |
|---|---|---|
| **1** | Definir las 5 decisiones clave (ver `decisiones-clave.md`) | 1 semana |
| **2** | Crear cuentas: Lovable.dev + Supabase + Vercel | 1 día |
| **3** | Generar la app con prompt maestro en Lovable | 2 semanas |
| **4** | Pruebas internas con 1-2 amigos | 1 semana |
| **5** | Onboarding de los 8 amigos | Días antes del 11/Jun/2026 |

## 📂 Archivos de este proyecto

- `README.md` — Este archivo (visión general)
- `decisiones-clave.md` — 5 decisiones que debes definir ANTES de programar
- `prompt-maestro.md` — Plantilla de prompt para usar con Lovable.dev (a desarrollar)
- `puntuacion.md` — Sistema de puntuación acordado con tus amigos (a definir)

## ⚠️ Notas importantes

- 🏠 **El código real de la app debe vivir en tu PC personal**, no en la máquina corporativa donde se generó esta guía
- 🔐 Nunca subir credenciales, API keys ni PINs de los amigos a un repositorio público
- 💾 Backupear regularmente la base de datos de Supabase durante el mundial

## 🐶 Generado con ayuda de Kira (Code Puppy)

Esta guía fue generada como **mentoría/asesoría**. El desarrollo del proyecto lo harás tú con herramientas IA en tu equipo personal. ¡Mucho éxito! ⚽🏆
