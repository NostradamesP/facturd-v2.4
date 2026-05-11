from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache
import secrets
import os

RENDER_SUPABASE_URL = "postgresql+psycopg2://fxytqxizerydyfqcpnxz.postgres:FactuRD2026Supabase23@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

class Settings(BaseSettings):
    APP_NAME: str = "FactuRD"
    DATABASE_URL: str = "sqlite:///./facturd.db"
    JWT_SECRET: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000")
    AUTO_CREATE_TABLES: bool = False
    RENDER: Optional[str] = None

    class Config:
        env_file = ".env"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.JWT_SECRET is None:
            import warnings
            warnings.warn("JWT_SECRET no definido en variables de entorno. Generando token temporal (los tokens no persistiran entre reinicios).")
            self.JWT_SECRET = secrets.token_urlsafe(32)
        if self.RENDER and self.DATABASE_URL == "sqlite:///./facturd.db":
            self.DATABASE_URL = RENDER_SUPABASE_URL

@lru_cache()
def get_settings():
    return Settings()
