# Version Produccion Pronta

Objetivo: dejar lista la base de publicacion real sin usar datos demo ni exponer informacion sensible.

## Servicios

- Backend Render: `facturd-api-produccion`
- Frontend Render: `facturd-frontend-produccion`
- Supabase DB: `facturd-produccion`

## Diferencias contra pruebas

- No ejecuta `python -m app.scripts.seed_demo`.
- Auto deploy queda apagado.
- Debe usar otro proyecto Supabase.
- Debe usar `JWT_SECRET` distinto.
- Debe usar dominios propios antes de poner clientes reales.

## Variables Render

Copiar los valores de `.env.render.example` en Render.

Para `DATABASE_URL`, usar Supabase Pooler Session y cambiar `postgres://` por `postgresql+psycopg2://`.

## Checklist antes de clientes reales

- Crear proyecto Supabase separado.
- Ejecutar migraciones con `alembic upgrade head`.
- Confirmar que `registros_dgii` existe.
- Confirmar almacenamiento de XML original, XML firmado, respuesta DGII, TrackId, estado, PDF, logs y auditoria.
- Cambiar `JWT_SECRET`.
- Configurar dominios finales.
- Configurar `CORS_ORIGINS` solo con el dominio real.
- Crear usuario administrador real desde flujo controlado.
- Desactivar o restringir registros publicos si se decide cerrar el alta libre.
- Hacer backup inicial de Supabase.
- Probar login, factura, PDF y registro DGII con datos controlados.

## Regla

Esta version no debe recibir datos reales hasta completar el checklist.
