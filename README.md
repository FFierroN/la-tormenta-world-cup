#  La Tormenta World Cup

> PWA de pronósticos del Mundial de Fútbol 2026 para jugar entre 8 amigos.

---

##  ¿Qué es?

Una aplicación móvil instalable (PWA) donde 8 amigos pueden:

-  Pronosticar el resultado de todos los partidos del Mundial 2026
-  Acumular puntos según las reglas del juego
-  Ver la tabla de posiciones actualizada en tiempo real
-  Hacer predicciones especiales (campeón, finalistas, goleador, premios)
-  Coronar a un ganador al final del torneo

---

##  Características

-  **Usuarios:** 8 amigos (grupo cerrado, no público)
-  **Plataforma:** PWA — se instala en iOS y Android sin App Store / Play Store
- ⏱ **Vida útil:** Mundial 2026 (11 jun – 19 jul)
-  **Admin:** un jugador (Felipe) con permisos extra para cargar resultados
-  **Resultados automáticos:** robot que sincroniza marcadores y eventos en vivo

---

##  Stack técnico (el real)

| Componente | Herramienta | Plan |
|---|---|---|
| Frontend | Vite + React + TypeScript + Tailwind | — |
| PWA | vite-plugin-pwa | — |
| Backend + DB | [Supabase](https://supabase.com) | Free |
| Hosting | [Vercel](https://vercel.com) | Hobby (gratis) |
| Datos en vivo | [API-Football](https://dashboard.api-football.com) | Free (100 req/día) |
| Automatización | GitHub Actions | Free |

>  **Nota histórica:** el proyecto empezó pensado para Lovable, pero se
> abandonó cuando Lovable forzó su propio backend de pago. Hoy el frontend es
> 100% Vite propio, conectado al Supabase personal de Felipe.

---

##  Arquitectura

```
┌─────────────────────────────────────┐
│   PWA (Vite + React + TS)         │
│  - Login con PIN                    │
│  - Lista de partidos                │
│  - Ingreso de pronósticos           │
│  - Predicciones especiales          │
│  - Tabla de posiciones (realtime)   │
│  - Panel admin (solo Felipe)        │
└─────────────────────────────────────┘
              ↕
┌─────────────────────────────────────┐
│   Supabase                        │
│  - Tablas: jugadores, partidos,     │
│    pronosticos, partido_eventos,    │
│    predicciones_especiales, config  │
│  - Login por PIN (bcrypt/pgcrypto)  │
│  - Row Level Security (privacidad)  │
│  - Realtime para la tabla           │
│  - Cálculo de puntos por trigger    │
└─────────────────────────────────────┘
       ↑                       ↑
       │ (anon key)            │ (service key)
┌──────────────┐      ┌──────────────────────┐
│   Vercel   │      │   GitHub Actions   │
│  app pública │      │  robot/actualizar.py │
│  para los 8  │      │  ← API-Football      │
└──────────────┘      └──────────────────────┘
```

---

##  Estructura del repositorio

```
MIPROYECTO/
├── app/          → frontend Vite (el código de la app)
│   └── src/
│       ├── pages/        → 11 pantallas (Login, Partidos, Tabla, Admin...)
│       ├── components/    → Avatar, BottomTabs, Flag
│       └── lib/           → data.ts (capa Supabase), auth, types, reglas...
├── db/           → SETUP-SUPABASE.sql (un solo script idempotente)
├── robot/        → actualizar.py + workflow de GitHub Actions
└── *.md          → documentación (esta guía y la de despliegue)
```

---

##  Estado actual

 **Código completo y funcional.** Las 11 pantallas leen datos reales de
Supabase (sin mocks). Lo que falta es **ejecución de despliegue**, no código:

1. ⏳ **Deploy** — publicar la PWA en Vercel (bloquea poder jugar).
2. ⏳ **Robot API** — crear 3 secretos en GitHub (opcional; el admin manual lo cubre).
3. ⏳ **Fixture** — faltan los cruces "Por definir" hasta que haya sorteo de llaves.

 La guía paso a paso está en **`MIGRACION-Y-DESPLIEGUE.md`**.

---

##  Cómo se juega

- Cada jugador ingresa su pronóstico (marcador) antes del cierre de cada partido.
- Sistema de puntos en **4 niveles**:
  -  **Exacto** — marcador exacto (+ bonus)
  - ↔ **Diferencia** — acertaste la diferencia de goles
  -  **Acierto** — acertaste el resultado (gana/empate/pierde)
  -  **Falla** — ni el resultado
- Predicciones especiales con su propio puntaje (campeón, finalistas, semis,
  goleador, mejor jugador, etc.).
- Detalle completo del puntaje dentro de la pantalla **Reglas** de la app.

---

##  Flujo de trabajo (después del primer deploy)

Cada cambio futuro es así de simple:

```bash
# editas algo en el código...
git add .
git commit -m "describe tu cambio"
git push
```

Vercel detecta el push y **republica solo** en ~1 minuto. Si hubo cambios en la
base de datos, vuelve a pegar `db/SETUP-SUPABASE.sql` en Supabase (es idempotente).

---

##  Notas importantes

-  El **build/dev se corre en la PC personal de Felipe** (la máquina de trabajo
  no tiene Node).
-  Nunca subir credenciales, API keys ni el `.env` al repo (están en `.gitignore`).
-  Conviene **respaldar la base de datos** de Supabase durante el mundial.
-  El repo es **privado** en `github.com/FFierroN/la-tormenta-world-cup`.

---

##  Mantenido con Kira (Code Puppy)

¡Mucho éxito con el mundial! 
