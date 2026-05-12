from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import uuid

from app.database import get_db
from app.middleware.auth import get_current_empresa
from app.models import models
from app.models.schemas import DashboardStats, FacturaCreate, FacturaUpdate

router = APIRouter(prefix="/api/facturas", tags=["Facturas"])


def generar_id() -> str:
    return uuid.uuid4().hex[:24]


def normalizar_enum(enum_cls, value, default):
    if value is None:
        return default
    key = str(value).upper()
    if key == "CANCELADA" and enum_cls is models.EstadoFactura:
        key = "ANULADA"
    if key in enum_cls.__members__:
        return enum_cls[key]
    raise HTTPException(status_code=400, detail=f"Valor invalido: {value}")


def generar_ncf(tipo_ncf: models.TipoNCF, secuencia: int) -> str:
    return f"{tipo_ncf.value}{str(secuencia).zfill(10)}"


def generar_ncf_disponible(tipo_ncf: models.TipoNCF, secuencia: int, db: Session) -> tuple[str, int]:
    secuencia_actual = secuencia or 1
    while True:
        ncf = generar_ncf(tipo_ncf, secuencia_actual)
        existe = db.query(models.Factura.id).filter(models.Factura.ncf == ncf).first()
        if not existe:
            return ncf, secuencia_actual
        secuencia_actual += 1


def parse_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Fecha invalida: {value}")


def parse_float(value, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"Numero invalido: {value}")


def preparar_detalles_factura(detalles_data: list, empresa_id: str, db: Session) -> tuple[list[dict], float, float]:
    if not detalles_data:
        raise HTTPException(status_code=400, detail="La factura necesita al menos un detalle")

    subtotal = 0.0
    itbis = 0.0
    reservado_por_producto: dict[str, float] = {}
    detalles_preparados = []

    for detalle_data in detalles_data:
        cantidad = parse_float(detalle_data.get("cantidad"))
        precio_unitario = parse_float(detalle_data.get("precio_unitario"))
        producto_id = detalle_data.get("producto_id") or None
        descripcion = detalle_data.get("descripcion")
        producto = None

        if cantidad <= 0:
            raise HTTPException(status_code=400, detail="Cada detalle necesita una cantidad mayor a cero")
        if precio_unitario < 0:
            raise HTTPException(status_code=400, detail="El precio no puede ser negativo")

        if producto_id:
            producto = db.query(models.Producto).filter(
                models.Producto.id == producto_id,
                models.Producto.empresa_id == empresa_id,
            ).first()
            if not producto:
                raise HTTPException(status_code=404, detail="Producto no encontrado")

            descripcion = descripcion or producto.nombre
            reservado = reservado_por_producto.get(producto.id, 0.0)
            disponible = (producto.stock or 0.0) - reservado
            if disponible < cantidad:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {producto.nombre}")
            reservado_por_producto[producto.id] = reservado + cantidad

        if not producto_id and not str(descripcion or "").strip():
            raise HTTPException(status_code=400, detail="Los servicios manuales necesitan una descripcion")

        descuento_linea = parse_float(detalle_data.get("descuento"))
        linea_base = cantidad * precio_unitario
        if producto and producto.aplica_itbis is False:
            linea_itbis = 0.0
        elif detalle_data.get("itbis") not in (None, ""):
            linea_itbis = parse_float(detalle_data.get("itbis"))
        else:
            linea_itbis = linea_base * 0.18
        linea_total = max(linea_base + linea_itbis - descuento_linea, 0.0)

        subtotal += linea_base
        itbis += linea_itbis
        detalles_preparados.append({
            "producto": producto,
            "producto_id": producto_id,
            "descripcion": descripcion or "Producto",
            "cantidad": cantidad,
            "precio_unitario": precio_unitario,
            "descuento": descuento_linea,
            "itbis": linea_itbis,
            "total": linea_total,
        })

    return detalles_preparados, subtotal, itbis


def calcular_descuento(data: dict, subtotal: float) -> float:
    descuento_porcentaje = parse_float(data.get("descuento_porcentaje"))
    descuento = parse_float(data.get("descuento"))
    if descuento_porcentaje:
        descuento = subtotal * (descuento_porcentaje / 100)
    if descuento < 0:
        raise HTTPException(status_code=400, detail="El descuento no puede ser negativo")
    return min(descuento, subtotal)


