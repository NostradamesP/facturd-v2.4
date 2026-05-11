from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import timedelta

from app.database import get_db
from app.models import models
from app.models.schemas import UserCreate, UserLogin, LoginResponse, UserResponse, EmpresaResponse
from app.middleware.auth import create_access_token, get_current_user
from app.config import get_settings
from app.utils import generar_id

router = APIRouter(prefix="/api/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()

@router.post("/register", response_model=LoginResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    empresa = db.query(models.Empresa).filter(models.Empresa.rnc == user_data.empresa_rnc).first()
    if not empresa:
        empresa = models.Empresa(
            id=generar_id(),
            nombre=user_data.empresa_nombre,
            rnc=user_data.empresa_rnc
        )
        db.add(empresa)
        db.commit()
        db.refresh(empresa)
    
    hashed_password = pwd_context.hash(user_data.password)
    user = models.User(
        id=generar_id(),
        email=user_data.email,
        password=hashed_password,
        name=user_data.name,
        role=models.Role.ADMIN,
        empresa_id=empresa.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return LoginResponse(
        token=access_token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, role=user.role.value),
        empresa=EmpresaResponse(id=empresa.id, nombre=empresa.nombre, rnc=empresa.rnc)
    )

@router.post("/login", response_model=LoginResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not pwd_context.verify(login_data.password, user.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    empresa = db.query(models.Empresa).filter(models.Empresa.id == user.empresa_id).first()
    
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return LoginResponse(
        token=access_token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, role=user.role.value),
        empresa=EmpresaResponse(id=empresa.id, nombre=empresa.nombre, rnc=empresa.rnc)
    )

@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    empresa = db.query(models.Empresa).filter(models.Empresa.id == current_user.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return {
        "user": UserResponse(id=current_user.id, email=current_user.email, name=current_user.name, role=current_user.role.value),
        "empresa": EmpresaResponse(id=empresa.id, nombre=empresa.nombre, rnc=empresa.rnc)
    }
