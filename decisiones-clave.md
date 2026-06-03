# 🎯 Las 5 Decisiones Clave que debes tomar ANTES de programar

> Estas decisiones son **críticas**. Definirlas bien al inicio te ahorrará horas de dolor después.
> La mayoría de proyectos fracasan por saltarse esta etapa.

---

## 1️⃣ Sistema de puntuación exacto

**¿Cuántos puntos otorga cada tipo de acierto?**

### Plantilla para completar con tus amigos:

| Tipo de acierto | Puntos |
|---|---|
| Acierto resultado exacto (ej: predijo 3-1 y fue 3-1) | ___ pts |
| Acierto ganador + diferencia de goles (ej: predijo 2-0 y fue 3-1, ambos "gana A por 2") | ___ pts |
| Solo acierto ganador (ej: predijo 1-0 y fue 4-2) | ___ pts |
| Acierto empate (sin importar el marcador) | ___ pts |
| Acierto empate con marcador exacto (ej: predijo 1-1 y fue 1-1) | ___ pts |
| Bonus por acertar fase eliminatoria (octavos, cuartos, etc.) | ___ pts |
| Bonus por acertar campeón del Mundial | ___ pts |
| Bonus por acertar finalistas | ___ pts |
| Bonus por acertar goleador del torneo | ___ pts |

### ⚠️ Reglas importantes:
- [ ] Una vez iniciado el torneo, **NO se pueden cambiar** las reglas
- [ ] Todos arrancan con 0 puntos
- [ ] Documentar las reglas en un grupo de WhatsApp/Telegram para que quede registro

---

## 2️⃣ ¿Cómo se cargan los resultados reales?

### Opción A: Manual (recomendada para principiantes) ⭐
- Tú (o un admin designado) carga los resultados después de cada partido
- **Pros**: Simple, sin dependencias externas, control total
- **Contras**: Tienes que estar pendiente (104 partidos en 1 mes)

### Opción B: API automática
- Conectar a [API-Football](https://www.api-football.com) o similar
- **Pros**: Cero trabajo manual, resultados al instante
- **Contras**: Más complejo, posibles errores de la API, límites del plan gratuito

**Tu elección**: ☐ Manual  ☐ API  ☐ Híbrido (manual con API de respaldo)

---

## 3️⃣ Deadline de pronósticos ⏰

**¿Hasta cuándo se puede pronosticar/modificar un partido?**

Opciones comunes:
- ☐ Hasta 15 minutos antes del kickoff (estándar de la industria)
- ☐ Hasta el inicio exacto del partido
- ☐ Hasta 1 hora antes
- ☐ Hasta 24 horas antes

### ⚠️ CRÍTICO
Si no defines esto y lo implementas técnicamente, tus amigos podrían pronosticar **con el partido ya en juego** (o terminado) viendo el resultado. Esto **arruina el juego**.

---

## 4️⃣ Sistema de login

### Opción A: Simple (recomendada) ⭐
- **Nombre + PIN de 4 dígitos**
- Tú creas las 8 cuentas y les pasas el PIN por WhatsApp
- No requiere emails ni recuperación de contraseña
- Perfecto para amigos cercanos

### Opción B: Email + contraseña
- Cada amigo se registra solo
- Más profesional pero más fricción
- Requiere validación de email, recuperación, etc.

### Opción C: Magic link
- Le mandas un link por email/WhatsApp que los loguea automáticamente
- Moderno pero requiere configuración

**Tu elección**: ☐ A  ☐ B  ☐ C

---

## 5️⃣ Carga del fixture (calendario de partidos)

**El Mundial 2026 tiene 104 partidos**. ¿Cómo los cargas a la base de datos?

### Opción A: Manual ⭐
- Una sola vez al inicio, cargas los 104 partidos a Supabase
- Puedes usar un CSV o el editor de Supabase
- Tiempo estimado: 2-3 horas
- **Pros**: Control total, no dependes de nada externo

### Opción B: API
- La API te trae el fixture completo automáticamente
- **Pros**: Cero trabajo
- **Contras**: Si la API cambia formato, te rompe la app

### Opción C: Híbrido
- Cargas fase de grupos manual (48 partidos)
- A medida que avanza el torneo, agregas los partidos de eliminatorias (porque dependen de quién clasifique)

**Tu elección**: ☐ A  ☐ B  ☐ C

---

## ✅ Checklist final antes de pasar a desarrollo

- [ ] Sistema de puntuación definido y acordado con TODOS los amigos
- [ ] Reglas documentadas en un grupo de chat (con captura de pantalla)
- [ ] Decidido quién será el admin para cargar resultados
- [ ] Deadline de pronósticos definido
- [ ] Sistema de login elegido
- [ ] Método de carga del fixture decidido
- [ ] Lista de los 8 amigos con sus nombres confirmados

## 📅 Fechas importantes del Mundial 2026

- **11 de junio 2026**: Partido inaugural
- **19 de julio 2026**: Final
- **Recomendación**: Tener la app lista y testeada al menos **2 semanas antes** del partido inaugural

---

## 🐶 Próximo paso

Una vez completes este documento, vuelve con Kira (en tu PC personal idealmente) para que te ayude a redactar el **prompt maestro** para Lovable.dev. Ese prompt va a determinar el 80% de la calidad de tu app generada por IA.
