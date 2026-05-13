from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import uuid
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models import models
from app.models.schemas import CotizacionCreate, CotizacionConvertData, CotizacionUpdate
from app.middleware.auth import get_current_empresa
from app.routes.facturas import (
    agregar_detalles_factura,
    calcular_descuento,
    factura_to_dict,
    generar_ncf_disponible,
    normalizar_enum,
    preparar_detalles_factura,
)
from app.utils import generar_id

router = APIRouter(prefix="/api/cotizaciones", tags=["Cotizaciones"])

@router.get("")
@router.get("/")
def get_cotizaciones(
    estado: str = "",
    skip: int = 0,
    limit: int = 100,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    query = db.query(models.Cotizacion).filter(models.Cotizacion.empresa_id == empresa_id)
    if estado:
        query = query.filter(models.Cotizacion.estado == estado)
    return query.order_by(models.Cotizacion.fecha.desc()).offset(skip).limit(limit).all()

@router.get("/{cotizacion_id}")
def get_cotizacion(
    cotizacion_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    cotizacion = db.query(models.Cotizacion).filter(
        models.Cotizacion.id == cotizacion_id,
        models.Cotizacion.empresa_id == empresa_id
    ).first()
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return cotizacion

@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_cotizacion(
    cotizacion_data: CotizacionCreate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    empresa = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    secuencia = empresa.secuencia_ncf + 50000
    numero = f"COT-{secuencia:06d}"
    
    detalles_data = cotizacion_data.detalles
    subtotal = sum(d.cantidad * d.precio_unitario for d in detalles_data)
    itbis = sum(d.itbis for d in detalles_data)
    total = subtotal + itbis - cotizacion_data.descuento
    
    fecha_validez = None
    if cotizacion_data.dias_validez:
        fecha_validez = datetime.now(timezone.utc) + timedelta(days=cotizacion_data.dias_validez)
    
    cotizacion = models.Cotizacion(
        id=generar_id(),
        empresa_id=empresa_id,
        cliente_id=cotizacion_data.cliente_id,
        numero=numero,
        secuencia=secuencia,
        fecha_validez=fecha_validez,
        subtotal=subtotal,
        descuento=cotizacion_data.descuento,
        itbis=itbis,
        total=total,
        nota=cotizacion_data.nota
    )
    db.add(cotizacion)
    db.flush()
    
    for d in detalles_data:
        detalle = models.DetalleCotizacion(
            id=generar_id(),
            cotizacion_id=cotizacion.id,
            producto_id=d.producto_id,
            descripcion=d.descripcion,
            cantidad=d.cantidad,
            precio_unitario=d.precio_unitario,
            descuento=d.descuento,
            itbis=d.itbis,
            total=d.total
        )
        db.add(detalle)
    
    db.commit()
    db.refresh(cotizacion)
    return cotizacion

@router.put("/{cotizacion_id}")
def update_cotizacion(
    cotizacion_id: str,
    cotizacion_data: CotizacionUpdate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    cotizacion = db.query(models.Cotizacion).filter(
        models.Cotizacion.id == cotizacion_id,
        models.Cotizacion.empresa_id == empresa_id
    ).first()
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    
    update_data = cotizacion_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(cotizacion, key, value)
    
    db.commit()
    return cotizacion

@router.delete("/{cotizacion_id}")
def delete_cotizacion(
    cotizacion_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    cotizacion = db.query(models.Cotizacion).filter(
        models.Cotizacion.id == cotizacion_id,
        models.Cotizacion.empresa_id == empresa_id
    ).first()
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    
    db.query(models.DetalleCotizacion).filter(models.DetalleCotizacion.cotizacion_id == cotizacion_id).delete()
    db.delete(cotizacion)
    db.commit()
    return {"message": "Cotización eliminada"}

@router.post("/{cotizacion_id}/convertir")
def convertir_cotizacion_factura(
    cotizacion_id: str,
    data: Optional[CotizacionConvertData] = None,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    data = data or CotizacionConvertData()
    cotizacion = db.query(models.Cotizacion).filter(
        models.Cotizacion.id == cotizacion_id,
        models.Cotizacion.empresa_id == empresa_id
    ).first()
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    
    if cotizacion.estado == models.EstadoCotizacion.CONVERTIDA:
        raise HTTPException(status_code=400, detail="Cotización ya convertida")
    
    empresa = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    detalles = db.query(models.DetalleCotizacion).filter(models.DetalleCotizacion.cotizacion_id == cotizacion_id).all()
    detalles_data = [
        {
            "producto_id": d.producto_id,
            "descripcion": d.descripcion,
            "cantidad": d.cantidad,
            "precio_unitario": d.precio_unitario,
            "descuento": d.descuento,
            "itbis": d.itbis,
            "total": d.total,
        }
        for d in detalles
    ]
    detalles_preparados, subtotal, itbis = preparar_detalles_factura(detalles_data, empresa_id, db)
    descuento = calcular_descuento(
        {"descuento": cotizacion.descuento, "descuento_porcentaje": data.descuento_porcentaje},
        subtotal,
    )
    total = subtotal + itbis - descuento
    tipo_ncf = normalizar_enum(models.TipoNCF, data.tipo_ncf or "E41", models.TipoNCF.E41)
    ncf, secuencia = generar_ncf_disponible(tipo_ncf, empresa.secuencia_ncf or 1, db)
    
    factura = models.Factura(
        id=generar_id(),
        empresa_id=empresa_id,
        cliente_id=cotizacion.cliente_id,
        ncf=ncf,
        tipo_ncf=tipo_ncf,
        secuencia=secuencia,
        subtotal=subtotal,
        descuento=descuento,
        itbis=itbis,
        total=total,
        estado=models.EstadoFactura.PENDIENTE,
        nota=cotizacion.nota,
        visual_settings=data.visual_settings,
    )
    db.add(factura)
    db.flush()
    agregar_detalles_factura(
        factura,
        ncf,
        detalles_preparados,
        db,
        nota_kardex=f"Venta por Cotizacion {cotizacion.numero}",
    )
    
    empresa.secuencia_ncf = secuencia + 1
    cotizacion.estado = models.EstadoCotizacion.CONVERTIDA
    
    db.commit()
    db.refresh(factura)
    return {
        "factura": factura_to_dict(factura, db, include_detalles=True),
        "message": "Cotización convertida a factura",
    }
