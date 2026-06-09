# 🎨 Referencia visual OneFootball (análisis real)

> Análisis de 4 screenshots reales de la app OneFootball que pasó Felipe.
> Esta es la SOURCE OF TRUTH para el design system del Prompt 1.

---

## 🎯 Filosofía visual general

OneFootball es **minimalista, oscuro y respirado**. No usa rojo como acento principal (eso fue mi error inicial). El protagonismo lo tienen:
- **Negro puro de fondo**
- **Tipografía blanca grande y bold**
- **Banderas circulares** como elemento visual fuerte
- **Mucho espacio en blanco** (negro en este caso)
- **Separadores hairline**, no cards

---

## 🎨 Paleta de colores REAL

| Uso | Color | Notas |
|---|---|---|
| Fondo principal | `#000000` | Negro PURO, no gris oscuro |
| Fondo de cards/secciones | `#0F0F0F` o `#121212` | Solo cuando es necesario destacar |
| Separadores entre filas | `#1F1F1F` | Hairline muy sutil |
| Bordes de pills/tabs activos | `#FFFFFF` | Outline blanco, sin fill |
| Texto principal | `#FFFFFF` | Blanco puro |
| Texto secundario | `#9CA3AF` | Gris medio |
| Texto deshabilitado | `#6B7280` | Gris más apagado |
| Acento rojo (solo barras de votación equipo local) | `#EF4444` | Rojo brillante |
| Acento verde (barras visitante) | `#22C55E` | Verde brillante |
| Acento gris (empate en barras) | `#6B7280` | Gris |

**IMPORTANTE**: el rojo NO es dominante. Solo aparece en barras de votación. Para "La Tormenta Mundial 2026" podemos usar rojo como acento de marca (botón principal, logo, badge admin), pero la mayoría de la app es **blanco sobre negro**.

---

## 📐 Componentes clave

### Header de pantalla
```
┌────────────────────────────────────────┐
│ [Avatar 🟡]  Partidos    [📺] [⚙️]    │
└────────────────────────────────────────┘
```
- Avatar circular grande (~48px) arriba izquierda
- Título en blanco bold tamaño grande (~28px)
- Iconos circulares con fondo gris oscuro arriba derecha (~40px)

### Selector de fechas (pills horizontal scrolleable)
```
[📅 Calendario] [Ayer] [⬜ Hoy ⬜] [Mañana] [sáb 6 jun] [dom 7]
```
- Pills con padding generoso
- **Pill activo**: borde blanco 1px outline, sin fill
- **Pill inactivo**: sin borde, fondo `#1A1A1A` muy sutil, texto gris
- Scroll horizontal

### Fila de partido (lista)
```
┌─────────────────────────────────────────┐
│ 🇦🇷 Argentina                           │
│                              17:00   ⭐  │
│ 🇲🇽 México                              │
└─────────────────────────────────────────┘
   ↑ separador hairline ↓
```
- **SIN card visible** — solo separadores hairline `#1F1F1F` entre filas
- Banderas circulares ~32px una arriba de la otra
- Nombre del país en blanco bold ~17px
- Hora en blanco regular ~17px a la derecha
- Estrella outline ~24px a la extrema derecha (favorito)
- Padding vertical generoso entre equipos (~16px)
- No hay "vs" entre equipos, solo se apilan

### Fila con cotizaciones (apuestas)
```
┌─────────────────────────────────────────┐
│ 🇸🇪 Suecia                              │
│                              13:00   ⭐  │
│ 🇬🇷 Grecia                              │
│                                         │
│ [SWE  1.96] [X  2.85] [GRE  3.33]      │
└─────────────────────────────────────────┘
```
- 3 botones outline (border `#2A2A2A`)
- Layout horizontal con código del equipo + cotización

### Detalle de partido
```
┌─────────────────────────────────────────┐
│ [🟢 imagen cancha con overlay oscuro 🟢] │
│ [←]                              [↗]    │
│                                         │
│  🇲🇻         Final del Partido    🇵🇰   │
│              0 - 3                      │
│  Maldivas                       Pakistán│
│                                         │
│           ⚽ 54', 84', 87'              │
└─────────────────────────────────────────┘

[Resumen] [Chat] [Cara a Cara] [Predicciones]
   ↑ tabs pill, outline blanco activo

Acontecimientos clave
┌─────────────────────────────────────────┐
│ ────── Final del Partido 0-3 ──────     │
│                              ⚽ 87'      │
│                              ⚽ 84'      │
│                              ⚽ 54'      │
│ ────── Empieza el partido 07:00 ──────  │
└─────────────────────────────────────────┘

Estadísticas
...
```
- Hero arriba con **imagen de cancha de fútbol verde** + overlay oscuro
- Botones circulares de back y compartir con fondo gris oscuro semitransparente
- Banderas circulares GRANDES (~80px)
- Marcador GIGANTE (~56px) en blanco bold
- Goles con icono ⚽ y minutos
- Tabs pill horizontales: activo = borde blanco outline, inactivo = sin borde
- Eventos en timeline con líneas separadoras

