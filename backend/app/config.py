from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache
import secrets
import os
import logging

logger = logging.getLogger("facturd")


class Settings(BaseSettings):
    APP_NAME: str = "FactuRD"
    DATABASE_URL: str = "sqlite:///./facturd.db"
    JWT_SECRET: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000")
    AUTO_CREATE_TABLES: bool = True
    RENDER: Optional[str] = None
    DEMO_EMAIL: Optional[str] = None
    DEMO_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.JWT_SECRET is None:
            import warnings
            warnings.warn("JWT_SECRET no definido en variables de entorno. Generando token temporal (los tokens no persistiran entre reinicios).")
            self.JWT_SECRET = secrets.token_urlsafe(32)
        if self.RENDER and self.DATABASE_URL == "sqlite:///./facturd.db":
            supabase_urls = []
            for k, v in os.environ.items():
                if k.startswith("SUPABASE_URL_"):
                    supabase_urls.append(v)

            if not supabase_urls:
                logger.error(
                    "RENDER=true pero no hay SUPABASE_URL_* definidas. "
                    "Define al menos SUPABASE_URL_1 con la URL de conexion a Supabase Pooler."
                )
                return

            from sqlalchemy import create_engine, text
            for url in supabase_urls:
                try:
                    eng = create_engine(url, connect_args={})
                    with eng.connect() as conn:
                        conn.execute(text("SELECT 1"))
                    self.DATABASE_URL = url
                    logger.info("Conectado a Supabase via %s", url.split("@")[1] if "@" in url else url)
                    break
                except Exception:
                    logger.warning("Fallo conexion a %s ...probando siguiente", url.split("@")[1] if "@" in url else url)
                    continue
            else:
                logger.error("Ninguna SUPABASE_URL_* funciono. Usando SQLite como fallback.")


@lru_cache()
def get_settings():
    return Settings()
