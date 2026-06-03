# 🧠 FAQ Técnico - Aprendizajes clave del proyecto

> Compendio de insights técnicos discutidos. Útil para no tener que repreguntar lo mismo en futuras sesiones.

---

## 💰 Costos y planes

### Lovable.dev
- **Free**: 5 prompts/día, 30/mes
- **Pro**: ~$20 USD/mes, 100 prompts/día
- **Modelo**: Pagas por prompts usados, NO por uptime
- **Una vez deployada la app, puedes cancelar Lovable y la app sigue viva**

### Supabase
- **Free**: 500 MB DB, 2 GB ancho de banda, 50K MAU
- **Para 8 usuarios = Gratis para siempre** ✅
- ⚠️ **Pausa**: si no hay actividad por 7 días, el proyecto se pausa (1 click para despertarlo)
- 💡 Durante el mundial NO es problema (hay actividad diaria)

### Vercel
- **Hobby (free)**: 100 GB/mes, NUNCA se duerme
- **Para tu escala: completamente gratis**

### Estimación final del proyecto
| Escenario | Costo total |
|---|---|
| Mínimo (todo gratis, plan Free de Lovable) | $0 |
| Recomendado (1 mes Lovable Pro) | $20 |
| Premium (incluye dominio .com) | $32 |

---

## 🎨 Lovable.dev - Lo importante

### Qué SÍ hace
- Genera UI funcional desde lenguaje natural
- Crea componentes React + TypeScript
- Conexión nativa con Supabase (1 click)
- Deploy automático a Vercel
- Genera PWA si se le pide

### Qué NO hace bien
- Lógica de negocio muy compleja
- Cuando el prompt es muy largo se "marea"
- A veces alucina (genera cosas que no pediste)
- A veces rompe lo que ya funcionaba

### Regla de oro
✅ **Prompts cortos + específicos + iterativos**  
❌ **Mega-prompts únicos con muchas instrucciones**

### Cuando Lovable se confunde
1. Pausa, no le des más instrucciones
2. Vuelve al checkpoint anterior (los guarda automático)
3. Reformula con prompts más cortos
4. Si está muy ido, abre nuevo chat (contexto fresco)

---

## 💾 Supabase - Lo importante

### Qué te da listo
- Base de datos PostgreSQL real
- Autenticación
- API automática (REST + GraphQL)
- Realtime (cambios en vivo)
- Storage de archivos
- Edge Functions (lógica serverless)

### Row Level Security (RLS) - CRÍTICO
Es el mecanismo que **protege los datos a nivel base de datos**, no solo en el frontend.

**Ejemplo aplicado al proyecto**:
> *"Solo puedes ver pronósticos donde `usuario = tu_usuario`, EXCEPTO si el partido ya empezó."*

Sin RLS, cualquiera con conocimientos básicos puede ver datos que no debería.

### Realtime
Cuando se actualiza la DB, los clientes conectados ven los cambios al instante. Perfecto para:
- Tabla de posiciones que se actualiza al cargar un resultado
- Indicador de "Juan acaba de pronosticar"

### La trampa del plan Free
- Si no hay actividad por 7 días → proyecto pausado
- Solución gratis: cron-job.org haciendo un request cada 6 días
- Durante el mundial = no es problema

---

## 🌐 PWA vs App Nativa

### Por qué PWA gana para este caso

| Aspecto | PWA | App Nativa |
|---|---|---|
| Costo | $0 | $99/año Apple + $25 Google |
| Tiempo de desarrollo | Días | Semanas/meses |
| Actualizar | Push y listo | Volver a publicar en tienda |
| Instalación | "Agregar a pantalla inicio" | Bajar de tienda |
| Funciona en iOS + Android | Sí, con el mismo código | Hay que hacer 2 versiones |
| Conocimiento requerido | Bajo | Alto (Swift/Kotlin/RN/Flutter) |

### Cómo se "instala" una PWA
1. Usuario abre la URL en Safari/Chrome
2. Menú del navegador → "Agregar a pantalla de inicio"
3. Aparece como ícono nativo, abre sin barra de navegador
4. Se siente como app real

---

## 🔐 Seguridad y antitrampa

### Principios aplicados al proyecto

1. **No confiar en el frontend**: toda validación crítica también en backend (Supabase RLS)
2. **Privacidad por diseño**: pronósticos ocultos hasta deadline a nivel DB
3. **Logs transparentes**: las acciones admin quedan visibles para todos
4. **PINs fuertes para roles privilegiados**: admin con PIN más largo
5. **Validación de tiempo en backend**: imposible saltarse el deadline editando HTML

### Por qué el admin no puede hacer trampa (técnicamente)
- Sus pronósticos están bajo las mismas reglas (RLS no distingue admin para esto)
- No puede ver pronósticos ajenos antes del kickoff (RLS bloquea)
- No puede editar su pronóstico después del deadline (validación en DB)
- Si edita resultados, queda registrado en log público

---

## 🐛 Debugging con IA - Lo que sí se puede

### Kira puede ayudar a debuggear
- Errores de consola del navegador
- Snippets de código que no entiendes
- UI rota (con screenshots)
- Queries de Supabase que fallan
- Errores de deploy en Vercel
- Cuando Lovable se confunde con prompts

### Cómo pedir ayuda efectivamente
1. Pegar mensaje de error completo
2. Pegar el código relevante
3. Describir qué intentaste hacer y qué pasó
4. Screenshot si es visual

### Errores comunes que verás
| Error | Significa | Dificultad |
|---|---|---|
| `undefined is not an object` | Pediste algo que aún no llegó | Fácil |
| `CORS error` | Navegador bloquea petición | Media |
| `Row Level Security policy violation` | Supabase no te deja leer/escribir | Media |
| `Hydration mismatch` | Server vs Client renderizan distinto | Difícil |
| Build failed on Vercel | Código no compila en producción | Media |

---

## 📅 Decisiones clave del proceso

### Por qué no usar API automática para resultados
- Más complejo (+3 prompts)
- Dependencia externa que puede fallar
- Con 104 partidos en 1 mes, 30 seg/partido manual = 52 min total (manejable)
- Para tu caso: manual es más simple y robusto

### Por qué Opción B (admin con cuenta de jugador)
- 1 sola sesión (cómodo)
- No necesitas cerrar/abrir sesión
- Permisos extra a través de flag `es_admin`
- Mismo costo en prompts que tener cuenta separada

### Por qué cargar fixture manualmente (sugerido)
- 100% exacto (sin alucinaciones de IA)
- Solo se hace 1 vez
- Te ahorras dependencia de prompts en algo crítico

---

## 🎯 Métricas a recordar

- **104 partidos** del Mundial 2026
- **8 jugadores** + 1 rol admin
- **40 días aprox** de duración del torneo
- **15 prompts** para construir el MVP
- **3 días** para tener todo listo
- **$0-$20** USD costo total
- **11 jun - 19 jul 2026** = fechas del Mundial

---

## 🐶 Filosofía del proyecto

> "Hecho > Perfecto"  
> Para 8 amigos durante 1 mes, no necesitas Netflix-quality.  
> Funcionalidad primero, belleza después.

> "Validar antes de avanzar"  
> Cada prompt debe funcionar antes del siguiente.  
> Acumular bugs es la muerte del proyecto.

> "Backups y checkpoints"  
> Lovable los guarda. Úsalos.  
> Supabase exporta DB. Hazlo semanalmente durante el mundial.
