# Modificaciones 15/06

> Bitacora de la sesion del 2026-06-15 con Kira. Estado general: **piloto escrito,
> NO ejecutado**. Se mantiene la **version actual en produccion** hasta que
> Felipe revise en su PC.

---

## 1. Rediseno visual estilo WC26 (PILOTO, sin activar)

Implementado de forma **aditiva** (no rompe nada). Vive en ruta aparte
`/partidos-wc`. La app actual (`/partidos`) queda intacta.

**Archivos nuevos**
- `app/src/lib/temaWC.ts` -- fuente unica: estado -> marco/glow (DRY).
- `app/src/components/TarjetaPartidoWC.tsx` -- tarjeta pro (v2 con marcador menta).
- `app/src/pages/PartidosWC.tsx` -- pagina piloto (reusa hooks de datos).

**Ediciones aditivas**
- `app/index.html` -- fuente Anton (Google Fonts).
- `app/tailwind.config.js` -- paleta `neon.*` + `font-display`.
- `app/src/index.css` -- utilidades `.marco-wc`, `.glow-neon`, `.astillas-wc`, `.titulo-wc`.
- `app/src/components/Flag.tsx` -- prop opcional `rect` (rectangulo redondeado; el circulo sigue por defecto).
- `app/src/App.tsx` -- ruta `/partidos-wc`.

**Como se ve la tarjeta (segun refs 1000278585/586)**
- Programado -> cuadrado blanco con "V" + hora arriba.
- En vivo / Final -> pildora MENTA con el marcador (numeros negros), top center con estado / "FIN".
- Etiqueta de grupo/fase vertical al costado derecho.
- Marco que codifica el estado (en vivo=neon+pulso / programado=sutil / final=apagado).
- Solo dark, banderas en rectangulo, tap sutil, penales debajo si los hay.

**Decisiones tomadas por default (la confirmacion expiro)** -- revisar en PC:
- "V" solo en programados (no "siempre").
- Cajas menta en vivo Y final.
- Etiqueta de grupo vertical a la derecha.
- Si Felipe queria otra cosa, se ajusta SOLO en `TarjetaPartidoWC.tsx`.

**Para verlo:** `cd MIPROYECTO/app && npm run dev` -> `http://localhost:5173/partidos-wc`

---

## 2. PENDIENTE: feature de Formaciones y Jugadores (stand-by)

Idea de Felipe: nueva pestana "Alineaciones" dentro del detalle de partido, con
jugadores (foto, nombre, numero, posicion) y, al final del partido, estadisticas
por jugador. Es valor agregado de experiencia (no afecta el juego/puntos).

**Falta confirmar (en PC, con la HIGHLIGHTLY_KEY):**
1. Highlightly devuelve `lineups` + `formation`?
2. Trae FOTO del jugador (URL)? (cuello de botella; si no, fallback Avatar).
3. Stats por jugador en plan free?

**Diseno propuesto (cuando se decida):**
- DB: 2 columnas JSONB en `partidos` (`alineaciones`, `jugador_stats`) -- mismo patron que `estadisticas`. Cero tablas nuevas (YAGNI).
- Robot: extender `robot/enriquecer.py` (lineups pre-partido + stats post-partido).
- Front: pestana nueva en `PartidoDetalle`, cancha vertical con la formacion.

---

## 3. PENDIENTE: nueva distribucion del timeline en Detalle de partido

> IMPORTANTE: este cambio es **independiente del estilo visual final** que se
> decida (sirve tanto para la version actual como para el rediseno WC26). Es un
> cambio de **distribucion/UX** del timeline de eventos, no de paleta.
> Objetivo de Felipe: "mas simple, mas limpia y mas linda".
> Refs: Downloads/1000278601.png (Destacado) y 1000278602.png (Todos).

Aplica a la pantalla `app/src/pages/PartidoDetalle.tsx` (pestana de eventos).

**Como debe verse el timeline:**
- **Espina vertical central** que recorre el partido (arriba=final, abajo=inicio).
- **Eventos a izquierda o derecha** segun el equipo (local un lado, visita el otro).
- **Chips de fase centrados** en la espina con el marcador parcial:
  "Fin de los 90 minutos 7 - 1", "Entretiempo 3 - 1", etc.
- **Icono central** junto al minuto segun el tipo de evento:
  - Gol -> balon.
  - Penal -> badge "P" amarillo con check verde (minuto en rojo, ej. 45'+5).
  - Cambio -> flecha verde arriba (entra) + flecha roja abajo (sale).
  - Penal fallado/atajado -> icono de arco.
- **Gol:** nombre del jugador en negrita + asistente debajo en gris.
- **Cambio:** entra (verde) / sale (gris) con sus flechas.
- **Minuto** pegado a la espina.
- **Dos sub-pestanas:** "Destacado" (solo goles/clave) vs "Todos" (todos los eventos).

**Notas de implementacion (para cuando se haga):**
- Los datos YA existen: `partido_eventos` (tipo gol/amarilla/roja/cambio, equipo
  local/visita, minuto, jugador, asistencia, detalle penal/autogol). No requiere
  cambios de DB ni de los robots.
- La pestana "Destacado" filtra tipo=gol (y quiza tarjetas rojas); "Todos" muestra
  todo. Reusar componentes/iconos existentes (`Iconos.tsx`) donde se pueda (DRY).
- Sumar minuto_adicional cuando exista (ej. 45'+5).

---

## 4. Decisiones del dia

- Se MANTIENE la version actual en produccion.
- El piloto WC26 queda escrito pero NO se propaga hasta revisar en PC.
- Logo Tormenta adaptado: lo entrega Felipe en PNG alta-res (transparente).

---

## 5. Proximos pasos (cuando Felipe vuelva a su PC)

- [ ] Visualizar `/partidos-wc` y decidir ajustes de la tarjeta.
- [ ] Decidir si se propaga el estilo al detalle de partido y al resto.
- [x] Definir/implementar la nueva distribucion del timeline en Detalle de partido (item 3). HECHO: componente `app/src/components/TimelinePartido.tsx` (espina central, eventos local/visita, chips de fase con marcador parcial, sub-pestanas Destacado/Todos).
- [ ] Entregar el logo PNG para reemplazar el placeholder de cabecera.
- [ ] (Feature aparte) Probar Highlightly para alineaciones/jugadores.
