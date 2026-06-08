# Guia completa - La Tormenta World Cup (frontend Vite)

> Esta guia explica que se hizo, como ejecutarlo, como conectarlo a Supabase
> y como desplegarlo para tener una app totalmente funcional.

---

## 1. Que se hizo
Frontend reconstruido desde cero en stack libre (Lovable ahora obliga a usar su
backend Lovable Cloud, sin control sin premium). 24 archivos:
- Config: package.json, vite.config.ts (PWA), tailwind.config.js, tsconfig.json, .env.example, .gitignore
- src/lib: supabase.ts (cliente), types.ts (tipos), mock.ts (datos de ejemplo), avatares.ts (logica de avatar por posicion)
- src/pages: Login, Partidos, PartidoDetalle, Tabla, MiCuenta
- src/components: Avatar, Flag, BottomTabs

## 2. Que se logro
- PWA instalable (Add to Home Screen, sin tienda de apps)
- Tabla de posiciones con 2 pestanas: "Galeria de avatares" + "Clasica"
- Pantalla "Ver partido" estilo OneFootball (header estadio + banderas + marcador,
  pestanas "Detalles" con goles/rojas y "Pronosticos" de los 8)
- Navegacion completa con menu inferior
- 100% propio, gratis, sin limites de creditos de IA

## 3. Como ejecutarlo (en computador personal, requiere Node.js)
```bash
cd MIPROYECTO/app
npm install      # una sola vez
npm run dev      # servidor de desarrollo
```
Abrir http://localhost:5173 (se ve con datos MOCK, sin backend).

## 4. Como conectarlo al backend (Supabase)
Paso A - Preparar Supabase (ya disenado):
1. supabase.com -> tu proyecto -> SQL Editor
2. Correr en orden: B0-schema-extras.sql, prompt-6.sql, prompt-7.sql
3. Importar fixture-FINAL-importar.csv (104 partidos) en Table Editor

Paso B - Conectar llaves:
1. Supabase -> Settings -> API: copiar URL y anon key
2. En MIPROYECTO/app crear .env (copia de .env.example) y pegar esos valores

Paso C - Reemplazar mocks por datos reales:
- Hoy las pantallas leen de lib/mock.ts
- Pendiente (lo programa Kira): funciones de fetch a Supabase + realtime (en vivo)
  + login con PIN real (bcrypt)

## 5. Como se veria
- Tema oscuro con acentos dorados sobre negro
- Mobile-first, menu de pestanas abajo
- Galeria: columna de tarjetas grandes con foto que cambia segun posicion
- Ver partido: similar a las capturas de OneFootball (fondo estadio, marcador grande)

## 6. Como desplegarla
```bash
npm run build    # genera dist/ optimizada
```
Subir dist/ a hosting gratuito con HTTPS (requisito PWA):
- Cloudflare Pages / Netlify: arrastrar dist/ o conectar repo GitHub
- Vercel: conectar GitHub
Resultado: una URL (ej tormenta-world-cup.pages.dev) que se comparte a los 8 amigos.
Ellos la abren en el celular y eligen "Agregar a pantalla de inicio".

---

## Estado y pendientes
- [x] Scaffold + routing + PWA + las 2 features (con datos MOCK)
- [ ] Conectar Supabase real (fetch + realtime)
- [ ] Login con PIN real (bcrypt)
- [ ] Assets en public/ (estadio.jpg, iconos PWA)
- [ ] Wizard predicciones especiales, panel admin, avatares (Storage)

## Importante
Proyecto PERSONAL. No usar infra de Walmart. Datos de los amigos (nombres/PINs)
fuera de git y de cualquier sistema corporativo.
