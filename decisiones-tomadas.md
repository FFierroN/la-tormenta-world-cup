# ✅ Decisiones Tomadas

> Registro oficial de todas las decisiones cerradas para el proyecto **La Tormenta Mundial 2026**.
> 📅 Última actualización: junio 2026

---

## 🏗️ Decisiones de arquitectura

### ✅ Plataforma: **PWA (Progressive Web App)**
- ❌ Descartado: app nativa iOS/Android
- ✅ Razón: 8 usuarios por 1 mes no justifica $99/año Apple + complejidad de tiendas
- ✅ Tus amigos abren URL en el celular y la "instalan" desde el navegador

### ✅ Stack técnico
| Componente | Herramienta | Plan |
|---|---|---|
| Generador de app con IA | **Lovable.dev** | Free (30 prompts/mes) → upgrade a Pro si hace falta |
| Backend + DB | **Supabase** | Free (suficiente para 8 usuarios) |
| Hosting | **Vercel** | Hobby (gratis, no se duerme) |

### ✅ Costo total estimado
- **Mínimo**: $0 USD
- **Recomendado**: $20 USD (1 mes Lovable Pro si hace falta)
- **Premium**: $32 USD (incluye dominio .com)

---

## 🎨 Identidad de la app

### ✅ Nombre: **La Tormenta Mundial 2026**

