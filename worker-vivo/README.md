# Robot EN VIVO — Cloudflare Worker

Port 1:1 de `robot/actualizar.py` (worldcup26.ir → Supabase), pero corriendo en
el edge de Cloudflare con un **cron de 1 minuto** confiable.

**Por qué:** el cron de GitHub Actions se estrangula/salta corridas en horas de
alta carga (Mundial) y no sirve para frescura de ~1 min. Cloudflare sí.

**Reparto de tareas:**
- **Este Worker** → marcador, estado y goles EN VIVO (cada 1 min, jun/jul).
- **GitHub Actions (`enriquecer.py`)** → asistencias, tarjetas y stats al FINAL
  del partido (Highlightly). No necesita frescura, se queda donde está.

> El Worker se auto-regula: si no hay partidos en vivo ni por empezar, sale sin
> pegarle a worldcup26.ir (solo hace una consulta chica a Supabase).

---

## Desplegar (una sola vez)

Desde la carpeta `worker-vivo/`:

```bash
cd worker-vivo
npm install                 # instala wrangler local

npx wrangler login          # abre el navegador, autoriza tu cuenta Cloudflare

# Cargar los 3 secretos (te los pide por consola, NO quedan en el repo):
npx wrangler secret put SUPABASE_URL          # https://TUPROYECTO.supabase.co
npx wrangler secret put SUPABASE_SERVICE_KEY  # service_role key (la misma de GitHub)
npx wrangler secret put TRIGGER_SECRET        # inventa un token largo (para disparo manual)

npx wrangler deploy         # publica el Worker + activa el cron
```

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

- Editas `src/index.js` y vuelves a correr `npx wrangler deploy`.
- Si agregas un país nuevo, edítalo en el mapa `EQUIPOS` (ojo: también existe
  el mismo mapa en `robot/comun.py` para el robot de Highlightly).

## Apagar el Worker (post-Mundial)

El cron solo dispara en junio/julio (`* * * 6,7 *`), así que en agosto se queda
quieto solo. Si quieres borrarlo del todo: `npx wrangler delete`.