### Predicciones (votación)
```
¿QUIÉN GANARÁ?                    2,107 votos
┌────────────────────────────────────────────┐
│ [🔴 37%] [⬜ 14%] [🟢 49%]                │  ← barra de 3 segmentos
└────────────────────────────────────────────┘
- Rojo izquierda (equipo local)
- Gris medio (empate)
- Verde derecha (equipo visitante)
- Porcentajes grandes en blanco bold dentro de cada segmento
```

### Estado "Predicciones cerradas"
```
┌────────────────────────────────────────────┐
│       PREDICCIONES CERRADAS                │
└────────────────────────────────────────────┘
- Card grande con texto centrado en mayúsculas
- Borde gris sutil
```

### Bottom navigation
```
┌────────────────────────────────────────────┐
│   🏠         ⚽         📺                  │
│  Inicio    Partidos    TV                  │
└────────────────────────────────────────────┘
```
- **Solo 3 tabs** (en nuestro caso van a ser 4: Partidos / Tabla / Mi cuenta / Admin)
- Iconos outline simples (Lucide React: `Home`, `Calendar`, `Tv`, etc.)
- Texto debajo del icono
- Tab activo: icono y texto en blanco puro
- Tab inactivo: icono y texto en gris `#9CA3AF`
- **SIN fondo diferente** para el activo, solo cambia el color del icono/texto
- Fondo del bottom nav: `#000000` con borde superior hairline `#1F1F1F`

---

## 🔤 Tipografía

| Uso | Tamaño | Peso | Color |
|---|---|---|---|
| Título de pantalla | 28px | Bold (700) | Blanco |
| Nombre de equipo | 17-18px | Semi-bold (600) | Blanco |
| Hora del partido | 17px | Regular (400) | Blanco |
| Tab activo/inactivo | 14px | Medium (500) | Blanco / Gris |
| Marcador gigante | 56px | Bold (700) | Blanco |
| Sección "Acontecimientos clave" | 20px | Bold (700) | Blanco |
| "PREDICCIONES CERRADAS" | 14px | Bold + uppercase | Blanco |
| Pequeños labels | 12px | Regular | Gris |

Fuente sugerida: **Inter** o **DM Sans** (sans-serif moderna, weights 400/500/600/700).

---

## 🚩 Adaptaciones para "La Tormenta Mundial 2026"

OneFootball es minimalista y casi sin color de marca. Para nuestra app **vamos a mantener el 90% de la estética OneFootball PERO** añadir el toque de marca:

1. **Logo de "La Tormenta Mundial 2026"** con icono ⚡ tormenta
2. **Color de marca**: rojo `#E3000F` para:
   - Botón principal "Entrar" en login
   - Botón "Guardar pronóstico"
   - Badge de "ADMIN" 
   - Highlight de la fila del usuario logueado en la tabla
   - Acento del logo
3. **Banderas circulares con imagen real** — para esto Lovable puede usar la librería `flag-icons` o emojis como fallback
4. **NO usar el rojo en todos lados** — respetar el minimalismo

---

## 📝 Cambios a aplicar al Prompt 1

Cuando Felipe me dé luz verde, voy a actualizar el Prompt 1 con:

- [ ] Fondo `#000000` (no `#0A0A0A`)
- [ ] Cards solo donde sea necesario (`#0F0F0F`)
- [ ] Separadores hairline en lista (`#1F1F1F`)
- [ ] Pills con outline blanco para activo (no fill rojo)
- [ ] Banderas circulares reales (librería `flag-icons` o equivalente)
- [ ] Bottom nav minimalista (sin fill, solo cambio de color)
- [ ] Tipografía Inter con tamaños grandes y bold
- [ ] Rojo `#E3000F` solo en botones primarios y highlights de marca
- [ ] Hero con imagen de cancha en detalle de partido
- [ ] Selector de fechas estilo pills scrolleable

---

## 🆕 Idea de Felipe: agrupar por grupos del Mundial

Felipe sugirió: "también se puede agrupar según los grupos del Mundial".

**Propuesta**: en el Prompt 3 (Lista de partidos), agregar un filtro adicional o vista alternativa:
- Tab actual: filtros por estado (Todos / Próximos / Pendientes / Finalizados)
- **Nuevo tab/toggle**: vista por GRUPO (Grupo A, B, C, ...)
  - Mostraría: equipos del grupo + sus 6 partidos + tabla del grupo
- Útil cuando el usuario quiere repasar todo lo que va de un grupo específico
