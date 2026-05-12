import logging
import random
import string
from datetime import datetime
from typing import Optional

logger = logging.getLogger("facturd.dgii_client")

DGII_API_BASE_URL: Optional[str] = None
DGII_API_TOKEN: Optional[str] = None
MOCK_MODE: bool = True


def configure(endpoint: Optional[str] = None, token: Optional[str] = None, mock: bool = True):
    global DGII_API_BASE_URL, DGII_API_TOKEN, MOCK_MODE
    if endpoint:
        DGII_API_BASE_URL = endpoint.rstrip("/")
    if token:
        DGII_API_TOKEN = token
    MOCK_MODE = mock


def _generar_track_id() -> str:
    return "T" + "".join(random.choices(string.digits, k=14))


def enviar_eCF(xml_firmado: str) -> dict:
    if MOCK_MODE:
        track_id = _generar_track_id()
        logger.info("DGII MOCK: enviar_eCF OK -> track_id=%s", track_id)
        return {
            "track_id": track_id,
            "estado": "RECIBIDO",
            "mensaje": "Comprobante recibido correctamente por la DGII",
            "fecha_recepcion": datetime.utcnow().isoformat(),
        }

    if not DGII_API_BASE_URL:
        raise RuntimeError("DGII API base URL not configured. Set DGII_API_URL env var or enable MOCK_MODE=True")

    logger.info("DGII REAL: enviando eCF a %s", DGII_API_BASE_URL)
    import requests

    headers = {"Content-Type": "application/xml"}
    if DGII_API_TOKEN:
        headers["Authorization"] = f"Bearer {DGII_API_TOKEN}"

    try:
        resp = requests.post(
            f"{DGII_API_BASE_URL}/Recepcion",
            data=xml_firmado.encode("utf-8"),
            headers=headers,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.error("DGII API error: %s", e)
        return {
            "track_id": None,
            "estado": "ERROR",
            "mensaje": f"Error de comunicacion con DGII: {str(e)}",
            "fecha_recepcion": datetime.utcnow().isoformat(),
        }


def consultar_estado(track_id: str) -> dict:
    if MOCK_MODE:
        logger.info("DGII MOCK: consultar_estado track_id=%s", track_id)
        return {
            "track_id": track_id,
            "estado": "ACEPTADO",
            "mensaje": "Comprobante aceptado por la DGII",
            "fecha_consulta": datetime.utcnow().isoformat(),
            "detalles": None,
        }

    if not DGII_API_BASE_URL:
        raise RuntimeError("DGII API base URL not configured")

    import requests

    headers = {}
    if DGII_API_TOKEN:
        headers["Authorization"] = f"Bearer {DGII_API_TOKEN}"

    try:
        resp = requests.get(
            f"{DGII_API_BASE_URL}/Consulta/{track_id}",
            headers=headers,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.error("DGII consulta error: %s", e)
        return {
            "track_id": track_id,
            "estado": "ERROR",
            "mensaje": f"Error de consulta DGII: {str(e)}",
        }


def validar_rnc(rnc: str) -> dict:
    if MOCK_MODE:
        valido = _validar_formato_rnc(rnc)
        logger.info("DGII MOCK: validar_rnc %s -> valido=%s", rnc, valido)
        if valido:
            return {
                "rnc": rnc,
                "valido": True,
                "razon_social": f"Contribuyente RNC {rnc}",
                "estatus": "ACTIVO",
                "categoria": "PERSONA_JURIDICA",
            }
        else:
            return {
                "rnc": rnc,
                "valido": False,
                "razon_social": None,
                "estatus": "NO_ENCONTRADO",
                "categoria": None,
            }

    if not DGII_API_BASE_URL:
        raise RuntimeError("DGII API base URL not configured")

    import requests

    try:
        resp = requests.get(
            f"{DGII_API_BASE_URL}/ValidarRNC/{rnc}",
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.error("DGII RNC validation error: %s", e)
        return {"rnc": rnc, "valido": False, "razon_social": None, "estatus": "ERROR_CONSULTA", "categoria": None}


def _validar_formato_rnc(rnc: str) -> bool:
    rnc = rnc.strip().replace("-", "")
    if not rnc.isdigit() or len(rnc) != 9:
        return False
    pesos = [7, 9, 8, 6, 5, 4, 3, 2]
    suma = sum(int(rnc[i]) * pesos[i] for i in range(8))
    digito_esperado = (10 - (suma % 10)) % 10
    return digito_esperado == int(rnc[8])
