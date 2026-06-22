# Robot EN VIVO — Cloudflare Worker

El bot **principal** del proyecto. Corre en el edge de Cloudflare con un **cron
de 1 minuto** confiable y, en esa misma corrida, hace TODO el trabajo automatico
de datos.

**Por qué:** el cron de GitHub Actions se estrangula/salta corridas en horas de
alta carga (Mundial) y no sirve para frescura de ~1 min. Cloudflare sí.

**Qué hace (todo en el cron de 1 min, jun/jul):**
- `src/index.js` → marcador, estado y goles EN VIVO (worldcup26.ir).
- `src/enriquecer.js` → tramos HT/2T + enriquecido HT/FT (Highlightly):
  asistencias, tarjetas, sustituciones y estadisticas.
- `src/alineaciones.js` → alineaciones (formacion + 11 + banca) ~1h antes del
  partido, con throttle de cuota.

> Los workflows de GitHub Actions (`robot/*.py`) hacen lo mismo pero quedaron
> como **respaldo manual** (cron apagado). Detalle en `../APIS-Y-BOTS.md`.

> El Worker se auto-regula: cada tarea solo le pega a su API si hay algo en su
> ventana (en vivo / en descanso / por empezar). Si no hay nada, sale casi gratis.

---

## Desplegar (una sola vez)

Desde la carpeta `worker-vivo/`:

```bash
cd worker-vivo
npm install                 # instala wrangler local

npx wrangler login          # abre el navegador, autoriza tu cuenta Cloudflare

# Cargar los secretos (te los pide por consola, NO quedan en el repo):
npx wrangler secret put SUPABASE_URL          # https://TUPROYECTO.supabase.co
npx wrangler secret put SUPABASE_SERVICE_KEY  # service_role key (la misma de GitHub)
npx wrangler secret put TRIGGER_SECRET        # inventa un token largo (para disparo manual)
npx wrangler secret put HL_KEY                # api key de Highlightly (tramos/enriquecido/alineaciones)

npx wrangler deploy         # publica el Worker + activa el cron
```

> Son **4 secretos**. `HL_KEY` es la key de Highlightly (la misma que en GitHub
> se llama `HIGHLIGHTLY_KEY`). Sin ella, el marcador en vivo igual funciona,
> pero NO habra tramos, enriquecido ni alineaciones.

## Probar que funciona

1. **Disparo manual** (sin esperar al cron). Abre en el navegador:
   ```
   https://tormenta-vivo.<tu-subdominio>.workers.dev/?key=EL_TRIGGER_SECRET
   ```
   Te devuelve el log en texto plano. Deberías ver algo como:
   ```
   Partidos totales: 104 | relevantes hoy +/-1d: 3
     2 gol(es) sincronizados en México vs Sudáfrica
     OK México vs Sudáfrica -> en_vivo
   Listo.
   ```

2. **Ver logs del cron en vivo:**
   ```bash
   npx wrangler tail
   ```

## Cambios futuros

- Editas `src/index.js` (vivo), `src/enriquecer.js` (tramos/enriquecido) o
  `src/alineaciones.js` (alineaciones) y vuelves a correr `npx wrangler deploy`.
- Si agregas un país nuevo, edítalo en el mapa `EQUIPOS` (ojo: también existe
  el mismo mapa en `robot/comun.py` para los scripts de respaldo).

## Apagar el Worker (post-Mundial)

El cron solo dispara en junio/julio (`* * * 6,7 *`), así que en agosto se queda
quieto solo. Si quieres borrarlo del todo: `npx wrangler delete`.
