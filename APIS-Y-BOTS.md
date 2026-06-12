# APIs y Bots — cómo se alimentan los datos

> Documento de referencia de la **capa de datos en vivo** de La Tormenta World
> Cup: qué APIs usamos, qué trae cada una, y qué bot hace qué.
> **Nunca se guardan keys aquí** — solo los *nombres* de los secretos y dónde viven.

Última actualización: 2026-06-12.

---

## Resumen en una frase

Dos APIs gratis + dos bots: **Cloudflare** trae el marcador EN VIVO cada 1 min,
y **GitHub Actions** rellena asistencias/tarjetas/stats/cambios al FINAL del
partido. Ambos escriben en Supabase; la app solo lee.

```
 worldcup26.ir ──► Cloudflare Worker (cada 1 min) ──┐
   (marcador en vivo)                                ├─► Supabase ──► App (PWA)
 Highlightly ─────► GitHub Actions (cada 10 min) ───┘
   (datos post-partido)
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

### Bot 1 — Cloudflare Worker (EN VIVO)
- **Carpeta:** `worker-vivo/` (ver su propio `README.md` para desplegar).
- **Qué hace:** lee worldcup26 y actualiza en Supabase el marcador, el estado
  (`en_vivo` / `final`) y los goleadores.
- **Frecuencia:** cron cada **1 minuto**, solo junio/julio.
- **Auto-regulado:** si no hay partido en vivo ni por empezar, no le pega a la
  API (solo una consulta chica a Supabase).
- **Por qué Cloudflare y no GitHub:** el cron de GitHub Actions se estrangula en
  horas pico (un Mundial) y saltaba corridas; perdía frescura. Cloudflare corre
  puntual.
- **Disparo manual (test):** `GET https://tormenta-vivo.<subdominio>.workers.dev/?key=<TRIGGER_SECRET>`
- **Secretos (en Cloudflare, vía `wrangler secret put`):**
  `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TRIGGER_SECRET`.

### Bot 2 — GitHub Actions (POST-partido)
- **Workflow:** `.github/workflows/sync.yml` → corre `robot/enriquecer.py`.
- **Qué hace:** para cada partido finalizado, llama a Highlightly y rellena
  `partido_eventos` (asistencias, tarjetas, cambios) y `partidos.estadisticas`.
- **Frecuencia:** cron cada **10 minutos**, solo junio/julio. No necesita ser
  puntual (es post-partido). Espera ~20 min tras el pitazo (gracia para que
  Highlightly cierre los datos).
- **Disparo manual:** Actions → "Enriquecer eventos" → Run workflow. Modo
  `todos` re-enriquece todos los partidos finalizados.
- **Secretos (en GitHub → Settings → Secrets → Actions):**
  `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `HIGHLIGHTLY_KEY`.

### Código heredado (ya no corre)
- `robot/actualizar.py` + `robot/comun.py`: fue el robot del marcador en vivo en
  GitHub. Sigue en el repo como **fuente del port** al Worker y por si se
  necesita, pero **ya no se ejecuta** (lo reemplazó el Worker de Cloudflare).

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
| `SUPABASE_URL` |  |  |
| `SUPABASE_SERVICE_KEY` |  |  |
| `TRIGGER_SECRET` |  | — |
| `HIGHLIGHTLY_KEY` | — |  |

> `SUPABASE_SERVICE_KEY` es la `service_role` (la larga `eyJ...`, bypassa RLS).
> Va **solo** como secreto en los bots — nunca en el código ni en el frontend.
> El frontend usa la `anon` key, que respeta Row Level Security.

---

## Migraciones de base de datos relacionadas

- `db/FIX-highlightly-stats.sql` → columna `partidos.estadisticas` (panel de stats).
- `db/FIX-desglose-tormenta.sql` → vista para la pestaña Tormenta.
- Las sustituciones (Fase 3) **no necesitan migración** (`tipo` es texto libre).
