# Robot de sincronizacion (API-Football -> Supabase)

Mantiene los marcadores, el minuto en vivo, los penales y los eventos
(goles / amarillas / rojas con minuto, goleador y asistencia) **al dia
automaticamente**, sin que nadie cargue nada a mano.

## Como funciona (en simple)

```
  [API-Football]  --(robot, cada 15 min)-->  [Supabase]  --realtime-->  [los 8 amigos]
```

- El robot (`actualizar.py`) corre en un **GitHub Action programado**.
- Llama a API-Football con tu key (guardada como secreto) y escribe en Supabase.
- Tus amigos **solo leen** de Supabase. Nunca tocan la API ni ven tu key.
- Cuando un partido pasa a `final`, el trigger de Supabase **recalcula los
  puntos solo**.

## Cuidado con la cuota (100 requests/dia gratis)

- El robot lleva un contador en la tabla `api_cuota` y **se frena en 95**.
- **Auto-gatillo (ventana movil automatica):** antes de llamar a la API, el robot
  pregunta GRATIS a Supabase si hay algun partido en vivo o por empezar. Si no
  hay, **sale sin gastar requests**. Asi se ajusta solo por jornada y por fase,
  sin tocar el `cron`. (Comparar `now()` contra `fecha` en la DB es timezone-safe.)
- No re-descarga eventos de partidos ya terminados (ahorra cuota).
- En vivo: 1 request por corrida para el marcador de todos + 1 por partido
  activo para sus eventos.

## Puesta en marcha (una sola vez)

1. **Crea los 3 secretos** en GitHub:
   repo -> *Settings* -> *Secrets and variables* -> *Actions* -> *New secret*
   - `APIFOOTBALL_KEY` -> tu key de dashboard.api-football.com
   - `SUPABASE_URL` -> `https://TUPROYECTO.supabase.co`
   - `SUPABASE_SERVICE_KEY` -> la **service_role** key
     (Supabase -> Project Settings -> API -> *service_role*).
     OJO: esta key es secreta y poderosa (salta el RLS). Por eso vive solo
     en los secretos de GitHub, **nunca** en el frontend ni en git.

2. **Prueba manual**: pestana *Actions* -> *Sincronizar resultados* -> *Run
   workflow*. Mira el log: deberia decir cuantos fixtures recibio y los
   "OK equipo vs equipo".

3. Si ves lineas **`SIN MAPEAR: 'X' vs 'Y'`**, agrega ese nombre ingles al
   diccionario `EQUIPOS` en `actualizar.py` (o a la tabla `equipos_api_map`).

## Ajustes

- Frecuencia: edita el `cron` en `.github/workflows/sync.yml`.
- Tope de cuota: variable de entorno `MAX_CUOTA` (default 95).
- Modo `vivo` (solo partidos en vivo, mas barato): cambia `MODO: hoy` por
  `MODO: vivo` en el workflow.

## Importante

- El **admin manual sigue funcionando** como respaldo: si la API falla un dia,
  puedes cargar resultados a mano desde Supabase y todo sigue igual.
- Fase 2 (cuando quieras): estadisticas (posesion, tiros), alineaciones.
