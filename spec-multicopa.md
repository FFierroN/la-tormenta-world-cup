# Spec: Copas multi-jugador (varias ligas en el mismo deploy)

> Estado: DISENO, no implementado. Documento de referencia para arrancar la
> feature. Objetivo: que la familia de Felipe (y futuros grupos) jueguen con la
> misma funcionalidad, en copas independientes, compartiendo el mismo Mundial.

## 1. Objetivo

Hoy la app sirve a UN grupo de jugadores ("La Tormenta"). Queremos soportar
VARIAS copas (grupos de jugadores) en el mismo deploy y la misma base, donde:

- Cada copa tiene sus propios jugadores, pronosticos, predicciones especiales,
  tabla de posiciones y configuracion.
- Todas las copas comparten el MISMO Mundial (partidos, marcadores, goles).
- Felipe es super-admin (administra cualquier copa). Cada copa puede tener,
  ademas, su propio admin local (opcional, fase 2).

## 2. Decisiones tomadas (con Felipe, 2026-06-15)

1. **Copas separadas del todo**: sin ranking global que mezcle copas. Cada copa
   ve solo su tabla.
2. **Configuracion por copa**: cada copa abre/cierra su ventana de predicciones
   y maneja sus flags (foto del ultimo, etc.) por separado.
3. **Felipe admin de todo**: flag `es_super_admin`. Puede cambiar de copa en el
   panel Admin y administrar cualquiera, sin crearse una cuenta por copa.

## 3. La idea central: dos clases de datos

| Clase | Tablas | Comportamiento |
|---|---|---|
| **Global (el Mundial)** | `partidos`, `partido_eventos`, `equipos_api_map`, `api_cuota` | COMPARTIDAS por todas las copas. Las llena el robot. |
| **Por copa (cada grupo)** | `jugadores`, `pronosticos`, `predicciones_especiales`, `configuracion` | Separadas por `copa_id`. |

**Consecuencia clave**: el robot / worker en vivo **NO se toca**. Sigue
escribiendo una sola tabla `partidos` que todas las copas leen. Esa es la razon
por la que este diseno (una sola base + `copa_id`) es mejor que clonar la base:
clonar obligaria a que el robot llene N bases de partidos.

## 4. Cambios de base de datos

### 4.1 Nueva tabla `copas`

```sql
create table if not exists copas (
  id          serial primary key,
  nombre      text not null,          -- ej. "La Tormenta", "Familia Fierro"
  slug        text unique,            -- ej. "tormenta", "familia" (para login/URL)
  creada_at   timestamptz not null default now(),
  activa      boolean not null default true
);

-- La copa actual existente es la #1.
insert into copas (id, nombre, slug) values (1, 'La Tormenta', 'tormenta')
on conflict (id) do nothing;
```

### 4.2 `copa_id` en las tablas por jugador (idempotente + backfill a 1)

```sql
-- jugadores
alter table jugadores add column if not exists copa_id int references copas(id) default 1;
update jugadores set copa_id = 1 where copa_id is null;
alter table jugadores alter column copa_id set not null;

-- El nombre debe ser unico DENTRO de la copa, no global.
drop index if exists uq_jugadores_nombre;
create unique index if not exists uq_jugadores_copa_nombre on jugadores(copa_id, nombre);

-- Super-admin (Felipe administra todas las copas).
alter table jugadores add column if not exists es_super_admin boolean not null default false;

-- pronosticos y predicciones_especiales: copa_id denormalizado para que la
-- vista de tabla agrupe sin joins. Se hereda del jugador.
alter table pronosticos add column if not exists copa_id int references copas(id) default 1;
update pronosticos p set copa_id = j.copa_id from jugadores j where p.jugador_id = j.id;
alter table pronosticos alter column copa_id set not null;

alter table predicciones_especiales add column if not exists copa_id int references copas(id) default 1;
update predicciones_especiales pe set copa_id = j.copa_id from jugadores j where pe.jugador_id = j.id;
alter table predicciones_especiales alter column copa_id set not null;
```

### 4.3 `configuracion` por copa (PK compuesta)

```sql
-- De PK (clave) a PK (copa_id, clave).
alter table configuracion add column if not exists copa_id int references copas(id) default 1;
update configuracion set copa_id = 1 where copa_id is null;

alter table configuracion drop constraint if exists configuracion_pkey;
alter table configuracion add primary key (copa_id, clave);
```

> Nota: los `real_*` (resultados reales del Mundial) son el mismo hecho para
> todas las copas; con esta PK quedan duplicados por copa. Es inofensivo y le da
> a cada admin la libertad de cargarlos cuando quiera. Si molesta, fase 2: una
> tabla `resultados_reales` global aparte.

### 4.4 Vista `tabla_posiciones` por copa

