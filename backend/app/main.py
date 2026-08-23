import logging
import os
import time
from collections import defaultdict
from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.config import get_settings
from app.routes import auth, clientes, productos, proveedores, cotizaciones, plantillas, facturas, pagos, empresa, pdf, dgii, usuarios, gastos
from app.services.dgii_client import configure as dgii_configure

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("facturd")

settings = get_settings()

if settings.AUTO_CREATE_TABLES or settings.DATABASE_URL.startswith("sqlite"):
    Base.metadata.create_all(bind=engine)


_estado_arranque: dict = {"migraciones": "no ejecutado", "seed": "no ejecutado", "gestionada": None}


def _es_base_gestionada() -> bool:
    return bool(settings.RENDER or "supabase" in settings.DATABASE_URL)


def _aplicar_migraciones() -> None:
    try:
        base_dir = Path(__file__).resolve().parents[1]
        alembic_cfg = AlembicConfig(str(base_dir / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(base_dir / "alembic"))
        command.upgrade(alembic_cfg, "head")
        _estado_arranque["migraciones"] = "ok"
        logger.info("Migraciones aplicadas (alembic upgrade head)")
    except Exception as e:
        _estado_arranque["migraciones"] = f"error: {e}"
        logger.exception("Error aplicando migraciones al arranque")


def _ejecutar_seed_demo() -> None:
    try:
        from app.scripts.seed_demo import upsert_admin, upsert_demo_data
        upsert_admin()
        upsert_demo_data()
        _estado_arranque["seed"] = "ok"
        logger.info("Seed demo verificado/aplicado")
    except Exception as e:
        _estado_arranque["seed"] = f"error: {e}"
        logger.exception("Error ejecutando seed demo al arranque")

dgii_configure(
    endpoint=os.getenv("DGII_API_URL"),
    token=os.getenv("DGII_API_TOKEN"),
    mock=os.getenv("DGII_MOCK_MODE", "true").lower() in ("true", "1", "yes"),
)

app = FastAPI(
    title="FactuRD API",
    description="Sistema de Facturación Electrónica DGII - República Dominicana",
    version="1.0.0",
)

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def cookie_to_auth_header(request: Request, call_next):
    has_auth = any(k.lower() == b"authorization" for k, _ in request.scope.get("headers", []))
    if not has_auth:
        token = request.cookies.get("token")
        if token:
            request.scope["headers"].append((b"authorization", f"Bearer {token}".encode()))
    return await call_next(request)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start
    logger.info("%s %s -> %s (%.3fs)", request.method, request.url.path, response.status_code, elapsed)
    return response


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' fonts.googleapis.com; "
        "font-src fonts.gstatic.com; "
        "connect-src 'self'; "
        "img-src 'self' data:; "
        "frame-ancestors 'none'"
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
    )


_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = settings.RATE_LIMIT_WINDOW
RATE_LIMIT_MAX = settings.RATE_LIMIT_MAX


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path in ("/api/auth/login", "/api/auth/register"):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window = RATE_LIMIT_WINDOW
        max_requests = RATE_LIMIT_MAX

        timestamps = _rate_limit_store[client_ip]
        cutoff = now - window
        _rate_limit_store[client_ip] = [t for t in timestamps if t > cutoff]

        if len(_rate_limit_store[client_ip]) >= max_requests:
            logger.warning("Rate limit exceeded for %s", client_ip)
            return JSONResponse(
                status_code=429,
                content={"detail": "Demasiados intentos. Intente de nuevo en 60 segundos."},
            )

        _rate_limit_store[client_ip].append(now)
    return await call_next(request)


app.include_router(auth.router)
app.include_router(clientes.router)
app.include_router(productos.router)
app.include_router(proveedores.router)
app.include_router(cotizaciones.router)
app.include_router(plantillas.router)
app.include_router(facturas.router)
app.include_router(pagos.router)
app.include_router(empresa.router)
app.include_router(pdf.router)
app.include_router(dgii.router)
app.include_router(usuarios.router)
app.include_router(gastos.router)


@app.on_event("startup")
def _arranque_produccion() -> None:
    _estado_arranque["gestionada"] = _es_base_gestionada()
    if _es_base_gestionada():
        _aplicar_migraciones()
        _ejecutar_seed_demo()


@app.get("/api/health")
def health_check():
    url = settings.DATABASE_URL
    host = url.split("@")[-1].split("/")[0] if "@" in url else "local"
    return {
        "status": "ok",
        "message": "FactuRD API running",
        "db_host": host,
        "arranque": _estado_arranque,
    }


@app.get("/api/health/db")
def health_db():
    db = None
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT 1")).scalar()
        return {"status": "ok", "db_connected": True}
    except Exception as e:
        logger.error("Health check DB failed: %s", e)
        return {"status": "error", "db_connected": False}
    finally:
        if db:
            db.close()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
