# Spec — Rediseño visual estilo FIFA World Cup 2026 (POSIBLE / EN EXPLORACIÓN)

> Estado: **propuesta**, aprobada por Felipe el 2026-06-15. Implementado como
> **piloto aditivo** (ruta `/partidos-wc`) sin tocar la app actual. Pendiente de
> validar en PC y decidir si se propaga al resto del front.

Referencia visual: captura oficial de fifa.com (pantalla "PARTIDOS" del Mundial
2026) — `Downloads/1000278568.png`.

---

## Decisiones cerradas con Felipe

| # | Tema | Decisión |
|---|---|---|
| 1 | **Tipografía** | Fuente gratis parecida a la oficial: **Anton** (con fallback Saira Condensed). Legal y sin costo. |
| 2 | **Marca** | Fusión: tomamos el *estilo* (negro + neón + tipografía brutal) con la marca propia **"La Tormenta "**. NO usar logos/trofeo FIFA. Logo adaptado lo entrega Felipe en **PNG alta-res (fondo transparente)**. |
| 3 | **Alcance** | Piloto en **Partidos + Detalle**; validar y luego propagar con variaciones. |
| 4 | **Decoración** | Neón **con propósito**: brillante solo en destacados (partido en vivo). Resto sobrio. La tarjeta pro va en TODOS los partidos. |
| 5 | **Banderas** | Mantener el componente `Flag` actual; solo se le agrega variante **rectángulo redondeado** (`rect`). |
| 6 | **Accesibilidad** | Clavar el look pero legible en celu (contraste cuidado, sin que se note). WCAG AA como norte. |
| 7 | **Centro tarjeta** | La **"V" de Versus** va en el cuadrado blanco SOLO en partidos **programados** (sin empezar). Refinado el 2026-06-15 con nuevas refs (1000278585/586): en cuanto hay marcador, la "V" cede su lugar. |
| 8 | **Marcador** | Partidos en vivo/final muestran el marcador en una **pildora MENTA** (neon menta) con numeros negros, partida por una linea fina (estilo refs FIFA). Top center: hora (programado) / estado (en vivo) / "FIN" (final). Penales debajo si los hay. |
| 9 | **Agrupación** | Por estado (como hoy). |
| 10 | **Badge** | Etiqueta de grupo/fase **VERTICAL al costado derecho** (rotada, estilo refs). En eliminatoria muestra la fase (OCTAVOS, CUARTOS, SEMIFINALES, FINAL). |
| 11 | **Animaciones** | Solo pulso del "en vivo" + feedback al tocar (tap). Barato y vivo. |
| 12 | **Dark mode** | Solo modo oscuro (negro puro). Se elimina cualquier variante clara. |

---

## El "ADN visual" del estilo WC26

- Fondo **negro puro** (#000).
- Borde **neón multicolor en degradado** (menta → azul → púrpura → naranja) — sello de marca.
- Tipografía **display gigante, condensada, ultra-bold** (Anton).
- Subtítulo en **amarillo/lima neón**, mayúsculas, con tracking.
- Tarjetas tipo **píldora negra** redondeada, con astillas de color y sombras.
- Banderas en **rectángulo redondeado**; "V" en cuadrado blanco; badge de fase arriba.

### El borde de la tarjeta CODIFICA el estado (color con propósito)
- **En vivo / entretiempo** → marco neón degradado + pulso (`glow-neon`).
- **Programado** → borde sutil neutro.
- **Final** → borde apagado + tarjeta levemente atenuada.
- **Te falta pronosticar** → acento lima ("Pendiente").

---

## Archivos del piloto (todo aditivo, no rompe nada)

| Archivo | Qué hace |
|---|---|
| `app/index.html` | + link a Google Fonts (Anton / Saira Condensed). |
| `app/tailwind.config.js` | + paleta `neon.*` y `fontFamily.display`. |
| `app/src/index.css` | + utilidades `.marco-wc`, `.glow-neon`, `.astillas-wc`. |
| `app/src/components/Flag.tsx` | + prop opcional `rect` (rectángulo redondeado). Compatible hacia atrás. |
| `app/src/lib/temaWC.ts` | **Fuente única**: estado → clases de marco/glow/atenuado. |
| `app/src/components/TarjetaPartidoWC.tsx` | La tarjeta pro reutilizable. |
| `app/src/pages/PartidosWC.tsx` | Página piloto (preview), reusa los hooks de datos. |
| `app/src/App.tsx` | + ruta `/partidos-wc` (oculta de los tabs; se navega a mano). |

> El piloto NO modifica `Partidos.tsx` ni `PartidoDetalle.tsx` originales.
> Para verlo: correr la app y entrar a `/partidos-wc`.

---

## Cómo probarlo (cuando Felipe esté en su PC)

```bash
cd MIPROYECTO/app
npm install      # si hiciera falta
npm run dev      # abre la app
# navegar a  http://localhost:5173/partidos-wc
```

Validado el look → se decide propagar al `Partidos.tsx` real y al `PartidoDetalle`.

---

## Pendientes / decisiones futuras

> NOTA 2026-06-15: el marcador menta + etiqueta vertical se implemento con los
> defaults RECOMENDADOS porque la pregunta de confirmacion a Felipe expiro. Si
> Felipe queria otra cosa (ej. la "V" literalmente SIEMPRE con numeros al lado,
> o etiqueta de grupo arriba en vez de vertical), ajustar SOLO
> `TarjetaPartidoWC.tsx` -- el resto del piloto no cambia.

- Reemplazar el placeholder de marca por el **logo Tormenta adaptado** (PNG) cuando Felipe lo entregue.
- Afinar contraste real en dispositivo (lima sobre negro).
- Si gusta, llevar el mismo lenguaje a: Tabla, Copa, Login, Reglas.
- (Stand-by aparte) feature de **alineaciones/formaciones** — ver conversación; no es parte de este rediseño.
