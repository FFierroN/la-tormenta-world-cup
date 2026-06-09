# 📋 Plan Detallado: 15 Prompts en 3 Días

> Estrategia de desarrollo escalonada para evitar marear a Lovable y maximizar resultados con el plan Free.

---

## 🧠 Filosofía del plan

```
✅ Prompts CORTOS + ESPECÍFICOS + ITERATIVOS  
❌ Mega-prompts únicos con 50 instrucciones
```

**Por qué**: Lovable se "marea" con prompts muy largos (dilución de atención, instrucciones contradictorias, errores en cascada). Mejor construir en capas funcionales validando cada paso.

---

## 📊 Resumen del plan

| Día | Foco | Prompts | Estado al final del día |
|---|---|---|---|
| 1 | 🏗️ Cimientos | 5 | App con login funcionando + DB lista |
| 2 | ⚙️ Features core | 5 | Pronósticos + puntos + leaderboard funcionando |
| 3 | ✨ Pulido + PWA | 5 | App instalable + admin panel + pulido final |

📊 **Total**: 15 prompts (de los 30 disponibles en plan Free)
📊 **Reserva**: 15 prompts para imprevistos / iteración / mejoras

---

## 🏗️ DÍA 1 — Cimientos (5 prompts)

### 🟢 Prompt 1: Foundation
**Objetivo**: Crear el proyecto, conectar Supabase, definir diseño base, navegación

**Debe incluir**:
- Stack, colores, tipografía, estética general
- Estructura de navegación (bottom tabs o sidebar)
- Conexión a Supabase configurada
- Componentes UI base (botones, cards, inputs)

### 🟢 Prompt 2: Schema completo de DB
**Objetivo**: Crear todas las tablas necesarias

**Tablas a crear**:
- `usuarios` (id, nombre, pin_hash, es_admin)
- `partidos` (id, equipo_local, equipo_visitante, fecha_hora, fase, resultado_local, resultado_visitante)
- `pronosticos` (id, usuario_id, partido_id, prediccion_local, prediccion_visitante, puntos_obtenidos, created_at, updated_at)
- `admin_log` (id, admin_id, accion, detalle, timestamp)

**Reglas de seguridad (RLS)**:
- Pronósticos ajenos invisibles hasta `now() > kickoff`
- No editar pronósticos después del deadline
- Solo admin puede insertar/editar resultados

### 🟢 Prompt 3: Sistema de login
**Objetivo**: Pantalla de login funcional con PIN

**Debe incluir**:
- Selector de nombre (dropdown con los 8 jugadores)
- Input de PIN (4 dígitos numéricos, 6 para admin opcional)
- Validación contra Supabase
- Persistencia de sesión
- Redirección a home tras login exitoso

### 🟢 Prompt 4: Pantalla principal con listado de partidos
**Objetivo**: Vista de todos los partidos del mundial

**Debe incluir**:
- Cards de partidos agrupados por fecha
- Estado visual: 🔵 próximo / 🟡 en curso / 🟢 terminado / 🔒 deadline pasado
- Indicador si ya pronosticaste ese partido
- Filtros: todos / próximos / mis pronósticos pendientes

### 🟢 Prompt 5: Carga del fixture (seed)
**Objetivo**: Tener los 104 partidos del Mundial 2026 en la DB

**Opción A**: Pedir a Lovable que genere el fixture completo
**Opción B (recomendada)**: Cargar manualmente desde dashboard de Supabase con CSV

> 💡 Si optas por B, este prompt se libera y puedes usarlo en otra cosa.

---

## ⚙️ DÍA 2 — Features Core (5 prompts)

### 🟡 Prompt 6: Modal de pronóstico
**Objetivo**: Permitir ingresar/editar predicción

**Debe incluir**:
- Botón "Pronosticar" en cada partido
- Modal con inputs para resultado local y visitante (0-15)
- Validación de inputs
- Guardar en `pronosticos` table
- UI feedback (éxito/error)
- Mostrar pronóstico actual si ya existe

### 🟡 Prompt 7: Bloqueo por deadline + privacidad ⏰🔒
**Objetivo**: Implementar las dos reglas críticas del juego

