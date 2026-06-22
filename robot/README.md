# Robot de enriquecimiento (Highlightly -> Supabase)

> Estos scripts Python son hoy el **RESPALDO MANUAL**. En produccion, todo el
> trabajo automatico (marcador en vivo, tramos, enriquecido y alineaciones) lo
> hace el Cloudflare Worker (carpeta `worker-vivo/`), NO estos scripts. Se
> conservan para correrse a mano si algo se desincroniza. Vision general en
> `../APIS-Y-BOTS.md`.

Lo que rellenan (lo que worldcup26.ir no entrega): asistencias, tarjetas,
sustituciones (cambios), estadisticas y alineaciones.

## Que hay en esta carpeta

| Archivo | Rol | Estado |
|---|---|---|
| `enriquecer.py` | Highlightly -> eventos + stats post-partido | RESPALDO (sync.yml, cron apagado) |
| `alineaciones.py` | Highlightly -> formacion + 11 + banca | RESPALDO (alineaciones.yml, cron apagado) |
| `actualizar.py` | worldcup26.ir -> marcador/estado/goles | RESPALDO (actualizar.yml, cron apagado) |
| `comun.py` | Helpers compartidos (Supabase REST, mapa `EQUIPOS`, casts) | ACTIVO (lo usan los 3) |
| `requirements.txt` | Dependencias (requests) | - |

> Los 3 scripts tienen su equivalente en el Worker (`worker-vivo/src/*.js`), que
> es el que corre en produccion cada minuto. Estos `.py` son el port original y
> la red de seguridad: si el Worker falla o se desincroniza algo, se disparan a
> mano desde Actions (cada uno con su workflow). El cron de los 3 esta apagado.

## Como funciona enriquecer.py (en simple)

```
  [Highlightly]  --(GitHub Actions, A MANO)-->  [Supabase]  --realtime-->  app
```

- Vive en `.github/workflows/sync.yml` (job `enriquecer`), con el **cron apagado**:
  hoy lo dispara el Worker automaticamente; este script es el respaldo manual.
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

- GitHub -> Actions -> elegir el workflow ("Enriquecer eventos", "Cargar
  alineaciones" o "Actualizar marcador") -> Run workflow.
- `MODO=auto` (default): solo los finalizados no enriquecidos, con la gracia cumplida.
- `MODO=todos`: re-enriquece TODOS los finalizados (util para rehacer un dia).
- En `sync.yml` hay ademas un modo `solo` (texto de un partido) para re-enriquecer
  UNO solo gastando 1 llamada a Highlightly.

## Migraciones de base relacionadas

- `db/FIX-highlightly-stats.sql` -> columna `partidos.estadisticas`.
- Los cambios (sustituciones) NO necesitan migracion (`tipo` es texto libre).

## Mantenimiento

- Si en el log aparece `SIN MATCH en HL` o `SIN MAPEAR`, el nombre de equipo no
  coincide. Agregalo al diccionario `EQUIPOS` en `comun.py` (y en
  `worker-vivo/src/index.js`, que tiene su propia copia).
- El admin manual sigue siendo el respaldo: si Highlightly falla, se cargan los
  eventos a mano desde el panel admin y se preservan al re-enriquecer.
