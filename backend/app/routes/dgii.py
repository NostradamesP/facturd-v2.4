from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_empresa, require_role
from app.models import models
from app.models.schemas import RegistroDGIICreate, RegistroDGIIUpdate
from app.utils import generar_id

router = APIRouter(prefix="/api/dgii", tags=["DGII"])
require_admin = require_role(["ADMIN"])


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


def get_factura(factura_id: str, empresa_id: str, db: Session) -> models.Factura:
    factura = db.query(models.Factura).filter(
        models.Factura.id == factura_id,
        models.Factura.empresa_id == empresa_id,
    ).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return factura


@router.get("/registros")
def get_registros_dgii(
    estado: str = "",
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    query = db.query(models.RegistroDGII).filter(models.RegistroDGII.empresa_id == empresa_id)
    if estado:
        query = query.filter(models.RegistroDGII.estado == estado_dgii(estado))
    registros = query.order_by(models.RegistroDGII.updated_at.desc()).all()
    return [registro_to_dict(registro) for registro in registros]


@router.get("/facturas/{factura_id}")
def get_registro_factura_dgii(
    factura_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    get_factura(factura_id, empresa_id, db)
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
    data: RegistroDGIICreate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    factura = get_factura(factura_id, empresa_id, db)
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
    _: models.User = Depends(require_admin),
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
