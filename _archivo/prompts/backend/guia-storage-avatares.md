# 🖼️ Guía: Supabase Storage — Subir avatares de los jugadores

> **Qué es esto**: guía paso a paso para subir las 24 fotos de avatares (8 jugadores × 3 posiciones) a Supabase Storage y obtener las URLs públicas para pegarlas en la app.
> **Cuándo hacerlo**: después de ejecutar el Prompt 6 de Lovable (que agrega los inputs de URL en el panel admin).

---

## 📐 Preparación: las 24 fotos

Antes de entrar a Supabase, tené listas las 24 imágenes en tu computadora.

### Las 3 categorías de avatar
- **pos1**: foto del 1er lugar (campeón)
- **medio**: foto para los puestos 2 a 7 (la misma)
- **pos8**: foto del último lugar

### Convención de nombres recomendada

```
felipe-fierro-pos1.jpg       ← posición 1 (1er lugar)
felipe-fierro-medio.jpg      ← posiciones 2 a 7
felipe-fierro-pos8.jpg       ← posición 8 (último)

victor-soto-pos1.jpg
victor-soto-medio.jpg
victor-soto-pos8.jpg

ignacio-contreras-pos1.jpg
ignacio-contreras-medio.jpg
ignacio-contreras-pos8.jpg

jaime-furio-pos1.jpg
jaime-furio-medio.jpg
jaime-furio-pos8.jpg

diego-galvez-pos1.jpg
diego-galvez-medio.jpg
diego-galvez-pos8.jpg

daniel-abreu-pos1.jpg
daniel-abreu-medio.jpg
daniel-abreu-pos8.jpg

benjamin-bustamante-pos1.jpg
benjamin-bustamante-medio.jpg
benjamin-bustamante-pos8.jpg

ignacio-gonzalez-pos1.jpg
ignacio-gonzalez-medio.jpg
ignacio-gonzalez-pos8.jpg
```

### Especificaciones técnicas recomendadas
- **Formato**: JPG o PNG (JPG más liviano, PNG si tienen fondo transparente)
- **Tamaño**: mínimo 200×200px, recomendado 400×400px
- **Forma**: cuadrada (se muestra circular en la app, pero el archivo es cuadrado)
- **Peso**: menos de 500KB por foto (para carga rápida en celular)

---

## 🪣 Paso 1: Crear el bucket en Supabase Storage

1. Entrá a [supabase.com](https://supabase.com) y abrí tu proyecto
2. En el menú lateral izquierdo, click en **"Storage"**
3. Click en **"New bucket"**
4. Configurá el bucket:
   - **Name**: `avatares`
   - **Public bucket**: ✅ activado (necesario para que las URLs funcionen en la app)
   - Click **"Save"**

---

## 📤 Paso 2: Subir las 32 fotos

1. Click en el bucket **`avatares`** que acabás de crear
2. Click en **"Upload files"** arriba a la derecha
3. Seleccioná las 32 fotos de una vez (Ctrl+A en la carpeta)
4. Esperá que suban todas
5. Deberías ver las 32 fotos listadas en el bucket

---

## 🔗 Paso 3: Obtener las URLs públicas

Para cada foto necesitás su URL pública. Hay dos formas:

### Forma A: Una por una (más lenta pero segura)
1. Click en la foto (ej: `felipe-fierro-pos1.jpg`)
2. En el panel derecho, copiá la **"Public URL"**
   - Se ve algo así: `https://xyz.supabase.co/storage/v1/object/public/avatares/felipe-fierro-pos1.jpg`
3. Pegá esa URL en un documento de texto para tenerlas todas juntas

### Forma B: Construirla manualmente (más rápido)
La URL de cualquier archivo sigue siempre este patrón:
```
https://[TU-PROJECT-ID].supabase.co/storage/v1/object/public/avatares/[nombre-del-archivo]
```

Podés construir las 32 URLs a mano reemplazando `[nombre-del-archivo]` con cada nombre.

Tu Project ID lo encontrás en: **Supabase → Settings → API → Project URL**

---

## 📋 Plantilla para organizar las URLs

Copiá esta plantilla en un bloc de notas y completala con tus URLs:

```
FELIPE FIERRO:
  pos1:  https://...supabase.co/storage/v1/object/public/avatares/felipe-fierro-pos1.jpg
  medio: https://...supabase.co/storage/v1/object/public/avatares/felipe-fierro-medio.jpg
  pos8:  https://...supabase.co/storage/v1/object/public/avatares/felipe-fierro-pos8.jpg

VICTOR SOTO:
  pos1:  https://...
  medio: https://...
  pos8:  https://...

IGNACIO CONTRERAS:
  pos1:  https://...
  medio: https://...
  pos8:  https://...

JAIME FURIÓ:
  pos1:  https://...
  medio: https://...
  pos8:  https://...

DIEGO GALVEZ:
  pos1:  https://...
  medio: https://...
  pos8:  https://...

DANIEL ABREU:
  pos1:  https://...
  medio: https://...
  pos8:  https://...

BENJAMIN BUSTAMANTE:
  pos1:  https://...
  medio: https://...
  pos8:  https://...

IGNACIO GONZALEZ:
  pos1:  https://...
  medio: https://...
  pos8:  https://...
```

---

## 📱 Paso 4: Pegar las URLs en la app

1. Abrí la app en el navegador (la URL de Lovable/Vercel)
2. Loguéate como **Felipe Fierro** (admin)
3. Andá al tab **Admin** → sub-tab **Jugadores**
4. Para cada jugador, pegá las 4 URLs en los inputs correspondientes
5. Click **"Guardar avatares"**
6. Verificá que aparezca el preview circular al lado del input

---

## ✅ Verificación final

Una vez cargadas todas las URLs:
1. Andá a la **Tabla de posiciones**
2. Verificá que cada jugador muestra su foto (no la inicial de fallback)
3. Para probar el cambio de avatar según posición → modificá manualmente los puntos de algún jugador en Supabase para cambiar su posición y ver si el avatar cambia

---

## 🐛 Si la URL no carga la imagen

- Verificá que el bucket esté marcado como **Public**
- Verificá que la URL no tenga espacios ni caracteres raros
- Abrí la URL directamente en el navegador → si muestra la imagen, funciona
- Si el bucket es privado → andá a Storage → bucket `avatares` → Settings → cambialo a Public
