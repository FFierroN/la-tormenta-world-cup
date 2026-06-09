# 🧠 Contexto para Próximas Sesiones

> **⚠️ EMPEZAR CADA NUEVA SESIÓN LEYENDO ESTE ARCHIVO PRIMERO**  
> Para que Kira (o cualquier IA) tenga el contexto necesario y no haga preguntas ya resueltas.

---

## 🎯 Resumen ejecutivo en 30 segundos

**Proyecto**: App de prode/polla del Mundial 2026 para 8 amigos.  
**Stack elegido**: PWA con Lovable.dev + Supabase + Vercel.  
**Plan**: 15 prompts en 3 días para tener MVP funcional.  
**Costo total**: $0 - $20 USD.  
**Dueño**: Felipe Fierro.  
**Mentora IA**: Kira (Code Puppy).  
**Restricción importante**: El código real vive en PC personal del dueño, no acá.

---

## 📚 Cómo navegar la documentación

Lee los archivos en este orden:

1. **`README.md`** → visión general del proyecto
2. **`decisiones-tomadas.md`** → todo lo que ya está cerrado (NO preguntar de nuevo)
3. **`pendientes.md`** → lo que aún falta decidir
4. **`plan-15-prompts.md`** → plan de desarrollo detallado
5. **`faq-tecnico.md`** → aprendizajes técnicos clave
6. **`decisiones-clave.md`** → template original (puede estar parcialmente respondido)

---

## 🐶 Cómo Kira debe operar en este proyecto

### ✅ HACER
- Asesorar, mentorear, debuggear conceptualmente
- Ayudar a redactar prompts para Lovable
- Analizar errores/snippets que el usuario pegue
- Sugerir mejoras y mejores prácticas
- Mantener actualizada la documentación de planificación

### ❌ NO HACER
- Ejecutar código del proyecto en esta máquina (es máquina corporativa)
- Conectarse a Supabase/Vercel del usuario
- Tocar archivos del proyecto real (que vive en PC personal)
- Re-preguntar cosas ya decididas (consultar `decisiones-tomadas.md` primero)

---

## 🎬 Estado actual del proyecto (al cerrar sesión)

### ✅ Fase actual: **Pre-desarrollo / Planificación**

**Lo que está hecho**:
- ✅ Stack tecnológico decidido
- ✅ Arquitectura definida
- ✅ Plan de 15 prompts redactado
- ✅ Decisiones de seguridad y antitrampa cerradas
- ✅ Sistema de admin definido (Opción B: jugador con permisos extra)
- ✅ Reglas de privacidad definidas (pronósticos ocultos hasta deadline)
- ✅ Documentación organizada en MIPROYECTO/

**Lo que NO está hecho** (próximos pasos):
- ❌ Llenar decisiones pendientes (ver `pendientes.md`)
- ❌ Redactar los 5 prompts del Día 1
- ❌ Crear cuenta en Lovable, Supabase y Vercel
- ❌ Mover MIPROYECTO/ a PC personal del usuario
- ❌ Empezar desarrollo

---

## 🔑 Decisiones críticas que NO se deben re-discutir

> Si el usuario menciona alguna de estas, dale por confirmada y avanza.

1. ✅ **PWA, no app nativa** (cerrado, razones en faq-tecnico.md)
2. ✅ **Lovable + Supabase + Vercel** (cerrado, comparativa hecha)
3. ✅ **Carga manual de resultados vía panel admin en la app** (cerrado)
4. ✅ **Admin = cuenta jugador con permisos extra (Opción B)** (cerrado)
5. ✅ **Pronósticos privados hasta deadline** (cerrado, regla crítica)
6. ✅ **Sistema antitrampa con log público** (cerrado)
7. ✅ **15 prompts en 3 días** (cerrado, estructura detallada en plan-15-prompts.md)
8. ✅ **Plan Free de Lovable para empezar, upgrade a Pro si hace falta** (cerrado)

---

## 🧭 Próximos pasos sugeridos por orden

### Inmediato (esta misma sesión o la próxima)
1. Usuario llena `pendientes.md` con sus respuestas
2. Kira redacta los 5 prompts del Día 1 basándose en las respuestas
3. Guardar los prompts en `MIPROYECTO/prompts/dia-1/`

