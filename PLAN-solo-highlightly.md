# PLAN — Migrar a Highlightly como fuente primaria (y jubilar worldcup26)

> Documento de DISEÑO. No implementa nada todavia. Es el veredicto tecnico y el
> plan por pasos para pasar de "worldcup26 (vivo) + HL (enriquecido)" a
> "HL primario + worldcup26 fallback de emergencia".

## 1. Contexto y motivacion

- **worldcup26.ir**: gratis e ilimitado, pero pobre (nombres de goleadores
  ABREVIADOS "K. Mbappe" -> fragmenta la tabla de goleo) y fragil (se cae /
  cambia formato; caido el 2026-07-01).
- **Highlightly (HL)**: datos completos y consistentes (nombres completos,
  asistencias, tarjetas, stats), pero con **cuota de 100 llamadas/dia**.
- Se usaban juntas porque en fase de grupos habia muchos partidos/dia y la cuota
  de HL no alcanzaba para el marcador en vivo.
- **Ahora** quedan pocos partidos por dia (16vos: 3, bajando a 1 en finales), asi
  que HL puede llevar TODO el peso con una estrategia de frecuencia adaptativa.

**Beneficio extra:** al sacar worldcup26 del marcador en vivo, desaparece la
causa raiz de los goleadores fragmentados (grafias abreviadas).

## 2. Como consume HL (2 niveles de dato)

| Endpoint | Trae | Costo |
|---|---|---|
| `/matches?date=HOY&leagueId&season` (lista) | Marcador + estado de TODOS los partidos del dia | 1 llamada cubre N partidos |
| `/matches/{id}` (detalle) | Marcador + estado + eventos (goles, asist, tarjetas) + stats | 1 llamada por partido |

**Palanca clave:** en eliminatorias los partidos NO se solapan (secuenciales:
16:00, 20:00...). En cualquier instante hay **1 solo partido en vivo**, y su
`/matches/{id}` trae marcador Y eventos juntos -> **1 llamada por ciclo**.

## 3. Presupuesto de cuota (100/dia)

