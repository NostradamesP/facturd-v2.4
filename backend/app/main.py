from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.config import get_settings
from app.routes import auth, clientes, productos, proveedores, cotizaciones, plantillas, facturas, pagos, empresa, pdf, dgii

settings = get_settings()

if settings.AUTO_CREATE_TABLES or settings.DATABASE_URL.startswith("sqlite"):
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FactuRD API",
    description="Sistema de Facturación Electrónica DGII - República Dominicana",
    version="1.0.0"
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000,https://facturd-pruebas.netlify.app").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
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

@app.get("/api/health/db")
def health_db():
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT 1")).scalar()
        db.close()
        return {"status": "ok", "db_connected": True, "result": result}
    except Exception as e:
        return {"status": "error", "db_connected": False, "error": str(e), "error_type": type(e).__name__}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
