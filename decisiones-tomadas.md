# ✅ Decisiones Tomadas

> Registro oficial de todas las decisiones cerradas para el proyecto **Prode Mundial 2026**.
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
| Diseño UI complementario | Stitch (Google) | Solo si hace falta inspiración |

### ✅ Costo total estimado
- **Mínimo**: $0 USD (todo en planes free)
- **Recomendado**: $20 USD (1 mes de Lovable Pro)
- **Premium**: $32 USD (incluye dominio .com)

---

## 👥 Decisiones de usuarios y permisos

### ✅ Sistema de cuentas
- **8 cuentas de jugadores** (los amigos)
- **El admin NO es una cuenta separada**: es una cuenta de jugador con permisos extra
- **Tú juegas igual que los demás** + tienes funciones adicionales

### ✅ Quién crea las cuentas
- Admin (tú) crea las 8 cuentas inicialmente
- No se permite auto-registro (es un grupo cerrado)
- PINs se reparten por WhatsApp/Telegram

### ✅ Permisos del admin
| Acción | ¿El admin puede? |
|---|---|
| Cargar resultados oficiales de partidos | ✅ Sí |
| Editar resultados ya cargados | ✅ Sí (queda en log público) |
| Resetear PINs de amigos | ✅ Sí |
| Ver pronósticos ajenos antes del deadline | ❌ NO (igual que todos) |
| Editar su propio pronóstico después del deadline | ❌ NO (igual que todos) |
| Modificar reglas de puntuación durante el torneo | ❌ NO (las reglas son inmutables) |

### ✅ Sistema anti-trampa
- 🔐 Row Level Security en Supabase (no solo validación en frontend)
- 📜 Log público visible para todos de las acciones del admin
- 🚩 Las ediciones de resultados quedan marcadas con bandera/símbolo
- ⏰ Validación de deadline en backend (no se puede saltar editando HTML)

---

## 🎮 Decisiones de gameplay

### ✅ Privacidad de pronósticos
- 🚫 **NO se pueden ver pronósticos ajenos antes del kickoff**
- ✅ Después del kickoff, todos ven todo
- ⚠️ Esta regla es **CRÍTICA** para que el juego sea justo

### ✅ Resultados
- Se cargan **manualmente** vía panel admin en la misma app
- Al cargar resultado → Supabase calcula puntos automáticamente
- Los jugadores ven actualización **en tiempo real** (Realtime de Supabase)

### ⚠️ Pendiente decidir (NO confirmado aún)
- Sistema de puntuación exacto
- Deadline en minutos antes del kickoff (sugerido: 15 min)
- Si se cargan partidos del fixture manual o con IA

---

## 📅 Decisiones de ejecución

### ✅ Plan de desarrollo: 3 días, 15 prompts

| Día | Foco | Prompts |
|---|---|---|
| 1 | Cimientos (DB + login + UI base) | 5 |
| 2 | Features core (pronósticos + puntos + leaderboard) | 5 |
| 3 | Pulido + PWA + admin | 5 |

### ✅ Filosofía de prompts
- **Cortos y específicos** (no mega-prompts)
- **Iterativos** (un feature a la vez)
- **Validar antes de avanzar** (no acumular bugs)
- Detalle completo en `plan-15-prompts.md`

---

## 🐶 Decisiones de proceso

### ✅ Dónde vive el código
- **Planificación y guía**: aquí, en máquina corporativa (temporal)
- **Código real de la app**: PC personal del usuario
- **Cuentas (Lovable, Supabase, Vercel)**: emails personales

### ✅ Mentoría
- Kira (Code Puppy) asesora desde acá
- No ejecuta código del proyecto en esta máquina
- Disponible para debugging vía pegar snippets/errores en chat

---

## ❓ Decisiones todavía pendientes

Ver archivo `pendientes.md` para la lista completa.
