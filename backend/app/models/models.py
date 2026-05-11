from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum, Integer, ForeignKey, Text
from sqlalchemy.sql import func
from app.database import Base
import enum

class Role(enum.Enum):
    ADMIN = "ADMIN"
    CONTADOR = "CONTADOR"
    VENDEDOR = "VENDEDOR"

class TipoContribuyente(enum.Enum):
    PERSONA_FISICA = "PERSONA_FISICA"
    PERSONA_JURIDICA = "PERSONA_JURIDICA"
    REGIMEN_ESPECIAL = "REGIMEN_ESPECIAL"

class TipoItbis(enum.Enum):
    ITBIS_0 = "ITBIS_0"
    ITBIS_18 = "ITBIS_18"
    ITBIS_EXENTO = "ITBIS_EXENTO"
    ITBIS_REDUCIDO_13 = "ITBIS_REDUCIDO_13"

class TipoNCF(enum.Enum):
    B01 = "B01"
    B02 = "B02"
    B04 = "B04"
    B11 = "B11"
    B12 = "B12"
    E31 = "E31"
    E41 = "E41"
    E43 = "E43"
    E44 = "E44"

class EstadoFactura(enum.Enum):
    PENDIENTE = "PENDIENTE"
    PAGADA = "PAGADA"
    VENCIDA = "VENCIDA"
    ANULADA = "ANULADA"
    ENVIADA_DGII = "ENVIADA_DGII"

class EstadoDGII(enum.Enum):
    PENDIENTE = "PENDIENTE"
    XML_GENERADO = "XML_GENERADO"
    FIRMADO = "FIRMADO"
    ENVIADO = "ENVIADO"
    ACEPTADO = "ACEPTADO"
    RECHAZADO = "RECHAZADO"
    ERROR = "ERROR"

class EstadoCotizacion(enum.Enum):
    PENDIENTE = "PENDIENTE"
    ACEPTADA = "ACEPTADA"
    RECHAZADA = "RECHAZADA"
    VENCIDA = "VENCIDA"
    CONVERTIDA = "CONVERTIDA"

class MetodoPago(enum.Enum):
    EFECTIVO = "EFECTIVO"
    TRANSFERENCIA = "TRANSFERENCIA"
    CHEQUE = "CHEQUE"
    TARJETA = "TARJETA"
    OTRO = "OTRO"

