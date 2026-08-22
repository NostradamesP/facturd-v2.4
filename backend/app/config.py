from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    APP_NAME: str = "FactuRD"
    DATABASE_URL: str = "sqlite:///./facturd.db"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"
    RATE_LIMIT_WINDOW: int = 60
    RATE_LIMIT_MAX: int = 30
    AUTO_CREATE_TABLES: bool = False
    RENDER: bool = False

@lru_cache()
def get_settings():
    return Settings()
