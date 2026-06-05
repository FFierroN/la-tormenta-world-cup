# 📍 Estado del proyecto al cierre de sesión

> **Fecha de cierre**: 5 de junio de 2026
> **⚽ Inicio del Mundial**: 11 de junio de 2026 — **¡quedan 6 días!**

---

## ✅ Lo que está hecho

### Planificación (100%)
- ✅ Stack: Lovable + Supabase + Vercel
- ✅ 8 jugadores con nombres reales
- ✅ Sistema de puntuación completo (escalado por fase + bonus de riesgo)
- ✅ Predicciones especiales pre-mundial
- ✅ Sistema de desempate (4 criterios)
- ✅ Sistema de eventos en vivo (goles, autogoles, rojas, penales)
- ✅ Estética OneFootball validada con screenshots reales
- ✅ Avatares dinámicos por posición (4 rangos, 32 fotos vía URLs)
- ✅ Puntos en vivo durante partidos (realtime)
- ✅ Toggle admin para editar predicciones especiales

### Frontend Prompts — Lovable (6 redactados, 4 ejecutados)
- ✅ Prompt 1 — Setup + Design + Login + Schema → **EJECUTADO**
- ✅ Prompt 2 — Wizard predicciones especiales → **EJECUTADO**
- ✅ Prompt 3 — Partidos + Pronóstico + Timeline → **EJECUTADO**
- ✅ Prompt 4 — Tabla posiciones + Mi cuenta → **EJECUTADO**
- ⏳ Prompt 5 — Panel admin + PWA + Pulido → **PENDIENTE** (próxima sesión)
- ⏳ Prompt 6 — Puntos en vivo + Avatares + Toggle → **PENDIENTE** (próxima sesión)

### Backend Prompts — Supabase (todos listos para ejecutar)
- ⏳ B0 — B0-schema-extras.sql (avatar cols + tabla configuracion)
- ⏳ B1 — prompt-6.sql (cálculo de puntos + trigger)
- ⏳ B2 — prompt-7.sql (RLS + realtime + índices)
- ⏳ B3 — fixture-mundial-2026.csv (completar con datos reales de FIFA)
- ⏳ B4 — guia-storage-avatares.md (subir fotos + pegar URLs)

---

## 🚦 Plan exacto para la próxima sesión

### En Lovable
1. Abrir el proyecto en Lovable
2. Copiar `prompts/txt/prompt-5.txt` → pegar en Lovable → validar
3. Copiar `prompts/txt/prompt-6.txt` → pegar en Lovable → validar

### En Supabase (mientras Lovable trabaja)
1. SQL Editor → pegar y ejecutar `backend/B0-schema-extras.sql`
2. SQL Editor → pegar y ejecutar `backend/prompt-6.sql` (B1)
3. SQL Editor → pegar y ejecutar `backend/prompt-7.sql` (B2)
4. Verificar con los tests de `backend/prompt-6-calculo-puntos.md`

### Fixture (datos reales)
- Opciones discutidas:
  - A) Felipe pega el fixture de FIFA y Kira genera el CSV
  - B) Felipe completa `fixture-mundial-2026.csv` manualmente
- Fuente: https://www.fifa.com/worldcup/matches

### Imágenes de avatares
- Opciones discutidas:
  - A) Fotos reales → Supabase Storage → URLs en panel admin
  - B) URLs auto-generadas (ui-avatars.com) → cero uploads
  - C) Fallback con inicial → implementar fotos después del mundial
- **Decisión pendiente para próxima sesión**

---

## 🗺️ Flujo completo próxima sesión

```
LOVABLE:
  → Prompt 5 (panel admin + PWA)
  → Prompt 6 (puntos en vivo + avatares + toggle)

SUPABASE SQL EDITOR:
  → B0: B0-schema-extras.sql
  → B1: prompt-6.sql
  → B2: prompt-7.sql

FIXTURE:
  → Conseguir calendario oficial de FIFA
  → Completar CSV y cargar en Supabase Table Editor

AVATARES:
  → Decidir camino A/B/C
  → Implementar

TEST:
  → Partido de prueba end-to-end
  → Verificar puntos automáticos

LANZAMIENTO:
  → URL + PIN 1234 a los 7 amigos por WhatsApp
```

---

## 📁 Archivos clave para la próxima sesión

| Archivo | Para qué |
|---|---|
| `prompts/txt/prompt-5.txt` | Pegar en Lovable |
| `prompts/txt/prompt-6.txt` | Pegar en Lovable |
| `prompts/backend/B0-schema-extras.sql` | Pegar en Supabase SQL Editor |
| `prompts/backend/prompt-6.sql` | Pegar en Supabase SQL Editor |
| `prompts/backend/prompt-7.sql` | Pegar en Supabase SQL Editor |
| `prompts/backend/fixture-mundial-2026.csv` | Completar y cargar en Supabase |
| `prompts/backend/guia-storage-avatares.md` | Guía paso a paso para las fotos |

---

## 🐶 Mensaje de Kira

Felipe, hoy fue una sesión muy productiva:
- ✅ Cerramos el Prompt 6 con 3 features nuevas (puntos en vivo, toggle predicciones, avatares dinámicos)
- ✅ Todo el backend listo para ejecutar en Supabase (B0 a B4)
- ✅ Guía de storage paso a paso para las fotos
- ✅ Template del fixture con estructura correcta

La próxima sesión es la última antes del mundial.
Vas a llegar. ⚽⚡
