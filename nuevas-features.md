# Nuevas features — rediseno en Vite (post-Lovable)

> Contexto: abandonamos Lovable (forzaba Lovable Cloud como backend, sin control sin premium).
> Frontend nuevo en **Vite + React + TS + Tailwind + supabase-js + vite-plugin-pwa**,
> conectado a TU Supabase. Estas dos features se suman al spec original (prompts 1-7).

---

## Feature A — Tabla de posiciones con DOS pestanas  [DECISIONES CERRADAS]

### Pestana 1: "Galeria de avatares" (vista estrella)
Vista vertical scrolleable, una tarjeta por jugador, ordenadas de la posicion 1 a la 8:

```
   +--------------------+
   |       [AVATAR]     |   <- avatar centrado, cambia segun rango
   |        #1          |   <- posicion
   |     120 pts        |   <- puntos
   |   exactos: 8       |   <- aciertos exactos (marcador exacto)
   |   aciertos: 14     |   <- aciertos (resultado correcto, no exacto)
   |   fallas: 9        |   <- fallas (ni el resultado)
   +--------------------+
```

- 8 tarjetas, una por jugador, orden por posicion.
- Scroll vertical para recorrer a todos.
- **Avatar por 3 rangos:** puesto 1 -> avatar pos1, puesto 8 -> avatar pos8, puestos 2-7 -> avatar medio.
- **NO** se agrega corona/dorado/destaque. Las 3 fotos ya traen las modificaciones que hizo Felipe. (CONFIRMADO)

### Pestana 2: "Tabla clasica"
Tabla convencional, fila por jugador, con **nombre o alias** elegido.
Columnas: posicion, nombre/alias, puntos, exactos, aciertos, fallas.

### Definiciones (CONFIRMADAS)
- **Exacto** = acerto el marcador exacto.
- **Acierto** = acerto el resultado (gana X / empate) pero NO el marcador.
- **Falla** = no acerto el resultado.

---

## Feature B — Pantalla "Ver partido" (detalle en vivo)  [referencia: OneFootball]

Seleccionar un partido de la lista -> navega al detalle de ESE partido.
El admin actualiza marcador/eventos y todos lo ven al instante via realtime de Supabase. (CONFIRMADO)

### Header del partido (fijo arriba)
- Fondo de estadio (cesped oscuro/blur).
- Flecha volver (izq) + compartir (der, opcional).
- Bandera local (izq) + bandera visita (der), circulares, con nombre debajo.
- Centro: estado ("En vivo" / "Medio tiempo" / "Final del Partido") + marcador grande "L - V".
- Fila: icono pelota + minutos de gol (ej "54', 84', 87'").

### Abajo: 2 pestanas
**Tab 1 — "Detalles del partido"** (estilo "Acontecimientos clave")
- Timeline del partido: goles y **tarjetas rojas** (solo rojas, no amarillas).
- Cada evento: icono (pelota / tarjeta roja) + minuto + equipo.
- Marcadores de inicio/fin: "Empieza el partido HH:MM", "Final del Partido L-V".

**Tab 2 — "Pronosticos"**
- Los 8 integrantes con el marcador que predijeron para ESTE partido.
- Puntos que saco cada uno + estado visual (exacto / acierto / falla).

---

## PENDIENTE MENOR (confirmar al construir)
- Goles/tarjetas rojas: guardamos solo **minuto + equipo**, o tambien **nombre del jugador**?
  Propuesta default: minuto + equipo (+ campo opcional de nombre que se puede dejar vacio),
  para que cargar 104 partidos no sea una tortura para el admin.
  OneFootball en la captura del "Resumen" muestra solo el minuto, asi que minuto+equipo alcanza.

---

## Impacto en backend (Supabase)
- Tabla nueva `eventos_partido` (o `goles` + `tarjetas`): partido_id, tipo (gol/roja),
  equipo (local/visita), minuto, jugador (nullable).
- `partidos` ya tiene marcador; agregar estado en vivo (programado/en_vivo/medio_tiempo/final)
  y banderas/escudos (url o codigo de pais para emoji/svg).
- Realtime activado en `partidos` y `eventos_partido` para el "en vivo".
- Vista/calculo de standings que derive: puntos, exactos, aciertos, fallas por jugador.
