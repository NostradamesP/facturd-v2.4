from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.middleware.auth import get_current_empresa, get_current_user
from app.models import models
from app.models.schemas import RegistroDGIIUpdate, DGIIConfigResponse
from app.services.dgii_xml import generar_eCF_xml
from app.services.dgii_client import (
    enviar_eCF as dgii_enviar,
    consultar_estado as dgii_consultar,
    validar_rnc as dgii_validar_rnc,
    configure as dgii_configure,
    MOCK_MODE as DGII_MOCK_MODE,
)
from app.utils import validar_rnc_formato, generar_id

router = APIRouter(prefix="/api/dgii", tags=["DGII"])


def estado_dgii(value):
    if value is None:
        return None
    key = str(value).upper()
    if key in models.EstadoDGII.__members__:
        return models.EstadoDGII[key]
    raise HTTPException(status_code=400, detail=f"Estado DGII invalido: {value}")


def registro_to_dict(registro: models.RegistroDGII) -> dict:
    return {
        "id": registro.id,
        "empresa_id": registro.empresa_id,
        "factura_id": registro.factura_id,
        "ncf": registro.ncf,
        "track_id": registro.track_id,
        "estado": registro.estado.value if registro.estado else None,
        "xml_original": registro.xml_original,
        "xml_firmado": registro.xml_firmado,
        "respuesta_dgii": registro.respuesta_dgii,
        "pdf_generado": registro.pdf_generado,
        "logs": registro.logs,
        "auditoria": registro.auditoria,
        "firmado_at": registro.firmado_at,
        "enviado_at": registro.enviado_at,
        "respondido_at": registro.respondido_at,
        "created_at": registro.created_at,
        "updated_at": registro.updated_at,
    }


def get_factura_or_404(factura_id: str, empresa_id: str, db: Session) -> models.Factura:
    factura = db.query(models.Factura).filter(
        models.Factura.id == factura_id,
        models.Factura.empresa_id == empresa_id,
    ).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return factura


def get_detalles_factura(factura_id: str, db: Session) -> list[models.DetalleFactura]:
    return db.query(models.DetalleFactura).filter(
        models.DetalleFactura.factura_id == factura_id
    ).all()


def _append_log(registro: models.RegistroDGII, mensaje: str):
    now = datetime.utcnow().isoformat()
    prev = registro.logs or ""
    registro.logs = f"{prev}\n[{now}] {mensaje}".strip()


# --- Endpoints existentes (mantenidos) ---