Ventana viva por partido: ~110 min promedio, 150 min peor caso (120' + penales).
Con 1 partido en vivo a la vez => 1 llamada por poll.

| Fase | Part./dia | Intervalo | Llamadas/dia (peor caso) |
|---|---|---|---|
| 16vos | 3 | **5 min** | ~90 |
| 8vos | 2 | **4 min** | ~80 |
| 4tos | 2 (o 1) | **3-4 min** | ~75-90 |
| Semis / 3er / Final | 1 | **2 min** | ~75 |

**Todo entra bajo 100/dia.** Aclaracion importante: **1 llamada/min NO cabe** ni
con un solo partido (pediria ~110-150/dia). El techo real es **~2 min** en finales.

Optimizaciones que dan aire extra:
- **Entretiempo (ET, ~15 min):** no hay goles -> pausar o espaciar el poll.
  Ahorro ~3 polls/partido.
- **Penales/alargue:** solo se pollea si el partido esta empatado al 90'. La
  mayoria se define en 90 -> ventana real < 150 casi siempre.
- **Pre-partido:** alineaciones 1 sola vez (~1h antes), no en loop.
- **Fuera de ventana viva:** cero llamadas a HL (auto-regulacion que ya existe).

## 4. Arquitectura recomendada

**UN solo worker con frecuencia adaptativa.** NO un bot por fase (romperia
DRY/KISS: 4 despliegues, 4 crons, 4x superficie de bugs, para algo que se
resuelve con una fila de config).

### 4.1 Cron
Sigue siendo `* * * 6,7 *` (cada 1 min, jun/jul). El worker **saltea ciclos**
segun un intervalo objetivo -> no gasta cuota de mas.

### 4.2 Frecuencia adaptativa por config
Nueva fila en la tabla `configuracion` (sin redeploys para ajustar):
```
clave: hl_intervalo_min   valor: 5     # minutos entre polls a HL (por fase)
```
El worker lee `hl_intervalo_min` y solo pollea si paso ese tiempo desde el
ultimo poll (guardado en `configuracion.hl_ultimo_poll` o por partido en
`partidos.hl_ultimo_poll_at`). Cambias de fase => editas la fila (5 -> 4 -> 3 -> 2).

> Alternativa mas automatica (fase 2): derivar el intervalo del **numero de
> partidos en vivo/hoy** en vez de setearlo a mano. Menos control, mas magia.
> Empezar por el valor manual (mas simple y predecible).

### 4.3 Flujo del ciclo (pseudocodigo)
```
si no hay partidos vivos ni por empezar ni recien terminados: salir (gratis)
si paso menos de hl_intervalo_min desde el ultimo poll: salir
vivos = partidos en vivo hoy
si vivos.length <= 1:
    para el partido: hlDetalle(id)  -> marcador + estado + eventos   (1 llamada)
si vivos.length >= 2:
    lista = hlListarPorFecha(hoy)   -> marcadores/estado             (1 llamada)
    por cada vivo: hlDetalle(id)    -> eventos                        (1 c/u)
aplicar salvaguardas ya existentes (no degradar estado, no pisar con null...)
```

### 4.4 Manejo de cuota agotada (429)
- HL 429 -> `LimiteDiario` (ya existe).
- **Fallback:** si worldcup26 sigue vivo, usarlo SOLO para marcador/estado ese
  dia (modo degradado, sin nombres finos). Activable por flag
  `configuracion.fallback_worldcup26 = true`.
- Si worldcup26 tambien esta caido -> log claro + seguir reintentando el proximo
  ciclo (la cuota se resetea a medianoche).

## 5. worldcup26: degradar, NO borrar

**Decision:** pasa de PRIMARIO a **fallback de emergencia activable**.
- Se saca del flujo normal (HL manda).
- El codigo de `index.js` (parseo worldcup26) queda, pero solo se invoca si
  `fallback_worldcup26 = true` (se prende ante 429 de HL o caida de HL).
- Costo de mantenerlo: cero. Beneficio: paracaidas si HL agota cuota un dia de
  3 partidos a penales. Borrarlo es perder redundancia gratis.

## 6. Cambios concretos (cuando se implemente)

1. **DB** (`configuracion`): agregar `hl_intervalo_min`, `fallback_worldcup26`,
   y ancla de ultimo poll (`hl_ultimo_poll` o `partidos.hl_ultimo_poll_at`).
2. **worker `index.js`**:
   - `correr()` orquesta HL primero (marcador+estado+eventos desde HL).
   - worldcup26 movido a funcion `fallbackWorldcup26()` gateada por flag.
   - respetar `hl_intervalo_min` (saltear ciclos).
3. **worker `enriquecer.js`**: `hlDetalle` pasa a ser tambien fuente de marcador
   en vivo (hoy solo se usa post-partido). Reusar `eventosDesdeHl`,
   `statsDesdeHl` y las salvaguardas.
4. **Estado en vivo desde HL**: mapear el estado de HL (`state.description`:
   "In Progress" / "Half time" / "Finished"...) a nuestros estados. Ya hay base
   en `detectarTramos`.
5. **Borrar** del flujo normal la dependencia de worldcup26 para arranque/LAG
   (con HL primario ya no hace falta el desempate).
6. **Tests manuales**: disparo por `?key=` en cada fase, verificar llamadas/dia
   con `wrangler tail`.

## 7. Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Cuota 100/dia se agota (3 partidos a penales) | Fallback worldcup26 + intervalos conservadores (5 min en 16vos) |
| HL cae un dia de partido | Fallback worldcup26 (si vive) + reintentos |
| Estado en vivo de HL mal mapeado | Reusar/expandir el mapeo de `detectarTramos`; salvaguardas anti-degradado |
| 1/min esperado pero no alcanza | Documentado: techo ~2 min en finales con 100/dia |
| Nombres de equipos HL distintos | Ya cubierto por `nuestroNombre` + match tolerante nuevo |

## 8. Recomendacion final

- **Migrar a HL primario: SI** (viable con frecuencia adaptativa, y arregla el
  goleo de paso).
- **Bot por fase: NO** (un worker + config adaptativa).
- **worldcup26: fallback pasivo activable, no borrar.**
- **Subir cuota HL (opcional pero ideal):** con ~500/dia se podria ir a 1-2 min
  en TODAS las fases con amplio margen y sin depender del fallback. Evaluar
  costo/beneficio del plan pago de HL.