La vista actual agrega TODOS los jugadores. Hay que:
- Agregar `copa_id` al SELECT (viene de `jugadores`).
- El front filtra `where copa_id = <copa activa>` al consultarla.
- La posicion (`row_number`) debe particionarse por copa:
  `row_number() over (partition by copa_id order by puntos desc, ...)`.

Mismo criterio para `desglose_tormenta`. La `tabla_grupos` (posiciones reales de
los grupos del Mundial) es GLOBAL: no lleva copa_id.

### 4.5 RPCs a ajustar

- `login_jugador`: sin cambio funcional, pero el listado de jugadores del login
  debe filtrarse por copa (ver front).
- `guardar_especiales`: valida la ventana leyendo `configuracion` -> ahora debe
  leer la fila `(copa_id, 'edicion_predicciones_habilitada')`.
- `actualizar_alias`, `cambiar_pin`: sin cambios (operan por jugador_id).
- Trigger `tg_actualizar_puntos` y `recalcular_especiales`: el calculo es por
  jugador, no cambia; solo asegurarse de que lee los `real_*` de la copa del
  jugador (o globales si se decide fase 2).

## 5. Cambios en la capa de datos (app/src/lib/data.ts)

La sesion expone la copa activa (la del jugador logueado). Todas las consultas
por-jugador filtran por ella:

- `listarJugadores(copaId)` -> para el login, lista solo los de esa copa.
- `obtenerTabla(copaId)`, `obtenerDesgloseTormenta(copaId)`.
- `misEspeciales`, `guardarEspeciales`, `todasEspeciales(copaId)`.
- `prediccionesHabilitadas(copaId)`, `setPrediccionesHabilitadas(copaId, on)`.
- `fotoUltimoHabilitada(copaId)` / setter.
- Las de `partidos` / `partido_eventos` / `tabla_grupos`: SIN cambios (globales).

Patron: agregar `copa_id` como primer parametro y `.eq("copa_id", copaId)` en el
query. ~10-15 funciones. Mecanico y de bajo riesgo.

## 6. Cambios en el frontend

### 6.1 Sesion
- El objeto `Jugador` ya viaja en la sesion (auth.tsx, localStorage). Se le suma
  `copa_id` (y `es_super_admin`). Toda la app usa `jugador.copa_id`.

### 6.2 Login
- Dos enfoques:
  - **A (recomendado):** elegir copa primero (lista de `copas` activas), luego el
    jugador de esa copa. Limpio y escalable.
  - **B:** una sola lista enorme de jugadores con la copa al lado. Mas simple
    pero se ensucia con muchas copas.
- Elegimos A.

### 6.3 Panel Admin (super-admin)
- Si `es_super_admin`, mostrar un **selector de copa** arriba del panel. Al
  cambiar, el admin opera sobre esa copa (su ventana, sus jugadores, sus flags).
- Crear copa: pantalla simple (nombre + slug) -> inserta en `copas`.
- Alta de jugadores: el alta existente (`AdminParticipantes`) crea al jugador en
  la copa seleccionada.

### 6.4 Resto de pantallas
- Tabla, MisPredicciones, Especiales, etc.: sin cambios de UI; solo pasan
  `jugador.copa_id` a las funciones de datos.

## 7. Lo que NO se toca

- **Robot / Worker en vivo** (worker-vivo/, robot/): cero cambios. El fixture es
  global.
- **partidos / partido_eventos / tabla_grupos**: globales, intactos.
- **Logica de puntaje** (trigger, calculo): es por jugador, no cambia.

## 8. Plan de implementacion por etapas (rama aparte)

1. **DB**: correr la migracion (seccion 4) en Supabase. Idempotente; backfill a
   `copa_id = 1`. La copa actual sigue jugando igual. Marcar a Felipe como
   `es_super_admin = true`.
2. **data.ts**: agregar `copa_id` a las consultas por-jugador. Probar que la copa
   1 funciona identico.
3. **Front**: sesion con copa_id, login con selector de copa, selector de copa en
   Admin, crear copa + alta de jugadores.
4. **Prueba E2E**: crear "copa 2" (familia), sumar 2-3 jugadores, pronosticar,
   verificar tablas separadas y ventana independiente.
5. **Merge** cuando todo verde.

## 9. Riesgos y mitigaciones

- **Romper la copa actual**: mitigado con backfill a `copa_id = 1` y migracion
  idempotente. Nada se borra.
- **Olvidar un filtro por copa** (fuga de datos entre copas): revisar una por una
  las consultas por-jugador; idealmente un helper que exija copa_id.
- **RLS**: hoy varias tablas tienen policies permisivas (la app valida). Con
  multi-copa conviene revisar que un jugador no pueda leer/escribir datos de otra
  copa. Fase 2 si se quiere endurecer; para un grupo de confianza, la validacion
  en app alcanza al inicio.

## 10. Estimacion honesta

Una sesion enfocada, quizas dos. Patron conocido, bien acotado, reversible, y sin
riesgo para el robot ni para la copa que ya esta jugando.