### Mediano plazo (próximas 1-2 sesiones)
4. Usuario mueve MIPROYECTO/ a su PC personal
5. Usuario crea cuentas en Lovable, Supabase, Vercel
6. Usuario ejecuta prompts del Día 1 en Lovable
7. Reportar progreso y bugs a Kira para iterar

### Largo plazo (durante el desarrollo)
8. Redactar prompts de Día 2 y Día 3
9. Debugging conjunto cuando aparezcan problemas
10. Pulido pre-mundial (antes del 11/jun/2026)

---

## 💡 Estilo de comunicación del usuario

- 🇪🇸 Habla en español
- 🎓 Experiencia nula en programación
- 🤖 Familiarizado con IAs y prompts
- ❓ Hace preguntas excelentes y desafiantes
- 🧠 Piensa antes de actuar (no se apura)
- 💰 Prefiere opciones gratis/baratas
- ✋ Le importa entender el "por qué", no solo el "cómo"

**Kira debe**:
- Ser pedagógica sin ser condescendiente
- Explicar conceptos técnicos con analogías
- Mostrar comparativas (tablas) y dar recomendaciones claras
- Honesta con riesgos y limitaciones
- Mantener tono casual/divertido (no formal)

---

## 🐛 Cosas que el usuario probablemente preguntará después

Anticipa estas preguntas con respuestas preparadas en `faq-tecnico.md`:

- "¿Cómo conecto Lovable con Supabase?" → 1 click en Lovable
- "¿Cómo creo la cuenta de Supabase?" → supabase.com/signup
- "¿Cómo despliego en Vercel?" → Lovable lo hace solo con 1 click
- "¿Mi app se va a dormir?" → Vercel no, Supabase sí (7 días inactivo)
- "¿Cómo agrego un nuevo amigo después?" → admin panel
- "¿Y si necesito más prompts?" → upgrade a Pro 1 mes ($20)
- "¿Cómo cambio reglas de puntuación a mitad del mundial?" → NO se puede (regla acordada)

---

## 🚨 Restricciones de máquina corporativa (Walmart)

Ten esto SIEMPRE presente:
- 🏢 Esta es máquina corporativa de Walmart
- 🚫 No ejecutar código del proyecto personal acá
- 🚫 No instalar dependencias del proyecto acá
- 🚫 No conectar a cuentas personales del usuario desde acá
- ✅ Solo mentoría / planificación / documentación

El usuario es consciente de esto y lo respeta. No hace falta repetírselo a menos que pida algo que cruce la línea.

---

## 📊 Métricas del proyecto

| Métrica | Valor |
|---|---|
| Total partidos a pronosticar | 104 (Mundial completo) |
| Usuarios objetivo | 8 amigos + admin (mismo user) |
| Duración del torneo | 11 jun - 19 jul 2026 (~40 días) |
| Prompts disponibles (Free) | 30/mes |
| Prompts planeados | 15 (en 3 días) |
| Costo total estimado | $0-$20 USD |
| Probabilidad de éxito | 60-80% según disciplina |

---

## 🎯 Definición de "éxito" del proyecto

El proyecto se considera **exitoso** si:
1. ✅ Los 8 amigos pueden loguearse desde su celular
2. ✅ Pueden pronosticar los 104 partidos del mundial
3. ✅ Los pronósticos se bloquean en el deadline
4. ✅ El admin puede cargar resultados sin fricción
5. ✅ La tabla de posiciones se actualiza en tiempo real
6. ✅ Aguanta todo el mundial sin caídas serias
7. ✅ Hay un ganador claro al final

**Bonus** (no obligatorio):
- 🎨 Estética bonita
- 🌙 Modo oscuro
- 🔔 Notificaciones
- 💬 Chat

---

## 🐶 Mensaje final para Kira en próxima sesión

> Felipe ya hizo el trabajo duro de planificar. Tu rol es ejecutar lo planeado con calidad.  
> NO empezar de cero. NO re-preguntar lo decidido. NO improvisar arquitectura.  
> SÍ ayudar con prompts, debugging, dudas técnicas, y mantener el plan vivo.  
> Recuerda: el proyecto real vive en PC personal, vos solo asesoras desde acá.
