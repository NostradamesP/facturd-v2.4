from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import models
from app.models.schemas import ProductoCreate, ProductoUpdate, ProductoResponse, PaginatedResponse
from app.middleware.auth import get_current_empresa
from app.utils import generar_id

router = APIRouter(prefix="/api/productos", tags=["Productos"])

@router.get("", response_model=PaginatedResponse[ProductoResponse])
@router.get("/", response_model=PaginatedResponse[ProductoResponse])
def get_productos(
    search: str = "",
    skip: int = 0,
    limit: int = 100,
    include_inactivos: bool = False,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    query = db.query(models.Producto).filter(models.Producto.empresa_id == empresa_id)
    if not include_inactivos:
        query = query.filter(models.Producto.activo == True)
    if search:
        query = query.filter(
            (models.Producto.nombre.ilike(f"%{search}%")) |
            (models.Producto.codigo.ilike(f"%{search}%"))
        )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total, "skip": skip, "limit": limit}

@router.get("/alertas/stock")
def get_alertas_stock(
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    productos = db.query(models.Producto).filter(
        models.Producto.empresa_id == empresa_id,
        models.Producto.stock <= models.Producto.stock_minimo,
        models.Producto.activo == True
    ).all()

    return {
        "alertas": [
            {
                "id": p.id,
                "codigo": p.codigo,
                "nombre": p.nombre,
                "stock": p.stock,
                "stock_minimo": p.stock_minimo,
                "diferencia": p.stock_minimo - p.stock
            }
            for p in productos
        ],
        "total": len(productos)
    }

@router.get("/{producto_id}", response_model=ProductoResponse)
def get_producto(
    producto_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    producto = db.query(models.Producto).filter(
        models.Producto.id == producto_id,
        models.Producto.empresa_id == empresa_id
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@router.post("", status_code=201, response_model=ProductoResponse)
@router.post("/", status_code=201, response_model=ProductoResponse)
def create_producto(
    producto_data: ProductoCreate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    producto = models.Producto(
        id=generar_id(),
        empresa_id=empresa_id,
        codigo=producto_data.codigo,
        nombre=producto_data.nombre,
        descripcion=producto_data.descripcion,
        precio_unitario=producto_data.precio_unitario,
        costo_unitario=producto_data.costo_unitario,
        stock=producto_data.stock,
        stock_minimo=producto_data.stock_minimo,
        codigo_barra=producto_data.codigo_barra,
        aplica_itbis=producto_data.aplica_itbis,
        tipo_itbis=producto_data.tipo_itbis,
        activo=True
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto

@router.put("/{producto_id}", response_model=ProductoResponse)
def update_producto(
    producto_id: str,
    producto_data: ProductoUpdate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    producto = db.query(models.Producto).filter(
        models.Producto.id == producto_id,
        models.Producto.empresa_id == empresa_id
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    for key, value in producto_data.model_dump(exclude_unset=True).items():
        setattr(producto, key, value)

    db.commit()
    db.refresh(producto)
    return producto

@router.delete("/{producto_id}")
def delete_producto(
    producto_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    producto = db.query(models.Producto).filter(
        models.Producto.id == producto_id,
        models.Producto.empresa_id == empresa_id
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    tiene_movimientos = (
        db.query(models.DetalleFactura).filter(models.DetalleFactura.producto_id == producto_id).first()
        or db.query(models.DetalleCotizacion).filter(models.DetalleCotizacion.producto_id == producto_id).first()
        or db.query(models.Kardex).filter(models.Kardex.producto_id == producto_id).first()
    )
    if tiene_movimientos:
        producto.activo = False
        db.commit()
        return {"message": "Producto desactivado por tener movimientos"}

    db.delete(producto)
    db.commit()
    return {"message": "Producto eliminado"}
