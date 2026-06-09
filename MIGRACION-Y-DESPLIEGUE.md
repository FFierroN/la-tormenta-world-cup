#  Migración y Despliegue — La Tormenta World Cup

> Guía paso a paso pensada para seguir **sin asustarse y sin romper nada**.
> Cada paso explica el **qué** y el **por qué**. Marca las casillas a medida que avanzas.
>
> **Tu setup elegido:**
> - Mover el proyecto: **Git + GitHub** (ya tienes cuenta)
> - Publicar la app: **Vercel** (gratis, el más simple, auto-deploy)
> - Base de datos: **Supabase** (proyecto creado pero vacío)

---

##  El mapa completo (qué vamos a hacer hoy)

```
  [Esta máquina]                 [GitHub]              [Tu PC personal]
   código + logo   --push-->   repo en la nube  --clone-->  correr local
                                     |
                                     | (conectado)
                                     v
                                  [Vercel]  ---->  app en internet
                                     ^                para los 8 amigos
                                     |
                                [Supabase]  <----  datos reales + login
```

**Idea central:** GitHub es el "punto central". Desde ahí tu PC personal baja el
código, y Vercel lo publica solo. Supabase guarda los datos. Una vez armado,
cada cambio futuro es: editar → `git push` → se publica automático. 

---

##  FASE 1 — Subir el código a GitHub

> **Objetivo:** que tu proyecto viva en la nube (GitHub), para poder bajarlo en
> tu PC y conectarlo a Vercel.
>
> ℹ El commit con tu trabajo de hoy (nombre + logo) **ya está guardado** en el
> git local de esta máquina. Solo falta enviarlo a GitHub.

### 1.1 Crear el repositorio vacío en GitHub
- [ ] Entra a https://github.com e inicia sesión.
- [ ] Arriba a la derecha: **+** → **New repository**.
- [ ] Nombre sugerido: `la-tormenta-world-cup`
- [ ] Visibilidad: **Private** (recomendado — es un proyecto entre amigos).
- [ ]  **NO marques** "Add a README", "Add .gitignore" ni "license".
      El repo debe quedar **100% vacío** (ya tenemos esos archivos acá).
- [ ] Click en **Create repository**.
- [ ] Copia la URL que te muestra (algo como
      `https://github.com/TU-USUARIO/la-tormenta-world-cup.git`).

### 1.2 Conectar y subir (esto lo hacemos juntos desde acá)
Kira correrá estos comandos por ti (solo necesita la URL del paso 1.1):
```bash
git remote add origin https://github.com/TU-USUARIO/la-tormenta-world-cup.git
git push -u origin main
```
- [ ] Te va a pedir login de GitHub la primera vez. Usa tu usuario y un
      **Personal Access Token** (no la contraseña normal). Si no tienes token:
      GitHub → Settings → Developer settings → Personal access tokens →
      "Tokens (classic)" → Generate → marca el permiso **repo** → copia el token.

** Resultado de la Fase 1:** al recargar la página del repo en GitHub, debes
ver todos los archivos (`app/`, etc.). 

---

##  FASE 2 — Correr el proyecto en tu PC personal

> **Objetivo:** ver la app funcionando en tu computador (con los datos mock).

### 2.1 Instalar Node.js (una sola vez)
- [ ] Entra a https://nodejs.org
- [ ] Descarga la versión **LTS** (la del botón de la izquierda, la "recomendada").
- [ ] Instálala con todo por defecto (Siguiente → Siguiente → Finalizar).
- [ ] Para confirmar: abre una terminal (en Windows: "PowerShell") y escribe:
```bash
node --version
npm --version
```
      Si ves dos números de versión, ¡quedó! 

### 2.2 Bajar el proyecto desde GitHub
- [ ] En la terminal, ubícate donde quieras guardar el proyecto, por ejemplo:
```bash
cd Documents
git clone https://github.com/TU-USUARIO/la-tormenta-world-cup.git
cd la-tormenta-world-cup/app
```
>  `git clone` baja TODO el proyecto. Es como "copiar la carpeta", pero
> conectada a GitHub para futuras actualizaciones con `git pull`.

