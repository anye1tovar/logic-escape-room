# Deploy (Logic Escape Room)

Este repo es un monorepo con:

- `packages/frontend`: React + Vite (sitio estático).
- `packages/backend`: Express + PostgreSQL (API).

## Requisitos

- Node.js (recomendado: 18+).
- npm.

## Variables de entorno

### Frontend (`packages/frontend/.env`)

- `VITE_API_BASE_URL`: URL base del backend (ej. `https://api.tudominio.com` o `http://localhost:4000`).
- `VITE_META_PIXEL_ID`: ID del Pixel/Dataset de Meta. Si no se configura, el Pixel no se carga.

### Backend (`packages/backend/.env`)

- `PORT`: puerto del servidor (default `4000`).
- `DATABASE_URL`: cadena de conexión a Postgres. En producción apunta a Neon.
- `DATABASE_SSL`: `true` para Neon y otros proveedores que requieren SSL.
- `AUTH_SECRET`: secreto fuerte para firmar tokens. Obligatorio en producción; no uses `dev-secret-change-me`.
- `AUTH_TOKEN_TTL_SECONDS`: duración de sesión admin en segundos (default `28800`).
- `META_CAPI_ENABLED`: `true` para activar Conversions API.
- `META_PIXEL_ID`: ID del Pixel/Dataset de Meta.
- `META_CAPI_ACCESS_TOKEN`: token de Conversions API generado en Events Manager.
- `META_TEST_EVENT_CODE`: código opcional para probar eventos en Events Manager.
- `META_CAPI_API_VERSION`: versión opcional de Graph API (default `v20.0`).

Notas de seguridad:

- `META_CAPI_ACCESS_TOKEN` debe existir solo como variable de entorno del backend. No lo pegues en código, documentación, tickets, capturas, logs ni archivos versionados.
- Si un token real se expone fuera del administrador de secretos del proveedor, rótalo en Meta Events Manager y actualiza la variable de entorno.

## Infraestructura actual

- Frontend: Vercel.
- Backend API: Koyeb.
- Database: Neon PostgreSQL.
- Imagenes del menu: assets estaticos en `packages/frontend/public/img/menu`.

## Deploy del Backend (API) en Koyeb

El backend expone:

- `GET /health`
- `GET/POST /api/bookings`
- `GET /api/rooms`
- `GET /api/rates`

Configuración recomendada en Koyeb:

- Runtime: Node.js.
- Root directory: `packages/backend`.
- Build command: `npm ci`.
- Run command: `npm start`.
- Health check path: `/health`.

Variables de entorno obligatorias en Koyeb:

- `NODE_ENV=production`
- `PORT` — usar el puerto que indique Koyeb si lo inyecta; si no, `4000`.
- `DATABASE_URL` — connection string de Neon.
- `DATABASE_SSL=true`
- `AUTH_SECRET` — valor fuerte generado para producción.
- `AUTH_TOKEN_TTL_SECONDS=28800`
- `CORS_ORIGINS=https://tu-frontend.vercel.app,https://tu-dominio.com`
- `META_CAPI_ENABLED=true`
- `META_PIXEL_ID` — mismo Pixel/Dataset usado en frontend.
- `META_CAPI_ACCESS_TOKEN` — token de CAPI.

Para generar `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Notas:

- No uses `dev-secret-change-me` en producción; el backend falla al iniciar en entornos production-like si el secreto falta o quedó con el valor default.
- Neon requiere SSL, por eso `DATABASE_SSL=true`.
- `cors()` está habilitado en `packages/backend/src/server.js`; en producción restringilo al dominio real del frontend con `CORS_ORIGINS`.

## Deploy del Frontend (sitio estático)

1. Configurar `VITE_API_BASE_URL` (producción) en `packages/frontend/.env` o en variables del proveedor de hosting.
2. Build:
   - `cd packages/frontend`
   - `npm ci`
   - `npm run build`
3. Publicar el contenido de `packages/frontend/dist` en un hosting estático (S3 + CloudFront, Vercel, Netlify, etc.).

## Checklist rápido

- Backend accesible públicamente (ej. `https://api.tudominio.com/health`).
- Frontend configurado con `VITE_API_BASE_URL` apuntando al backend.
- CORS validado para el dominio del frontend.
- Neon PostgreSQL configurado y accesible desde Koyeb.
- `DATABASE_SSL=true` configurado para Neon.
- `AUTH_SECRET` fuerte configurado; no usar el valor de desarrollo.

## Pendientes (Infraestructura)

- Mantener las imagenes del menu en `packages/frontend/public/img/menu/products` y `packages/frontend/public/img/menu/categories`; la BD puede guardar solo el nombre del archivo.
- (Opcional) Definir un flujo de administración/carga para poblar `cafeteria_products` en la BD.
