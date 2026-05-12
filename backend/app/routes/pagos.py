from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models import models
from app.models.schemas import PagoCreate
from app.middleware.auth import get_current_empresa
from app.utils import generar_id

router = APIRouter(prefix="/api/pagos", tags=["Pagos"])

def parse_monto(value):
    try:
        monto = float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Monto invalido")
    if monto <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a cero")
    return monto


def pago_to_dict(pago: models.Pago, db: Session):
    factura = db.query(models.Factura).filter(models.Factura.id == pago.factura_id).first()
    return {
        "id": pago.id,
        "empresa_id": pago.empresa_id,
        "factura_id": pago.factura_id,
        "factura_ncf": factura.ncf if factura else None,
        "monto": pago.monto,
        "metodo": pago.metodo.value if pago.metodo else None,
        "referencia": pago.referencia,
        "nota": pago.nota,
        "fecha": pago.fecha,
        "created_at": pago.created_at,
    }

@router.get("")
@router.get("/")
def get_pagos(
    factura_id: str = None,
    skip: int = 0,
    limit: int = 100,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    query = db.query(models.Pago).filter(models.Pago.empresa_id == empresa_id)
    if factura_id:
        query = query.filter(models.Pago.factura_id == factura_id)
    pagos = query.order_by(models.Pago.fecha.desc()).offset(skip).limit(limit).all()
    return [pago_to_dict(pago, db) for pago in pagos]

@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_pago(
    data: PagoCreate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    factura = db.query(models.Factura).filter(
        models.Factura.id == data.factura_id,
        models.Factura.empresa_id == empresa_id
    ).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if factura.estado == models.EstadoFactura.ANULADA:
        raise HTTPException(status_code=400, detail="No se pueden registrar pagos en una factura anulada")
    if factura.estado == models.EstadoFactura.ENVIADA_DGII:
        raise HTTPException(status_code=400, detail="Esta factura ya fue enviada a DGII y requiere un flujo controlado de cobro")
    
    monto = parse_monto(data.monto)
    
    pagos_anteriores = db.query(models.Pago).filter(models.Pago.factura_id == factura.id).all()
    total_pagado = sum(p.monto or 0 for p in pagos_anteriores)
    
    if total_pagado + monto > (factura.total or 0):
        raise HTTPException(status_code=400, detail="Monto excede el total de la factura")
    
    metodo = str(data.metodo).upper()
    if metodo not in models.MetodoPago.__members__:
        raise HTTPException(status_code=400, detail="Metodo de pago invalido")

    pago = models.Pago(
        id=generar_id(),
        empresa_id=empresa_id,
        factura_id=factura.id,
        monto=monto,
        metodo=models.MetodoPago[metodo],
        referencia=data.referencia,
        nota=data.nota
    )
    db.add(pago)
    
    total_pagado += monto
    if total_pagado >= (factura.total or 0):
        factura.estado = models.EstadoFactura.PAGADA
    
    db.commit()
    db.refresh(pago)
    return pago_to_dict(pago, db)

@router.delete("/{pago_id}")
def delete_pago(
    pago_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    pago = db.query(models.Pago).filter(
        models.Pago.id == pago_id,
        models.Pago.empresa_id == empresa_id
    ).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    factura = db.query(models.Factura).filter(models.Factura.id == pago.factura_id).first()
    if factura:
        if factura.estado == models.EstadoFactura.ANULADA:
            raise HTTPException(status_code=400, detail="No se pueden modificar pagos de una factura anulada")
        pagos_restantes = db.query(models.Pago).filter(
            models.Pago.factura_id == factura.id,
            models.Pago.id != pago_id
        ).all()
        total_restante = sum(p.monto or 0 for p in pagos_restantes)
        if total_restante < (factura.total or 0):
            factura.estado = models.EstadoFactura.PENDIENTE
    
    db.delete(pago)
    db.commit()
    return {"message": "Pago eliminado"}

@router.get("/factura/{factura_id}")
def get_pagos_factura(
    factura_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    factura = db.query(models.Factura).filter(
        models.Factura.id == factura_id,
        models.Factura.empresa_id == empresa_id
    ).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    pagos = db.query(models.Pago).filter(models.Pago.factura_id == factura_id).all()
    total_pagado = sum(p.monto or 0 for p in pagos)
    
    return {
        "factura": factura,
        "pagos": [pago_to_dict(pago, db) for pago in pagos],
        "total_pagado": total_pagado,
        "pendiente": (factura.total or 0) - total_pagado
    }
