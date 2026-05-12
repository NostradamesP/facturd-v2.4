from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional, List, TypeVar, Generic
from datetime import datetime
from enum import Enum

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    skip: int
    limit: int

class RoleEnum(str, Enum):
    ADMIN = "ADMIN"
    CONTADOR = "CONTADOR"
    VENDEDOR = "VENDEDOR"

class TipoContribuyenteEnum(str, Enum):
    PERSONA_FISICA = "PERSONA_FISICA"
    PERSONA_JURIDICA = "PERSONA_JURIDICA"
    REGIMEN_ESPECIAL = "REGIMEN_ESPECIAL"

class TipoItbisEnum(str, Enum):
    ITBIS_0 = "ITBIS_0"
    ITBIS_18 = "ITBIS_18"
    ITBIS_EXENTO = "ITBIS_EXENTO"
    ITBIS_REDUCIDO_13 = "ITBIS_REDUCIDO_13"

class TipoNCFEnum(str, Enum):
    B01 = "B01"
    E31 = "E31"
    E41 = "E41"
    E43 = "E43"
    E44 = "E44"

class EstadoFacturaEnum(str, Enum):
    PENDIENTE = "PENDIENTE"
    PAGADA = "PAGADA"
    VENCIDA = "VENCIDA"
    ANULADA = "ANULADA"
    ENVIADA_DGII = "ENVIADA_DGII"

class EstadoDGIIEnum(str, Enum):
    PENDIENTE = "PENDIENTE"
    XML_GENERADO = "XML_GENERADO"
    FIRMADO = "FIRMADO"
    ENVIADO = "ENVIADO"
    ACEPTADO = "ACEPTADO"
    RECHAZADO = "RECHAZADO"
    ERROR = "ERROR"

# Auth
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    empresa_rnc: str
    empresa_nombre: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

    model_config = ConfigDict(from_attributes=True)

class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    empresa: "EmpresaResponse"

# Empresa
class EmpresaBase(BaseModel):
    nombre: str
    rnc: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    idioma: str = "es"

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaUpdate(EmpresaBase):
    pass

class EmpresaResponse(EmpresaBase):
    id: str

    model_config = ConfigDict(from_attributes=True)

LoginResponse.model_rebuild()

# Cliente
class ClienteBase(BaseModel):
    rnc: str
    nombre: str
    nombre_comercial: Optional[str] = None
    tipo: TipoContribuyenteEnum = TipoContribuyenteEnum.PERSONA_JURIDICA
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    limite_credito: Optional[float] = 0

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(ClienteBase):
    pass

class ClienteResponse(ClienteBase):
    id: str
    empresa_id: str
    estatus: str
    saldo_pendiente: float

    model_config = ConfigDict(from_attributes=True)

# Proveedor
class ProveedorBase(BaseModel):
    rnc: str
    nombre: str
    nombre_comercial: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    productos_servicios: Optional[str] = None
    costo_promedio: float = 0

class ProveedorCreate(ProveedorBase):
    pass

class ProveedorUpdate(ProveedorBase):
    pass

class ProveedorResponse(ProveedorBase):
    id: str
    empresa_id: str

    model_config = ConfigDict(from_attributes=True)

class GastoBase(BaseModel):
    proveedor_id: Optional[str] = None
    factura_id: Optional[str] = None
    monto: float = 0
    fecha: Optional[str] = None
    categoria: str = "OTROS"
    nota: Optional[str] = None

class GastoCreate(GastoBase):
    pass

class GastoUpdate(GastoBase):
    pass

class GastoResponse(GastoBase):
    id: str
    empresa_id: str
    created_at: Optional[str] = None
    proveedor_nombre: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Producto
class ProductoBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    precio_unitario: float = 0
    costo_unitario: float = 0
    stock: float = 0
    stock_minimo: float = 5
    codigo_barra: Optional[str] = None
    aplica_itbis: bool = True
    tipo_itbis: TipoItbisEnum = TipoItbisEnum.ITBIS_18
    tipo: str = "PRODUCTO"

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(ProductoBase):
    pass

class ProductoResponse(ProductoBase):
    id: str
    empresa_id: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)

# Detalle Factura
class DetalleFacturaBase(BaseModel):
    producto_id: Optional[str] = None
    descripcion: str
    cantidad: float
    precio_unitario: float
    descuento: float = 0
    itbis: float = 0
    total: float

class DetalleFacturaCreate(DetalleFacturaBase):
    pass

