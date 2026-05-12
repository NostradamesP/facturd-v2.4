from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import models
from app.models.schemas import ProveedorCreate, ProveedorUpdate, ProveedorResponse, PaginatedResponse
from app.middleware.auth import get_current_empresa
from app.utils import generar_id

router = APIRouter(prefix="/api/proveedores", tags=["Proveedores"])

@router.get("", response_model=PaginatedResponse[ProveedorResponse])
@router.get("/", response_model=PaginatedResponse[ProveedorResponse])
def get_proveedores(
    search: str = "",
    skip: int = 0,
    limit: int = 100,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    query = db.query(models.Proveedor).filter(models.Proveedor.empresa_id == empresa_id)
    if search:
        query = query.filter(
            (models.Proveedor.nombre.ilike(f"%{search}%")) | 
            (models.Proveedor.rnc.ilike(f"%{search}%"))
        )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total, "skip": skip, "limit": limit}

@router.get("/{proveedor_id}", response_model=ProveedorResponse)
def get_proveedor(
    proveedor_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    proveedor = db.query(models.Proveedor).filter(
        models.Proveedor.id == proveedor_id,
        models.Proveedor.empresa_id == empresa_id
    ).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return proveedor

@router.post("", status_code=201, response_model=ProveedorResponse)
@router.post("/", status_code=201, response_model=ProveedorResponse)
def create_proveedor(
    proveedor_data: ProveedorCreate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    proveedor = models.Proveedor(
        id=generar_id(),
        empresa_id=empresa_id,
        rnc=proveedor_data.rnc,
        nombre=proveedor_data.nombre,
        nombre_comercial=proveedor_data.nombre_comercial,
        direccion=proveedor_data.direccion,
        telefono=proveedor_data.telefono,
        email=proveedor_data.email
    )
    db.add(proveedor)
    db.commit()
    db.refresh(proveedor)
    return proveedor

@router.put("/{proveedor_id}", response_model=ProveedorResponse)
def update_proveedor(
    proveedor_id: str,
    proveedor_data: ProveedorUpdate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    proveedor = db.query(models.Proveedor).filter(
        models.Proveedor.id == proveedor_id,
        models.Proveedor.empresa_id == empresa_id
    ).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    for key, value in proveedor_data.model_dump(exclude_unset=True).items():
        setattr(proveedor, key, value)
    
    db.commit()
    db.refresh(proveedor)
    return proveedor

@router.delete("/{proveedor_id}")
def delete_proveedor(
    proveedor_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    proveedor = db.query(models.Proveedor).filter(
        models.Proveedor.id == proveedor_id,
        models.Proveedor.empresa_id == empresa_id
    ).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    db.delete(proveedor)
    db.commit()
    return {"message": "Proveedor eliminado"}
