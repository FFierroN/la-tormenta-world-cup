# La Tormenta World Cup

> PWA de pronosticos del Mundial 2026 para jugar entre amigos (grupo cerrado de 7 participantes).

---

## Que es

Una aplicacion movil instalable (PWA) donde el grupo puede:

- Pronosticar el resultado de todos los partidos del Mundial 2026.
- Acumular puntos segun las reglas del juego.
- Ver la tabla de posiciones actualizada en tiempo real.
- Hacer predicciones especiales (campeon, finalistas, goleador, premios).
- Seguir cada partido en vivo (marcador y goles casi en tiempo real).

---

## Stack tecnico (el real, a junio 2026)

| Componente | Herramienta | Plan |
|---|---|---|
| Frontend | Vite + React + TypeScript + Tailwind | - |
| PWA | vite-plugin-pwa | - |
| Backend + DB | Supabase | Free |
| Hosting de la app | Cloudflare Pages | Free |
| Marcador en vivo | worldcup26.ir | Free (sin auth) |
| Datos post-partido | Highlightly | Free (100 req/dia) |
| Bot en vivo | Cloudflare Worker (cron 1 min) | Free |
| Bot post-partido | GitHub Actions (cron 10 min) | Free |

> Nota historica: el proyecto empezo pensado para Lovable, pero se abandono
> cuando forzo su backend de pago. El frontend hoy es 100% Vite propio,
> conectado al Supabase personal de Felipe. La capa de datos en vivo tambien
> migro: de API-Football a worldcup26.ir + Highlightly (ver `APIS-Y-BOTS.md`).

---

## Arquitectura

```
                       App (PWA en Cloudflare Pages)
                                  | lee (anon key, respeta RLS)
                                  v
                              Supabase
                          (tablas + RLS + realtime
                           + calculo de puntos por trigger)
                                  ^  ^
              escribe (service key) |  | escribe (service key)
                                  |  |
        Cloudflare Worker --------+  +-------- GitHub Actions
        worldcup26.ir (1 min)           Highlightly (10 min)
        marcador / estado / goles       asistencias / tarjetas /
        EN VIVO                         cambios / stats POST-partido
```

Detalle completo de APIs, bots, secretos y salvaguardas en **`APIS-Y-BOTS.md`**.

---

## Estructura del repositorio

```
MIPROYECTO/
|- app/           -> frontend Vite (el codigo de la app)
|   \- src/
|       |- pages/        -> pantallas (Login, Partidos, PartidoDetalle, Tabla, Admin...)
|       |- components/    -> Avatar, BottomTabs, Flag, RelojVivo, Iconos...
|       \- lib/           -> data.ts (capa Supabase), auth, types, reglas...
|- db/            -> SETUP-SUPABASE.sql + migraciones FIX-*.sql
|- robot/         -> enriquecer.py (Highlightly) + actualizar.py/comun.py (legacy port)
|- worker-vivo/   -> Cloudflare Worker del marcador en vivo
|- .github/       -> workflow de GitHub Actions (enriquecimiento)
|- _archivo/      -> documentacion historica (specs y decisiones de construccion)
\- *.md           -> esta guia, APIS-Y-BOTS.md y MIGRACION-Y-DESPLIEGUE.md
```

---

## Como se juega

- Cada jugador ingresa su pronostico (marcador) antes del cierre de cada partido.
- Sistema de puntos en 4 niveles:
  - Exacto: marcador exacto.
  - Diferencia: misma diferencia de goles (no empate).
  - Acierto: resultado correcto (gana / empate / pierde) pero no la diferencia.
  - Falla: ni el resultado.
- Predicciones especiales con su propio puntaje (campeon, finalistas, semis,
  goleador, mejor jugador, premio Asistidor, etc.).
- Detalle completo del puntaje dentro de la pantalla Reglas de la app.

### Pantalla de detalle del partido (4 pestanas)
1. **Detalles**: timeline de eventos (goles, tarjetas, cambios) con minuto.
2. **Estadisticas**: posesion, tiros, etc. (Highlightly, post-partido).
3. **Pronosticos**: que predijo cada jugador y cuanto sumo.
4. **Tormenta**: desglose por jugador (exacto / diferencia / acierto / falla).

---

## Datos en vivo: que llega y cuando

- **En vivo (Cloudflare Worker, cada 1 min):** estado del partido (en vivo /
  final), marcador y goleadores con minuto.
- **Post-partido (GitHub Actions + Highlightly):** asistencias, tarjetas,
  sustituciones y estadisticas.
- **Limitacion conocida:** worldcup26.ir no entrega el minuto numerico del
  partido, por eso el cronometro no corre solo (necesita un ancla de minuto que
  la API no da). El marcador y los goles si llegan en vivo.

---

## Flujo de trabajo (desarrollo)

Ramas: se trabaja en `cambios-felipe` y se hace fast-forward a `main`.

```bash
# editas algo en el codigo...
git add .
git commit -m "describe tu cambio"
git push origin cambios-felipe
# luego (validado): merge ff a main -> Cloudflare republica la app solo
```

- La **app** (Cloudflare Pages) se republica sola al push a `main`.
- El **Worker** NO se redespliega solo: hay que correr `npx wrangler deploy`
  dentro de `worker-vivo/` (ver `worker-vivo/README.md`).
- Cambios de base de datos: correr el SQL correspondiente en Supabase (idempotente).

---

## Notas importantes

- El build/dev se corre en la PC personal de Felipe (la maquina de trabajo no tiene Node).
- Nunca subir credenciales ni API keys al repo (estan en `.gitignore`).
- El frontend usa la `anon` key (respeta RLS). Los bots usan la `service_role`
  key, que vive solo como secreto en Cloudflare y GitHub.
- El mapa de paises `EQUIPOS` esta duplicado en `worker-vivo/src/index.js` y
  `robot/comun.py`: si aparece un `SIN MAPEAR`, agregar el pais en ambos.
- Conviene respaldar la base de Supabase durante el mundial.
- El repo es privado: `github.com/FFierroN/la-tormenta-world-cup`.

---

## Documentacion relacionada

- `APIS-Y-BOTS.md` -> capa de datos en vivo (APIs, bots, secretos, salvaguardas).
- `worker-vivo/README.md` -> como desplegar y operar el Worker.
- `robot/README.md` -> el enriquecedor de Highlightly (post-partido).
- `MIGRACION-Y-DESPLIEGUE.md` -> guia del despliegue inicial (Cloudflare + Supabase).
- `_archivo/` -> specs y decisiones historicas de la construccion.

---

Mantenido con Kira (Code Puppy). Exito con el mundial.
