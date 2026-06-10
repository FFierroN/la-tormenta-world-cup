# Pendientes de Felipe — La Tormenta World Cup

> Checklist para ejecutar EN TU PC (la maquina de trabajo no tiene Node).
> Hazlo en este orden. Marca cada casilla. Ante cualquier error, copiame el
> mensaje exacto y lo resolvemos.

---

## Info que necesito de ti (para que Kira avance lo demas)

- [x] ~~Los 12 grupos reales~~ -> RESUELTO: me pasaste el fixture oficial completo
      (`mundial_2026_fixture_completo.csv`) y reconstrui los 104 partidos.
- [x] ~~Zona horaria de los `fecha_hora`~~ -> RESUELTO: el fixture esta en **UTC-4**
      (= hora de Chile / `America/Santiago` en junio). El cron YA esta acotado.
- [x] ~~Visibilidad del repo~~ -> es **PRIVADO** (2000 min/mes de Actions). El cron
      se acoto a la ventana real + solo junio/julio para no pasarse. Igual, si
      quieres cero preocupacion, hacer el repo **publico** = Actions ilimitado
      (tus secretos NO se exponen, viven aparte en Settings).

---

## 0. Traer los cambios

- [ ] Cierra VS Code y cualquier `npm run dev` corriendo (evita el error de
      Windows "Unlink of file .git/objects..." al hacer pull).
- [ ] `git pull` en la carpeta del proyecto.
      - Si igual se traba: reinicia la PC y reintenta.

---

## 1. Corregir el fixture  [HECHO por Kira]

> RESUELTO. Reconstrui los 104 partidos desde tu fixture oficial completo:
> - Fase de grupos: 72 partidos, los 12 grupos con sus 4 equipos y round-robin
>   completo (J1/J2/J3 con equipos reales, fechas y estadios reales).
> - Eliminatorias: 32 partidos como 'Por definir' (se llenan en el torneo) pero
>   con fechas y estadios reales del calendario oficial.
> - Nombres mapeados a los canonicos de la app (Chequia, RI de Iran, Arabia
>   Saudi, Irak, Republica de Corea) para no romper banderas ni el bot.
>
> Ya esta aplicado en `db/fixture-FINAL-importar.csv` y regenerado el
> `db/SETUP-SUPABASE.sql`. **Lo unico que falta de tu lado: re-pegar el SQL en
> Supabase (paso 2).** Como la tabla `partidos` deberia estar vacia (base nueva),
> el INSERT del fixture corregido entra solo.
>
> OJO: si YA habias importado partidos antes, el SQL NO los re-inserta (solo si la
> tabla esta vacia). En ese caso avisame y te paso un script para reemplazarlos
> sin perder pronosticos.

---

## 2. Base de datos (OBLIGATORIO — sin esto los puntos siguen en 0)

- [ ] Abre Supabase -> tu proyecto -> **SQL Editor** -> **New query**.
- [ ] Abre `db/SETUP-SUPABASE.sql`, copia TODO (Ctrl+A, Ctrl+C), pega y **Run**.
- [ ] Verifica al final: `jugadores` = 8, `partidos` = 104, `partidos_grupos` = 72.

> Es idempotente: se puede re-correr sin romper nada. Este paso aplica el fix de
> puntos en vivo y las columnas nuevas (activo / ajuste_puntos / **minuto_at** +
> el trigger del cronometro en vivo). El auto-gatillo del bot no necesita nada
> extra aqui.

---

## 2.5. ARREGLAR LA HORA DE LOS PARTIDOS (tu base YA esta viva)  [URGENTE]

> Bug encontrado: los partidos se cargaron con la hora en UTC-4 pero SIN el
> offset, asi que quedaron guardados 4 horas ANTES de lo real. La app mostraba
> 11:00 cuando el partido es a las 15:00 (hora Chile). Esto te cerraria los
> pronosticos antes de tiempo Y haria que el bot NO se dispare durante el
> partido real (perderias resultados/minuto en vivo automaticos).
>
> Ya lo arregle en la fuente (`SETUP-SUPABASE.sql` nuevo inserta con `-04`), pero
> como tu base YA tiene los partidos cargados, el INSERT no se re-ejecuta. Por eso
> hay un script aparte que corrige los que ya estan:

- [ ] Supabase -> **SQL Editor** -> **New query** -> pega TODO
      `db/FIX-zona-horaria.sql` -> **Run**.
- [ ] El resultado de abajo debe mostrar `fecha_chile` = **15:00** para
      Mexico vs Sudafrica. Si dice 15:00, quedo perfecto.

> Es IDEMPOTENTE: si lo corres dos veces, la segunda detecta que ya esta bien y
> no vuelve a desplazar. Si en vez de eso BORRAS y recreas la base con el SETUP
> nuevo, NO necesitas este fix (ya entra con la hora correcta).

---

## 3. Correr la app en local (para ver y probar)

- [ ] En la terminal: `cd app`
- [ ] Si es la primera vez en esta PC: `npm install`
- [ ] Crea/confirma el archivo `app/.env` con:
      ```
      VITE_SUPABASE_URL=https://TUPROYECTO.supabase.co
      VITE_SUPABASE_ANON_KEY=tu-anon-key
      ```