### 2.3 Instalar las librerías y arrancar
```bash
npm install      # descarga React, Vite, Tailwind... (1-2 min la 1ra vez)
npm run dev      # levanta la app
```
- [ ] Abre en el navegador la dirección que aparece (normalmente
      `http://localhost:5173`).
- [ ] Deberías ver el **Login con tu logo** 

> ℹ Verás un aviso amarillo en la consola por falta de `.env`. **Es normal**:
> la app corre con datos de ejemplo hasta que conectemos Supabase (Fase 3).

** Resultado de la Fase 2:** la app corre en tu PC con el logo nuevo.

---

##  FASE 3 — Llenar tu base de datos en Supabase

> **Objetivo:** crear las tablas, reglas y los 104 partidos en tu Supabase vacío,
> y obtener las claves para conectar la app.
>
>  Todos los archivos de la base de datos estan en `MIPROYECTO/db/`.
> La guía detallada de cada uno está en `GUIA-MAESTRA-SUPABASE.txt`.

### 3.1 Ejecutar el setup (UN solo script)
En Supabase → tu proyecto → menú izquierdo **SQL Editor** → **New query**.
- [ ] Abre `db/SETUP-SUPABASE.sql`, copia **TODO** (Ctrl+A, Ctrl+C).
- [ ] Pégalo en el editor y dale **Run**.
- [ ] Al final verás la verificación. Debe decir: `jugadores` = **8**,
      `partidos` = **104**, `partidos_grupos` = **72**.

> Ese único script crea TODO: tablas alineadas al frontend, login por PIN
> seguro, cálculo de puntos, tabla de posiciones, RLS, realtime, los 8
> jugadores (PIN `1234`) y los 104 partidos. Es idempotente: se puede
> re-correr sin romper nada.
>
> Prueba opcional de login: `select * from login_jugador(1, '1234');`
> (debe devolver a Felipe).

### 3.2 (Ya no hace falta importar CSV)
El fixture de 104 partidos viene **incluido** en el script de 3.1.

### 3.3 Obtener las claves de conexión
- [ ] Supabase → **Project Settings** (engranaje) → **API**.
- [ ] Copia dos cosas:
  - **Project URL** → ej. `https://abcdxyz.supabase.co`
  - **anon public** key → una clave larga.
>  La `anon` key es **pública y segura** para el frontend (por eso lleva
> el prefijo `VITE_`). La protección real la dan las reglas RLS del paso B2.

### 3.4 Crear tu archivo `.env` (en tu PC personal)
En la carpeta `app/`:
- [ ] Copia `.env.example` y renómbralo a `.env`
- [ ] Rellénalo con tus claves:
```
VITE_SUPABASE_URL=https://abcdxyz.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-larga
```
- [ ] Reinicia el servidor: corta con `Ctrl+C` y vuelve a `npm run dev`.

>  El `.env` NUNCA se sube a GitHub (está en `.gitignore`). Tus claves
> quedan solo en tu PC y, más adelante, configuradas aparte en Vercel.

** Resultado de la Fase 3:** la app local ahora lee datos reales de Supabase.

---

##  FASE 4 — Publicar en internet con Vercel

> **Objetivo:** que la app tenga una URL pública que puedas compartir a los 8
> amigos para instalarla en su celular (PWA).

### 4.1 Conectar Vercel con GitHub
- [ ] Entra a https://vercel.com → **Sign up** → **Continue with GitHub**.
- [ ] Autoriza a Vercel a ver tus repos.
- [ ] Click en **Add New… → Project**.
- [ ] Elige el repo `la-tormenta-world-cup` → **Import**.

### 4.2 Configurar el proyecto
Vercel suele detectar Vite solo. Verifica que diga:
- [ ] **Framework Preset:** Vite
- [ ] **Root Directory:** `app`   ¡importante! El código está dentro de `app/`,
      no en la raíz. Click en **Edit** y selecciona `app`.
