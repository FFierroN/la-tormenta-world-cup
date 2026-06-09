# 📅 Prompt 8 — Carga del fixture (104 partidos)

> **Objetivo**: Cargar los 104 partidos del Mundial 2026 en la tabla `partidos`.
> **Dónde se ejecuta**: SQL Editor de Supabase (o vía importación CSV).
> **Cuándo ejecutarlo**: después del Prompt 6 (para que el trigger esté listo) y antes de invitar a los amigos.

---

## 📊 Datos del Mundial 2026

- **Sede**: USA, México, Canadá
- **Fechas**: 11 jun 2026 - 19 jul 2026
- **Total partidos**: 104 (formato nuevo de 48 selecciones)
- **Fase de grupos**: 72 partidos (12 grupos de 4, cada equipo juega 3)
- **Dieciseisavos**: 16 partidos (32 equipos)
- **Octavos**: 8 partidos
- **Cuartos**: 4 partidos
- **Semifinales**: 2 partidos
- **Tercer puesto + Final**: 2 partidos

---

## ⚠️ Importante antes de empezar

**Yo (Kira) NO tengo el calendario oficial al detalle**: las fechas y horas exactas dependen del sorteo final de FIFA (que se hace meses antes del mundial). Lo que te doy abajo es:

1. ✅ **Estructura correcta del CSV** (columnas, tipos)
2. ✅ **Ejemplos de partidos** con datos plausibles
3. ✅ **Lista oficial de las 48 selecciones** con sus códigos ISO
4. ❌ **NO** la lista de los 104 partidos reales (eso lo tomás del sitio oficial de FIFA cuando salga)

Tu trabajo:
- Cerca de la fecha del Mundial, sacás el calendario oficial desde [fifa.com/worldcup](https://www.fifa.com/worldcup)
- Completás el CSV con los datos reales
- Lo importás a Supabase

---

## 📋 Cómo cargar el fixture en Supabase

### Opción A: Importar CSV desde la UI de Supabase (recomendado)

1. Completá `fixture-template.csv` con los 104 partidos reales.
2. Abrí Supabase → Table Editor → tabla `partidos`.
3. Click en "Insert" → "Import data from CSV".
4. Arrastrá el archivo.
5. Mapeá las columnas (Supabase las detecta solas si los nombres coinciden).
6. Click en "Import".

### Opción B: INSERT manual desde SQL Editor

Si preferís ir SQL directo, usá el ejemplo en `prompt-8-ejemplo-insert.sql` como base.

---

## 📐 Estructura del CSV

| Columna | Tipo | Obligatorio | Ejemplo |
|---|---|---|---|
| `equipo_local` | TEXT | ✅ | "Argentina" |
| `equipo_visitante` | TEXT | ✅ | "México" |
| `codigo_local` | TEXT (2 letras ISO) | ✅ | "AR" |
| `codigo_visitante` | TEXT (2 letras ISO) | ✅ | "MX" |
| `fecha_hora` | TIMESTAMP (UTC) | ✅ | "2026-06-21 21:00:00" |
| `fase` | TEXT | ✅ | "Grupos" |
| `grupo` | TEXT | Solo en fase grupos | "C" |
| `estadio` | TEXT | Recomendado | "Estadio Azteca" |
| `ciudad` | TEXT | Recomendado | "Ciudad de México" |

**Valores válidos para `fase`** (tienen que coincidir EXACTO):
- `Grupos`
- `Dieciseisavos`
- `Octavos`
- `Cuartos`
- `Semifinales`
- `Final`

> ⚠️ Si usás otros nombres (ej: "Octavos de Final"), el cálculo de puntos NO va a funcionar bien.

**Valores válidos para `grupo`** (solo si fase = 'Grupos'):
- A, B, C, D, E, F, G, H, I, J, K, L (12 grupos)

**Sobre `fecha_hora`**:
- Formato: `YYYY-MM-DD HH:MM:SS`
- Zona horaria: UTC (Supabase la guarda en UTC y el frontend la muestra en UTC-4)
- Ejemplo: si el partido es a las 17:00 UTC-4, en UTC es 21:00 → `2026-06-21 21:00:00`

---

## 🌍 Lista oficial de las 48 selecciones con códigos ISO

Esta es la lista que usamos en el wizard de predicciones especiales. Cuando sepas qué 48 selecciones se clasificaron realmente, ajustá esta lista.

| País | Código ISO |
|---|---|
| Argentina | AR |
| Australia | AU |
| Austria | AT |
| Bélgica | BE |
| Brasil | BR |
| Camerún | CM |
| Canadá | CA |
| Chile | CL |
| Colombia | CO |
| Corea del Sur | KR |
| Costa de Marfil | CI |
| Costa Rica | CR |
| Croacia | HR |
| Dinamarca | DK |
| Ecuador | EC |
| Egipto | EG |
| El Salvador | SV |
| Escocia | GB-SCT |
| España | ES |
| Estados Unidos | US |
| Francia | FR |
| Gales | GB-WLS |
| Ghana | GH |
| Holanda | NL |
| Inglaterra | GB-ENG |
| Irán | IR |
| Italia | IT |
| Jamaica | JM |
| Japón | JP |
| Marruecos | MA |
| México | MX |
| Nigeria | NG |
| Noruega | NO |
| Panamá | PA |
| Paraguay | PY |
| Perú | PE |
| Polonia | PL |
| Portugal | PT |
| Qatar | QA |
| República Checa | CZ |
| Senegal | SN |
| Serbia | RS |
| Suecia | SE |
| Suiza | CH |
| Turquía | TR |
| Ucrania | UA |
| Uruguay | UY |
| Venezuela | VE |

> 💡 Las banderas de Inglaterra, Escocia y Gales en `flag-icons` usan los códigos especiales `GB-ENG`, `GB-SCT`, `GB-WLS`.

---

## ✅ Test de validación

Después de cargar el fixture:

```sql
-- Test 1: Total de partidos
SELECT COUNT(*) FROM partidos;
-- Esperado: 104

-- Test 2: Distribución por fase
SELECT fase, COUNT(*) FROM partidos GROUP BY fase ORDER BY fase;
-- Esperado:
-- Cuartos        | 4
-- Dieciseisavos  | 16
-- Final          | 2
-- Grupos         | 72
-- Octavos        | 8
-- Semifinales    | 2

-- Test 3: Distribución por grupo (solo fase Grupos)
SELECT grupo, COUNT(*) FROM partidos WHERE fase = 'Grupos' GROUP BY grupo ORDER BY grupo;
-- Esperado: 12 filas, cada una con COUNT = 6

-- Test 4: Verificar que no hay partidos sin grupo en la fase Grupos
SELECT COUNT(*) FROM partidos WHERE fase = 'Grupos' AND grupo IS NULL;
-- Esperado: 0
```

Si los 4 tests pasan → fixture cargado correctamente.

---

## 🔁 Si te equivocaste y querés empezar de cero

```sql
-- ⚠️ ESTO BORRA TODOS LOS PARTIDOS Y PRONÓSTICOS ASOCIADOS
TRUNCATE TABLE pronosticos CASCADE;
TRUNCATE TABLE partido_eventos CASCADE;
TRUNCATE TABLE partidos RESTART IDENTITY CASCADE;
```

Después volvé a importar el CSV.