class User(Base):
    __tablename__ = "usuarios"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    name = Column(String)
    role = Column(Enum(Role), default=Role.VENDEDOR)
    empresa_id = Column(String, ForeignKey("empresas.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(String, primary_key=True)
    nombre = Column(String)
    rnc = Column(String, unique=True)
    direccion = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True)
    secuencia_ncf = Column(Integer, default=1)
    secuencia_ecf = Column(Integer, default=1)
    itbis = Column(Float, default=18.0)
    regimen = Column(String, default="ORDINARIO")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(String, primary_key=True)
    empresa_id = Column(String, ForeignKey("empresas.id"))
    rnc = Column(String)
    nombre = Column(String)
    nombre_comercial = Column(String, nullable=True)
    tipo = Column(Enum(TipoContribuyente), default=TipoContribuyente.PERSONA_JURIDICA)
    estatus = Column(String, default="ACTIVO")
    regimen_pago = Column(String, default="ORDINARIO")
    direccion = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True)
    limite_credito = Column(Float, default=0)
    saldo_pendiente = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Proveedor(Base):
    __tablename__ = "proveedores"

    id = Column(String, primary_key=True)
    empresa_id = Column(String, ForeignKey("empresas.id"))
    rnc = Column(String)
    nombre = Column(String)
    nombre_comercial = Column(String, nullable=True)
    direccion = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Producto(Base):
    __tablename__ = "productos"

    id = Column(String, primary_key=True)
    empresa_id = Column(String, ForeignKey("empresas.id"))
    codigo = Column(String)
    nombre = Column(String)
    descripcion = Column(String, nullable=True)
    precio_unitario = Column(Float, default=0)
    costo_unitario = Column(Float, default=0)
    stock = Column(Float, default=0)
    stock_minimo = Column(Float, default=5)
    codigo_barra = Column(String, nullable=True)
    aplica_itbis = Column(Boolean, default=True)
    tipo_itbis = Column(Enum(TipoItbis), default=TipoItbis.ITBIS_18)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Factura(Base):
    __tablename__ = "facturas"

    id = Column(String, primary_key=True)
    empresa_id = Column(String, ForeignKey("empresas.id"), index=True)
    cliente_id = Column(String, ForeignKey("clientes.id"), index=True)
    ncf = Column(String, unique=True)
    tipo_ncf = Column(Enum(TipoNCF), default=TipoNCF.E41)
    secuencia = Column(Integer, index=True)
    fecha = Column(DateTime, server_default=func.now())
    fecha_vencimiento = Column(DateTime, nullable=True)
    subtotal = Column(Float, default=0)
    descuento = Column(Float, default=0)
    itbis = Column(Float, default=0)
    total = Column(Float, default=0)
    estado = Column(Enum(EstadoFactura), default=EstadoFactura.PENDIENTE, index=True)
    nota = Column(Text, nullable=True)
    visual_settings = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class DetalleFactura(Base):
    __tablename__ = "detalles_factura"

    id = Column(String, primary_key=True)
    factura_id = Column(String, ForeignKey("facturas.id"))
    producto_id = Column(String, ForeignKey("productos.id"), nullable=True)
    descripcion = Column(String)
    cantidad = Column(Float)
    precio_unitario = Column(Float)
    descuento = Column(Float, default=0)
    itbis = Column(Float, default=0)
    total = Column(Float)

class RegistroDGII(Base):
    __tablename__ = "registros_dgii"

    id = Column(String, primary_key=True)
    empresa_id = Column(String, ForeignKey("empresas.id"), index=True)
    factura_id = Column(String, ForeignKey("facturas.id"), unique=True, index=True)
    ncf = Column(String, index=True, nullable=True)
    track_id = Column(String, index=True, nullable=True)
    estado = Column(Enum(EstadoDGII), default=EstadoDGII.PENDIENTE, index=True)
    xml_original = Column(Text, nullable=True)
    xml_firmado = Column(Text, nullable=True)
    respuesta_dgii = Column(Text, nullable=True)
    pdf_generado = Column(Text, nullable=True)
    logs = Column(Text, nullable=True)
    auditoria = Column(Text, nullable=True)
    firmado_at = Column(DateTime, nullable=True)
    enviado_at = Column(DateTime, nullable=True)
    respondido_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

# ==================== NOTA CRÉDITO ====================

class NotaCredito(Base):
    __tablename__ = "notas_credito"

    id = Column(String, primary_key=True)
    empresa_id = Column(String, ForeignKey("empresas.id"))
    cliente_id = Column(String, ForeignKey("clientes.id"))
    factura_id = Column(String, ForeignKey("facturas.id"), nullable=True)
    ncf = Column(String, unique=True)
    secuencia = Column(Integer)
    ncf_original = Column(String)
    fecha = Column(DateTime, server_default=func.now())
    subtotal = Column(Float)
    itbis = Column(Float)
    total = Column(Float)
    motivo = Column(String)
    estado = Column(String, default="PENDIENTE")
    created_at = Column(DateTime, server_default=func.now())

class NotaDebito(Base):
    __tablename__ = "notas_debito"

    id = Column(String, primary_key=True)
    empresa_id = Column(String, ForeignKey("empresas.id"))
    cliente_id = Column(String, ForeignKey("clientes.id"))
    factura_id = Column(String, ForeignKey("facturas.id"), nullable=True)
    ncf = Column(String, unique=True)
    secuencia = Column(Integer)
    ncf_original = Column(String)
    fecha = Column(DateTime, server_default=func.now())
    subtotal = Column(Float)
    itbis = Column(Float)
    total = Column(Float)
    motivo = Column(String)
    estado = Column(String, default="PENDIENTE")
    created_at = Column(DateTime, server_default=func.now())

