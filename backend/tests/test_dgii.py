import pytest
from datetime import datetime
from lxml import etree

from app.services.dgii_xml import generar_eCF_xml, _monto_en_letras, _numero_a_letras
from app.services.dgii_client import (
    enviar_eCF, consultar_estado, validar_rnc, configure, _validar_formato_rnc
)
from app.utils import validar_rnc_formato


class TestGenerarECFXML:
    def test_genera_xml_valido(self):
        xml = generar_eCF_xml(
            ncf="E410000000001",
            tipo_ncf="E41",
            rnc_emisor="101234567",
            razon_social_emisor="Mi Empresa SRL",
            rnc_receptor="987654321",
            razon_social_receptor="Cliente XYZ",
            fecha=datetime(2026, 5, 11),
            subtotal=1000.0,
            itbis=180.0,
            total=1180.0,
            descuento=0.0,
            detalles=[
                {
                    "descripcion": "Producto A",
                    "cantidad": 2,
                    "precio_unitario": 500.0,
                    "itbis": 180.0,
                    "total": 1180.0,
                }
            ],
        )

        root = etree.fromstring(xml.encode("utf-8"))
        ns = "{http://www.dgii.gov.do/eCF}"

        encabezado = root.find(f"{ns}Encabezado")
        assert encabezado is not None

        assert encabezado.find(f"{ns}NumeroComprobanteFiscal") is not None
        assert encabezado.find(f"{ns}NumeroComprobanteFiscal").text == "E410000000001"
        assert encabezado.find(f"{ns}RNCEmisor").text == "101234567"
        assert encabezado.find(f"{ns}RNCRceptor").text == "987654321"
        assert encabezado.find(f"{ns}RazonSocialEmisor").text == "Mi Empresa SRL"
        assert encabezado.find(f"{ns}RazonSocialReceptor").text == "Cliente XYZ"
        assert encabezado.find(f"{ns}FechaEmision").text == "2026-05-11"
        assert encabezado.find(f"{ns}TotalITBIS").text == "180.00"
        assert encabezado.find(f"{ns}MontoTotal").text == "1180.00"
        assert encabezado.find(f"{ns}TipoNCF").text == "E41"
        assert encabezado.find(f"{ns}Moneda").text == "DOP"

    def test_incluye_detalles(self):
        xml = generar_eCF_xml(
            ncf="E310000000002",
            tipo_ncf="E31",
            rnc_emisor="101234567",
            razon_social_emisor="Empresa",
            rnc_receptor="987654321",
            razon_social_receptor="Cliente",
            fecha=datetime(2026, 5, 11),
            subtotal=2000.0,
            itbis=360.0,
            total=2360.0,
            descuento=0.0,
            detalles=[
                {"descripcion": "Item 1", "cantidad": 1, "precio_unitario": 1000.0, "itbis": 180.0, "total": 1180.0},
                {"descripcion": "Item 2", "cantidad": 1, "precio_unitario": 1000.0, "itbis": 180.0, "total": 1180.0},
            ],
        )

        root = etree.fromstring(xml.encode("utf-8"))
        ns = "{http://www.dgii.gov.do/eCF}"

        detalles = root.find(f"{ns}Detalles")
        assert detalles is not None

        hijos = list(detalles)
        assert len(hijos) == 2

        primer = hijos[0]
        assert primer.find(f"{ns}Descripcion").text == "Item 1"
        assert primer.find(f"{ns}Cantidad").text == "1.0000"
        assert primer.find(f"{ns}PrecioUnitario").text == "1000.00"
        assert primer.find(f"{ns}TasaITBIS").text == "18.00"

    def test_monto_en_letras(self):
        assert "CERO" in _monto_en_letras(0)
        assert "UN" in _monto_en_letras(1)
        assert "CIEN" in _monto_en_letras(100)
        assert "MIL" in _monto_en_letras(1000)
        assert "MIL" in _monto_en_letras(1234)
        assert "PESOS DOMINICANOS" in _monto_en_letras(1234)
        assert "DOS MIL" in _monto_en_letras(2000)
        assert "DIEZ MIL" in _monto_en_letras(10000)
        assert "CIEN MIL" in _monto_en_letras(100000)

    def test_numero_a_letras(self):
        assert _numero_a_letras(0) == "CERO"
        assert _numero_a_letras(1) == "UN"
        assert _numero_a_letras(10) == "DIEZ"
        assert _numero_a_letras(15) == "QUINCE"
        assert _numero_a_letras(21) == "VEINTIUN"
        assert _numero_a_letras(30) == "TREINTA"
        assert _numero_a_letras(99) == "NOVENTA Y NUEVE"
        assert _numero_a_letras(100) == "CIEN"
        assert _numero_a_letras(101) == "CIENTO UN"
        assert _numero_a_letras(500) == "QUINIENTOS"

    def test_con_descuento(self):
        xml = generar_eCF_xml(
            ncf="B010000000003",
            tipo_ncf="B01",
            rnc_emisor="101234567",
            razon_social_emisor="Empresa",
            rnc_receptor="987654321",
            razon_social_receptor="Cliente",
            fecha=None,
            subtotal=1000.0,
            itbis=180.0,
            total=1080.0,
            descuento=100.0,
            detalles=[
                {"descripcion": "Producto", "cantidad": 1, "precio_unitario": 1000.0, "itbis": 180.0, "total": 1080.0},
            ],
        )

        root = etree.fromstring(xml.encode("utf-8"))
        ns = "{http://www.dgii.gov.do/eCF}"
        encabezado = root.find(f"{ns}Encabezado")
        assert encabezado.find(f"{ns}DescuentoTotal").text == "100.00"
        assert encabezado.find(f"{ns}MontoTotal").text == "1080.00"

    def test_con_nota(self):
        xml = generar_eCF_xml(
            ncf="E440000000004",
            tipo_ncf="E44",
            rnc_emisor="101234567",
            razon_social_emisor="Empresa",
            rnc_receptor="987654321",
            razon_social_receptor="Cliente",
            fecha=datetime(2026, 5, 11),
            subtotal=500.0,
            itbis=0.0,
            total=500.0,
            descuento=0.0,
            detalles=[
                {"descripcion": "Exento", "cantidad": 1, "precio_unitario": 500.0, "itbis": 0.0, "total": 500.0},
            ],
            nota="Factura exenta de ITBIS",
        )

        root = etree.fromstring(xml.encode("utf-8"))
        ns = "{http://www.dgii.gov.do/eCF}"
        info = root.find(f"{ns}InformacionAdicional")
        assert info is not None
        assert info.find(f"{ns}Nota").text == "Factura exenta de ITBIS"


