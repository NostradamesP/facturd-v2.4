from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from datetime import datetime
import uuid

from app.database import get_db
from app.models import models
from app.models.schemas import GastoCreate, GastoUpdate, GastoResponse
from app.middleware.auth import get_current_empresa
from app.utils import generar_id

router = APIRouter(prefix="/api/gastos", tags=["Gastos"])

@router.get("/resumen")
def get_resumen(
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_general = db.query(func.coalesce(func.sum(models.Gasto.monto), 0)).filter(
        models.Gasto.empresa_id == empresa_id
    ).scalar()

    total_mes = db.query(func.coalesce(func.sum(models.Gasto.monto), 0)).filter(
        models.Gasto.empresa_id == empresa_id,
        models.Gasto.fecha >= first_of_month
    ).scalar()

    cantidad = db.query(func.count(models.Gasto.id)).filter(
        models.Gasto.empresa_id == empresa_id
    ).scalar()

    return {
        "total_general": float(total_general),
        "total_mes": float(total_mes),
        "cantidad": cantidad,
    }

@router.get("", response_model=List[GastoResponse])
@router.get("/", response_model=List[GastoResponse])
def get_gastos(
    search: str = "",
    skip: int = 0,
    limit: int = 100,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    query = db.query(models.Gasto).options(joinedload(models.Gasto.proveedor)).filter(models.Gasto.empresa_id == empresa_id)
    if search:
        query = query.filter(models.Gasto.nota.ilike(f"%{search}%"))
    gastos = query.order_by(models.Gasto.fecha.desc()).offset(skip).limit(limit).all()

    result = []
    for g in gastos:
        proveedor_nombre = g.proveedor.nombre if g.proveedor else None
        result.append(GastoResponse(
            id=g.id,
            empresa_id=g.empresa_id,
            proveedor_id=g.proveedor_id,
            factura_id=g.factura_id,
            monto=g.monto,
            fecha=g.fecha.isoformat() if g.fecha else None,
            categoria=g.categoria.value if g.categoria else "OTROS",
            nota=g.nota,
            created_at=g.created_at.isoformat() if g.created_at else None,
            proveedor_nombre=proveedor_nombre,
        ))
    return result

@router.get("/{gasto_id}", response_model=GastoResponse)
def get_gasto(
    gasto_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    gasto = db.query(models.Gasto).options(joinedload(models.Gasto.proveedor)).filter(
        models.Gasto.id == gasto_id,
        models.Gasto.empresa_id == empresa_id
    ).first()
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    proveedor_nombre = gasto.proveedor.nombre if gasto.proveedor else None
    return GastoResponse(
        id=gasto.id,
        empresa_id=gasto.empresa_id,
        proveedor_id=gasto.proveedor_id,
        factura_id=gasto.factura_id,
        monto=gasto.monto,
        fecha=gasto.fecha.isoformat() if gasto.fecha else None,
        categoria=gasto.categoria.value if gasto.categoria else "OTROS",
        nota=gasto.nota,
        created_at=gasto.created_at.isoformat() if gasto.created_at else None,
        proveedor_nombre=proveedor_nombre,
    )

@router.post("", status_code=201, response_model=GastoResponse)
@router.post("/", status_code=201, response_model=GastoResponse)
def create_gasto(
    gasto_data: GastoCreate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    fecha = None
    if gasto_data.fecha:
        try:
            fecha = datetime.fromisoformat(gasto_data.fecha)
        except ValueError:
            fecha = None

    gasto = models.Gasto(
        id=generar_id(),
        empresa_id=empresa_id,
        proveedor_id=gasto_data.proveedor_id,
        factura_id=gasto_data.factura_id,
        monto=gasto_data.monto,
        fecha=fecha,
        categoria=models.CategoriaGasto(gasto_data.categoria) if gasto_data.categoria else models.CategoriaGasto.OTROS,
        nota=gasto_data.nota,
    )
    db.add(gasto)
    db.commit()
    db.refresh(gasto)
    gasto = db.query(models.Gasto).options(joinedload(models.Gasto.proveedor)).filter(models.Gasto.id == gasto.id).first()
    proveedor_nombre = gasto.proveedor.nombre if gasto.proveedor else None
    return GastoResponse(
        id=gasto.id,
        empresa_id=gasto.empresa_id,
        proveedor_id=gasto.proveedor_id,
        factura_id=gasto.factura_id,
        monto=gasto.monto,
        fecha=gasto.fecha.isoformat() if gasto.fecha else None,
        categoria=gasto.categoria.value if gasto.categoria else "OTROS",
        nota=gasto.nota,
        created_at=gasto.created_at.isoformat() if gasto.created_at else None,
        proveedor_nombre=proveedor_nombre,
    )

@router.put("/{gasto_id}", response_model=GastoResponse)
def update_gasto(
    gasto_id: str,
    gasto_data: GastoUpdate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    gasto = db.query(models.Gasto).options(joinedload(models.Gasto.proveedor)).filter(
        models.Gasto.id == gasto_id,
        models.Gasto.empresa_id == empresa_id
    ).first()
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    update_data = gasto_data.model_dump(exclude_unset=True)
    if "fecha" in update_data and update_data["fecha"]:
        try:
            update_data["fecha"] = datetime.fromisoformat(update_data["fecha"])
        except ValueError:
            del update_data["fecha"]
    if "categoria" in update_data:
        update_data["categoria"] = models.CategoriaGasto(update_data["categoria"])

    for key, value in update_data.items():
        setattr(gasto, key, value)

    db.commit()
    db.refresh(gasto)
    gasto = db.query(models.Gasto).options(joinedload(models.Gasto.proveedor)).filter(models.Gasto.id == gasto.id).first()
    proveedor_nombre = gasto.proveedor.nombre if gasto.proveedor else None
    return GastoResponse(
        id=gasto.id,
        empresa_id=gasto.empresa_id,
        proveedor_id=gasto.proveedor_id,
        factura_id=gasto.factura_id,
        monto=gasto.monto,
        fecha=gasto.fecha.isoformat() if gasto.fecha else None,
        categoria=gasto.categoria.value if gasto.categoria else "OTROS",
        nota=gasto.nota,
        created_at=gasto.created_at.isoformat() if gasto.created_at else None,
        proveedor_nombre=proveedor_nombre,
    )

@router.delete("/{gasto_id}")
def delete_gasto(
    gasto_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    gasto = db.query(models.Gasto).filter(
        models.Gasto.id == gasto_id,
        models.Gasto.empresa_id == empresa_id
    ).first()
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    db.delete(gasto)
    db.commit()
    return {"message": "Gasto eliminado"}
