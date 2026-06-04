# 🔐 Prompt 7 — Políticas de seguridad (RLS)

> **Objetivo**: Configurar Row Level Security en Supabase para proteger los datos.
> **Dónde se ejecuta**: SQL Editor de Supabase (NO en Lovable).
> **Cuándo ejecutarlo**: en cualquier momento después del Prompt 1 del frontend. Recomendado: ANTES de invitar a los amigos a usar la app.

---

## ⚠️ Honestidad técnica primero

Felipe, te tengo que aclarar una cosa importante antes de pasarte el SQL:

**Como nuestra app NO usa Supabase Auth** (usamos un sistema de PIN custom hardcodeado), las políticas RLS basadas en "el usuario actual de Supabase" **no funcionan**, porque para Supabase **siempre somos el mismo "usuario anónimo"**.

Esto significa:
- ✅ Podemos proteger contra **clientes externos** que intenten hackear la app desde otra app/script
- ✅ Podemos hacer que **lectura sea pública** pero **escritura tenga restricciones**
- ❌ NO podemos hacer "Felipe no puede ver los pronósticos de Victor antes del deadline" desde RLS puro

**Cómo resolvemos eso entonces**:
- 🛡️ La regla de "no ver pronósticos ajenos" se valida en **el frontend** (Prompt 3 ya lo hace: solo muestra tus pronósticos antes del deadline)
- 🛡️ La regla de "no editar después del deadline" se valida en **el frontend** (Prompt 3 ya lo hace)
- 🛡️ El login con PIN previene que personas random entren a la app
- 🛡️ Es un grupo cerrado de 8 amigos (no Reddit), confianza implícita

**Esto es un trade-off consciente**: simpleza vs seguridad perfecta. Para 8 amigos durante 40 días → es 100% válido.

Si en el futuro querés mejorar seguridad → migrar a Supabase Auth (con magic link o email/password) y reescribir las políticas. Pero eso suma 3-5 prompts más al proyecto.

---

## 📋 Qué hace este SQL

1. **Habilita RLS** en todas las tablas (sin esto las políticas no se aplican)
2. **Lectura pública** para `partidos`, `partido_eventos`, `admin_log`, `predicciones_especiales`, `pronosticos`, `usuarios` (la regla de visibilidad la maneja el frontend)
3. **Escritura abierta para clientes anónimos** (con validación en frontend)
4. **Protege `usuarios.pin_hash`** — creamos una vista pública que no expone el PIN

---

## 📋 Cómo usar este prompt

1. Asegurate de que ya ejecutaste los Prompts 1 y 6.
2. Abrí Supabase → SQL Editor → New query.
3. Abrí `prompt-7.sql` con Bloc de Notas.
4. Copiá TODO el contenido y pegalo en el SQL Editor.
5. Click en "Run".
6. Validá con los tests de abajo.

---

## ✅ Test de validación

Después de ejecutar el SQL, probá desde el SQL Editor:

```sql
-- Test 1: Verificar que RLS está habilitado en todas las tablas
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('usuarios', 'partidos', 'pronosticos', 'predicciones_especiales', 'partido_eventos', 'admin_log');
-- Esperado: todas con rowsecurity = true

-- Test 2: Verificar que existe la vista usuarios_publica (sin pin_hash)
SELECT * FROM usuarios_publica LIMIT 1;
-- Esperado: ves columnas pero NO ves pin_hash

-- Test 3: Verificar que podés leer partidos como anónimo
SELECT COUNT(*) FROM partidos;
-- Esperado: número (no error)
```

Si los 3 tests pasan → seguridad básica activada.

---

## 🔮 Mejora futura (NO ahora)

Si en algún momento querés seguridad real:
1. Migrar a Supabase Auth (email + password o magic link)
2. Reescribir políticas RLS usando `auth.uid()`
3. Cambiar el login del frontend para usar `supabase.auth.signIn(...)`
4. Eliminar la columna `pin_hash` de `usuarios`

Esto agregaría ~3 prompts más. Para el MVP del mundial no hace falta. ✋
