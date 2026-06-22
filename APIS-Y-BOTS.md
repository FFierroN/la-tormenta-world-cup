# APIs y Bots — cómo se alimentan los datos

> Documento de referencia de la **capa de datos en vivo** de La Tormenta World
> Cup: qué APIs usamos, qué trae cada una, y qué bot hace qué.
> **Nunca se guardan keys aquí** — solo los *nombres* de los secretos y dónde viven.

Última actualización: 2026-06-22.

---

## Resumen en una frase

Dos APIs gratis + un bot principal: el **Cloudflare Worker** hace TODO el trabajo
automatico en un cron de 1 min (marcador en vivo, tramos HT/2T, enriquecido
HT/FT y alineaciones). **GitHub Actions** quedo como **respaldo manual** (cron
apagado) por si algo se desincroniza. Ambos escriben en Supabase; la app solo lee.

```
 worldcup26.ir ──►┐
   (marcador en vivo)  Cloudflare Worker (cada 1 min) ──► Supabase ──► App (PWA)
 Highlightly ────►┘   (marcador + tramos + enriquecido + alineaciones)

 GitHub Actions (workflow_dispatch, a mano) ──► Supabase   [RESPALDO]
```

---

## Las 2 APIs

### 1. worldcup26.ir — marcador EN VIVO
| | |
|---|---|
| Para qué | Marcador, estado (en vivo/final) y goleadores, casi en tiempo real |
| Auth | **Ninguna** (gratis, sin key) |
| Endpoint | `GET https://worldcup26.ir/get/games` (1 request trae los ~104 partidos) |
| **Trae** | marcador, `time_elapsed` (live/—), `finished`, goleadores (nombre + minuto) |
| **NO trae** | minuto numérico del partido, asistencias, tarjetas, penales, cambios |

### 2. Highlightly — datos POST-partido
| | |
|---|---|
| Para qué | Asistencias, tarjetas, sustituciones y estadísticas (al terminar el partido) |
| Auth | Header `x-rapidapi-key` (plan free Basic: **100 req/día**) |
| Endpoints | `GET /matches?leagueId=1635&season=2026&date=YYYY-MM-DD` y `GET /matches/{id}` |
| **Trae** | eventos (goles con asistidor, amarillas, rojas, **sustituciones**), estadísticas, topPlayers |
| Costo real | 1 request por partido finalizado, una sola vez (~10-15/día en el día más cargado) |

> El minuto en vivo, asistencias, tarjetas, penales y cambios **no existen** en
> worldcup26. Por eso Highlightly los rellena después. Trade-off aceptado a
> cambio de tener el marcador en tiempo real.

---

## Los 2 Bots

### Bot 1 — Cloudflare Worker (PRINCIPAL, hace TODO)
- **Carpeta:** `worker-vivo/` (ver su propio `README.md` para desplegar).
- **Qué hace, todo en el mismo cron de 1 min:**
  - **Marcador en vivo** (worldcup26.ir): estado (`en_vivo` / `final`),
    marcador y goleadores. `src/index.js`.
  - **Tramos HT/2T** (Highlightly): detecta entretiempo y segundo tiempo.
    `src/enriquecer.js` → `detectarTramos`.
  - **Enriquecido HT/FT** (Highlightly): asistencias, tarjetas, sustituciones y
    stats, a medio tiempo y al final. `src/enriquecer.js` → `enriquecerPendientes`.
  - **Alineaciones** (Highlightly): formacion + 11 + banca, ~1h antes del
    partido, con throttle de cuota. `src/alineaciones.js`.
- **Frecuencia:** cron cada **1 minuto**, solo junio/julio.
- **Auto-regulado:** cada tarea solo le pega a su API si hay algo en su ventana
  (partido en vivo / en descanso / por empezar). Si no hay nada, sale casi gratis.
- **Por qué Cloudflare y no GitHub:** el cron de GitHub Actions se estrangula en
  horas pico (un Mundial) y saltaba corridas; perdía frescura. Cloudflare corre
  puntual cada minuto.
