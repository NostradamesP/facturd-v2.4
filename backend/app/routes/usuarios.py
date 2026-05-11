from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.database import get_db
from app.models import models
from app.middleware.auth import get_current_empresa, get_current_user
from app.utils import generar_id

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("/")
def get_usuarios(
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    usuarios = db.query(models.User).filter(models.User.empresa_id == empresa_id).all()
    return [{"id": u.id, "email": u.email, "name": u.name, "role": u.role.value, "created_at": u.created_at} for u in usuarios]

@router.get("/me")
def get_current_user_info(
    current_user: dict = Depends(get_current_user)
):
    return current_user

@router.post("/")
def create_usuario(
    data: dict,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    existing = db.query(models.User).filter(models.User.email == data.get("email")).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    hashed_password = pwd_context.hash(data.get("password"))
    role_str = data.get("role", "VENDEDOR")
    role = models.Role[role_str] if role_str in models.Role.__members__ else models.Role.VENDEDOR
    usuario = models.User(
        id=generar_id(),
        email=data.get("email"),
        password=hashed_password,
        name=data.get("name"),
        role=role,
        empresa_id=empresa_id
    )
    db.add(usuario)
    db.commit()
    return {"id": usuario.id, "email": usuario.email, "name": usuario.name, "role": usuario.role.value}

@router.put("/{usuario_id}")
def update_usuario(
    usuario_id: str,
    data: dict,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    usuario = db.query(models.User).filter(
        models.User.id == usuario_id,
        models.User.empresa_id == empresa_id
    ).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if "name" in data:
        usuario.name = data["name"]
    if "role" in data:
        usuario.role = models.Role[data["role"]]
    if "password" in data and data["password"]:
        usuario.password = pwd_context.hash(data["password"])
    
    db.commit()
    return {"id": usuario.id, "email": usuario.email, "name": usuario.name, "role": usuario.role.value}

@router.delete("/{usuario_id}")
def delete_usuario(
    usuario_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    usuario = db.query(models.User).filter(
        models.User.id == usuario_id,
        models.User.empresa_id == empresa_id
    ).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(usuario)
    db.commit()
    return {"message": "Usuario eliminado"}
