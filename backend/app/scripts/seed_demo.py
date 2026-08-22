from datetime import datetime, timedelta, timezone
import json
import os

from app.database import SessionLocal
from app.models import models
from app.utils import pwd_context, generar_id

ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@facturd.com")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD")
ADMIN_RNC = "101234567"

DEMO_EMAIL = os.getenv("SEED_DEMO_EMAIL", "demo@facturd-demo.com")
DEMO_PASSWORD = os.getenv("SEED_DEMO_PASSWORD", "DemoFactuRD2026!")


def upsert_admin() -> None:
    if not ADMIN_PASSWORD:
        print("Admin omitido: define SEED_ADMIN_PASSWORD para crearlo")
        return

    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.email == ADMIN_EMAIL).first()
        if admin:
            return

        empresa = db.query(models.Empresa).filter(models.Empresa.rnc == ADMIN_RNC).first()
        if not empresa:
            empresa = models.Empresa(
                id=generar_id(),
                nombre="FactuRD Demo SRL",
                rnc=ADMIN_RNC,
                direccion="Av. Admin 1, Santo Domingo",
                telefono="809-555-0001",
                email=ADMIN_EMAIL,
                secuencia_ncf=1,
                secuencia_ecf=1,
                itbis=18.0,
                regimen="ORDINARIO",
            )
            db.add(empresa)
            db.flush()

        admin = models.User(
            id=generar_id(),
            email=ADMIN_EMAIL,
            password=pwd_context.hash(ADMIN_PASSWORD),
            name="Admin",
            role=models.Role.ADMIN,
            empresa_id=empresa.id,
        )
        db.add(admin)
        db.commit()
        print(f"Admin listo: {ADMIN_EMAIL}")
    finally:
        db.close()


