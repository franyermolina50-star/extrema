# Backend Python (FastAPI) - Produccion

Backend profesional para el frontend actual con:

- FastAPI + SQLAlchemy async
- Supabase PostgreSQL (externo)
- JWT access/refresh en cookies HttpOnly
- CSRF obligatorio en rutas sensibles
- Rate limiting de login
- Arquitectura por capas (`models`, `controllers`, `routes`)

## 1) Configurar variables

1. Copia `.env.example` a `.env`.
2. Completa `DATABASE_URL`, `JWT_SECRET_KEY` y dominios reales.
3. Produccion recomendada:
   - `APP_ENV=production`
   - `SECURE_COOKIES=true`
   - `COOKIE_SAMESITE=none`

## 2) Crear esquema en Supabase

1. Abre SQL Editor en Supabase.
2. Ejecuta `backend/sql/schema.sql`.
3. Opcional: carga catalogo base con `backend/sql/seed.sql`.

## 3) Crear admin inicial

Variables:

- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`

Ejemplo local valido:

- `DEFAULT_ADMIN_EMAIL=admin@apexntr.com`
- `DEFAULT_ADMIN_PASSWORD=Admin123!`

Opciones:

- Automatico al iniciar app (si existen variables).
- Manual:

```bash
python -m backend.scripts.bootstrap_admin
```

## 4) Ejecutar local

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

## 5) Endpoints principales

Publicos:

- `GET /api/v1/health`
- `GET /api/v1/store/products`
- `GET /api/v1/store/videos`
- `POST /api/v1/store/checkout`

Auth admin:

- `POST /api/v1/auth/change-credentials`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Admin catalogo:

- `GET /api/v1/admin/overview/`
- `POST /api/v1/admin/media/upload`
- `GET/POST/PATCH/DELETE /api/v1/admin/products/`
- `GET/POST/PATCH/DELETE /api/v1/admin/videos/`
- `GET /api/v1/admin/purchases/`
- `PATCH /api/v1/admin/purchases/{id}/status`

Admin operaciones (ventas y validaciones):

- `GET /api/v1/admin/ops/state`
- `GET /api/v1/admin/ops/store-sales`
- `POST /api/v1/admin/ops/store-sales`
- `GET /api/v1/admin/ops/online-validations`
- `PUT /api/v1/admin/ops/online-validations/{purchaseId}`

## 6) Despliegue en Render

Este repo ya incluye blueprint:

- `render.yaml` (frontend + backend + PostgreSQL administrado por Render)
- `Procfile` (arranque backend)

### Opcion A: Blueprint (recomendada)

1. En Render: `New +` -> `Blueprint`.
2. Conecta el repo.
3. Render detecta `render.yaml`.
4. Render crea automaticamente la base `extrema-db` y enlaza `DATABASE_URL`.
5. Completa solo variables sensibles pendientes (`DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD` si las usas).

### Opcion B: Crear servicios manualmente

Backend (Web Service):

- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

Frontend (Web Service):

- Build command: `npm ci && npm run build`
- Start command: `npm run start -- -p $PORT`
- `NEXT_PUBLIC_API_BASE_URL=https://<tu-api>.onrender.com/api/v1`
