from datetime import datetime, timedelta
import json
import uuid

from passlib.context import CryptContext

from app.database import SessionLocal
from app.models import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_EMAIL = "demo@facturd-demo.com"
DEMO_PASSWORD = "DemoFactuRD2026!"


def generar_id() -> str:
    return uuid.uuid4().hex[:24]


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
                fecha=datetime.utcnow() - timedelta(days=4),
                fecha_vencimiento=datetime.utcnow() + timedelta(days=26),
                subtotal=subtotal,
                descuento=0,
                itbis=itbis,
                total=total,
                estado=models.EstadoFactura.PAGADA,
                nota="Factura demo para publicacion temporal.",
                visual_settings=json.dumps({"theme": "publicacion-demo", "primary": "#0056D2"}),
            )
            db.add(factura)
            db.flush()
            db.add(models.DetalleFactura(
                id=generar_id(),
                factura_id=factura.id,
                producto_id=producto_objs[0].id,
                descripcion=producto_objs[0].nombre,
                cantidad=1,
                precio_unitario=45000,
                descuento=0,
                itbis=0,
                total=45000,
            ))
            db.add(models.DetalleFactura(
                id=generar_id(),
                factura_id=factura.id,
                producto_id=producto_objs[2].id,
                descripcion=producto_objs[2].nombre,
                cantidad=1,
                precio_unitario=18500,
                descuento=0,
                itbis=itbis,
                total=18500 + itbis,
            ))
            db.add(models.Pago(
                id=generar_id(),
                empresa_id=empresa.id,
                factura_id=factura.id,
                monto=total,
                metodo=models.MetodoPago.TRANSFERENCIA,
                referencia="DEMO-PAGO-001",
                nota="Pago demo",
            ))

        cotizacion = db.query(models.Cotizacion).filter(
            models.Cotizacion.empresa_id == empresa.id,
            models.Cotizacion.numero == "COT-DEMO-0001",
        ).first()
        if not cotizacion:
            cotizacion = models.Cotizacion(
                id=generar_id(),
                empresa_id=empresa.id,
                cliente_id=cliente_objs[1].id,
                numero="COT-DEMO-0001",
                secuencia=1,
                fecha=datetime.utcnow() - timedelta(days=1),
                fecha_validez=datetime.utcnow() + timedelta(days=14),
                subtotal=12000,
                descuento=0,
                itbis=0,
                total=12000,
                estado=models.EstadoCotizacion.PENDIENTE,
                nota="Cotizacion demo.",
            )
            db.add(cotizacion)
            db.flush()
            db.add(models.DetalleCotizacion(
                id=generar_id(),
                cotizacion_id=cotizacion.id,
                producto_id=producto_objs[1].id,
                descripcion=producto_objs[1].nombre,
                cantidad=1,
                precio_unitario=12000,
                descuento=0,
                itbis=0,
                total=12000,
            ))

        registro = db.query(models.RegistroDGII).filter(
            models.RegistroDGII.factura_id == factura.id,
        ).first()
        if not registro:
            db.add(models.RegistroDGII(
                id=generar_id(),
                empresa_id=empresa.id,
                factura_id=factura.id,
                ncf=factura.ncf,
                track_id="DEMO-TRACK-0001",
                estado=models.EstadoDGII.ACEPTADO,
                xml_original="<eCF><Encabezado><NCF>E410000000001</NCF></Encabezado></eCF>",
                xml_firmado="<eCF firmado=\"demo\"><Encabezado><NCF>E410000000001</NCF></Encabezado></eCF>",
                respuesta_dgii='{"estado":"ACEPTADO","mensaje":"Respuesta demo DGII"}',
                pdf_generado="facturas/demo/E410000000001.pdf",
                logs='[{"nivel":"info","mensaje":"XML demo generado y firmado"}]',
                auditoria='[{"actor":"seed_demo","accion":"crear_registro_dgii","ambiente":"demo"}]',
                firmado_at=datetime.utcnow() - timedelta(days=4, minutes=-2),
                enviado_at=datetime.utcnow() - timedelta(days=4, minutes=-1),
                respondido_at=datetime.utcnow() - timedelta(days=4),
            ))

        db.commit()
        print("Demo listo")
        print(f"Usuario: {DEMO_EMAIL}")
        print(f"Contrasena: {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    upsert_demo_data()
