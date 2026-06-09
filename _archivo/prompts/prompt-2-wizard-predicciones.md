# 🎯 Prompt 2 — Wizard obligatorio de predicciones especiales

> **Objetivo**: Bloquear el acceso a la app hasta que el jugador complete las 8 predicciones especiales.
> **Tiempo estimado de validación**: 10 min.

---

## 📋 Cómo usar este prompt

1. Asegurate de que Prompt 1 esté funcionando (login + navegación).
2. Pegá el bloque de abajo como segundo mensaje en Lovable.
3. Probá: loguéate con un usuario que tenga `onboarding_completado = false` → debería abrirte el wizard automáticamente.

---

## ✅ Checklist de validación

- [ ] Al loguearme por primera vez, NO veo las tabs — veo el wizard
- [ ] El wizard tiene 8 pasos con barra de progreso
- [ ] Puedo elegir un seudónimo opcional
- [ ] Puedo seleccionar campeón / finalistas / semifinalistas desde lista de 48 selecciones
- [ ] Puedo escribir texto libre en goleador / MVP / arquero / joven
- [ ] Al finalizar, `onboarding_completado = true` en Supabase y veo las tabs
- [ ] Si cierro sesión y vuelvo a entrar con el mismo usuario, NO vuelvo a ver el wizard

---

---PROMPT---

Agrega un **wizard obligatorio de bienvenida** que se muestra automáticamente la primera vez que cada usuario inicia sesión. Hasta que no lo complete, NO puede acceder a las tabs principales.

## Comportamiento
- Al hacer login, verificar el campo `usuarios.onboarding_completado`:
  - Si es `false` → mostrar wizard (en lugar de las tabs principales)
  - Si es `true` → mostrar tabs normales
- Una vez completado el wizard, marcar `onboarding_completado = true` y crear el registro en `predicciones_especiales`

## Estilo del wizard
- Pantalla completa, fondo oscuro `#0A0A0A`
- Card central con padding generoso
- Barra de progreso arriba (8 pasos, color rojo `#E3000F`)
- Botones "Anterior" y "Siguiente" abajo
- Botón "Siguiente" deshabilitado hasta completar el paso actual
- Animación suave de transición entre pasos (fade o slide horizontal)

## Lista de las 48 selecciones del Mundial 2026
Usa esta lista para los selectores de campeón / finalistas / semifinalistas:

```
Argentina, Australia, Austria, Bélgica, Brasil, Camerún, Canadá, Chile, Colombia,
Corea del Sur, Costa de Marfil, Costa Rica, Croacia, Dinamarca, Ecuador, Egipto,
El Salvador, Escocia, España, Estados Unidos, Francia, Gales, Ghana, Holanda,
Inglaterra, Irán, Italia, Jamaica, Japón, Marruecos, México, Nigeria, Noruega,
Panamá, Paraguay, Perú, Polonia, Portugal, Qatar, República Checa, Senegal,
Serbia, Suecia, Suiza, Turquía, Ucrania, Uruguay, Venezuela
```

## Los 8 pasos del wizard

### Paso 1: Seudónimo (opcional)
- Título: "¿Cómo querés que te llamen en la tabla?"
- Input de texto (max 20 caracteres)
- Placeholder: "Tu seudónimo (o dejá vacío para usar tu nombre real)"
- Texto pequeño: "Si lo dejás vacío, te van a ver como [nombre real]"

### Paso 2: Campeón del Mundo (30 pts)
- Título: "¿Quién será el Campeón del Mundo? 🏆"
- Dropdown searchable con las 48 selecciones
- Subtexto: "Acertar el campeón = 30 puntos"

### Paso 3: Finalistas (hasta 20 pts)
- Título: "¿Quiénes serán los 2 finalistas? 🥈"
- 2 dropdowns searchable (no se puede repetir selección)
- Subtexto: "Acertar 1 = 5 pts | Acertar los 2 = 20 pts"

### Paso 4: Semifinalistas (hasta 15 pts)
- Título: "¿Quiénes serán los 4 semifinalistas? 🎯"
- 4 dropdowns searchable (no se puede repetir)
- Subtexto: "1 acierto = 2 pts | 2 = 5 pts | 3 = 10 pts | 4 = 15 pts"

### Paso 5: Goleador del Mundial (10 pts)
- Título: "¿Quién será el goleador del Mundial? ⚽"
- Input de texto libre (placeholder: "Ej: Lionel Messi")
- Subtexto: "Texto libre. El admin asignará puntos manualmente al final del torneo."

### Paso 6: Mejor Jugador del Mundial (10 pts)
- Título: "¿Quién será el Mejor Jugador? 🌟"
- Input de texto libre

### Paso 7: Mejor Arquero (10 pts)
- Título: "¿Quién será el Mejor Arquero? 🧤"
- Input de texto libre

### Paso 8: Mejor Jugador Joven (10 pts)
- Título: "¿Quién será el Mejor Jugador Joven? 👶"
- Input de texto libre
- Subtexto: "Jugadores nacidos en 2005 o después"

### Pantalla final (post-paso 8)
- ✅ Animación de éxito (confetti o checkmark grande)
- Título: "¡Listo, [seudónimo]! Tus predicciones quedaron registradas 🎉"
- Resumen de las 8 predicciones en lista
- Texto: "Estas predicciones quedan bloqueadas al iniciar el primer partido del Mundial."
- Botón rojo "Empezar a pronosticar"

## Al hacer submit final
- INSERT en tabla `predicciones_especiales`
- UPDATE `usuarios.seudonimo` con el valor del Paso 1 (si no vacío)
- UPDATE `usuarios.onboarding_completado = true`
- Redirigir a la pantalla principal (tab Partidos)

## Importante
- El wizard debe ser imposible de cerrar (sin botón X, sin atajos)
- Si recargo la página a mitad de wizard, debe arrancar de cero (no guardar progreso parcial)
- Validar que todos los campos obligatorios estén completos antes de submit final
- Mobile-first: que se vea bien en 360px

---PROMPT---