**Debe incluir**:
- Bloqueo de edición 15 min antes del kickoff
- Validación en backend (Supabase RLS), no solo frontend
- UI cambia para mostrar "🔒 Cerrado"
- Si pasó deadline → mostrar predicciones de TODOS
- Si no pasó deadline → solo el usuario ve la suya

### 🟡 Prompt 8: Cálculo de puntos
**Objetivo**: Cuando se carga un resultado, calcular puntos automáticamente

**Debe incluir**:
- Función en Supabase (Edge Function o trigger SQL)
- Aplica las reglas de puntuación definidas
- Actualiza columna `puntos_obtenidos` de cada pronóstico
- Idempotente (puede recalcularse si se edita el resultado)

### 🟡 Prompt 9: Tabla de posiciones (leaderboard)
**Objetivo**: Ranking de los 8 jugadores

**Debe incluir**:
- Suma de puntos por usuario
- Ordenado descendente
- Realtime (actualización automática)
- Detalle: clickear un jugador muestra sus pronósticos pasados
- Indicadores visuales (🥇🥈🥉 para top 3)

### 🟡 Prompt 10: Panel admin
**Objetivo**: Vista para que el admin cargue resultados

**Debe incluir**:
- Visible solo para usuarios con `es_admin = true`
- Lista de partidos sin resultado
- Form para ingresar marcador
- Al guardar → dispara cálculo de puntos
- Editar resultados ya cargados (con confirmación)
- Vista del log de cambios

---

## ✨ DÍA 3 — Pulido + PWA (5 prompts)

### 🟣 Prompt 11: Configuración PWA
**Objetivo**: Hacer la app instalable en celular

**Debe incluir**:
- `manifest.json` con iconos y configuración
- Service worker básico
- Splash screen
- Botón "Instalar app" cuando el navegador lo permita

### 🟣 Prompt 12: Responsive mobile + modo oscuro
**Objetivo**: Pulir UX en celular

**Debe incluir**:
- Layout mobile-first
- Tap targets grandes (min 44x44px)
- Modo oscuro con toggle
- Animaciones suaves

### 🟣 Prompt 13: Vista "Mi cuenta" + estadísticas
**Objetivo**: Cada jugador ve su perfil personal

**Debe incluir**:
- Lista de pronósticos propios (pasados y futuros)
- Puntos totales y por partido
- Estadísticas (% aciertos, partidos restantes)
- Posición actual en la tabla
- Botón "Cerrar sesión"

### 🟣 Prompt 14: Comodín - Fix de bugs detectados 🐛
**Objetivo**: Reservado para imprevistos

**Plan B si no hay bugs**: usar para feature opcional (chat, notificaciones, etc.)

### 🟣 Prompt 15: Pulido final
**Objetivo**: Detalles que hacen la diferencia

**Debe incluir**:
- Loading states (spinners, skeletons)
- Empty states ("Aún no hay pronósticos...")
- Mensajes de error amigables
- Toasts de confirmación
- Animación de "ganaste X puntos" cuando se carga un resultado

---

## ⚠️ Reglas para sobrevivir con 15 prompts

### 1. 📝 Tener los prompts redactados ANTES de abrir Lovable
No improvisar. Redactarlos en .md, revisar, ajustar.

### 2. ⏰ Bloquear tiempo real (mínimo 2 horas seguidas)
No trabajar 15 min entre cosas — se pierde el contexto.

### 3. 🧪 Testear DESPUÉS de cada prompt
No avanzar al siguiente sin verificar el anterior.

### 4. 📸 Documentar lo que va saliendo
Screenshots y notas para futura referencia.

### 5. 🆘 Plan B claro
Si día 3 al mediodía no estamos cerca → upgrade a Pro ($20 USD) y terminar tranquilo.

---

## 🚩 Señales de que Lovable se está mareando

- Empieza a "olvidar" cosas que ya hizo
- Genera código que no compila
- Cambia estilos random sin pedirlo
- Dice "ya está hecho" pero no funciona
- Ignora partes del prompt

**Qué hacer**: Pausa, vuelve al checkpoint anterior, reformula con prompts más cortos.

---

## 📊 Probabilidad de éxito estimada

```
✅ MVP funcional en 3 días:        ~60%
✅ MVP + pulido decente:           ~35%
⚠️  Necesita día 4 extra:          ~40%
```

**Con disciplina militar y prompts pre-redactados → sube a 80%+**
