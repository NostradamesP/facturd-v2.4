# Continuacion FactuRD

## Estado actual

Proyecto original:

`/Users/Erojas/Desktop/Desarrollo/FactuRD v2.4`

Esta sesion puede leer el proyecto original, pero no puede escribir dentro del Escritorio. Por eso no se aplicaron nuevas ediciones directas despues de la normalizacion de rutas. Las pruebas de backend si pudieron correr porque se envio el cache de Python a `/private/tmp`.

## Validado hoy

- Backend tests: `4 passed`.
- Build de escritorio: bloqueado por permisos de sandbox, no por error de codigo.
  - Vite intenta escribir en `facturd-desktop/node_modules/.vite-temp`.

## Cambios ya aplicados en el proyecto original

- `facturd-desktop/src/services/api.js` usa endpoints sin barra final.
- Backend acepta colecciones sin barra final en clientes, productos, proveedores, pagos, cotizaciones y empresa.
- `backend/app/routes/productos.py` tiene `/alertas/stock` antes de `/{producto_id}`.

## Parche preparado

Archivo:

`/Users/Erojas/Documents/Codex/2026-05-03/revisa-en-el-escritorio-una-app/siguiente_tanda_facturd.patch`

Incluye:

- Logs de Axios solo en modo desarrollo.
- Redireccion automatica a login cuando el escritorio recibe `401`.
- Validacion de monto de pago.
- Bloqueo de pagos sobre facturas anuladas.
- Sumas de pagos tolerantes a `None`.

Verificacion:

- `git apply --check siguiente_tanda_facturd.patch`: correcto.

## Segundo parche preparado

Archivo:

`/Users/Erojas/Documents/Codex/2026-05-03/revisa-en-el-escritorio-una-app/cotizacion_a_factura.patch`

Incluye:

- Conversion de cotizacion a factura usando helpers reales de facturacion.
- NCF con formato nuevo (`E41` + 10 digitos) y secuencia incrementada correctamente.
- Recalculo de subtotal, ITBIS, descuento y total al convertir.
- Validacion de stock al convertir.
- Salida de inventario y Kardex usando la misma funcion que facturas.
- Respuesta de factura convertida con detalles incluidos.

Verificacion:

- `git apply --check cotizacion_a_factura.patch`: correcto.

## Parche de los 6 hallazgos criticos

Archivo:

`/Users/Erojas/Documents/Codex/2026-05-03/revisa-en-el-escritorio-una-app/fix_review_findings_facturd.patch`

Incluye:

- Facturas con cobros ya no pueden editar renglones ni cambiar estado manualmente fuera del flujo de cobros.
- Facturas pendientes sin pagos restauran inventario al eliminarse; facturas con pagos o cerradas se bloquean.
- Pagos validan monto positivo/numerico y bloquean cobros sobre facturas anuladas o enviadas a DGII.
- Conversion de cotizacion a factura reutiliza la logica real de facturacion, NCF, totales, stock y Kardex.
- Vista previa de factura calcula ITBIS desde los renglones reales, respetando productos exentos.
- Clientes/productos con historial se desactivan en vez de borrarse fisicamente.

Verificacion:

- `python3 -m py_compile` sobre rutas modificadas: correcto.
- `git apply --check fix_review_findings_facturd.patch`: correcto.

## Proxima ejecucion con permisos completos

Desde el proyecto original:

```bash
git apply /Users/Erojas/Documents/Codex/2026-05-03/revisa-en-el-escritorio-una-app/fix_review_findings_facturd.patch
PYTHONPYCACHEPREFIX=/private/tmp/facturd-pycache .venv/bin/python -m pytest backend/tests -q -p no:cacheprovider
cd facturd-desktop && npm run build
```

Luego reiniciar backend/frontend y probar en navegador:

- Login.
- Facturas.
- Cobros.
- Inventario.
- Empresa.
