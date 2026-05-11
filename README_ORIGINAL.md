# FactuRD v2.4 - Sistema de Facturación Electrónica para República Dominicana

## 📋 Descripción

FactuRD es un sistema completo de facturación electrónica diseñado específicamente para cumplir con los requisitos de la DGII (Dirección General de Impuestos Internos) de la República Dominicana.

## 🎯 Versión Desktop

Esta versión incluye una aplicación de escritorio construida con **Tauri** para distribución nativa.

### Aplicación de Escritorio

- **Ubicación**: `facturd-desktop/`
- **App**: `facturd-desktop/src-tauri/target/release/FactuRD.app`
- **Instalador DMG**: `facturd-desktop/src-tauri/target/release/bundle/dmg/FactuRD_2.4.0_aarch64.dmg`

### Compilar Desktop

```bash
cd facturd-desktop
npm install
npm run tauri build
```

### Desarrollo Desktop

```bash
cd facturd-desktop
npm run tauri dev
```

## 📱 PWA (Progressive Web App)

El frontend web funciona como PWA, permitiendo:
- Instalación en dispositivos móviles y escritorio
- Funcionamiento sin conexión (parcial)
- Iconos en pantalla de inicio

### Archivos PWA
- `frontend/public/manifest.json` - Manifiesto PWA
- `frontend/index.html` - Meta tags para PWA

## 🚀 Características Principales

### Frontend (React + Vite + Tailwind CSS)

- **Diseño Moderno**: Interfaz de usuario basada en "The Precise Ledger" - diseño editorial de alta gama
- **Navegación Lateral**: Dashboard, Facturas, Diseñador de Facturas, Clientes, Proveedores, Inventario, Cobros, Reportes, Configuración
- **Autenticación**: Sistema de login/registro con tokens JWT

### Módulos

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Vista general con métricas de facturación |
| **Facturas** | Crear, editar, eliminar facturas electrónicas |
| **Diseñador de Facturas** | Editor drag-and-drop para diseñar plantillas |
| **Clientes** | Gestión de clientes con RNC |
| **Proveedores** | Gestión de proveedores |
| **Inventario** | Control de productos y stock |
| **Cobros** | Registro de pagos recibidos |
| **Reportes** | Análisis financiero y estadísticas |
| **Empresa** | Configuración de datos fiscales y logo |

## 🛠️ Tecnologías

### Frontend
- React 19.2.4
- Vite 8.0.2
- Tailwind CSS 4.2.2
- Axios 1.13.6
- React Router DOM 7.13.2

### Backend
- FastAPI 0.128.8
- SQLAlchemy 2.0.48
- Pydantic 2.12.5
- Uvicorn 0.39.0

## 📦 Instalación

### Requisitos Previos
- Node.js 18+
- Python 3.9+
- pip

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

## 🎨 Diseñador de Facturas

ElDiseñador de Facturas es una herramienta drag-and-drop que permite crear plantillas personalizadas.

### Elementos Disponibles

| Categoría | Elementos |
|-----------|-----------|
| **Básico** | Texto, Caja de Texto, Línea |
| **Elementos** | Logo/Imagen, Rectángulo, Círculo |
| **Datos** | Tabla de Productos, Código QR, Espaciador |
| **Información** | Nombre Empresa, RNC, Dirección, Número Factura, Fecha, Cliente, Subtotal, ITBIS, Total |

### Controles

- **Arrastrar y soltar**: Arrastra elementos desde la barra lateral al lienzo
- **Mover**: Click y arrastra elementos en el lienzo
- **Redimensionar**: Arrastra las esquinas de los elementos seleccionados
- **Eliminar**: Click en elemento + Delete o botón de eliminar
- **Duplicar**: Click en elemento + botón de copiar
- **Deshacer/Rehacer**: Ctrl+Z / Ctrl+Y
- **Copiar/Pegar**: Ctrl+C / Ctrl+V
- **Snapping**: Ajuste automático a cuadrícula (10px)

### Guardar Plantillas

1. Diseña tu factura en el lienzo
2. Click en "Guardar"
3. Ingresa un nombre para la plantilla
4. La plantilla se guardará en la base de datos

### Usar Plantillas en Facturas

1. Ve a "Invoices" (Facturas)
2. Crea o edita una factura
3. En el selector de plantilla, elige tu plantilla personalizada
4. Click en "Preview" para ver el diseño

## 🔧 Configuración

### Variables de Empresa

En la sección "Settings" (Empresa), configura:
- Nombre legal de la empresa
- RNC
- Dirección
- Teléfono
- Email
- Logo (subir imagen)

Estos datos aparecen automáticamente en las facturas.

## 📁 Estructura del Proyecto

