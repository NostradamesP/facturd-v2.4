from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import secrets
import logging

logger = logging.getLogger("facturd")

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    APP_NAME: str = "FactuRD"
    DATABASE_URL: str = "sqlite:///./facturd.db"
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"
    AUTO_CREATE_TABLES: bool = False
    RENDER: bool = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.JWT_SECRET:
            self.JWT_SECRET = secrets.token_urlsafe(32)
            logger.warning("No JWT_SECRET set in environment. Using random secret — tokens will be invalidated on restart!")

@lru_cache()
def get_settings():
    return Settings()
