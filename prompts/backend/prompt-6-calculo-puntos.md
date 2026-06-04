# 🧮 Prompt 6 — Cálculo automático de puntos (SQL + Trigger)

> **Objetivo**: Cuando el admin finaliza un partido, calcular automáticamente los puntos de los 8 pronósticos asociados aplicando todas las reglas (fase, marcador exacto, diferencia, ganador, bonus por riesgo).
> **Dónde se ejecuta**: SQL Editor de Supabase (NO en Lovable).
> **Cuándo ejecutarlo**: después del Prompt 1 del frontend (necesita las tablas creadas), antes de cargar el fixture.

---

## 📋 Cómo usar este prompt

1. Asegurate de que ya ejecutaste el Prompt 1 del frontend (tablas creadas en Supabase).
2. Abrí Supabase → SQL Editor → New query.
3. Abrí `prompt-6.sql` con Bloc de Notas.
4. Copiá TODO el contenido y pegalo en el SQL Editor.
5. Click en "Run".
6. Validá con el test de abajo.

---

## ✅ Test de validación

Después de ejecutar el SQL, probá manualmente desde el SQL Editor:

```sql
-- Test 1: Acierto exacto en grupos (esperado: 6 pts)
SELECT calcular_puntos_pronostico(2, 1, 2, 1, 'Grupos');

-- Test 2: Acierto exacto en grupos con bonus por marcador raro 3-1 (esperado: 7 pts)
SELECT calcular_puntos_pronostico(3, 1, 3, 1, 'Grupos');

-- Test 3: Acierto exacto en final con bonus 5-0 (esperado: 12 + 3 = 15 pts)
SELECT calcular_puntos_pronostico(5, 0, 5, 0, 'Final');

-- Test 4: Solo diferencia correcta en grupos (esperado: 4 pts)
SELECT calcular_puntos_pronostico(3, 2, 2, 1, 'Grupos');

-- Test 5: Solo ganador en grupos (esperado: 2 pts)
SELECT calcular_puntos_pronostico(3, 0, 1, 0, 'Grupos');

-- Test 6: Empate sin marcador exacto (esperado: 2 pts en grupos)
SELECT calcular_puntos_pronostico(2, 2, 1, 1, 'Grupos');

-- Test 7: Nada acertado (esperado: 0 pts)
SELECT calcular_puntos_pronostico(2, 0, 0, 2, 'Grupos');
```

Si los 7 tests dan los valores esperados → el cálculo está OK.

### Test del trigger

```sql
-- 1. Insertar un partido de prueba (si no hay)
INSERT INTO partidos (equipo_local, equipo_visitante, fecha_hora, fase, estado_partido)
VALUES ('TestA', 'TestB', NOW(), 'Grupos', 'pendiente')
RETURNING id;
-- Anotá el ID que te devuelve (ej: 105)

-- 2. Insertar un pronóstico de prueba para ese partido (usá usuario_id = 1 = Felipe)
INSERT INTO pronosticos (usuario_id, partido_id, prediccion_local, prediccion_visitante)
VALUES (1, 105, 2, 1);  -- reemplazá 105 por el id que te dio arriba

-- 3. Verificar que está en 0
SELECT puntos_obtenidos FROM pronosticos WHERE usuario_id = 1 AND partido_id = 105;
-- Esperado: 0

-- 4. Finalizar el partido con el mismo resultado predicho (debería disparar el trigger)
UPDATE partidos
SET estado_partido = 'finalizado', resultado_local = 2, resultado_visitante = 1
WHERE id = 105;

-- 5. Verificar que se calcularon los puntos automáticamente
SELECT puntos_obtenidos FROM pronosticos WHERE usuario_id = 1 AND partido_id = 105;
-- Esperado: 6 (acierto exacto en grupos)

-- 6. Limpiar (importante para no ensuciar la DB)
DELETE FROM pronosticos WHERE partido_id = 105;
DELETE FROM partidos WHERE id = 105;
```

Si te dio 6 → trigger funcionando perfecto.

---

## 📦 Qué hace este SQL (resumen)

1. **`calcular_puntos_pronostico(...)`**: función pura que recibe predicción + resultado real + fase y devuelve los puntos.
   - Aplica puntaje base por fase (Grupos/Octavos/Cuartos/Semis/Final)
   - Aplica bonus por marcador de riesgo si el acierto es exacto
   - Devuelve 0 si no acertó nada

2. **`actualizar_puntos_partido()`**: función trigger que recorre todos los pronósticos de un partido finalizado y les calcula los puntos.

3. **`trigger_actualizar_puntos_partido`**: trigger en la tabla `partidos` que dispara la función anterior cuando:
   - `estado_partido` cambia a `'finalizado'`
   - O cuando se editan `resultado_local` / `resultado_visitante` en un partido ya finalizado

4. **`calcular_puntos_especiales(...)`**: función que el admin invoca al final del Mundial pasando los resultados reales (campeón, finalistas, semifinalistas) y calcula los puntos de las predicciones especiales.

---

## ⚠️ Detalles importantes

### Sobre la regla de 90 min
- La función trabaja sobre `resultado_local` y `resultado_visitante` directo.
- El admin debe cargar el resultado **a los 90 min** (sin tiempo extra ni penales).
- El campo `ganador_penales` es solo display, NO afecta este cálculo. ✅

### Sobre los puntos especiales (campeón, etc.)
- NO se calculan automáticamente con trigger.
- El admin los calcula al final del Mundial ejecutando manualmente `calcular_puntos_especiales(...)`.
- Los puntos de goleador/MVP/arquero/joven se asignan desde el panel admin del frontend (Prompt 5).

### Sobre idempotencia
- Podés ejecutar este SQL múltiples veces sin romper nada (`CREATE OR REPLACE`).
- Podés ejecutar `calcular_puntos_pronostico(...)` desde el SQL Editor para tests ad-hoc.
