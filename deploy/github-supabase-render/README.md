# GitHub + Supabase + Render

Esta ruta separa FactuRD en dos versiones de publicacion:

- `pruebas`: demo publico temporal, con datos demo y seed automatico.
- `produccion-pronta`: base para salir a produccion pronto, sin seed demo y con checklist de seguridad.

Render usa dos servicios:

- API: Web Service Python desde `backend`.
- Frontend: Static Site desde `facturd-desktop`.

Supabase se usa solo como PostgreSQL. Para Render conviene usar el connection string de Supabase en modo Pooler Session, porque soporta IPv4/IPv6 y va mejor para un backend persistente.

## Flujo recomendado

1. Subir este proyecto limpio a GitHub.
2. Crear dos proyectos en Supabase:
   - `facturd-pruebas`
   - `facturd-produccion`
3. Crear en Render primero la version `pruebas`.
4. Cuando todo este validado, crear la version `produccion-pronta`.

## Importante

No mezclar bases:

- Pruebas usa datos demo.
- Produccion usa base vacia o datos migrados manualmente y revisados.

No subir:

- `.env` reales.
- `facturd.db`.
- logs.
- backups.
- XML/PDF reales de clientes.

Fuentes revisadas:

- Render Blueprints: https://render.com/docs/blueprint-spec
- Render Static Sites: https://render.com/docs/static-sites
- Supabase Postgres connection strings: https://supabase.com/docs/reference/postgres/connection-strings
