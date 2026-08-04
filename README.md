# FactuRD v2.4 — Facturación Electrónica DGII

> Sistema de facturación electrónica para la República Dominicana (DGII) · Electronic invoicing system for the Dominican Republic (DGII)

Aplicación full-stack de facturación electrónica (e-CF): backend **FastAPI + PostgreSQL (Supabase)**, frontend **React + Tailwind CSS + Vite**, app de escritorio con **Tauri** y modo **PWA**.

> La página de marketing del producto se encuentra en el repositorio **[facturd-landing](https://github.com/NostradamesP/facturd-landing)**.

---

## 🇪🇸 Español

### Descripción

FactuRD es un sistema completo para la emisión de comprobantes fiscales electrónicos (e-CF) conforme a la DGII (Ley 32-23). Incluye facturación, inventario con Kardex FIFO, cotizaciones, cobros/pagos, gastos, reportes, diseñador visual de facturas (drag & drop), generación de PDF, multi-empresa, multi-usuario con roles y módulo DGII (actualmente en modo mock mientras avanza la certificación).

### Características principales

- **Facturación electrónica (e-CF):** NCF secuencial (B01/B02/B04/B11/B12/E31/E41/E43/E44), estados y descuentos.
- **Diseñador de facturas** drag & drop con plantillas guardadas en BD.
- **Inventario + Kardex FIFO**, stock mínimo y alertas.
- **Clientes/proveedores** con validación de RNC (checksum de 9 dígitos).
- **Cobros, pagos, gastos y cotizaciones** convertibles a factura.
- **Módulo DGII:** XML e-CF v1.0, envío/consulta y validación de RNC (modo mock configurable con `DGII_MOCK_MODE`).
- **Multi-empresa y multi-usuario** con roles ADMIN/CONTADOR/VENDEDOR y datos segregados por `empresa_id`.
- **Autenticación JWT** con refresh tokens, rate limiting y headers de seguridad.
- **i18n ES/EN**, **PWA** y app de escritorio **Tauri 2**.
- **42 tests automatizados** (pytest).

### Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.10+ · FastAPI · SQLAlchemy 2 · Pydantic 2 · Alembic |
| Base de datos | PostgreSQL (Supabase en producción, SQLite en dev) |
| Frontend | React 19 · Vite 8 · Tailwind CSS 4 · React Router 7 · Axios |
| Desktop | Tauri 2 (Rust) |
| Auth | JWT + refresh tokens (python-jose, bcrypt) |
| PDF / XML | ReportLab · lxml |
| Deploy | Render · Netlify · GitHub Pages · Docker Compose + Nginx |

### Requisitos

- Node.js 18+
- Python 3.10+
- Rust (solo para build desktop)

### Setup local

#### Backend

```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
# .env debe tener DATABASE_URL y JWT_SECRET
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd facturd-desktop
npm install
npm run dev   # → http://localhost:5173
```

El dev server de Vite hace proxy de `/api` a `http://localhost:8000`.

### Variables de entorno

#### Backend (`.env`)

```env
DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/db?sslmode=require
JWT_SECRET=<tu-secreto>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DGII_MOCK_MODE=true
```

#### Frontend (`facturd-desktop/.env`)

```env
VITE_API_URL=/api
```

### Arquitectura

```txt
Browser / Tauri ──> Frontend (Vite) ──> /api ──> Backend (FastAPI) ──> PostgreSQL (Supabase)
                                                        │
                                                        └──> DGII SOAP + mTLS
```

### Estructura

```txt
facturd-v2.4/
├── backend/               # API FastAPI (routes, models, services, tests, alembic)
├── facturd-desktop/       # Frontend React + Tauri (pages, components, i18n, src-tauri)
├── deploy/                # Docker Compose, Nginx, guía de publicación VPS
├── supabase/              # Migraciones SQL
├── render.yaml            # Blueprint de Render
└── .github/workflows/     # CI/CD a GitHub Pages
```

### Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/refresh` | Renovar token |
| GET/POST | `/api/facturas` | Listar / crear facturas |
| GET | `/api/clientes` | Clientes (paginado) |
| GET | `/api/productos` | Productos (paginado) |
| GET/PUT | `/api/empresa` | Datos de la empresa |
| GET | `/api/gastos/resumen` | Resumen de gastos |
| POST | `/api/dgii/enviar/{id}` | Enviar a la DGII |
| POST | `/api/pdf/invoice/{id}` | Generar PDF |

### Licencia

MIT

---

## 🇺🇸 English

### Overview

FactuRD is a full electronic invoicing (e-CF) system compliant with the Dominican Republic's DGII (Law 32-23): billing, FIFO Kardex inventory, quotes, collections/payments, expenses, reports, a drag & drop invoice designer, PDF generation, multi-company, role-based multi-user and a DGII module (currently in mock mode while certification is in progress).

### Key features

- **Electronic invoicing (e-CF):** sequential NCF (B01/B02/B04/B11/B12/E31/E41/E43/E44), statuses and discounts.
- **Drag & drop invoice designer** with templates stored in the database.
- **FIFO Kardex inventory**, minimum stock and alerts.
- **Customers/suppliers** with RNC validation (9-digit checksum).
- **Collections, payments, expenses and quotes** convertible to invoices.
- **DGII module:** e-CF XML v1.0, send/query and RNC validation (configurable mock mode via `DGII_MOCK_MODE`).
- **Multi-company and multi-user** with ADMIN/ACCOUNTANT/SELLER roles and data segregated by `empresa_id`.
- **JWT auth** with refresh tokens, rate limiting and security headers.
- **ES/EN i18n**, **PWA** and **Tauri 2** desktop app.
- **42 automated tests** (pytest).

### Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+ · FastAPI · SQLAlchemy 2 · Pydantic 2 · Alembic |
| Database | PostgreSQL (Supabase in production, SQLite in dev) |
| Frontend | React 19 · Vite 8 · Tailwind CSS 4 · React Router 7 · Axios |
| Desktop | Tauri 2 (Rust) |
| Auth | JWT + refresh tokens (python-jose, bcrypt) |
| PDF / XML | ReportLab · lxml |
| Deploy | Render · Netlify · GitHub Pages · Docker Compose + Nginx |

### Requirements

- Node.js 18+
- Python 3.10+
- Rust (desktop build only)

### Local setup

#### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# .env must contain DATABASE_URL and JWT_SECRET
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd facturd-desktop
npm install
npm run dev   # → http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:8000`.

### Environment variables

#### Backend (`.env`)

```env
DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/db?sslmode=require
JWT_SECRET=<your-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DGII_MOCK_MODE=true
```

#### Frontend (`facturd-desktop/.env`)

```env
VITE_API_URL=/api
```

### Architecture

```txt
Browser / Tauri ──> Frontend (Vite) ──> /api ──> Backend (FastAPI) ──> PostgreSQL (Supabase)
                                                        │
                                                        └──> DGII SOAP + mTLS
```

### Structure

```txt
facturd-v2.4/
├── backend/               # FastAPI API (routes, models, services, tests, alembic)
├── facturd-desktop/       # React + Tauri frontend (pages, components, i18n, src-tauri)
├── deploy/                # Docker Compose, Nginx, VPS publishing guide
├── supabase/              # SQL migrations
├── render.yaml            # Render blueprint
└── .github/workflows/     # CI/CD to GitHub Pages
```

### Main endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/refresh` | Refresh token |
| GET/POST | `/api/facturas` | List / create invoices |
| GET | `/api/clientes` | Customers (paginated) |
| GET | `/api/productos` | Products (paginated) |
| GET/PUT | `/api/empresa` | Company data |
| GET | `/api/gastos/resumen` | Expenses summary |
| POST | `/api/dgii/enviar/{id}` | Send to DGII |
| POST | `/api/pdf/invoice/{id}` | Generate PDF |

### License

MIT
