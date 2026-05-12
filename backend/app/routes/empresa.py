from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models import models
from app.middleware.auth import get_current_empresa
from app.models.schemas import EmpresaResponse, EmpresaUpdate

logger = logging.getLogger("facturd")

router = APIRouter(prefix="/api/empresa", tags=["Empresa"])

@router.get("", response_model=EmpresaResponse)
@router.get("/", response_model=EmpresaResponse)
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

@router.put("", response_model=EmpresaResponse)
@router.put("/", response_model=EmpresaResponse)
def update_empresa(
    data: EmpresaUpdate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    empresa = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(empresa, key, value)
    
    db.commit()
    db.refresh(empresa)
    return empresa