class DetalleFacturaResponse(DetalleFacturaBase):
    id: str

    model_config = ConfigDict(from_attributes=True)

# Factura
class FacturaBase(BaseModel):
    cliente_id: str
    tipo_ncf: TipoNCFEnum = TipoNCFEnum.E41
    nota: Optional[str] = None
    visual_settings: Optional[str] = None

class FacturaCreate(FacturaBase):
    detalles: List[DetalleFacturaCreate]
    descuento: float = 0

class FacturaUpdate(BaseModel):
    estado: Optional[EstadoFacturaEnum] = None

class FacturaResponse(FacturaBase):
    id: str
    empresa_id: str
    cliente_id: str
    ncf: str
    secuencia: int
    fecha: datetime
    subtotal: float
    descuento: float
    itbis: float
    total: float
    estado: EstadoFacturaEnum

    model_config = ConfigDict(from_attributes=True)

class RegistroDGIIBase(BaseModel):
    track_id: Optional[str] = None
    estado: EstadoDGIIEnum = EstadoDGIIEnum.PENDIENTE
    xml_original: Optional[str] = None
    xml_firmado: Optional[str] = None
    respuesta_dgii: Optional[str] = None
    pdf_generado: Optional[str] = None
    logs: Optional[str] = None
    auditoria: Optional[str] = None
    firmado_at: Optional[datetime] = None
    enviado_at: Optional[datetime] = None
    respondido_at: Optional[datetime] = None

class RegistroDGIICreate(RegistroDGIIBase):
    pass

class RegistroDGIIUpdate(BaseModel):
    track_id: Optional[str] = None
    estado: Optional[EstadoDGIIEnum] = None
    xml_original: Optional[str] = None
    xml_firmado: Optional[str] = None
    respuesta_dgii: Optional[str] = None
    pdf_generado: Optional[str] = None
    logs: Optional[str] = None
    auditoria: Optional[str] = None
    firmado_at: Optional[datetime] = None
    enviado_at: Optional[datetime] = None
    respondido_at: Optional[datetime] = None

class RegistroDGIIResponse(RegistroDGIIBase):
    id: str
    empresa_id: str
    factura_id: str
    ncf: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DGIIEnviarResponse(BaseModel):
    factura_id: str
    ncf: str
    estado_factura: EstadoFacturaEnum
    registro_dgii: RegistroDGIIResponse


class DGIIConsultarResponse(BaseModel):
    factura_id: str
    ncf: str
    track_id: Optional[str] = None
    estado_dgii: EstadoDGIIEnum
    respuesta_dgii: Optional[str] = None


class DGIIConfigResponse(BaseModel):
    mock_mode: bool
    api_url: Optional[str] = None
    version: str = "1.0"


class RNCValidarResponse(BaseModel):
    rnc: str
    valido: bool
    razon_social: Optional[str] = None
    estatus: str
    categoria: Optional[str] = None
    formato_valido: bool

# Stats
class DashboardStats(BaseModel):
    total_ventas: float
    total_itbis: float
    pendientes: int
    pagadas: int
    cliente_count: int
    factura_count: int

# Plantilla Factura
class PlantillaFacturaBase(BaseModel):
    nombre: str = "Plantilla Predeterminada"
    logo_url: Optional[str] = None

    color_primario: str = "#2E7D32"
    color_secundario: str = "#1565C0"
    color_texto: str = "#333333"
    color_fondo: str = "#FFFFFF"

    mostrar_logo: bool = True
    mostrar_datos_empresa: bool = True
    mostrar_ncf: bool = True
    mostrar_fecha: bool = True
    mostrar_cliente: bool = True
    mostrar_nota: bool = True
    mostrar_qr: bool = True
    mostrar_pie: bool = True

    orden_secciones: str = "logo,empresa,ncf,fecha,cliente,items,subtotales,nota,pie"

    texto_encabezado: str = "FACTURA ELECTRONICA"
    texto_pie: str = "Gracias por su preferencia"
    mensaje_adicional: Optional[str] = None

    fuente_principal: str = "Helvetica"
    tamaño_fuente: int = 10

    diseno_json: Optional[str] = None

    es_predeterminada: bool = False

class PlantillaFacturaCreate(PlantillaFacturaBase):
    pass

class PlantillaFacturaUpdate(PlantillaFacturaBase):
    pass

class PlantillaFacturaResponse(PlantillaFacturaBase):
    id: str
    empresa_id: str

    model_config = ConfigDict(from_attributes=True)
