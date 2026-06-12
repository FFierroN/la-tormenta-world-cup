# Robot de enriquecimiento (Highlightly -> Supabase)

> Este robot es el de POST-partido. El marcador EN VIVO lo maneja el Cloudflare
> Worker (carpeta `worker-vivo/`), NO este. Vision general en `APIS-Y-BOTS.md`.

Despues de que un partido termina, rellena lo que worldcup26.ir no entrega:
asistencias, tarjetas, sustituciones (cambios) y estadisticas.

## Que hay en esta carpeta

| Archivo | Rol | Estado |
|---|---|---|
| `enriquecer.py` | Llama a Highlightly y escribe eventos + stats post-partido | ACTIVO (GitHub Actions) |
| `comun.py` | Helpers compartidos (Supabase REST, mapa `EQUIPOS`, casts) | ACTIVO |
| `actualizar.py` | Robot del marcador en vivo via worldcup26.ir | LEGACY: ya no corre |
| `requirements.txt` | Dependencias (requests) | - |

> `actualizar.py` fue el robot del marcador en vivo cuando corria en GitHub.
> Se reemplazo por el Cloudflare Worker (el cron de GitHub se estrangulaba en
> horas pico). Se conserva como fuente del port a JavaScript y por si se
> necesita, pero NO se ejecuta en el workflow actual.

## Como funciona enriquecer.py (en simple)

```
  [Highlightly]  --(GitHub Actions, cada 10 min jun/jul)-->  [Supabase]  --realtime-->  app
```

- Corre en `.github/workflows/sync.yml` (job `enriquecer`).
- Para cada partido en estado `final` que aun no se enriquecio, llama UNA vez a
  Highlightly y escribe:
  - `partido_eventos`: goles (con asistidor), amarillas, rojas y cambios.
  - `partidos.estadisticas` (JSONB): posesion, tiros, etc.
- Da ~20 min de gracia tras el pitazo (para que Highlightly cierre los datos).
- El minuto del cambio (`Substitution`): `player` = quien entra (campo `jugador`),
  `substituted` = quien sale (campo `asistencia`).

## Cuota de Highlightly (free: 100 req/dia)

- Auto-gatillo: si no hay partidos finalizados pendientes, sale sin gastar requests.
- 1 GET `/matches/{id}` por partido finalizado, una sola vez. En el dia mas
  cargado del mundial: ~10-15 requests.
- Si recibe 429 (limite diario), corta y sigue en la proxima corrida.

## Secretos (GitHub -> Settings -> Secrets and variables -> Actions)

- `SUPABASE_URL` -> `https://TUPROYECTO.supabase.co`
- `SUPABASE_SERVICE_KEY` -> la `service_role` key (secreta, salta el RLS).
- `HIGHLIGHTLY_KEY` -> la api key (header `x-rapidapi-key`).

> Nunca van en el codigo ni en el frontend. El frontend usa la `anon` key.

## Disparo manual y modos

- GitHub -> Actions -> "Enriquecer eventos" -> Run workflow.
- `MODO=auto` (default): solo los finalizados no enriquecidos, con la gracia cumplida.
- `MODO=todos`: re-enriquece TODOS los finalizados (util para rehacer un dia).

## Migraciones de base relacionadas

- `db/FIX-highlightly-stats.sql` -> columna `partidos.estadisticas`.
- Los cambios (sustituciones) NO necesitan migracion (`tipo` es texto libre).

## Mantenimiento

- Si en el log aparece `SIN MATCH en HL` o `SIN MAPEAR`, el nombre de equipo no
  coincide. Agregalo al diccionario `EQUIPOS` en `comun.py` (y en
  `worker-vivo/src/index.js`, que tiene su propia copia).
- El admin manual sigue siendo el respaldo: si Highlightly falla, se cargan los
  eventos a mano desde el panel admin y se preservan al re-enriquecer.
