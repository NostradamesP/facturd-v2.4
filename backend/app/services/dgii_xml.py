from datetime import datetime
from typing import Optional
from lxml import etree

NS = "http://www.dgii.gov.do/eCF"
NSMAP = {None: NS}
SCHEMA_LOCATION = "http://www.dgii.gov.do/eCF eCF-v1.0.xsd"


def _fmt(valor, decimals=2):
    if valor is None:
        return "0.00"
    return f"{float(valor):.{decimals}f}"


def _hora_emision(dt: Optional[datetime]) -> str:
    if dt:
        return dt.strftime("%H:%M:%S")
    return datetime.now().strftime("%H:%M:%S")


def _fecha_emision(dt: Optional[datetime]) -> str:
    if dt:
        return dt.strftime("%Y-%m-%d")
    return datetime.now().strftime("%Y-%m-%d")


def _monto_en_letras(monto: float) -> str:
    entero = int(monto)
    decimales = int(round((monto - entero) * 100))

    if entero == 0:
        letras = "CERO"
    else:
        letras = _numero_a_letras(entero)

    return f"{letras} CON {decimales:02d}/100 PESOS DOMINICANOS"


def _numero_a_letras(n: int) -> str:
    unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"]
    decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]
    especiales = {11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
                  16: "DIECISÉIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE"}
    centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
                "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"]

    if n == 0:
        return "CERO"
    if n == 100:
        return "CIEN"

    partes = []

    miles = n // 1000
    resto = n % 1000

    if miles > 0:
        if miles == 1:
            partes.append("MIL")
        else:
            partes.append(_numero_a_letras(miles))
            partes.append("MIL")

    if resto > 0:
        c = resto // 100
        d = (resto % 100) // 10
        u = resto % 10

        if c > 0:
            if c == 1 and resto % 100 == 0:
                partes.append("CIEN")
                return " ".join(partes)
            partes.append(centenas[c])

        if d == 0 and u > 0:
            partes.append(unidades[u])
        elif d == 1:
            if u == 0:
                partes.append("DIEZ")
            else:
                partes.append(especiales.get(10 + u, ""))
        elif d == 2 and u > 0:
            veinti_prefijos = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"]
            partes.append(f"VEINTI{veinti_prefijos[u]}")
        elif d > 1:
            partes.append(decenas[d])
            if u > 0:
                partes.append(f"Y {unidades[u]}")

    return " ".join(partes).strip()


def generar_eCF_xml(
    ncf: str,
    tipo_ncf: str,
    rnc_emisor: str,
    razon_social_emisor: str,
    rnc_receptor: str,
    razon_social_receptor: str,
    fecha: Optional[datetime],
    subtotal: float,
    itbis: float,
    total: float,
    descuento: float,
    detalles: list[dict],
    regimen_pago: str = "ORDINARIO",
    nota: Optional[str] = None,
) -> str:
    root = etree.Element(f"{{{NS}}}eCF", nsmap=NSMAP)

    encabezado = etree.SubElement(root, f"{{{NS}}}Encabezado")

    _add_text(encabezado, "Version", "1.0")
    _add_text(encabezado, "RNCEmisor", rnc_emisor)
    _add_text(encabezado, "RazonSocialEmisor", razon_social_emisor)
    _add_text(encabezado, "RNCRceptor", rnc_receptor)
    _add_text(encabezado, "RazonSocialReceptor", razon_social_receptor)
    _add_text(encabezado, "NumeroComprobanteFiscal", ncf)
    _add_text(encabezado, "TipoNCF", tipo_ncf)
    _add_text(encabezado, "FechaEmision", _fecha_emision(fecha))
    _add_text(encabezado, "HoraEmision", _hora_emision(fecha))
    _add_text(encabezado, "RegimenPago", regimen_pago)

    itbis_18 = sum(d.get("itbis", 0) for d in detalles)
    itbis_0 = 0.0
    itbis_exento = 0.0

    _add_text(encabezado, "TotalITBIS", _fmt(itbis))
    _add_text(encabezado, "TotalITBIS18", _fmt(itbis_18))
    _add_text(encabezado, "TotalITBIS0", _fmt(itbis_0))
    _add_text(encabezado, "TotalITBISExento", _fmt(itbis_exento))
    _add_text(encabezado, "TotalAntesDescuento", _fmt(subtotal))
    _add_text(encabezado, "DescuentoTotal", _fmt(descuento))
    _add_text(encabezado, "MontoTotal", _fmt(total))
    _add_text(encabezado, "MontoTotalLetras", _monto_en_letras(total))
    _add_text(encabezado, "Moneda", "DOP")
    _add_text(encabezado, "TipoCambio", "1.00")

    detalles_node = etree.SubElement(root, f"{{{NS}}}Detalles")
    for d in detalles:
        det = etree.SubElement(detalles_node, f"{{{NS}}}Detalle")
        _add_text(det, "Descripcion", d.get("descripcion", ""))
        _add_text(det, "Cantidad", _fmt(d.get("cantidad", 1), 4))
        _add_text(det, "PrecioUnitario", _fmt(d.get("precio_unitario", 0)))
        _add_text(det, "Monto", _fmt(d.get("total", 0)))
        _add_text(det, "ITBIS", _fmt(d.get("itbis", 0)))

        tasa_itbis = _determinar_tasa_itbis(d)
        _add_text(det, "TasaITBIS", tasa_itbis)

    if nota:
        info_adicional = etree.SubElement(root, f"{{{NS}}}InformacionAdicional")
        _add_text(info_adicional, "Nota", nota)

    xml_str = etree.tostring(
        root,
        pretty_print=True,
        xml_declaration=True,
        encoding="UTF-8",
        standalone=True,
    ).decode("utf-8")

    return xml_str


def _determinar_tasa_itbis(detalle: dict) -> str:
    itbis_val = float(detalle.get("itbis", 0))
    total = float(detalle.get("total", 0))
    base = float(detalle.get("cantidad", 1)) * float(detalle.get("precio_unitario", 0))

    if base == 0:
        return "0.00"

    tasa = (itbis_val / base) * 100
    if tasa >= 17.5:
        return "18.00"
    elif tasa >= 12.5:
        return "13.00"
    elif tasa > 0:
        return "0.00"
    else:
        return "0.00"


def _add_text(parent, tag, value):
    el = etree.SubElement(parent, f"{{{NS}}}{tag}")
    el.text = str(value) if value is not None else ""
    return el


def validar_xsd(xml_str: str, xsd_path: Optional[str] = None) -> tuple[bool, Optional[str]]:
    if not xsd_path:
        return True, None
    try:
        xsd_doc = etree.parse(xsd_path)
        xsd_schema = etree.XMLSchema(xsd_doc)
        xml_doc = etree.fromstring(xml_str.encode("utf-8"))
        xsd_schema.assertValid(xml_doc)
        return True, None
    except etree.DocumentInvalid as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)