# ==================== KARDEX ====================

class Kardex(Base):
    __tablename__ = "kardex"

    id = Column(String, primary_key=True)
    producto_id = Column(String, ForeignKey("productos.id"))
    tipo = Column(String)
    cantidad = Column(Float)
    saldo_actual = Column(Float)
    referencia = Column(String, nullable=True)
    nota = Column(String, nullable=True)
    fecha = Column(DateTime, server_default=func.now())

# ==================== COTIZACIONES ====================

class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id = Column(String, primary_key=True)
    empresa_id = Column(String, ForeignKey("empresas.id"))
    cliente_id = Column(String, ForeignKey("clientes.id"))
    numero = Column(String)
    secuencia = Column(Integer)
    fecha = Column(DateTime, server_default=func.now())
    fecha_validez = Column(DateTime, nullable=True)
    subtotal = Column(Float, default=0)
    descuento = Column(Float, default=0)
    itbis = Column(Float, default=0)
    total = Column(Float, default=0)
    estado = Column(Enum(EstadoCotizacion), default=EstadoCotizacion.PENDIENTE)
    nota = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class DetalleCotizacion(Base):
    __tablename__ = "detalles_cotizacion"

    id = Column(String, primary_key=True)
    cotizacion_id = Column(String, ForeignKey("cotizaciones.id"))
    producto_id = Column(String, ForeignKey("productos.id"), nullable=True)
    descripcion = Column(String)
    cantidad = Column(Float)
    precio_unitario = Column(Float)
    descuento = Column(Float, default=0)
    itbis = Column(Float, default=0)
    total = Column(Float)

# ==================== PAGOS/COBROS ====================

class Pago(Base):
    __tablename__ = "pagos"

    id = Column(String, primary_key=True)
    empresa_id = Column(String, ForeignKey("empresas.id"))
    factura_id = Column(String, ForeignKey("facturas.id"))
    monto = Column(Float)
    metodo = Column(Enum(MetodoPago), default=MetodoPago.EFECTIVO)
    referencia = Column(String, nullable=True)
    nota = Column(Text, nullable=True)
    fecha = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

# ==================== PLANTILLA FACTURA ====================

class PlantillaFactura(Base):
    __tablename__ = "plantillas_factura"

    id = Column(String, primary_key=True)
    empresa_id = Column(String, ForeignKey("empresas.id"))
    nombre = Column(String, default="Plantilla Predeterminada")
    logo_url = Column(Text, nullable=True)

    color_primario = Column(String, default="#2E7D32")
    color_secundario = Column(String, default="#1565C0")
    color_texto = Column(String, default="#333333")
    color_fondo = Column(String, default="#FFFFFF")

    mostrar_logo = Column(Boolean, default=True)
    mostrar_datos_empresa = Column(Boolean, default=True)
    mostrar_ncf = Column(Boolean, default=True)
    mostrar_fecha = Column(Boolean, default=True)
    mostrar_cliente = Column(Boolean, default=True)
    mostrar_nota = Column(Boolean, default=True)
    mostrar_qr = Column(Boolean, default=True)
    mostrar_pie = Column(Boolean, default=True)

    orden_secciones = Column(Text, default="logo,empresa,ncf,fecha,cliente,items,subtotales,nota,pie")

    texto_encabezado = Column(Text, default="FACTURA ELECTRONICA")
    texto_pie = Column(Text, default="Gracias por su preferencia")
    mensaje_adicional = Column(Text, nullable=True)

    fuente_principal = Column(String, default="Helvetica")
    tamaño_fuente = Column(Integer, default=10)

    diseno_json = Column(Text, nullable=True)

    es_predeterminada = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
