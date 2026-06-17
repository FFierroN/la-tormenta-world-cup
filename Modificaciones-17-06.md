# Modificaciones 17/06

> Sesion 2026-06-17 con Kira. Tres cambios OFICIALES (no piloto). Felipe los
> pidio lanzar; los probara con `git pull` + `npm run dev` cuando tenga su PC.
> Todo es ADITIVO: no rompe la app actual.

---

## PASO MANUAL OBLIGATORIO (Supabase) — correr ANTES de usar las tablas en vivo

En **Supabase -> SQL Editor -> New query** pega y corre TODO:

- `db/FIX-tablas-live.sql`

Crea dos vistas NUEVAS (no toca las oficiales):
- `tabla_posiciones_live` — tabla de la liga contando partidos EN CURSO.
- `tabla_grupos_live` — tabla de cada grupo del Mundial contando partidos en curso.

Reusan las funciones de puntaje existentes (`calcular_puntos_pronostico`,
`contar_exactos`), asi que el criterio de puntos es idantico al oficial (DRY).
Si no corres este SQL, las nuevas tablas/indicadores mostraran "no se pudo
cargar" (las vistas no existen aun), pero el resto de la app sigue igual.

---

## 1. Predicciones especiales de TODOS (oficial)

El piloto `/especiales-wc` paso a ser oficial:
- Ruta nueva: **`/especiales-todos`**. La vieja `/especiales-wc` REDIRIGE a la
  nueva (no se rompen enlaces).
- Acceso desde **Mi cuenta -> "Predicciones especiales de todos"** (icono de
  grupo). Convive con el boton de SIEMPRE ("Realizar predicciones especiales",
  que sigue llevando al editor `/especiales`).
- Se le agrego cabecera con boton de volver (a Mi cuenta) y va a pantalla
  completa (sin bottom tabs), como el editor.
- Guardrail anti-copia intacto: mientras la ventana de edicion siga ABIERTA,
  cada uno solo ve SU tarjeta; al cerrarla, se revelan todas.

Archivos: `App.tsx`, `pages/MiCuenta.tsx`, `pages/EspecialesWC.tsx`,
`components/IconosCuenta.tsx` (icono `GrupoIcon`).

## 2. Tabla en vivo en Partidos > Tormenta

En el detalle de partido, pestana **Tormenta**, ahora aparece arriba una
**"Tabla en vivo"**: posiciones provisionales de la liga sumando los partidos
en curso. Al finalizar el partido, esos puntos pasan solos a la tabla oficial
(pestana Tabla), asi que converge sola. Debajo queda el desglose de siempre.

Cada fila lleva el indicador de movimiento (ver punto 3) comparando su posicion
EN VIVO contra la OFICIAL.

Archivos: `components/TablaTormentaLive.tsx` (nuevo), `pages/PartidoDetalle.tsx`,
`lib/data.ts` (`obtenerTablaLive`).

## 3. Indicador de movimiento (verde sube / rojo baja / gris igual)

Distincion visual de subida/bajada de posicion, segun la imagen de referencia
(chevron verde arriba = sube, chevron rojo abajo = baja, circulo gris = igual).
Compara la posicion EN VIVO (provisional) contra la OFICIAL actual.

Aparece en:
- **Tabla** (jugadores): pestanas Tabla (galeria) y Clasica.
- **Copa** (grupos): tabla de cada grupo del Mundial.
- **Tabla en vivo** de la pestana Tormenta.

Cuando NO hay partidos en curso, todo queda en gris (live == oficial).

Archivos: `lib/movimiento.ts` (helper puro), `components/IndicadorMovimiento.tsx`
(nuevo), `pages/Tabla.tsx`, `components/TablaGrupos.tsx`,
`lib/data.ts` (`obtenerTablaGruposLive`).

---

## Pendiente de verificacion en PC (Felipe)

- [ ] Correr `db/FIX-tablas-live.sql` en Supabase.
- [ ] `git pull` + `npm run dev` y revisar:
  - Mi cuenta -> "Predicciones especiales de todos".
  - Detalle de un partido -> pestana Tormenta -> "Tabla en vivo".
  - Indicadores verde/rojo/gris en Tabla y en Copa (se ven mejor con un partido
    en vivo; sin partidos en curso quedan grises, que es lo correcto).
- [ ] No hay node en la maquina actual, asi que NO se pudo typecheckear aqui.
      Si `npm run dev` se queja de tipos, avisar.