### ✅ Estética: **inspirada en OneFootball**
- 🎨 Dark mode dominante (default)
- 🔴 Acento rojo característico (similar al rojo OneFootball #E3000F)
- 📰 Cards limpias con jerarquía visual clara
- 🔤 Tipografía sans-serif moderna (Inter, Roboto o similar)
- 📱 Layout estilo feed vertical
- 🚫 Sin gradientes recargados
- ⚡ Botones flat, modernos

### ✅ Idioma: Español
### ✅ Zona horaria: **UTC-4** (Chile / Venezuela / Bolivia)
### ✅ Navegación: bottom tabs

---

## 👥 Decisiones de usuarios y permisos

### ✅ Los 8 jugadores (hardcodeados en login)

| # | Nombre real | Rol |
|---|---|---|
| 1 | Felipe Fierro | 🔧 Admin |
| 2 | Victor Soto | Jugador |
| 3 | Ignacio Contreras | Jugador |
| 4 | Jaime Furió | Jugador |
| 5 | Diego Galvez | Jugador |
| 6 | Daniel Abreu | Jugador |
| 7 | Benjamin Bustamante | Jugador |
| 8 | Ignacio Gonzalez | Jugador |

### ✅ Sistema de cuentas
- **8 cuentas hardcodeadas** (los amigos)
- **No hay auto-registro** (grupo cerrado)
- **Login**: dropdown con los 8 nombres + PIN de 4 dígitos
- **Admin (Felipe)** crea los PINs y los reparte por WhatsApp
- **Seudónimo opcional**: cada jugador puede elegir uno en el wizard inicial, que es lo que se ve en la tabla de posiciones
- Si no elige seudónimo → se muestra el nombre real

### ✅ Permisos del admin
| Acción | ¿El admin puede? |
|---|---|
| Cargar resultados oficiales de partidos | ✅ Sí |
| Editar resultados ya cargados | ✅ Sí (queda en log público) |
| Asignar manualmente puntos de predicciones especiales (goleador/MVP/arquero/joven) | ✅ Sí (al final del mundial) |
| Resetear PINs de amigos | ✅ Sí |
| Ver pronósticos ajenos antes del deadline | ❌ NO |
| Editar su propio pronóstico después del deadline | ❌ NO |
| Modificar reglas de puntuación durante el torneo | ⚠️ SÍ (con recálculo automático y aviso) — ver Prompt 7 |

### ✅ Sistema anti-trampa
- 🔐 Row Level Security en Supabase
- 📜 Log público de acciones del admin (visible para todos)
- 🚩 Ediciones de resultados marcadas con bandera
- ⏰ Validación de deadline en backend

---

## 🎮 Decisiones de gameplay

### ✅ Privacidad de pronósticos
- 🚫 NO se pueden ver pronósticos ajenos antes del kickoff
- ✅ Después del kickoff: todos ven todo
- ⚠️ Regla CRÍTICA

### ✅ Onboarding obligatorio (wizard único)
- Al primer login, cada jugador pasa por un wizard único de bienvenida
- **Hasta que no lo complete, NO puede acceder a la app**
- Pasos:
  1. Elegir seudónimo (opcional)
  2. Campeón del Mundo
  3. Finalistas (2)
  4. Semifinalistas (4)
  5. Goleador del torneo (texto libre)
  6. Mejor jugador del torneo (texto libre)
  7. Mejor arquero (texto libre)
  8. Mejor jugador joven (texto libre)
- Una vez completado, NO se puede modificar (se bloquea al iniciar el Mundial)

### ✅ Deadline de pronósticos
- **10 minutos antes del kickoff**
- Validado en backend (Supabase RLS)

### ✅ Resultados
- Cargados manualmente por admin (Felipe) vía panel en la app
- Al cargar → cálculo automático de puntos (función SQL en Supabase)
- Realtime para los jugadores

### ✅ Carga del fixture
- **CSV manual desde Supabase** (104 partidos del Mundial 2026)
- Felipe sube el CSV antes de abrir la app a los jugadores

### ✅ Sistema de eventos en vivo (híbrido)

El admin puede registrar eventos de cada partido. Los jugadores ven todo en realtime.

#### Modos de carga (a elección del admin)
- **Modo rápido**: solo cargar marcador final (sin eventos individuales)
- **Modo en vivo**: ir cargando goles/expulsiones a medida que pasan (los jugadores los ven en realtime)
- **Modo retroactivo**: cargar todos los eventos después de terminado el partido
- Los 3 modos coexisten — el admin elige según el contexto

#### Tipos de eventos registrables
| Evento | Campos requeridos | Notas |
|---|---|---|
| Gol equipo local | Minuto + nombre del goleador | Texto libre |
| Gol equipo visitante | Minuto + nombre del goleador | Texto libre |
| Autogol (en contra de local) | Minuto + nombre del jugador que la hizo | Suma al marcador del visitante |
| Autogol (en contra de visitante) | Minuto + nombre del jugador que la hizo | Suma al marcador del local |
| Tarjeta roja local | Solo contador | Sin minuto, sin nombre |
| Tarjeta roja visitante | Solo contador | Sin minuto, sin nombre |
| Ganador por penales | local / visitante / ninguno | Solo eliminatorias, NO afecta puntos |

#### Lo que NO se registra
- ❌ Tarjetas amarillas (descartado por simplicidad)
- ❌ Cambios de jugadores
- ❌ Tiros de esquina, faltas, posesión, etc.

#### Reglas
- **Los goles suman al marcador automáticamente** al ser registrados
- **Los autogoles suman al marcador del equipo contrario** al jugador autor
- **Las rojas son contador** (no aparecen en timeline, solo en estadísticas del partido)
- **"Ganador por penales" es solo display** (se muestra en detalle del partido, NO afecta puntos)
- **Edición de eventos**: borrar y volver a cargar (no hay edición en línea)
- **El cálculo de puntos se dispara cuando el admin marca "Finalizar partido"** (recalcula sobre el resultado de 90 min)

---

## 🏆 Sistema de puntuación (CONFIRMADO)

### Puntaje base por fase

| Acierto | Grupos / 16vos | Octavos / Cuartos | Semifinales | Final |
|---|---|---|---|---|
| Marcador exacto | 6 | 8 | 10 | 12 |
| Diferencia de goles correcta | 4 | 6 | 8 | 10 |
| Ganador o empate correcto | 2 | 4 | 6 | 8 |
| Incorrecto | 0 | 0 | 0 | 0 |

### Bonus por marcador de riesgo
*Solo aplica cuando se acierta el marcador EXACTO. Premia pronósticos arriesgados.*

| Marcador exacto | Bonus |
|---|---|
| 0-0, 1-0, 0-1, 1-1, 2-0, 0-2, 2-1, 1-2 | +0 |
| 2-2, 3-0, 0-3, 3-1, 1-3 | +1 |
| 3-2, 2-3, 4-0, 0-4, 4-1, 1-4 | +2 |
| 4-2, 2-4, 5-0, 0-5, 5-1, 1-5 o más extremo | +3 |

**Ejemplos**:
- Acertar 1-0 en grupos = 6 pts
- Acertar 3-1 en grupos = 6+1 = 7 pts
- Acertar 4-1 en grupos = 6+2 = 8 pts
- Acertar 5-0 en final = 12+3 = 15 pts

### Regla para fases eliminatorias
- Para el puntaje **SOLO cuenta el resultado a los 90 min + tiempo agregado**
- ❌ NO se considera tiempo extra ni penales
- Ejemplo: Argentina 1-1 Francia (90'), Argentina gana por penales → para el sistema cuenta 1-1

### Predicciones especiales pre-mundial

| Predicción | Puntos |
|---|---|
| Campeón del Mundo | 30 |
| Finalistas (acierta 0 / 1 / 2) | 0 / 5 / 20 |
| Semifinalistas (acierta 0 / 1 / 2 / 3 / 4) | 0 / 2 / 5 / 10 / 15 |
| Goleador del Mundial (asignado manual por admin) | 10 |
| Mejor jugador del Mundial (asignado manual por admin) | 10 |
| Mejor arquero del Mundial (asignado manual por admin) | 10 |
| Mejor jugador joven del Mundial (asignado manual por admin) | 10 |

### Sistema de desempate

Si dos o más participantes terminan con la misma cantidad de puntos:

1. **1er criterio**: Mayor cantidad de marcadores exactos
2. **2do criterio**: Mayor cantidad de diferencias de goles acertadas
3. **3er criterio**: Mayor cantidad de resultados acertados
4. **4to criterio**: Mejor pronóstico de la final
   - Marcador exacto > Diferencia de goles correcta > Ganador correcto
5. Si persiste el empate → comparten posición

---

## 📅 Decisiones de ejecución

### ✅ Plan de desarrollo: 5 prompts para FRONTEND completo

| Prompt | Foco |
|---|---|
| 1 | Setup + Design System (OneFootball) + Login + Navegación |
| 2 | Wizard obligatorio de predicciones especiales |
| 3 | Lista de partidos + Modal de pronóstico |
| 4 | Tabla de posiciones + Mi cuenta |
| 5 | Panel admin + PWA + Pulido final |

Después del frontend → prompts adicionales para lógica de backend (cálculo de puntos, RLS, realtime).

### ✅ Filosofía de prompts
- Cortos, estructurados, máximo ~500 palabras
- Validar después de cada prompt antes de avanzar
- Si Lovable se marea → reformular más corto

---

## 🐶 Decisiones de proceso

### ✅ Dónde vive el código
- **Planificación y guía**: aquí, en máquina corporativa
- **Código real de la app**: PC personal del usuario / Lovable cloud
- **Cuentas (Lovable, Supabase, Vercel)**: emails personales

### ✅ Mentoría
- Kira (Code Puppy) asesora desde acá
- No ejecuta código del proyecto en esta máquina
- Disponible para debugging vía pegar snippets/errores en chat

---

## ❓ Decisiones todavía pendientes

**NINGUNA crítica.** Estamos listos para arrancar con los 5 prompts del frontend.

Decisiones diferidas (las tomamos sobre la marcha):
- Features opcionales (chat, notificaciones, animaciones extra) — evaluar en prompt 5 si sobra margen
- Dominio custom (.com) — evaluar al final si querés gastar $12 USD
