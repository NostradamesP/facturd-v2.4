# FactuRD - Sistema de Facturación DGII

Sistema de facturación electrónica para la República Dominicana, desarrollado con React + Tailwind CSS y empaquetado como aplicación de escritorio con Tauri.

## Características

- **Facturación Electrónica**: Crea y gestiona facturas electrónicas conformes con la DGII
- **Gestión de Clientes y Proveedores**: Administra tu directorio de clientes y proveedores
- **Inventario**: Control de productos y stock
- **Diseño de Facturas**: Editor drag-and-drop con plantillas personalizables
- **Reportes**: Informes de ventas, cobros y más
- **Multi-empresa**: Configuración para múltiples empresas
- **Aplicación de Escritorio**: Funciona offline y como PWA
- **Responsive**: Diseño adaptativo para móvil y escritorio

## Requisitos

- Node.js 18+
- Python 3.10+
- Rust (para compilación de escritorio)
- PostgreSQL (base de datos)

## Instalación

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Web

```bash
cd frontend
npm install
npm run dev
```

### Aplicación de Escritorio

```bash
cd facturd-desktop
npm install
npm run tauri dev    # Modo desarrollo
npm run tauri build  # Compilar
```

## Configuración

### Variables de Entorno

**Backend** (`.env`):
```
DATABASE_URL=postgresql://user:password@localhost:5432/facturd
SECRET_KEY=your-secret-key
```

**Frontend** (`.env`):
```
VITE_API_URL=http://localhost:8000
```

## Estructura del Proyecto

```
FactuRD v2.4/
├── backend/              # API FastAPI
│   ├── main.py          # Aplicación principal
│   ├── routers/         # Endpoints API
│   ├── models/          # Modelos SQLAlchemy
│   └── schemas/         # Schemas Pydantic
├── frontend/            # Frontend React web
│   ├── src/
│   │   ├── pages/      # Páginas de la aplicación
│   │   ├── components/ # Componentes React
│   │   └── services/   # Configuración API
│   └── public/         # Archivos estáticos
├── facturd-desktop/    # Aplicación Tauri
│   ├── src/            # Código frontend
│   └── src-tauri/     # Configuración Rust
└── docs/               # Documentación
```

## Uso

1. Inicia el backend: `uvicorn main:app --reload`
2. Inicia el frontend o instala la aplicación de escritorio
3. Inicia sesión con tu cuenta
4. Configura los datos de tu empresa en "Empresa"
5. Carga clientes, productos e inventario
6. Crea facturas electrónicas

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/login | Iniciar sesión |
| POST | /api/auth/register | Registrarse |
| GET | /api/facturas/ | Listar facturas |
| POST | /api/facturas/ | Crear factura |
| GET | /api/clientes/ | Listar clientes |
| POST | /api/clientes/ | Crear cliente |
| GET | /api/productos/ | Listar productos |
| GET | /api/empresa/ | Obtener empresa |
| PUT | /api/empresa/ | Actualizar empresa |

## Licencia

MIT