```
FactuRD v2.4/
├── facturd-desktop/          # Aplicación Tauri (Desktop)
│   ├── src/                  # Código React frontend
│   ├── src-tauri/           # Configuración Rust
│   │   └── tauri.conf.json  # Configuración Tauri
│   ├── package.json
│   └── vite.config.js
│
├── backend/                  # FastAPI
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   │   ├── factura/   # Componentes de facturas
│   │   │   ├── Layout.jsx # Layout principal
│   │   │   ├── Sidebar.jsx# Navegación lateral
│   │   │   └── Toast.jsx  # Notificaciones
│   │   ├── context/       # Contextos de React (AuthContext)
│   │   ├── pages/         # Páginas de la aplicación
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Facturas.jsx
│   │   │   ├── DisenoFactura.jsx
│   │   │   ├── Clientes.jsx
│   │   │   ├── Proveedores.jsx
│   │   │   ├── Inventario.jsx
│   │   │   ├── Cobros.jsx
│   │   │   ├── Reportes.jsx
│   │   │   └── Empresa.jsx
│   │   ├── services/       # Servicios API (api.js)
│   │   ├── App.jsx        # Componente principal
│   │   ├── main.jsx       # Punto de entrada
│   │   └── index.css      # Estilos Tailwind
│   ├── package.json
│   └── vite.config.js
│
├── backend/                  # FastAPI
│   ├── app/
│   │   ├── models/        # Modelos de base de datos
│   │   │   ├── models.py # Modelos SQLAlchemy
│   │   │   └── schemas.py# Esquemas Pydantic
│   │   ├── routes/       # Endpoints de API
│   │   │   ├── auth.py
│   │   │   ├── facturas.py
│   │   │   ├── clientes.py
│   │   │   ├── productos.py
│   │   │   ├── proveedores.py
│   │   │   ├── plantillas.py
│   │   │   ├── pagos.py
│   │   │   └── empresa.py
│   │   ├── middleware/    # Middleware de autenticación
│   │   │   └── auth.py
│   │   ├── database.py    # Configuración de base de datos
│   │   └── main.py        # Aplicación principal
│   ├── facturd.db        # Base de datos SQLite
│   └── requirements.txt
│
└── README.md
```

## 🔐 Autenticación

El sistema usa tokens JWT para autenticación. Los usuarios deben registrarse antes de usar la aplicación.

## 📊 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/login | Iniciar sesión |
| POST | /api/auth/register | Registrarse |
| GET | /api/auth/me | Obtener usuario actual |
| GET | /api/facturas | Listar facturas |
| POST | /api/facturas | Crear factura |
| PUT | /api/facturas/{id} | Actualizar factura |
| DELETE | /api/facturas/{id} | Eliminar factura |
| GET | /api/clientes | Listar clientes |
| POST | /api/clientes | Crear cliente |
| PUT | /api/clientes/{id} | Actualizar cliente |
| DELETE | /api/clientes/{id} | Eliminar cliente |
| GET | /api/productos | Listar productos |
| POST | /api/productos | Crear producto |
| PUT | /api/productos/{id} | Actualizar producto |
| DELETE | /api/productos/{id} | Eliminar producto |
| GET | /api/proveedores | Listar proveedores |
| POST | /api/proveedores | Crear proveedor |
| GET | /api/plantillas | Listar plantillas |
| POST | /api/plantillas | Guardar plantilla |
| PUT | /api/plantillas/{id} | Actualizar plantilla |
| DELETE | /api/plantillas/{id} | Eliminar plantilla |
| GET | /api/empresa | Obtener empresa |
| PUT | /api/empresa | Actualizar empresa |

## 📝 Notas de Desarrollo

### v2.4 (Versión Actual)
- ✅ Migración completa de Flet a React
- ✅ Nuevo diseñador de facturas drag-and-drop con:
  -   Elementos: Texto, Caja, Línea, Imagen, Rectángulo, Círculo, Tabla, QR
  -   Campos dinámicos: {{ company_name }}, {{ total }}, etc.
  -   Sistema de deshacer/rehacer (Ctrl+Z/Y)
  -   Copiar/pegar elementos (Ctrl+C/V)
  -   Snapping a cuadrícula
  -   Redimensionar elementos
- ✅ Sistema de plantillas guardado en base de datos
- ✅ Preview de facturas con plantillas personalizadas
- ✅ Mejor manejo de errores con notificaciones toast
- ✅ Dependencias actualizadas (FastAPI 0.128.8, etc.)
- ✅ Fix de autenticación con trailing slashes
- ✅ Fix de dropdown de clientes
- ✅ Función de Discard Changes en Empresa

### v2.3
- Interfaz basada en diseño "The Precise Ledger"
- Módulos completos de facturación

## 🐛 Problemas Conocidos y Soluciones

### Error de autenticación (401)
- **Causa**: FastAPI redirige /api/endpoint a /api/endpoint/ perdiendo el header de autorización
- **Solución**: El frontend usa trailing slashes en las peticiones de datos

### La lista de clientes no se cierra
- **Solución**: Añadido control de `showClienteDropdown`

### Error al guardar factura
- **Causa**: El botón usaba `type="submit"` sin formulario correcto
- **Solución**: Cambiado a `type="button"` con `requestSubmit()`

## 📄 Licencia

Copyright © 2026 FactuRD - Todos los derechos reservados.
