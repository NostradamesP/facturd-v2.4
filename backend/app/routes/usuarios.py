from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.models.schemas import UserResponse, UsuarioCreate, UsuarioUpdate
from app.middleware.auth import get_current_empresa, get_current_user
from app.utils import pwd_context, generar_id

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])

@router.get("/")
def get_usuarios(
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    usuarios = db.query(models.User).filter(models.User.empresa_id == empresa_id).all()
    return [{"id": u.id, "email": u.email, "name": u.name, "role": u.role.value, "created_at": u.created_at} for u in usuarios]

@router.get("/me")
def get_current_user_info(
    current_user: models.User = Depends(get_current_user)
):
    return UserResponse(id=current_user.id, email=current_user.email, name=current_user.name, role=current_user.role.value)

@router.post("/", status_code=201)
def create_usuario(
    data: UsuarioCreate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    existing = db.query(models.User).filter(models.User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    hashed_password = pwd_context.hash(data.password)
    role_str = data.role or "VENDEDOR"
    role = models.Role[role_str] if role_str in models.Role.__members__ else models.Role.VENDEDOR
    usuario = models.User(
        id=generar_id(),
        email=data.email,
        password=hashed_password,
        name=data.name,
        role=role,
        empresa_id=empresa_id
    )
    db.add(usuario)
    db.commit()
    return {"id": usuario.id, "email": usuario.email, "name": usuario.name, "role": usuario.role.value}

@router.put("/{usuario_id}")
def update_usuario(
    usuario_id: str,
    data: UsuarioUpdate,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db)
):
    usuario = db.query(models.User).filter(
        models.User.id == usuario_id,
        models.User.empresa_id == empresa_id
    ).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["password"] = pwd_context.hash(update_data["password"])
    if "role" in update_data:
        update_data["role"] = models.Role[update_data["role"]]
    
    for key, value in update_data.items():
        setattr(usuario, key, value)
    
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
