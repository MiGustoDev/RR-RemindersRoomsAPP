# Configuración de Netlify para Reminder

## Problema: Error ERR_NAME_NOT_RESOLVED

Si ves el error `ERR_NAME_NOT_RESOLVED` al intentar iniciar sesión, significa que las variables de entorno de Supabase no están configuradas en Netlify.

## Solución: Configurar Variables de Entorno en Netlify

### Paso 1: Obtener tus credenciales de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Settings** > **API**
3. Copia los siguientes valores:
   - **Project URL** → será tu `VITE_SUPABASE_URL`
   - **anon/public key** → será tu `VITE_SUPABASE_ANON_KEY`

### Paso 2: Configurar variables en Netlify

1. Ve a tu sitio en [Netlify Dashboard](https://app.netlify.com)
2. Selecciona tu sitio
3. Ve a **Site settings** (Configuración del sitio)
4. En el menú lateral, haz clic en **Build & deploy** > **Environment variables**
5. Haz clic en **Add a variable** (Agregar variable)
6. Agrega las siguientes variables:

   **Variable 1:**
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://tu-proyecto.supabase.co` (tu URL de Supabase)

   **Variable 2:**
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: `tu_anon_key_aqui` (tu clave anónima de Supabase)

7. Haz clic en **Save** (Guardar)

### Paso 3: Redesplegar tu sitio

1. Ve a **Deploys** en el menú de tu sitio
2. Haz clic en **Trigger deploy** > **Deploy site**
3. Espera a que termine el build

### Paso 4: Verificar

Una vez que el deploy termine, recarga tu sitio y deberías poder iniciar sesión sin problemas.

## Configuración Local (Desarrollo)

Para desarrollo local, crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

**Nota:** El archivo `.env` está en `.gitignore` y no se subirá al repositorio por seguridad.

## Verificación

Si las variables están correctamente configuradas, verás en la consola del navegador:
```
✅ Variables de entorno encontradas
URL: https://tu-proyecto.supabase...
```

Si no están configuradas, verás un mensaje de error en la página.