def agregar_detalles_factura(
    factura: models.Factura,
    ncf: str,
    detalles_preparados: list[dict],
    db: Session,
    nota_kardex: str = "Venta",
):
    for detalle in detalles_preparados:
        db.add(models.DetalleFactura(
            id=generar_id(),
            factura_id=factura.id,
            producto_id=detalle["producto_id"],
            descripcion=detalle["descripcion"],
            cantidad=detalle["cantidad"],
            precio_unitario=detalle["precio_unitario"],
            descuento=detalle["descuento"],
            itbis=detalle["itbis"],
            total=detalle["total"],
        ))
        producto = detalle["producto"]
        if producto:
            producto.stock -= detalle["cantidad"]
            db.add(models.Kardex(
                id=generar_id(),
                producto_id=producto.id,
                tipo="SALIDA",
                cantidad=detalle["cantidad"],
                saldo_actual=producto.stock,
                referencia=factura.id,
                nota=f"{nota_kardex} {ncf}",
            ))


def restaurar_stock_factura(factura: models.Factura, db: Session):
    detalles_actuales = db.query(models.DetalleFactura).filter(
        models.DetalleFactura.factura_id == factura.id
    ).all()
    for detalle in detalles_actuales:
        if not detalle.producto_id:
            continue
        producto = db.query(models.Producto).filter(
            models.Producto.id == detalle.producto_id,
            models.Producto.empresa_id == factura.empresa_id,
        ).first()
        if not producto:
            continue
        producto.stock = (producto.stock or 0.0) + (detalle.cantidad or 0.0)
        db.add(models.Kardex(
            id=generar_id(),
            producto_id=producto.id,
            tipo="ENTRADA",
            cantidad=detalle.cantidad or 0.0,
            saldo_actual=producto.stock,
            referencia=factura.id,
            nota=f"Reversion edicion {factura.ncf}",
        ))


def total_pagado_factura(factura_id: str, db: Session) -> float:
    pagos = db.query(models.Pago).filter(models.Pago.factura_id == factura_id).all()
    return sum(pago.monto or 0 for pago in pagos)


def factura_to_dict(factura: models.Factura, db: Session, include_detalles: bool = False) -> dict:
    cliente = db.query(models.Cliente).filter(models.Cliente.id == factura.cliente_id).first() if factura.cliente_id else None
    data = {
        "id": factura.id,
        "empresa_id": factura.empresa_id,
        "cliente_id": factura.cliente_id,
        "cliente_nombre": cliente.nombre if cliente else None,
        "ncf": factura.ncf,
        "tipo_ncf": factura.tipo_ncf.value if factura.tipo_ncf else None,
        "secuencia": factura.secuencia,
        "fecha": factura.fecha,
        "fecha_vencimiento": factura.fecha_vencimiento,
        "subtotal": factura.subtotal,
        "descuento": factura.descuento,
        "itbis": factura.itbis,
        "total": factura.total,
        "estado": factura.estado.value if factura.estado else None,
        "nota": factura.nota,
        "visual_settings": factura.visual_settings,
    }
    if include_detalles:
        detalles = db.query(models.DetalleFactura).filter(
            models.DetalleFactura.factura_id == factura.id
        ).all()
        data["detalles"] = [
            {
                "id": detalle.id,
                "producto_id": detalle.producto_id,
                "descripcion": detalle.descripcion,
                "cantidad": detalle.cantidad,
                "precio_unitario": detalle.precio_unitario,
                "descuento": detalle.descuento,
                "itbis": detalle.itbis,
                "total": detalle.total,
            }
            for detalle in detalles
        ]
    return data


@router.get("")
def get_facturas(
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    estado: Optional[str] = None,
):
    """Get all facturas for the current empresa"""
    query = db.query(models.Factura).filter(models.Factura.empresa_id == empresa_id)
    if estado:
        query = query.filter(models.Factura.estado == estado)

    total = query.count()
    facturas = query.order_by(models.Factura.created_at.desc()).offset(skip).limit(limit).all()
    items = [factura_to_dict(f, db) for f in facturas]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/stats/dashboard", response_model=DashboardStats)
