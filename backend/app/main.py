import time
import logging
from collections import defaultdict
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os

from app.database import engine, Base
from app.config import get_settings
from app.routes import auth, clientes, productos, proveedores, cotizaciones, plantillas, facturas, pagos, empresa, pdf, dgii

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("facturd")

settings = get_settings()

if settings.AUTO_CREATE_TABLES or settings.DATABASE_URL.startswith("sqlite"):
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FactuRD API",
    description="Sistema de Facturación Electrónica DGII - República Dominicana",
    version="1.0.0"
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

# In-memory rate limiter
rate_limit_store: dict = {}

def check_rate_limit(client_ip: str, max_req: int = 10, window: int = 60) -> bool:
    now = time.time()
    key = f"{client_ip}:auth"
    window_start = now - window
    timestamps = [t for t in rate_limit_store.get(key, []) if t > window_start]
    timestamps.append(now)
    rate_limit_store[key] = timestamps
    return len(timestamps) <= max_req

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start
    logger.info("%s %s %s %.3fs", request.method, request.url.path, response.status_code, elapsed)
    return response

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/auth/login") or request.url.path.startswith("/api/auth/register"):
        client_ip = request.client.host if request.client else "unknown"
        if not check_rate_limit(client_ip):
            return JSONResponse(status_code=429, content={"detail": "Demasiadas solicitudes. Intente de nuevo en 60 segundos."})
    return await call_next(request)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Cache-Control"] = "no-store"
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor"})

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

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "FactuRD API running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
