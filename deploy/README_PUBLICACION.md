# Publicacion Temporal FactuRD v2.4

Esta carpeta prepara la version correcta de FactuRD para una publicacion temporal segura en DigitalOcean con PostgreSQL, Cloudflare, Nginx y Let's Encrypt.

## Ruta nueva recomendada

Tambien queda preparada la ruta GitHub + Supabase Free + Render Free en:

`deploy/github-supabase-render`

Esa ruta esta separada en:

- `pruebas`: demo publico con seed automatico.
- `produccion-pronta`: base de produccion sin seed demo.

## Credenciales demo

- Usuario: `demo@facturd-demo.com`
- Contrasena: `DemoFactuRD2026!`

## Preparacion del VPS

1. Crear un Droplet Ubuntu en DigitalOcean.
2. En Cloudflare, crear un registro `A` del dominio hacia la IP del VPS.
3. Instalar Docker, Docker Compose, Nginx y Certbot.
4. Copiar el proyecto al VPS.
5. Crear `deploy/.env.production` desde `deploy/.env.production.example` y cambiar passwords, `JWT_SECRET` y dominio.

## Levantar backend y PostgreSQL

Desde la carpeta `deploy`:

```bash
docker compose up -d --build
```

El backend queda escuchando solo localmente en `127.0.0.1:8000`.

## Publicar frontend

Desde `facturd-desktop`:

```bash
VITE_API_URL=/api npm run build
sudo mkdir -p /var/www/facturd
sudo rsync -a --delete dist/ /var/www/facturd/
```

## Configurar Nginx y SSL

```bash
sudo cp deploy/nginx/facturd.conf /etc/nginx/sites-available/facturd
sudo ln -s /etc/nginx/sites-available/facturd /etc/nginx/sites-enabled/facturd
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

Antes de copiar, reemplazar `tu-dominio.com` por el dominio real.

## DGII y auditoria

La publicacion incluye almacenamiento para:

- XML original.
- XML firmado.
- Respuesta DGII.
- TrackId.
- Estado.
- PDF generado.
- Logs.
- Auditoria.

La API queda disponible en `/api/dgii`.
