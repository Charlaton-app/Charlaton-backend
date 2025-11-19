# Guía de Deployment - Backend

Esta guía explica cómo desplegar el backend de Charlaton en Render (u otra plataforma similar).

## Configuración de Firebase en Producción

### ⚠️ IMPORTANTE: No subir el archivo `firebase.json` al repositorio

El archivo `firebase.json` (service account key) contiene credenciales sensibles y **NUNCA** debe subirse a Git.

### Configuración Local (Desarrollo)

En tu archivo `.env` local (en `Charlaton-backend/`), usa:

```env
FIREBASE_KEY_PATH=./firebase.json
```

O si el archivo está en otro lugar:

```env
FIREBASE_KEY_PATH=../firebase.json
```

### Configuración en Producción (Render)

En lugar de subir el archivo, configura una **variable de entorno** con el contenido del JSON:

#### Paso 1: Obtener el contenido del JSON

Abre tu archivo `firebase.json` y copia **todo su contenido** (el JSON completo).

#### Paso 2: Convertir a una sola línea

Necesitas convertir el JSON a una sola línea. Puedes hacerlo de dos formas:

**Opción A: Usando un script (recomendado)**

```bash
# En la terminal, desde el directorio donde está firebase.json
cat firebase.json | jq -c
```

**Opción B: Manualmente**

1. Abre `firebase.json`
2. Elimina todos los saltos de línea y espacios extra
3. Debe quedar como una sola línea

**Ejemplo:**
```json
{"type":"service_account","project_id":"tu-proyecto",...}
```

#### Paso 3: Configurar en Render

1. Ve a tu proyecto en [Render Dashboard](https://dashboard.render.com)
2. Selecciona tu servicio (Web Service)
3. Ve a **Environment** (Variables de Entorno)
4. Agrega una nueva variable:
   - **Key**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Pega el JSON completo en una sola línea (sin saltos de línea)
5. Guarda los cambios

#### Paso 4: Otras variables de entorno necesarias

Asegúrate de configurar también:

```env
DATABASE_URL=tu_connection_string_de_postgres
FRONTEND_URL=https://tu-frontend.vercel.app
PORT=10000
NODE_ENV=production
```

### Cómo funciona el código

El código en `src/config/db.ts` ahora soporta ambas opciones:

- **Desarrollo**: Lee desde `FIREBASE_KEY_PATH` (archivo local)
- **Producción**: Lee desde `FIREBASE_SERVICE_ACCOUNT` (variable de entorno)

El código automáticamente detecta cuál usar según qué variable esté configurada.

## Verificación

Después de configurar las variables de entorno en Render:

1. Reinicia el servicio en Render
2. Revisa los logs para asegurarte de que no hay errores
3. Prueba que la conexión a Firebase funciona correctamente

## Seguridad

✅ **HACER:**
- Usar variables de entorno en producción
- Mantener `firebase.json` en `.gitignore`
- Rotar las credenciales periódicamente

❌ **NO HACER:**
- Subir `firebase.json` a Git
- Compartir credenciales en mensajes o documentación pública
- Usar el mismo service account en múltiples proyectos sin necesidad

