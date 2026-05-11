import uuid
from datetime import datetime
from fastapi import HTTPException


def generar_id() -> str:
    return uuid.uuid4().hex[:24]


def normalizar_enum(enum_cls, value, default):
    if value is None:
        return default
    key = str(value).upper()
    if key in ("CANCELADA", "CANCELADO") and hasattr(enum_cls, "__members__"):
        if "ANULADA" in enum_cls.__members__:
            key = "ANULADA"
    if hasattr(enum_cls, "__members__") and key in enum_cls.__members__:
        return enum_cls[key]
    raise HTTPException(status_code=400, detail=f"Valor invalido: {value}")


def parse_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Fecha invalida: {value}")


def parse_float(value, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"Numero invalido: {value}")
