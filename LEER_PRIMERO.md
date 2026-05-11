# FactuRD v2.4 - ULTIMA VERSION CORRECTA

Esta carpeta es la copia marcada para no confundirnos otra vez.

## Version que se debe abrir

La app correcta esta en:

`facturd-desktop`

No usar la carpeta vieja `frontend` para esta version. Los ultimos cambios de colores, menu lateral, diseño y facturas estan en `facturd-desktop`.

## Como abrirla

Backend:

```bash
cd "/Users/Erojas/Desktop/FactuRD v2.4 ULTIMA VERSION - 2026-05-11/backend"
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

App:

```bash
cd "/Users/Erojas/Desktop/FactuRD v2.4 ULTIMA VERSION - 2026-05-11/facturd-desktop"
npm install
npm run dev -- --host 127.0.0.1 --port 3002 --strictPort
```

Abrir:

`http://127.0.0.1:3002/login`

## Nota

Esta copia fue creada desde:

`/Users/Erojas/Desktop/Desarrollo/FactuRD v2.4`

Fecha: 2026-05-11.

## Publicacion temporal

La preparacion de publicacion esta en:

`deploy/README_PUBLICACION.md`

Para la ruta nueva GitHub + Supabase + Render:

`deploy/github-supabase-render/README.md`

Separacion:

- Pruebas: `deploy/github-supabase-render/pruebas`
- Produccion pronta: `deploy/github-supabase-render/produccion-pronta`

Credenciales demo:

- Usuario: `demo@facturd-demo.com`
- Contrasena: `DemoFactuRD2026!`

No publicar `facturd.db`, archivos `.env` reales, logs ni bases locales.