def get_stats(
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    facturas = db.query(models.Factura).filter(models.Factura.empresa_id == empresa_id).all()
    return DashboardStats(
        total_ventas=sum(f.total or 0 for f in facturas),
        total_itbis=sum(f.itbis or 0 for f in facturas),
        pendientes=sum(1 for f in facturas if f.estado == models.EstadoFactura.PENDIENTE),
        pagadas=sum(1 for f in facturas if f.estado == models.EstadoFactura.PAGADA),
        cliente_count=db.query(models.Cliente).filter(models.Cliente.empresa_id == empresa_id).count(),
        factura_count=len(facturas),
    )


@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_factura(
    data: FacturaCreate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    empresa = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    cliente_id = data.cliente_id
    cliente = db.query(models.Cliente).filter(
        models.Cliente.id == cliente_id,
        models.Cliente.empresa_id == empresa_id,
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    tipo_ncf = normalizar_enum(models.TipoNCF, data.tipo_ncf, models.TipoNCF.E41)
    ncf, secuencia = generar_ncf_disponible(tipo_ncf, empresa.secuencia_ncf or 1, db)
    detalles_preparados, subtotal, itbis = preparar_detalles_factura(
        [d.model_dump() for d in data.detalles], empresa_id, db
    )
    descuento = calcular_descuento(data.model_dump(), subtotal)
    total = subtotal + itbis - descuento
    factura = models.Factura(
        id=generar_id(),
        empresa_id=empresa_id,
        cliente_id=cliente_id,
        ncf=ncf,
        tipo_ncf=tipo_ncf,
        secuencia=secuencia,
        fecha=parse_date(data.fecha) or None,
        fecha_vencimiento=parse_date(data.fecha_vencimiento),
        subtotal=subtotal,
        descuento=descuento,
        itbis=itbis,
        total=total,
        estado=models.EstadoFactura.PENDIENTE,
        nota=data.nota,
        visual_settings=data.visual_settings,
    )
    db.add(factura)
    db.flush()
    agregar_detalles_factura(factura, ncf, detalles_preparados, db)

    empresa.secuencia_ncf = secuencia + 1
    db.commit()
    db.refresh(factura)
    return factura_to_dict(factura, db, include_detalles=True)


@router.get("/{factura_id}")
def get_factura(
    factura_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    factura = db.query(models.Factura).filter(
        models.Factura.id == factura_id,
        models.Factura.empresa_id == empresa_id,
    ).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return factura_to_dict(factura, db, include_detalles=True)


@router.put("/{factura_id}")
def update_factura(
    factura_id: str,
    data: FacturaUpdate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    factura = db.query(models.Factura).filter(
        models.Factura.id == factura_id,
        models.Factura.empresa_id == empresa_id,
    ).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    actualiza_detalles = data.detalles is not None
    total_pagado = total_pagado_factura(factura.id, db)
    if actualiza_detalles and factura.estado in (models.EstadoFactura.PAGADA, models.EstadoFactura.ENVIADA_DGII):
        raise HTTPException(status_code=400, detail="No se pueden editar los renglones de una factura cerrada")
    if actualiza_detalles and total_pagado > 0:
        raise HTTPException(status_code=400, detail="No se pueden editar renglones de una factura con pagos registrados")

    if data.cliente_id is not None:
        cliente = db.query(models.Cliente).filter(
            models.Cliente.id == data.cliente_id,
            models.Cliente.empresa_id == empresa_id,
        ).first()
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        factura.cliente_id = data.cliente_id

    if data.fecha is not None:
        factura.fecha = parse_date(data.fecha) or factura.fecha
    if data.fecha_vencimiento is not None:
        factura.fecha_vencimiento = parse_date(data.fecha_vencimiento)

    if actualiza_detalles:
        restaurar_stock_factura(factura, db)
        detalles_preparados, subtotal, itbis = preparar_detalles_factura(
            [d.model_dump() for d in data.detalles],
            empresa_id,
            db,
        )
        db.query(models.DetalleFactura).filter(
            models.DetalleFactura.factura_id == factura.id
        ).delete(synchronize_session=False)
        descuento = calcular_descuento(data.model_dump(), subtotal)
        factura.subtotal = subtotal
        factura.descuento = descuento
        factura.itbis = itbis
        factura.total = subtotal + itbis - descuento
        agregar_detalles_factura(
            factura,
            factura.ncf,
            detalles_preparados,
            db,
            nota_kardex="Edicion venta",
        )

    if data.estado is not None:
        nuevo_estado = normalizar_enum(models.EstadoFactura, data.estado, factura.estado)
        if total_pagado > 0 and nuevo_estado != factura.estado:
            if nuevo_estado == models.EstadoFactura.PAGADA and total_pagado >= (factura.total or 0):
                factura.estado = nuevo_estado
            else:
                raise HTTPException(status_code=400, detail="El estado de una factura con pagos se controla desde cobros")
        else:
            factura.estado = nuevo_estado
    if data.nota is not None:
        factura.nota = data.nota
    if data.visual_settings is not None:
        factura.visual_settings = data.visual_settings
    db.commit()
    db.refresh(factura)
    return factura_to_dict(factura, db, include_detalles=True)


@router.delete("/{factura_id}")
def delete_factura(
    factura_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    factura = db.query(models.Factura).filter(
        models.Factura.id == factura_id,
        models.Factura.empresa_id == empresa_id,
    ).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if total_pagado_factura(factura.id, db) > 0:
        raise HTTPException(status_code=400, detail="No se puede eliminar una factura con pagos registrados")
    if factura.estado != models.EstadoFactura.PENDIENTE:
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar facturas pendientes sin pagos")
    restaurar_stock_factura(factura, db)
    db.query(models.DetalleFactura).filter(models.DetalleFactura.factura_id == factura_id).delete()
    db.delete(factura)
    db.commit()
    return {"message": "Factura eliminada"}
