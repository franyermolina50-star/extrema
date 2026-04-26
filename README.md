# Apex Nutrition Frontend

Reestructura profesional del sitio en **Next.js 15 (App Router) + TypeScript**.

## Incluye

- Landing/storefront en `/` con:
  - productos activos
  - carrito
  - checkout real conectado al backend
  - seccion de videos controlada desde admin
- Panel admin en `/admin` con login en `/admin/login`
  - resumen general
  - gestion de inventario y productos
  - registro de ventas en tienda
  - validacion de pagos online
  - gestion de videos de portada
- Estado central con React Context + API backend.

## Stack

- Next.js 15
- TypeScript
- App Router

## Ejecutar local

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Variables frontend

Configura `.env.local` (puedes copiar `.env.local.example`):

```bash
NEXT_PUBLIC_API_BASE_URL=https://tu-api.onrender.com/api/v1
NEXT_PUBLIC_CSRF_COOKIE_NAME=apex_csrf_token
```

## Login de administrador

El login ahora usa el backend real. Debes crear tu usuario admin en la base de datos (ver `README_BACKEND.md`).
Desde la pantalla de login tambien puedes cambiar el usuario y la contraseña validando las credenciales actuales.

## Estructura principal

```text
src/
  app/
  components/
    admin/
    storefront/
  hooks/
  lib/
  providers/
  types/
```

## Nota de backend

El backend Python ya esta implementado en este repositorio.

- Arquitectura: `backend/models`, `backend/controllers`, `backend/routes`
- Deploy recomendado: Render (`render.yaml`)
- Guia completa: `README_BACKEND.md`
