from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import models
from app.models.schemas import ClienteCreate, ClienteUpdate, ClienteResponse, PaginatedResponse
from app.middleware.auth import get_current_empresa

router = APIRouter(prefix="/api/clientes", tags=["Clientes"])

def generar_id() -> str:
    val_hex: str = uuid.uuid4().hex
    return val_hex[:24]  # type: ignore

@router.get("", response_model=PaginatedResponse[ClienteResponse])
@router.get("/", response_model=PaginatedResponse[ClienteResponse])
def get_clientes(
    search: str = "",
    skip: int = 0,
    limit: int = 100,
    include_inactivos: bool = False,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    query = db.query(models.Cliente).filter(models.Cliente.empresa_id == empresa_id)
    if not include_inactivos:
        query = query.filter(models.Cliente.estatus == "ACTIVO")
    if search:
        query = query.filter(
            (models.Cliente.nombre.ilike(f"%{search}%")) | 
            (models.Cliente.rnc.ilike(f"%{search}%"))
        )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total, "skip": skip, "limit": limit}

@router.get("/{cliente_id}", response_model=ClienteResponse)
def get_cliente(
    cliente_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    cliente = db.query(models.Cliente).filter(
        models.Cliente.id == cliente_id,
        models.Cliente.empresa_id == empresa_id
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@router.post("", response_model=ClienteResponse)
@router.post("/", response_model=ClienteResponse)
def create_cliente(
    cliente_data: ClienteCreate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    existing = db.query(models.Cliente).filter(
        models.Cliente.rnc == cliente_data.rnc,
        models.Cliente.empresa_id == empresa_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un cliente con este RNC")
    
    cliente = models.Cliente(
        id=generar_id(),
        empresa_id=empresa_id,
        rnc=cliente_data.rnc,
        nombre=cliente_data.nombre,
        nombre_comercial=cliente_data.nombre_comercial,
        tipo=cliente_data.tipo,
        direccion=cliente_data.direccion,
        telefono=cliente_data.telefono,
        email=cliente_data.email,
        limite_credito=cliente_data.limite_credito,
        saldo_pendiente=0,
        estatus="ACTIVO"
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente

@router.put("/{cliente_id}", response_model=ClienteResponse)
def update_cliente(
    cliente_id: str,
    cliente_data: ClienteUpdate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    cliente = db.query(models.Cliente).filter(
        models.Cliente.id == cliente_id,
        models.Cliente.empresa_id == empresa_id
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    for key, value in cliente_data.model_dump(exclude_unset=True).items():
        setattr(cliente, key, value)
    
    db.commit()
    db.refresh(cliente)
    return cliente

@router.delete("/{cliente_id}")
def delete_cliente(
    cliente_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    cliente = db.query(models.Cliente).filter(
        models.Cliente.id == cliente_id,
        models.Cliente.empresa_id == empresa_id
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    tiene_historial = (
        db.query(models.Factura).filter(models.Factura.cliente_id == cliente_id).first()
        or db.query(models.Cotizacion).filter(models.Cotizacion.cliente_id == cliente_id).first()
        or db.query(models.NotaCredito).filter(models.NotaCredito.cliente_id == cliente_id).first()
        or db.query(models.NotaDebito).filter(models.NotaDebito.cliente_id == cliente_id).first()
    )
    if tiene_historial:
        cliente.estatus = "INACTIVO"
        db.commit()
        return {"message": "Cliente desactivado por tener historial fiscal"}

    db.delete(cliente)
    db.commit()
    return {"message": "Cliente eliminado"}