def upsert_demo_data() -> None:
    db = SessionLocal()
    try:
        empresa = db.query(models.Empresa).filter(models.Empresa.rnc == "131999999").first()
        if not empresa:
            empresa = models.Empresa(
                id=generar_id(),
                nombre="FactuRD Demo SRL",
                rnc="131999999",
                direccion="Av. Demo 24, Santo Domingo",
                telefono="809-555-2400",
                email="demo@facturd.com",
                secuencia_ncf=3,
                secuencia_ecf=3,
                itbis=18.0,
                regimen="ORDINARIO",
            )
            db.add(empresa)
            db.flush()
        else:
            empresa.nombre = empresa.nombre or "FactuRD Demo SRL"
            empresa.direccion = empresa.direccion or "Av. Demo 24, Santo Domingo"
            empresa.telefono = empresa.telefono or "809-555-2400"
            empresa.email = empresa.email or "demo@facturd.com"
            empresa.secuencia_ncf = empresa.secuencia_ncf or 3
            empresa.secuencia_ecf = empresa.secuencia_ecf or 3
            empresa.itbis = empresa.itbis if empresa.itbis is not None else 18.0
            empresa.regimen = empresa.regimen or "ORDINARIO"

        user = db.query(models.User).filter(models.User.email == DEMO_EMAIL).first()
        if not user:
            user = models.User(
                id=generar_id(),
                email=DEMO_EMAIL,
                password=pwd_context.hash(DEMO_PASSWORD),
                name="Administrador Demo",
                role=models.Role.ADMIN,
                empresa_id=empresa.id,
            )
            db.add(user)
        else:
            user.password = pwd_context.hash(DEMO_PASSWORD)
            user.role = models.Role.ADMIN
            user.empresa_id = empresa.id

        clientes = [
            ("101999991", "Comercial Caribe Demo", "Av. Winston Churchill 100", "809-555-1101"),
            ("101999992", "Servicios Norte Demo", "Calle Duarte 45", "809-555-1102"),
            ("00199999999", "Maria Perez Demo", "Ensanche Naco", "809-555-1103"),
        ]
        cliente_objs = []
        for rnc, nombre, direccion, telefono in clientes:
            cliente = db.query(models.Cliente).filter(
                models.Cliente.empresa_id == empresa.id,
                models.Cliente.rnc == rnc,
            ).first()
            if not cliente:
                cliente = models.Cliente(
                    id=generar_id(),
                    empresa_id=empresa.id,
                    rnc=rnc,
                    nombre=nombre,
                    nombre_comercial=nombre,
                    tipo=models.TipoContribuyente.PERSONA_JURIDICA if rnc.startswith("101") else models.TipoContribuyente.PERSONA_FISICA,
                    direccion=direccion,
                    telefono=telefono,
                    email=f"{nombre.lower().replace(' ', '.')}@example.com",
                    limite_credito=150000,
                    saldo_pendiente=0,
                )
                db.add(cliente)
            else:
                if not cliente.estatus:
                    cliente.estatus = "ACTIVO"
                cliente.nombre = cliente.nombre or nombre
                cliente.direccion = cliente.direccion or direccion
                cliente.telefono = cliente.telefono or telefono
            cliente_objs.append(cliente)

        productos = [
            ("SRV-001", "Implementacion e-CF", 45000, 0, False),
            ("SRV-002", "Soporte mensual", 12000, 0, False),
            ("INV-001", "Impresora termica demo", 18500, 8, True),
            ("INV-002", "Lector codigo de barras demo", 7200, 15, True),
        ]
        producto_objs = []
        for codigo, nombre, precio, stock, aplica_itbis in productos:
            producto = db.query(models.Producto).filter(
                models.Producto.empresa_id == empresa.id,
                models.Producto.codigo == codigo,
            ).first()
            if not producto:
                producto = models.Producto(
                    id=generar_id(),
                    empresa_id=empresa.id,
                    codigo=codigo,
                    nombre=nombre,
                    descripcion=f"Producto demo: {nombre}",
                    precio_unitario=precio,
                    costo_unitario=precio * 0.55,
                    stock=stock,
                    stock_minimo=2,
                    aplica_itbis=aplica_itbis,
                    tipo_itbis=models.TipoItbis.ITBIS_18 if aplica_itbis else models.TipoItbis.ITBIS_EXENTO,
                    activo=True,
                )
                db.add(producto)
            else:
                if producto.activo is None:
                    producto.activo = True
                producto.nombre = producto.nombre or nombre
                if not producto.precio_unitario:
                    producto.precio_unitario = precio
            producto_objs.append(producto)

        plantilla = db.query(models.PlantillaFactura).filter(
            models.PlantillaFactura.empresa_id == empresa.id,
            models.PlantillaFactura.nombre == "Plantilla Demo Publicacion",
        ).first()
        if not plantilla:
            plantilla = models.PlantillaFactura(
                id=generar_id(),
                empresa_id=empresa.id,
                nombre="Plantilla Demo Publicacion",
                color_primario="#0056D2",
                color_secundario="#10A37F",
                color_texto="#2A3439",
                color_fondo="#FFFFFF",
                texto_encabezado="FACTURA ELECTRONICA DEMO",
                texto_pie="Documento demo sin validez fiscal",
                mensaje_adicional="Ambiente de demostracion FactuRD",
                es_predeterminada=True,
            )
            db.add(plantilla)

        db.flush()

        factura = db.query(models.Factura).filter(
            models.Factura.empresa_id == empresa.id,
            models.Factura.ncf == "E410000000001",
        ).first()
        if not factura:
            subtotal = 45000 + 18500
            itbis = 18500 * 0.18
            total = subtotal + itbis
            factura = models.Factura(
                id=generar_id(),
                empresa_id=empresa.id,
                cliente_id=cliente_objs[0].id,
                ncf="E410000000001",
                tipo_ncf=models.TipoNCF.E41,
                secuencia=1,
                fecha_vencimiento=datetime.now(timezone.utc) + timedelta(days=26),
                fecha=datetime.now(timezone.utc) - timedelta(days=1),
                subtotal=subtotal,
                descuento=0,
                itbis=itbis,
                total=total,
                estado=models.EstadoFactura.PAGADA,
                nota="Factura demo creada automaticamente",
            )
            db.add(factura)
            db.flush()

        if not cliente_objs[0].id:
            raise RuntimeError("Cliente demo no disponible")

        tiene_detalles = db.query(models.DetalleFactura).filter(
            models.DetalleFactura.factura_id == factura.id
        ).first() is not None

        if not tiene_detalles:
            itbis_producto = 18500 * 0.18
            detalle_servicio = models.DetalleFactura(
                id=generar_id(),
                factura_id=factura.id,
                producto_id=producto_objs[0].id,
                descripcion=producto_objs[0].nombre or "Implementacion e-CF",
                cantidad=1,
                precio_unitario=45000,
                descuento=0,
                itbis=0,
                total=45000,
            )
            detalle_producto = models.DetalleFactura(
                id=generar_id(),
                factura_id=factura.id,
                producto_id=producto_objs[2].id,
                descripcion=producto_objs[2].nombre or "Impresora termica demo",
                cantidad=1,
                precio_unitario=18500,
                descuento=0,
                itbis=itbis_producto,
                total=18500 + itbis_producto,
            )
            db.add(detalle_servicio)
            db.add(detalle_producto)

        db.commit()
        print("Demo listo")
        print(f"Usuario: {DEMO_EMAIL}")
        print(f"Contrasena: {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    upsert_admin()
    upsert_demo_data()