- [ ] **Build Command:** `npm run build` (automático)
- [ ] **Output Directory:** `dist` (automático)

### 4.3 Cargar las variables de entorno
- [ ] En la sección **Environment Variables**, agrega las mismas dos del `.env`:
  - `VITE_SUPABASE_URL` = tu URL de Supabase
  - `VITE_SUPABASE_ANON_KEY` = tu anon key
> Aquí sí van escritas en Vercel (es seguro, es la nube de tu proyecto).
> Por eso NO necesitamos subir el `.env` a GitHub.

### 4.4 Desplegar
- [ ] Click en **Deploy**. Espera 1-2 minutos.
- [ ] Vercel te dará una URL pública, ej.
      `https://la-tormenta-world-cup.vercel.app`
- [ ] Ábrela en tu celular → menú del navegador → **"Agregar a pantalla de
      inicio"** → ¡se instala con tu logo como una app! 

** Resultado de la Fase 4:** app en vivo, instalable, lista para tus amigos. 

---

## FASE 5 - Resultados automaticos con API-Football (opcional)

> **Objetivo:** que los marcadores, el minuto en vivo y los eventos (goles,
> amarillas, rojas con goleador y asistencia) se actualicen SOLOS.
>
> Guia detallada en `robot/README.md`. Resumen:

- [ ] Crea 3 secretos en GitHub (repo -> Settings -> Secrets -> Actions):
      `APIFOOTBALL_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
- [ ] Prueba manual: pestana **Actions** -> *Sincronizar resultados* -> **Run workflow**.
- [ ] Si aparece `SIN MAPEAR: 'X' vs 'Y'` en el log, agrega ese nombre ingles
      a `EQUIPOS` en `robot/actualizar.py`.
- [ ] El robot corre cada 15 min y se frena solo en 95/100 requests del dia.

> El admin manual sigue siendo el respaldo: si la API falla, cargas resultados
> a mano en Supabase y todo sigue igual.

---

##  Cómo trabajar de aquí en adelante (el flujo mágico)

Una vez armado todo, hacer cambios es así de simple:
```bash
# editas algo en el código...
git add .
git commit -m "describe tu cambio"
git push
```
Vercel detecta el push y **republica solo** en ~1 minuto. No tocas nada más. 

---

## 🆘 Si algo se rompe (no entres en pánico)

| Síntoma | Causa probable | Solución |
|---|---|---|
| `npm install` falla | Node mal instalado | Reinstala Node LTS y reinicia la terminal |
| Pantalla en blanco local | Falta `.env` o claves malas | Revisa `.env` y reinicia `npm run dev` |
| Vercel: "build failed" | Root Directory mal puesto | Debe ser `app`, no la raíz |
| App en blanco en Vercel | Faltan las env vars en Vercel | Agrégalas en Settings → Environment Variables y redeploy |
| Login no valida | No corriste el SQL de setup | Pega y corre `db/SETUP-SUPABASE.sql` |
| Robot no actualiza | Faltan secretos en GitHub | Revisa APIFOOTBALL_KEY / SUPABASE_URL / SUPABASE_SERVICE_KEY |
| Robot dice SIN MAPEAR | Nombre de equipo distinto | Agregalo a `EQUIPOS` en `robot/actualizar.py` |

>  Ante cualquier duda o error: cópiame el mensaje exacto y lo resolvemos
> juntos. **Git nos permite volver atrás** si algo sale mal, así que tranquilo:
> no hay forma de "romperlo para siempre".

---

##  Checklist maestro (resumen)

- [ ] **F1** — Repo creado en GitHub + código subido (`git push`)
- [ ] **F2** — Node instalado + `git clone` + `npm install` + `npm run dev` OK
- [ ] **F3** — Pegar `SETUP-SUPABASE.sql` en Supabase + `.env` creado (8/104/72)
- [ ] **F4** — Vercel conectado + env vars + deploy + URL pública
- [ ] **F5** — (opcional) Robot API-Football: 3 secretos + run manual + mapeo

 *Vamos fase por fase. No saltes pasos. Marca cada casilla. Yo te acompaño.*
