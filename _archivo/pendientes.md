# ❓ Decisiones Pendientes

> Lo último que falta cerrar antes de armar los 3 prompts del frontend para Lovable.

> 🆕 **Update**: el sistema de puntuación ya está CERRADO (ver `decisiones-tomadas.md`).
> Se incorporaron las reglas tomadas del prompt anterior de Felipe:
> puntuación escalada por fase, bonus por marcador de riesgo, regla 90 min,
> predicciones especiales pre-mundial y sistema de desempate.

---

## 🔴 BLOQUEANTES para armar los 3 prompts de Lovable

### 1. 🎨 Identidad de la app

#### a) Nombre
**Opciones**:
- "Prode Mundial 26"
- "La Polla 2026"
- "Pronóstico Crack"
- "GoalMasters 26"
- Custom: __________

**Tu elección**: ____________________

#### b) Estética visual (elige UNA)
- [ ] 🏟️ **Estadio clásico** — verde césped #0E7C3A + dorado #FFD700
- [ ] ⚡ **Deportivo moderno** — negro #0A0A0A + neón azul/verde
- [ ] 🌈 **Festivo mundialista** — rojo/verde/blanco (USA/MEX/CAN)
- [ ] 🎮 **Gaming/FIFA** — oscuro + azul eléctrico #00D9FF
- [ ] 🍺 **Casual entre amigos** — naranja cálido + crema

---

### 2. 👥 Los 8 jugadores

- [ ] **A)** Paso los 8 nombres reales (van hardcodeados en el dropdown de login)
- [ ] **B)** Uso placeholders "Jugador 1 ... Jugador 8" y los cambio después en Supabase

**Si elegiste A, lista**:
1. ____________________ (admin) 🔧
2. ____________________
3. ____________________
4. ____________________
5. ____________________
6. ____________________
7. ____________________
8. ____________________

---

### 3. 🌍 Zona horaria

¿En qué zona horaria se muestran los partidos?
- [ ] GMT-3 (Argentina, Uruguay, Chile-verano)
- [ ] GMT-5 (Colombia, Perú, México central)
- [ ] GMT-6 (México DF, Centroamérica)
- [ ] Otra: __________

---

### 4. ⏰ Deadline de pronósticos (cierre antes del kickoff)

- [ ] 5 min antes
- [ ] **15 min antes** ⭐ (recomendado)
- [ ] 30 min antes
- [ ] 1 hora antes

---

### 5. 📅 Carga del fixture (104 partidos)

¿Cómo cargamos los partidos del Mundial 2026?
- [ ] 🅰️ Que Lovable los genere (riesgo: puede inventar fechas/sedes incorrectas)
- [ ] 🅱️ **CSV manual desde Supabase** ⭐ (recomendado, más confiable)
- [ ] 🅲️ Conectar a API deportiva (más complejo, +1 prompt extra)

---

## 🟢 YA DECIDIDO (no preguntar de nuevo)

Ver `decisiones-tomadas.md` para la lista completa. Highlights:

- ✅ PWA con Lovable + Supabase + Vercel
- ✅ 8 amigos cerrados, login con PIN
- ✅ Admin = jugador con permisos extra
- ✅ Pronósticos privados hasta deadline
- ✅ Carga manual de resultados por admin
- ✅ **Sistema de puntuación completo** (escalado por fase + bonus por marcador de riesgo)
- ✅ **Predicciones especiales pre-mundial** (campeón, finalistas, semifinalistas, goleador, mejor jugador, mejor arquero, mejor joven)
- ✅ **Regla 90 min en eliminatorias** (sin tiempo extra ni penales)
- ✅ **Sistema de desempate** (4 criterios escalonados)
- ✅ Modo oscuro, mobile-first, idioma español, navegación bottom tabs

---

## 📝 Formato sugerido para responder

Cuando quieras responder, copiá esto y completá:

```
1. NOMBRE: ____________
2. ESTÉTICA: ____________
3. JUGADORES: A (van los nombres) / B (placeholders)
   Si A:
   1. ____________ (admin)
   2-8. ____________
4. ZONA HORARIA: GMT-___
5. DEADLINE: __ minutos
6. FIXTURE: A (Lovable) / B (CSV manual) / C (API)
```

---

## 🚨 Mínimos absolutos para arrancar

Si querés arrancar HOY con lo mínimo, lo crítico es:
1. ✅ Nombre (1 palabra alcanza)
2. ✅ Estética (1 opción de las 5)
3. ✅ Jugadores: A o B
4. ✅ Zona horaria

El resto (deadline, fixture) puede ir con defaults (15 min / CSV manual).