- **Disparo manual (test):** `GET https://tormenta-vivo.<subdominio>.workers.dev/?key=<TRIGGER_SECRET>`
- **Secretos (en Cloudflare, vía `wrangler secret put`):**
  `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TRIGGER_SECRET` y **`HL_KEY`**
  (Highlightly; necesaria para tramos, enriquecido y alineaciones).

### Bot 2 — GitHub Actions (RESPALDO MANUAL, cron apagado)
Ya no corre por cron. Son 3 workflows que se disparan **a mano** (Actions → Run
workflow) si algo se desincroniza y hay que rehacerlo sin esperar al Worker:

| Workflow | Script | Para qué (respaldo de...) |
|---|---|---|
| `sync.yml` | `robot/enriquecer.py` | enriquecido HT/FT (Highlightly). Modo `todos` rehace todo. |
| `alineaciones.yml` | `robot/alineaciones.py` | alineaciones (Highlightly). |
| `actualizar.yml` | `robot/actualizar.py` | marcador/goles (worldcup26.ir, NO gasta cuota HL). |

- **Por qué se apagaron los cron:** los hace el Worker, puntual cada minuto.
- **Disparo manual:** Actions → elegir el workflow → Run workflow.
- **Secretos (en GitHub → Settings → Secrets → Actions):**
  `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `HIGHLIGHTLY_KEY`.

### Código compartido
- `robot/comun.py`: helpers (Supabase REST, mapa `EQUIPOS`, casts) que usan los
  scripts de respaldo. El Worker tiene su propia copia en `worker-vivo/src/`.
- Los scripts `robot/*.py` y el Worker hacen lo mismo: el Worker es el port a JS
  que corre en producción; los `.py` quedan como respaldo manual y referencia.

---

## Salvaguardas (las respetan ambos bots de marcador)

1. **No degradar el estado:** si la DB ya dice `en_vivo` y la API trae
   `programado` (por un delay del feed), se ignora. Un partido nunca "retrocede".
2. **No pisar valores reales con `null`:** si la API manda un campo vacío, no
   sobreescribe el dato bueno que ya estaba.
3. **Preservar datos manuales del admin:** al re-sincronizar goles, se conservan
   los datos que Felipe cargó a mano (penal/autogol) por (equipo, minuto).

---

##  Mantenimiento — el mapa de países está DUPLICADO

El diccionario de nombres de equipo (inglés → español) existe en **dos**
archivos. Si aparece un `SIN MAPEAR` en algún log, agrega el país en **ambos**:
- `worker-vivo/src/index.js` (constante `EQUIPOS`)
- `robot/comun.py` (constante `EQUIPOS`)

---

## Dónde viven los secretos (resumen)

| Secreto | Cloudflare Worker | GitHub Actions |
|---|:---:|:---:|
| `SUPABASE_URL` | si | si |
| `SUPABASE_SERVICE_KEY` | si | si |
| `TRIGGER_SECRET` | si | — |
| `HL_KEY` (Highlightly) | si | — |
| `HIGHLIGHTLY_KEY` (Highlightly) | — | si |

> Ojo: la key de Highlightly es la MISMA, pero el secreto se llama distinto en
> cada lado: `HL_KEY` en el Worker y `HIGHLIGHTLY_KEY` en GitHub Actions.
> `SUPABASE_SERVICE_KEY` es la `service_role` (la larga `eyJ...`, bypassa RLS).
> Va **solo** como secreto en los bots — nunca en el código ni en el frontend.
> El frontend usa la `anon` key, que respeta Row Level Security.

---

## Migraciones de base de datos relacionadas

- `db/FIX-highlightly-stats.sql` → columna `partidos.estadisticas` (panel de stats).
- `db/FIX-desglose-tormenta.sql` → vista para la pestaña Tormenta.
- Las sustituciones (Fase 3) **no necesitan migración** (`tipo` es texto libre).
