from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models import models
from app.middleware.auth import get_current_empresa
from app.models.schemas import EmpresaResponse

logger = logging.getLogger("facturd")

router = APIRouter(prefix="/api/empresa", tags=["Empresa"])

@router.get("")
@router.get("/")
def get_empresa(
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    empresa = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return {
        "id": empresa.id,
        "nombre": empresa.nombre,
        "rnc": empresa.rnc,
        "direccion": empresa.direccion,
        "telefono": empresa.telefono,
        "email": empresa.email,
        "itbis": empresa.itbis,
        "regimen": empresa.regimen,
        "idioma": empresa.idioma,
        "secuencia_ncf": empresa.secuencia_ncf,
        "secuencia_ecf": empresa.secuencia_ecf,
        "nombre_sistema": empresa.nombre_sistema,
        "logo_url": empresa.logo_url
    }

@router.put("")
@router.put("/")
def update_empresa(
    data: dict,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    empresa = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    if "nombre" in data:
        empresa.nombre = data["nombre"]
    if "direccion" in data:
        empresa.direccion = data["direccion"]
    if "telefono" in data:
        empresa.telefono = data["telefono"]
    if "email" in data:
        empresa.email = data["email"]
    if "itbis" in data:
        empresa.itbis = data["itbis"]
    if "regimen" in data:
        empresa.regimen = data["regimen"]
    if "idioma" in data:
        empresa.idioma = data["idioma"]
    if "nombre_sistema" in data:
        empresa.nombre_sistema = data["nombre_sistema"]
    if "logo_url" in data:
        empresa.logo_url = data["logo_url"]
    
    db.commit()
    db.refresh(empresa)
    
    return {
        "id": empresa.id,
        "nombre": empresa.nombre,
        "rnc": empresa.rnc,
        "direccion": empresa.direccion,
        "telefono": empresa.telefono,
        "email": empresa.email,
        "itbis": empresa.itbis,
        "regimen": empresa.regimen,
        "idioma": empresa.idioma,
        "nombre_sistema": empresa.nombre_sistema,
        "logo_url": empresa.logo_url
    }
