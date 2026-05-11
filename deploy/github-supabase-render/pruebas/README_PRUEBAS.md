# Version Pruebas

Objetivo: publicar FactuRD temporalmente con datos demo para validar pantallas, flujo comercial y trazabilidad DGII sin exponer datos reales.

## Servicios

- Backend Render: `facturd-api-pruebas`
- Frontend Render: `facturd-frontend-pruebas`
- Supabase DB: `facturd-pruebas`

## Datos

Esta version ejecuta automaticamente:

```bash
alembic upgrade head
python -m app.scripts.seed_demo
```

Credenciales:

- Usuario: `demo@facturd-demo.com`
- Contrasena: `DemoFactuRD2026!`

## Variables Render

Copiar los valores de `.env.render.example` en Render.

Para `DATABASE_URL`, usar Supabase Pooler Session y cambiar `postgres://` por `postgresql+psycopg2://`.

## Validacion

- `/api/health` responde `ok`.
- Login demo entra correctamente.
- Dashboard carga facturas demo.
- `/api/dgii/registros` devuelve el registro demo con `DEMO-TRACK-0001`.
- Frontend abre desde Render Static Site y consume la API publica.

## Regla

Esta version puede reinicializar datos demo. Nunca usarla para datos reales.
