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

### Paso 3: ⚠️ REDESPLEGAR tu sitio (MUY IMPORTANTE)

**CRÍTICO:** Después de agregar las variables de entorno, **DEBES hacer un nuevo deploy**. Las variables de entorno solo se inyectan durante el proceso de build, no en tiempo de ejecución.

1. Ve a **Deploys** en el menú de tu sitio
2. Haz clic en **Trigger deploy** > **Deploy site**
3. Espera a que termine el build (puede tardar 1-3 minutos)
4. **NO** uses "Clear cache and deploy site" a menos que sea necesario

### Paso 4: Verificar

Una vez que el deploy termine:
1. Recarga tu sitio (Ctrl+F5 o Cmd+Shift+R para forzar recarga)
2. Abre la consola del navegador (F12)
3. Deberías ver: `✅ Variables de entorno encontradas` y la URL de Supabase
4. Intenta iniciar sesión

Si aún ves el error `ERR_NAME_NOT_RESOLVED`, verifica la sección de Troubleshooting abajo.

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

## Troubleshooting

### Error persiste después de configurar variables

Si después de agregar las variables y hacer un nuevo deploy sigues viendo `ERR_NAME_NOT_RESOLVED`:

1. **Verifica que las variables estén correctamente escritas:**
   - `VITE_SUPABASE_URL` (no `SUPABASE_URL`)
   - `VITE_SUPABASE_ANON_KEY` (no `SUPABASE_ANON_KEY`)
   - El prefijo `VITE_` es **obligatorio** para que Vite las inyecte en el build

2. **Verifica los valores:**
   - La URL debe empezar con `https://` y terminar con `.supabase.co`
   - La key debe ser la clave **anon/public**, no la service_role key

3. **Verifica el build:**
   - Ve a **Deploys** y revisa los logs del último build
   - Busca si hay errores relacionados con las variables
   - Asegúrate de que el build se completó exitosamente

4. **Limpia la caché y redespliega:**
   - Ve a **Deploys**
   - Haz clic en **Trigger deploy** > **Clear cache and deploy site**

5. **Verifica en la consola del navegador:**
   - Abre las herramientas de desarrollador (F12)
   - Ve a la pestaña Console
   - Deberías ver: `✅ Variables de entorno encontradas`
   - Si ves un error sobre variables faltantes, las variables no se inyectaron correctamente

### Verificar que las variables se inyectaron

Para verificar que las variables se inyectaron correctamente en el build:

1. Abre tu sitio en Netlify
2. Abre las herramientas de desarrollador (F12)
3. Ve a la pestaña **Network**
4. Recarga la página
5. Busca el archivo JavaScript principal (ej: `index-XXXXX.js`)
6. Ábrelo y busca `VITE_SUPABASE_URL` - deberías ver tu URL de Supabase en el código

Si no encuentras la URL en el código JavaScript, las variables no se inyectaron y necesitas verificar la configuración en Netlify.

