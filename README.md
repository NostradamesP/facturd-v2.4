# FactuRD v2.4

Sistema de facturación electrónica para la República Dominicana (DGII).  
Backend: FastAPI + PostgreSQL (Supabase) | Frontend: React + Tailwind CSS + Vite

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI (Python 3.10+) |
| Frontend | React 19 + Vite + Tailwind CSS |
| BD | PostgreSQL (Supabase) |
| Desktop | Tauri (Rust) |
| Auth | JWT + refresh tokens |
| Hosting API | Render |
| Hosting Frontend | Netlify |

## Requisitos

- Node.js 18+
- Python 3.10+
- Rust (solo para build desktop)

## Setup Local

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# .env debe tener DATABASE_URL y JWT_SECRET
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd facturd-desktop
npm install
npm run dev   # → http://localhost:3000
```

El dev server de Vite proxy `/api` a `http://localhost:8000`.


## Variables de Entorno

### Backend (`.env`)

```
DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/db?sslmode=require
JWT_SECRET=<tu-secreto>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Frontend (`facturd-desktop/.env`)

```
VITE_API_URL=/api
```

## Arquitectura

```
Backend (FastAPI :8000) ──→ Supabase PostgreSQL
     ↑ proxy
Frontend (Vite :3000)
     ↑
Browser
```

La API se despliega en Render; el frontend en Netlify apuntando a la API de Render.

## Estructura

```
backend/
├── main.py               # App FastAPI + CORS + routers
├── app/
│   ├── routes/           # Endpoints (auth, facturas, clientes, etc.)
│   ├── models/           # SQLAlchemy models + Pydantic schemas
│   ├── middleware/        # Auth middleware (JWT)
│   ├── database.py       # DB session + engine
│   └── utils.py          # Helpers (ID gen, RNG)
├── migrate_orm.py        # Migración SQLite → PostgreSQL
└── seed_demo.py          # Datos demo

facturd-desktop/
├── src/
│   ├── pages/            # Dashboard, Facturas, Clientes, etc.
│   ├── components/       # Sidebar, Header, Layout, etc.
│   ├── context/          # AuthContext
│   ├── services/         # api.js (axios + interceptors)
│   └── i18n/             # Traducciones ES/EN
├── vite.config.js        # Proxy /api → :8000
└── package.json
```

## Endpoints Principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh token |
| GET | /api/facturas | Facturas (paginado) |
| POST | /api/facturas | Crear factura |
| GET | /api/clientes | Clientes (paginado) |
| GET | /api/productos | Productos (paginado) |
| GET/PUT | /api/empresa | Datos de empresa |
| GET | /api/gastos/resumen | Resumen de gastos |
| POST | /api/dgii/enviar/{id} | Enviar a DGII |
| POST | /api/pdf/invoice/{id} | Generar PDF |

## Licencia

MIT
