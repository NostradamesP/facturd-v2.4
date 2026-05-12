from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models.models import PlantillaFactura
from app.models.schemas import PlantillaFacturaCreate, PlantillaFacturaUpdate, PlantillaFacturaResponse
from app.middleware.auth import get_current_empresa
from app.utils import generar_id

router = APIRouter(prefix="/api/plantillas", tags=["Plantillas"])

def crear_plantilla_default(db: Session, empresa_id: str) -> PlantillaFactura:
    plantilla = PlantillaFactura(
        id=generar_id(),
        empresa_id=empresa_id,
        nombre="Plantilla Predeterminada",
        color_primario="#2E7D32",
        color_secundario="#1565C0",
        color_texto="#333333",
        color_fondo="#FFFFFF",
        mostrar_logo=True,
        mostrar_datos_empresa=True,
        mostrar_ncf=True,
        mostrar_fecha=True,
        mostrar_cliente=True,
        mostrar_nota=True,
        mostrar_qr=True,
        mostrar_pie=True,
        orden_secciones="logo,empresa,ncf,fecha,cliente,items,subtotales,nota,pie",
        texto_encabezado="FACTURA ELECTRONICA",
        texto_pie="Gracias por su preferencia",
        fuente_principal="Helvetica",
        tamaño_fuente=10,
        es_predeterminada=True
    )
    db.add(plantilla)
    db.commit()
    db.refresh(plantilla)
    return plantilla

@router.get("", response_model=list[PlantillaFacturaResponse])
def get_plantillas(
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    plantillas = db.query(PlantillaFactura).filter(PlantillaFactura.empresa_id == empresa_id).all()
    if not plantillas:
        plantilla = crear_plantilla_default(db, empresa_id)
        return [plantilla]
    return plantillas

@router.get("/{plantilla_id}", response_model=PlantillaFacturaResponse)
def get_plantilla(
    plantilla_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    plantilla = db.query(PlantillaFactura).filter(
        PlantillaFactura.id == plantilla_id,
        PlantillaFactura.empresa_id == empresa_id
    ).first()
    if not plantilla:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return plantilla

@router.post("", status_code=201, response_model=PlantillaFacturaResponse)
def create_plantilla(
    data: PlantillaFacturaCreate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    plantilla = PlantillaFactura(
        id=generar_id(),
        empresa_id=empresa_id,
        **data.model_dump()
    )
    db.add(plantilla)
    db.commit()
    db.refresh(plantilla)
    return plantilla

@router.put("/{plantilla_id}", response_model=PlantillaFacturaResponse)
def update_plantilla(
    plantilla_id: str,
    data: PlantillaFacturaUpdate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    plantilla = db.query(PlantillaFactura).filter(
        PlantillaFactura.id == plantilla_id,
        PlantillaFactura.empresa_id == empresa_id
    ).first()
    if not plantilla:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(plantilla, key, value)
    
    db.commit()
    db.refresh(plantilla)
    return plantilla

@router.delete("/{plantilla_id}")
def delete_plantilla(
    plantilla_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    plantilla = db.query(PlantillaFactura).filter(
        PlantillaFactura.id == plantilla_id,
        PlantillaFactura.empresa_id == empresa_id
    ).first()
    if not plantilla:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    if plantilla.es_predeterminada:
        raise HTTPException(status_code=400, detail="No se puede eliminar la plantilla predeterminada")
    
    db.delete(plantilla)
    db.commit()
    return {"message": "Plantilla eliminada"}

@router.post("/{plantilla_id}/duplicar", response_model=PlantillaFacturaResponse)
def duplicar_plantilla(
    plantilla_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    original = db.query(PlantillaFactura).filter(
        PlantillaFactura.id == plantilla_id,
        PlantillaFactura.empresa_id == empresa_id
    ).first()
    if not original:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    nueva = PlantillaFactura(
        id=generar_id(),
        empresa_id=empresa_id,
        nombre=f"{original.nombre} (Copia)",
        logo_url=original.logo_url,
        color_primario=original.color_primario,
        color_secundario=original.color_secundario,
        color_texto=original.color_texto,
        color_fondo=original.color_fondo,
        mostrar_logo=original.mostrar_logo,
        mostrar_datos_empresa=original.mostrar_datos_empresa,
        mostrar_ncf=original.mostrar_ncf,
        mostrar_fecha=original.mostrar_fecha,
        mostrar_cliente=original.mostrar_cliente,
        mostrar_nota=original.mostrar_nota,
        mostrar_qr=original.mostrar_qr,
        mostrar_pie=original.mostrar_pie,
        orden_secciones=original.orden_secciones or "logo,empresa,ncf,fecha,cliente,items,subtotales,nota,pie",
        texto_encabezado=original.texto_encabezado,
        texto_pie=original.texto_pie,
        mensaje_adicional=original.mensaje_adicional,
        fuente_principal=original.fuente_principal,
        tamaño_fuente=original.tamaño_fuente,
        es_predeterminada=False
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva
