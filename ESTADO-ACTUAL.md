# 📍 Estado del proyecto al cierre de sesión

> **Última actualización**: sesión de cierre
> **⚽ Inicio del Mundial**: 11 de junio de 2026

---

## ✅ Lo que está hecho

### Frontend Prompts — Lovable (7 redactados, 5 ejecutados)
- ✅ Prompt 1 — Setup + Login + Schema → **EJECUTADO**
- ✅ Prompt 2 — Wizard predicciones especiales → **EJECUTADO**
- ✅ Prompt 3 — Partidos + Pronóstico → **EJECUTADO**
- ✅ Prompt 4 — Tabla posiciones + Mi cuenta → **EJECUTADO**
- ✅ Prompt 5 — Panel admin + PWA + Pulido → **EJECUTADO**
- ⏳ Prompt 6 — Puntos en vivo + Avatares (3 rangos) + Toggle + **LOGO** → **PENDIENTE**
  - ⚠️ Al ejecutarlo, ADJUNTAR la imagen del logo en el mismo mensaje de Lovable
- ⏳ Prompt 7 — Reglas de puntaje editables por admin → **PENDIENTE (OPCIONAL)**
  - ⚠️ Solo ejecutar si también se ejecuta el B5 en Supabase (van juntos)

### Backend Prompts — Supabase (todos listos, NINGUNO ejecutado aún)
- ⏳ B0 — B0-schema-extras.sql (3 columnas avatar + tabla configuracion)
- ⏳ B1 — prompt-6.sql (cálculo de puntos + trigger)
- ⏳ B2 — prompt-7.sql (RLS + realtime + índices)
- ⏳ B5 — B5-reglas-puntaje-editables.sql (OPCIONAL, va con Prompt 7)
- ⏳ Fixture — fixture-FINAL-importar.csv (104 partidos, LISTO para importar)
- ⏳ Avatares — 24 fotos (8 jugadores × 3: pos1 / medio / pos8)

---

## 🚦 PRÓXIMA SESIÓN: arrancar acá

### 1. Verificar conexión Supabase ↔ Lovable
- Probar PIN `1234` en la app
- Si entra → ya está conectado ✅
- Si no → seguir PARTE 0 de la guía maestra

### 2. Setup de Supabase (seguir GUIA-MAESTRA-SUPABASE.txt)
- B0 → B1 → B2 (SQL Editor)
- B5 solo si se quiere reglas editables
- Importar fixture-FINAL-importar.csv

### 3. Lovable
- Ejecutar Prompt 6 (¡con logo adjunto!)
- Ejecutar Prompt 7 solo si se ejecutó B5

### 4. Avatares (opcional)
- Bucket "avatares" + 24 fotos + pegar URLs

---

## 📁 Archivos clave

| Archivo | Para qué |
|---|---|
| `prompts/backend/GUIA-MAESTRA-SUPABASE.txt` | ⭐ Paso a paso completo de Supabase |
| `prompts/txt/prompt-6.txt` | Pegar en Lovable (+ adjuntar logo) |
| `prompts/txt/prompt-7.txt` | Pegar en Lovable (opcional) |
| `prompts/backend/B0-schema-extras.sql` | SQL Editor |
| `prompts/backend/prompt-6.sql` | SQL Editor (B1) |
| `prompts/backend/prompt-7.sql` | SQL Editor (B2) |
| `prompts/backend/B5-reglas-puntaje-editables.sql` | SQL Editor (opcional) |
| `prompts/backend/fixture-FINAL-importar.csv` | Importar en Table Editor |
| `prompts/backend/guia-storage-avatares.md` | Guía de las 24 fotos |

---

## ⏳ Decisiones pendientes para próxima sesión

1. **¿Reglas de puntaje editables?** (Prompt 7 + B5) → o dejarlas fijas (más simple)
2. **¿Avatares con fotos reales oallback con inicial?**
3. **El logo**: tenerlo como archivo listo para adjuntar al ejecutar Prompt 6

---

## 🐶 Mensaje de Kira

Felipe, gran avance hoy:
- ✅ Prompt 6 actualizado (avatares a 3 rangos + Feature 4 logo)
- ✅ Prompt 7 nuevo (reglas editables, con red de seguridad)
- ✅ Fixture FINAL listo para importar (104 partidos)
- ✅ Guía maestra de Supabase con TODO el paso a paso

Mañana arrancamos con Supabase desde la guía maestra.
Descansá. ⚽⚡
