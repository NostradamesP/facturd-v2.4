import uuid
import re
from datetime import datetime
from typing import Optional
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generar_id() -> str:
    return uuid.uuid4().hex[:24]


def normalizar_enum(valor: str) -> str:
    return "ANULADA" if valor.upper() == "CANCELADA" else valor.upper()


def parse_date(valor: str) -> Optional[datetime]:
    if not valor:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(valor, fmt)
        except ValueError:
            continue
    return None


def parse_float(valor) -> float:
    if valor is None:
        return 0.0
    if isinstance(valor, (int, float)):
        return float(valor)
    valor = re.sub(r"[^0-9.,-]", "", str(valor).replace(",", "."))
    try:
        return float(valor)
    except ValueError:
        return 0.0


def validar_rnc_formato(rnc: str) -> bool:
    rnc = rnc.strip().replace("-", "")
    if not rnc.isdigit() or len(rnc) != 9:
        return False
    pesos = [7, 9, 8, 6, 5, 4, 3, 2]
    suma = sum(int(rnc[i]) * pesos[i] for i in range(8))
    digito_esperado = (10 - (suma % 10)) % 10
    return digito_esperado == int(rnc[8])
