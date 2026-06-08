# La Tormenta World Cup — Frontend (Vite)

PWA del prode de la World Cup 2026 entre amigos. Reemplaza el frontend que estaba en Lovable
(Lovable ahora fuerza su backend Lovable Cloud). Este frontend se conecta a **tu** Supabase.

## Stack
- Vite + React + TypeScript
- Tailwind CSS (marca: dorado sobre negro)
- @supabase/supabase-js (backend = TU proyecto Supabase)
- vite-plugin-pwa (instalable: Add to Home Screen)

## Correr en local
```bash
cp .env.example .env     # completa con tu URL y anon key de Supabase
npm install
npm run dev
```
Abre http://localhost:5173

> Nota: detras del VPN/proxy de Walmart el `npm install` puede fallar.
> Lo mas limpio es correrlo en tu entorno personal.

## Build + deploy (gratis)
```bash
npm run build            # genera dist/
```
Subir `dist/` a Cloudflare Pages / Netlify / Vercel (HTTPS incluido, requisito de PWA).

## Estado actual
- [x] Scaffold + routing + bottom tabs + PWA manifest
- [x] Tabla de posiciones: pestana "Galeria de avatares" + pestana "Clasica"
- [x] Ver partido: header estilo OneFootball + tabs "Detalles" (goles/rojas) y "Pronosticos"
- [x] UI previsualizable con datos MOCK (src/lib/mock.ts)
- [ ] Conectar a Supabase real (reemplazar mocks por queries + realtime)
- [ ] Login con PIN real (bcrypt via Supabase)
- [ ] Wizard predicciones especiales, panel admin, avatares (Storage)

## Assets a agregar en `public/`
- `estadio.jpg` — fondo del header de partido
- `favicon.svg`, `apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png`
- (los 3 avatares por jugador se cargan via Supabase Storage)

## Importante
Proyecto PERSONAL. No usar infra de Walmart. Datos de los amigos (nombres/PINs)
fuera de git y de cualquier sistema corporativo.
