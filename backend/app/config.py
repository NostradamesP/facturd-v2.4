from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache
import secrets
import os

RENDER_SUPABASE_URLS = [
    "postgresql+psycopg2://postgres.fxytqxizerydyfqcpnxz:Nostradame07.@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
    "postgresql+psycopg2://postgres.fxytqxizerydyfqcpnxz:Nostradame07.@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require",
    "postgresql+psycopg2://postgres:Nostradame07.@db.fxytqxizerydyfqcpnxz.supabase.co:5432/postgres?sslmode=require",
    "postgresql+psycopg2://postgres.fxytqxizerydyfqcpnxz:Nostradame07.@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
    "postgresql+psycopg2://postgres.fxytqxizerydyfqcpnxz:Nostradame07.@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require",
]

class Settings(BaseSettings):
    APP_NAME: str = "FactuRD"
    DATABASE_URL: str = "sqlite:///./facturd.db"
    JWT_SECRET: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000")
    AUTO_CREATE_TABLES: bool = True
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
            from sqlalchemy import create_engine, text
            for url in RENDER_SUPABASE_URLS:
                try:
                    eng = create_engine(url, connect_args={})
                    with eng.connect() as conn:
                        conn.execute(text("SELECT 1"))
                    self.DATABASE_URL = url
                    break
                except Exception:
                    continue

@lru_cache()
def get_settings():
    return Settings()
