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

### Backend (`packages/backend/.env`)

- `PORT`: puerto del servidor (default `4000`).
- `DATABASE_URL`: cadena de conexi?n a Postgres.
- `DATABASE_SSL`: `true` si el proveedor requiere SSL.

## Deploy del Backend (API)

El backend expone:

- `GET /health`
- `GET/POST /api/bookings`
- `GET /api/rooms`
- `GET /api/rates`

### Opción A: Servidor Node (VM / EC2 / Droplet / Render / Fly)

1. Construir el entorno:
   - Copia `packages/backend/.env.example` a `packages/backend/.env` y ajusta valores.
2. Instalar dependencias:
   - `cd packages/backend`
   - `npm ci`
3. Ejecutar:
   - `npm start`

Notas:

- Asegura que el proveedor tenga una base de datos Postgres persistente.
- `cors()` está habilitado en `packages/backend/src/server.js`, pero en producción es recomendable restringir orígenes al dominio del frontend.

### Opción B: Contenedor (Docker)

No hay `Dockerfile` incluido actualmente. Si se decide contenerizar:

- El contenedor debe exponer el puerto `PORT`.
- Debe apuntar a un Postgres externo o incluir Postgres en el stack de Docker.

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
- Postgres configurado y accesible desde el backend.

## Pendientes (Infraestructura)

- Configurar `VITE_IMAGES_BASE_URL` en el frontend para servir las imágenes de productos (el backend devuelve solo el nombre de la imagen).
- (Opcional) Definir un flujo de administración/carga para poblar `cafeteria_products` en la BD.
