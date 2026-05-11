# Flujo GitHub

## Repositorio

Crear un repositorio privado al principio. Cuando la demo este limpia, se puede decidir si hacerlo publico o mantenerlo privado.

Antes del primer push revisar que no entren:

- `.env`
- `facturd.db`
- `*.db`
- `*.log`
- `backend/venv`
- `facturd-desktop/node_modules`
- XML/PDF reales

## Ramas recomendadas

- `main`: version de pruebas/demo.
- `production`: version preparada para produccion.

## Render

Para pruebas:

1. Usar `deploy/github-supabase-render/pruebas/render.yaml`.
2. Crear Blueprint en Render apuntando a `main`.
3. Completar variables desde `pruebas/.env.render.example`.

Para produccion pronta:

1. Usar `deploy/github-supabase-render/produccion-pronta/render.yaml`.
2. Crear Blueprint separado en Render apuntando a `production`.
3. Completar variables desde `produccion-pronta/.env.render.example`.

Render permite usar Blueprints desde un `render.yaml`. Si la pantalla pide el archivo por defecto, copiar temporalmente el YAML elegido a la raiz como `render.yaml` antes de conectar esa version.

## Supabase

Crear dos proyectos separados:

- `facturd-pruebas`
- `facturd-produccion`

En ambos, copiar el connection string de Pooler Session y convertir:

```text
postgres://...
```

a:

```text
postgresql+psycopg2://...
```

Agregar `?sslmode=require` si no viene incluido.