class TestDGIIClient:
    def test_enviar_eCF_mock(self):
        configure(mock=True)
        result = enviar_eCF("<eCF>test</eCF>")
        assert "track_id" in result
        assert result["track_id"].startswith("T")
        assert result["estado"] == "RECIBIDO"

    def test_consultar_estado_mock(self):
        configure(mock=True)
        result = consultar_estado("T12345678901234")
        assert result["estado"] == "ACEPTADO"
        assert result["track_id"] == "T12345678901234"

    def test_validar_rnc_valido(self):
        configure(mock=True)
        result = validar_rnc("101234565")
        assert result["valido"] is True
        assert result["estatus"] == "ACTIVO"

    def test_validar_rnc_invalido(self):
        configure(mock=True)
        result = validar_rnc("123")
        assert result["valido"] is False
        assert result["estatus"] == "NO_ENCONTRADO"

    def test_validar_formato_rnc(self):
        assert _validar_formato_rnc("101234565") is True


class TestRNCValidation:
    def test_rnc_valido(self):
        assert validar_rnc_formato("101234565") is True

    def test_rnc_invalido_digito(self):
        assert validar_rnc_formato("101234566") is False

    def test_rnc_muy_corto(self):
        assert validar_rnc_formato("12345") is False

    def test_rnc_con_guiones(self):
        assert validar_rnc_formato("131-869943-0") is False

    def test_rnc_vacio(self):
        assert validar_rnc_formato("") is False

    def test_rnc_letras(self):
        assert validar_rnc_formato("ABCDEFGHI") is False