- [ ] `npm run dev` y abre `http://localhost:5173`
- [ ] Revisa lo nuevo:
  - [ ] Fondo azul marino en toda la app (antes negro).
  - [ ] Login: la foto `inicio.png` entre el logo y "Elegir usuario".
  - [ ] Tabla: pestanas "Fichas" y "Formato antiguo".
  - [ ] Panel admin -> "Gestionar participantes" (baja + ajuste de puntos).
  - [ ] Banner de partido en formato 16:9.
  - [ ] **Partidos con pestanas:** barra deslizable arriba (Proximos | Grupo A..L
        | fases). "Proximos" abre en los partidos del dia. Probar tocar pestanas
        y deslizar; el deep-link desde Grupos debe abrir la pestana correcta.
  - [ ] **Cronometro en vivo:** en un partido marcado `en_vivo`, el minuto debe
        avanzar solo (tickea cada minuto, no salta de 15 en 15). Topa en 45'/90'.
- [ ] OJO: el componente del cronometro (`RelojVivo.tsx`) se escribio sin poder
      compilar aqui (esta maquina no tiene Node). Si `npm run dev` tira un error
      de TypeScript, copiamelo y lo corrijo al toque.
- [ ] Prueba el FIX DE PUNTOS: marca un partido como final con un resultado,
      pon un pronostico que acierte y confirma que ahora SI suma puntos
      (sin importar el orden en que cargues resultado/pronostico).

---

## 4. Publicar en internet — Cloudflare Pages

> Guia completa con capturas mentales en `MIGRACION-Y-DESPLIEGUE.md` (Fase 4).

- [ ] (Si aun no lo hiciste) `git push` para subir los commits a GitHub.
- [ ] Entra a https://dash.cloudflare.com (crea cuenta gratis).
- [ ] **Workers & Pages** -> **Create** -> pestana **Pages** -> **Connect to Git**.
- [ ] Autoriza y elige el repo `la-tormenta-world-cup`.
- [ ] Configura el build:
  - [ ] **Framework preset:** Vite
  - [ ] **Root directory (advanced):** `app`   (IMPORTANTE: el codigo vive en app/)
  - [ ] **Build command:** `npm run build`
  - [ ] **Build output directory:** `dist`
- [ ] **Environment variables (build):** agrega las dos:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] **Save and Deploy**. Espera 1-2 min -> te da una URL `*.pages.dev`.
- [ ] Abre la URL en tu celular -> menu del navegador -> "Agregar a pantalla de
      inicio" -> se instala como app con tu logo.

> El archivo `app/public/_redirects` (ya en el repo) evita el 404 al recargar
> rutas internas. No tienes que tocar nada.

---

## 5. Bot de resultados automaticos — GitHub Actions

> Esto mantiene marcadores, minuto en vivo y eventos al dia solos.
> Guia detallada en `robot/README.md`.

- [ ] Ten a mano: tu key de https://dashboard.api-football.com y, en Supabase
      -> Project Settings -> API, la **service_role** key.
- [ ] En GitHub: repo -> **Settings** -> **Secrets and variables** -> **Actions**
      -> **New repository secret**. Crea los 3:
  - [ ] `APIFOOTBALL_KEY`  = tu key de API-Football
  - [ ] `SUPABASE_URL`     = `https://TUPROYECTO.supabase.co`
  - [ ] `SUPABASE_SERVICE_KEY` = la service_role key (SECRETA, salta el RLS)
- [ ] Prueba manual: pestana **Actions** -> *Sincronizar resultados* ->
      **Run workflow**.
- [ ] Mira el log:
  - [ ] Debe decir cuantos fixtures recibio y lineas "OK equipo vs equipo".
  - [ ] Si aparece `SIN MAPEAR: 'X' vs 'Y'` -> copiame esas lineas y completo
        el diccionario de equipos en `robot/actualizar.py`.

> El bot corre cada 15 min **solo dentro de la ventana de partidos** (15:00-06:00
> UTC = 11:00-02:00 Chile) y **solo en junio/julio**. Fuera de eso duerme (0
> minutos de Actions). **Auto-gatillo:** dentro de la ventana, si no hay partidos
> en vivo ni por empezar, sale sin gastar requests a la API. Se frena en 95/100
> requests del dia. El admin manual sigue siendo el respaldo si la API falla.
>
> NOTA minutos de Actions (repo privado = 2000/mes): con el cron acotado da
> ~1920 min/mes, alcanza pero queda **al filo**. Si un dia con muchos partidos
> alguna corrida pasa de 1 min, cuenta doble. La opcion a prueba de balas es
> hacer el repo **publico** (Actions ilimitado; los secretos NO se exponen).

---

## 6. Imagenes (opcional, mejora visual)

- [ ] `fondo-partido.png` (banner de partido): re-editar a **1440 x 810 px**
      (16:9), lo importante centrado, idealmente < 300 KB. Reemplaza
      `app/public/fondo-partido.png`, `git add` + `commit` + `push`.

> La foto del login (`inicio.png`) ya quedo lista y optimizada. No hay que tocarla.

---

## Flujo para futuros cambios (despues del primer deploy)

```
editas en el codigo -> git add . -> git commit -m "..." -> git push
```
Cloudflare detecta el push y republica solo en ~1 minuto. Si hubo cambios de
base de datos, re-pega `db/SETUP-SUPABASE.sql` en Supabase.

---

## Orden urgente (el Mundial arranca el 11 de junio)

1. git pull
2. Re-pegar SQL en Supabase     (paso 2)
3. **FIX zona horaria**         (paso 2.5)  <- tu base ya esta viva, OBLIGATORIO
4. Secretos del bot + Run       (paso 5)

Lo demas (probar local, imagenes) puede ir despues.