@router.get("/registros")
def get_registros_dgii(
    estado: str = "",
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    query = db.query(models.RegistroDGII).filter(models.RegistroDGII.empresa_id == empresa_id)
    if estado:
        query = query.filter(models.RegistroDGII.estado == estado_dgii(estado))
    registros = query.order_by(models.RegistroDGII.updated_at.desc()).all()
    return [registro_to_dict(registro) for registro in registros]


@router.get("/facturas")
def get_facturas_con_dgii(
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    facturas = db.query(models.Factura).filter(
        models.Factura.empresa_id == empresa_id,
        models.Factura.estado == models.EstadoFactura.ENVIADA_DGII,
    ).order_by(models.Factura.fecha.desc()).all()

    result = []
    for factura in facturas:
        registro = db.query(models.RegistroDGII).filter(models.RegistroDGII.factura_id == factura.id).first()
        cliente = db.query(models.Cliente).filter(models.Cliente.id == factura.cliente_id).first()
        result.append({
            "factura_id": factura.id,
            "ncf": factura.ncf,
            "cliente_nombre": cliente.nombre if cliente else None,
            "total": factura.total,
            "fecha": factura.fecha,
            "estado_dgii": registro.estado.value if registro and registro.estado else "PENDIENTE",
            "track_id": registro.track_id if registro else None,
        })
    return result


@router.get("/facturas/{factura_id}")
def get_registro_factura_dgii(
    factura_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    get_factura_or_404(factura_id, empresa_id, db)
    registro = db.query(models.RegistroDGII).filter(
        models.RegistroDGII.factura_id == factura_id,
        models.RegistroDGII.empresa_id == empresa_id,
    ).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro DGII no encontrado")
    return registro_to_dict(registro)


@router.put("/facturas/{factura_id}")
def upsert_registro_factura_dgii(
    factura_id: str,
    data: RegistroDGIIUpdate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    factura = get_factura_or_404(factura_id, empresa_id, db)
    registro = db.query(models.RegistroDGII).filter(
        models.RegistroDGII.factura_id == factura_id,
        models.RegistroDGII.empresa_id == empresa_id,
    ).first()
    if not registro:
        registro = models.RegistroDGII(
            id=generar_id(),
            empresa_id=empresa_id,
            factura_id=factura.id,
            ncf=factura.ncf,
        )
        db.add(registro)

    payload = data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        if key == "estado":
            value = estado_dgii(value)
        setattr(registro, key, value)

    db.commit()
    db.refresh(registro)
    return registro_to_dict(registro)


@router.patch("/registros/{registro_id}")
def update_registro_dgii(
    registro_id: str,
    data: RegistroDGIIUpdate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    registro = db.query(models.RegistroDGII).filter(
        models.RegistroDGII.id == registro_id,
        models.RegistroDGII.empresa_id == empresa_id,
    ).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro DGII no encontrado")

    payload = data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        if key == "estado":
            value = estado_dgii(value)
        setattr(registro, key, value)

    db.commit()
    db.refresh(registro)
    return registro_to_dict(registro)


# --- Nuevos endpoints DGII ---

@router.post("/enviar/{factura_id}")
def enviar_factura_dgii(
    factura_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    factura = get_factura_or_404(factura_id, empresa_id, db)
    if factura.estado == models.EstadoFactura.ENVIADA_DGII:
        raise HTTPException(status_code=400, detail="Esta factura ya fue enviada a la DGII")
    if factura.estado == models.EstadoFactura.ANULADA:
        raise HTTPException(status_code=400, detail="No se puede enviar una factura anulada a la DGII")

    empresa = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    if not empresa.rnc:
        raise HTTPException(status_code=400, detail="La empresa debe tener un RNC configurado")

    cliente = db.query(models.Cliente).filter(models.Cliente.id == factura.cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if not cliente.rnc:
        raise HTTPException(status_code=400, detail="El cliente debe tener un RNC o cedula configurado")

    detalles = get_detalles_factura(factura.id, db)
    detalles_dict = [
        {
            "descripcion": d.descripcion,
            "cantidad": d.cantidad,
            "precio_unitario": d.precio_unitario,
            "itbis": d.itbis,
            "total": d.total,
        }
        for d in detalles
    ]

    try:
        xml_original = generar_eCF_xml(
            ncf=factura.ncf,
            tipo_ncf=factura.tipo_ncf.value if factura.tipo_ncf else "E41",
            rnc_emisor=empresa.rnc,
            razon_social_emisor=empresa.nombre,
            rnc_receptor=cliente.rnc,
            razon_social_receptor=cliente.nombre,
            fecha=factura.fecha,
            subtotal=factura.subtotal or 0,
            itbis=factura.itbis or 0,
            total=factura.total or 0,
            descuento=factura.descuento or 0,
            detalles=detalles_dict,
            regimen_pago=cliente.regimen_pago or "ORDINARIO",
            nota=factura.nota,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando XML e-CF: {str(e)}")

    registro = db.query(models.RegistroDGII).filter(
        models.RegistroDGII.factura_id == factura_id,
    ).first()
    if not registro:
        registro = models.RegistroDGII(
            id=generar_id(),
            empresa_id=empresa_id,
            factura_id=factura.id,
            ncf=factura.ncf,
        )
        db.add(registro)

    registro.xml_original = xml_original
    registro.estado = models.EstadoDGII.XML_GENERADO
    _append_log(registro, "XML e-CF generado correctamente")
    db.flush()

    respuesta_api = dgii_enviar(xml_original)
    track_id = respuesta_api.get("track_id")
    estado_api = respuesta_api.get("estado", "ERROR")
    mensaje_api = respuesta_api.get("mensaje", "")

    registro.track_id = track_id
    registro.respuesta_dgii = str(respuesta_api)
    registro.enviado_at = datetime.utcnow()
    _append_log(registro, f"Enviado a DGII: {mensaje_api} (track_id={track_id})")

    if estado_api == "RECIBIDO":
        registro.estado = models.EstadoDGII.ENVIADO
        factura.estado = models.EstadoFactura.ENVIADA_DGII
    else:
        registro.estado = models.EstadoDGII.ERROR
        _append_log(registro, f"Error en envio DGII: {mensaje_api}")

    db.commit()
    db.refresh(registro)

    return {
        "factura_id": factura.id,
        "ncf": factura.ncf,
        "estado_factura": factura.estado.value,
        "registro_dgii": registro_to_dict(registro),
    }


@router.post("/consultar/{factura_id}")
def consultar_estado_dgii(
    factura_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    get_factura_or_404(factura_id, empresa_id, db)
    registro = db.query(models.RegistroDGII).filter(
        models.RegistroDGII.factura_id == factura_id,
        models.RegistroDGII.empresa_id == empresa_id,
    ).first()
    if not registro:
        raise HTTPException(status_code=404, detail="No hay registro DGII para esta factura")
    if not registro.track_id:
        raise HTTPException(status_code=400, detail="Esta factura aun no tiene track_id de DGII")

    respuesta = dgii_consultar(registro.track_id)
    estado_consulta = respuesta.get("estado", "ERROR")

    if estado_consulta == "ACEPTADO":
        registro.estado = models.EstadoDGII.ACEPTADO
        registro.respondido_at = datetime.utcnow()
    elif estado_consulta in ("RECHAZADO",):
        registro.estado = models.EstadoDGII.RECHAZADO
        registro.respondido_at = datetime.utcnow()
    elif estado_consulta == "ERROR":
        registro.estado = models.EstadoDGII.ERROR

    registro.respuesta_dgii = str(respuesta)
    _append_log(registro, f"Consulta DGII: {respuesta.get('mensaje', '')} (estado={estado_consulta})")
    db.commit()
    db.refresh(registro)

    return {
        "factura_id": factura_id,
        "ncf": registro.ncf,
        "track_id": registro.track_id,
        "estado_dgii": registro.estado.value if registro.estado else None,
        "respuesta_dgii": registro.respuesta_dgii,
    }


@router.get("/rnc/{rnc}")
def validar_rnc_endpoint(
    rnc: str,
):
    formato_valido = validar_rnc_formato(rnc)
    if not formato_valido:
        return {
            "rnc": rnc,
            "valido": False,
            "razon_social": None,
            "estatus": "FORMATO_INVALIDO",
            "categoria": None,
            "formato_valido": False,
        }

    resultado = dgii_validar_rnc(rnc)
    resultado["formato_valido"] = True
    return resultado


@router.get("/config")
def get_dgii_config():
    return DGIIConfigResponse(
        mock_mode=DGII_MOCK_MODE,
        api_url=None,
        version="1.0",
    )


@router.get("/estadisticas")
def get_dgii_estadisticas(
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    registros = db.query(models.RegistroDGII).filter(
        models.RegistroDGII.empresa_id == empresa_id,
    ).all()

    total = len(registros)
    conteo: dict[str, int] = {}
    for r in registros:
        key = r.estado.value if r.estado else "PENDIENTE"
        conteo[key] = conteo.get(key, 0) + 1

    return {
        "total_registros": total,
        "conteo_estados": conteo,
        "pendientes": conteo.get("PENDIENTE", 0) + conteo.get("XML_GENERADO", 0) + conteo.get("FIRMADO", 0),
        "enviados": conteo.get("ENVIADO", 0),
        "aceptados": conteo.get("ACEPTADO", 0),
        "rechazados": conteo.get("RECHAZADO", 0),
        "errores": conteo.get("ERROR", 0),
    }
