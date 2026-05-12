import pytest


def _create_client(auth_client, rnc=None):
    data = {
        "rnc": rnc if rnc is not None else "987654321",
        "nombre": "Cliente Test",
        "tipo": "PERSONA_JURIDICA",
        "direccion": "Calle Test 123",
    }
    resp = auth_client.post("/api/clientes", json=data)
    assert resp.status_code == 200, f"Error creando cliente: {resp.text}"
    return resp.json()


def _create_product(auth_client, **kwargs):
    data = {
        "codigo": f"PROD-{kwargs.get('codigo', '001')}",
        "nombre": kwargs.get("nombre", "Producto Test"),
        "precio_unitario": kwargs.get("precio", 1000.0),
        "stock": kwargs.get("stock", 100),
        "aplica_itbis": kwargs.get("aplica_itbis", True),
    }
    resp = auth_client.post("/api/productos", json=data)
    assert resp.status_code == 200, f"Error creando producto: {resp.text}"
    return resp.json()


class TestInvoiceFlow:
    def test_create_invoice_full(self, auth_client):
        cliente = _create_client(auth_client)
        producto = _create_product(auth_client)

        data = {
            "cliente_id": cliente["id"],
            "tipo_ncf": "E41",
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": producto["nombre"],
                    "cantidad": 2,
                    "precio_unitario": 1000.0,
                    "descuento": 0,
                    "itbis": 360.0,
                    "total": 2360.0,
                }
            ],
            "descuento": 0,
        }
        resp = auth_client.post("/api/facturas", json=data)
        assert resp.status_code == 200, f"Error creando factura: {resp.text}"
        factura = resp.json()
        assert factura["ncf"].startswith("E41")
        assert factura["subtotal"] == 2000.0
        assert factura["itbis"] == 360.0
        assert factura["total"] == 2360.0
        assert factura["estado"] == "PENDIENTE"
        assert len(factura["detalles"]) == 1

    def test_get_invoice(self, auth_client):
        cliente = _create_client(auth_client)
        producto = _create_product(auth_client)
        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": producto["nombre"],
                    "cantidad": 1,
                    "precio_unitario": 500.0,
                    "itbis": 90.0,
                    "total": 590.0,
                }
            ],
        }
        created = auth_client.post("/api/facturas", json=data).json()

        resp = auth_client.get(f"/api/facturas/{created['id']}")
        assert resp.status_code == 200
        factura = resp.json()
        assert factura["id"] == created["id"]
        assert factura["ncf"] == created["ncf"]
        assert len(factura["detalles"]) == 1

    def test_list_invoices(self, auth_client):
        cliente = _create_client(auth_client)
        producto = _create_product(auth_client)
        for i in range(3):
            data = {
                "cliente_id": cliente["id"],
                "detalles": [
                    {
                        "producto_id": producto["id"],
                        "descripcion": producto["nombre"],
                        "cantidad": 1,
                        "precio_unitario": 100.0 * (i + 1),
                        "itbis": 18.0 * (i + 1),
                        "total": 118.0 * (i + 1),
                    }
                ],
            }
            auth_client.post("/api/facturas", json=data)

        resp = auth_client.get("/api/facturas")
        assert resp.status_code == 200
        facturas = resp.json() if isinstance(resp.json(), list) else resp.json()["items"]
        assert len(facturas) >= 3

    def test_update_invoice_status(self, auth_client):
        cliente = _create_client(auth_client)
        producto = _create_product(auth_client)
        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": producto["nombre"],
                    "cantidad": 1,
                    "precio_unitario": 1000.0,
                    "itbis": 180.0,
                    "total": 1180.0,
                }
            ],
        }
        created = auth_client.post("/api/facturas", json=data).json()

        resp = auth_client.put(f"/api/facturas/{created['id']}", json={"estado": "ANULADA"})
        assert resp.status_code == 200
        assert resp.json()["estado"] == "ANULADA"

    def test_delete_pending_invoice(self, auth_client):
        cliente = _create_client(auth_client)
        producto = _create_product(auth_client)
        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": producto["nombre"],
                    "cantidad": 1,
                    "precio_unitario": 500.0,
                    "itbis": 90.0,
                    "total": 590.0,
                }
            ],
        }
        created = auth_client.post("/api/facturas", json=data).json()

        resp = auth_client.delete(f"/api/facturas/{created['id']}")
        assert resp.status_code == 200

        resp = auth_client.get(f"/api/facturas/{created['id']}")
        assert resp.status_code == 404

    def test_create_invoice_with_discount(self, auth_client):
        cliente = _create_client(auth_client)
        producto = _create_product(auth_client)
        data = {
            "cliente_id": cliente["id"],
            "descuento_porcentaje": 10,
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": producto["nombre"],
                    "cantidad": 5,
                    "precio_unitario": 1000.0,
                    "descuento": 0,
                    "itbis": 900.0,
                    "total": 5900.0,
                }
            ],
        }
        resp = auth_client.post("/api/facturas", json=data)
        assert resp.status_code == 200
        factura = resp.json()
        assert factura["subtotal"] == 5000.0
        assert factura["descuento"] == 500.0
        assert factura["itbis"] == 900.0
        assert factura["total"] == 5400.0


class TestITBISIntegration:
    def test_itbis_18_percent(self, auth_client):
        cliente = _create_client(auth_client)
        producto = _create_product(auth_client, nombre="Producto ITBIS 18%")
        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": producto["nombre"],
                    "cantidad": 10,
                    "precio_unitario": 100.0,
                    "descuento": 0,
                    "itbis": 180.0,
                    "total": 1180.0,
                }
            ],
        }
        resp = auth_client.post("/api/facturas", json=data)
        assert resp.status_code == 200
        factura = resp.json()
        assert factura["itbis"] == 180.0
        assert factura["subtotal"] == 1000.0
        assert factura["total"] == 1180.0

    def test_itbis_exento(self, auth_client):
        cliente = _create_client(auth_client)
        producto = _create_product(auth_client, nombre="Producto Exento", aplica_itbis=False)
        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": producto["nombre"],
                    "cantidad": 5,
                    "precio_unitario": 200.0,
                    "descuento": 0,
                    "itbis": 0,
                    "total": 1000.0,
                }
            ],
        }
        resp = auth_client.post("/api/facturas", json=data)
        assert resp.status_code == 200
        factura = resp.json()
        assert factura["itbis"] == 0.0
        assert factura["subtotal"] == 1000.0
        assert factura["total"] == 1000.0

    def test_mixed_itbis_rates(self, auth_client):
        cliente = _create_client(auth_client)
        prod_con_itbis = _create_product(auth_client, codigo="CON", nombre="Con ITBIS")
        prod_sin_itbis = _create_product(auth_client, codigo="SIN", nombre="Sin ITBIS", aplica_itbis=False)

        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": prod_con_itbis["id"],
                    "descripcion": prod_con_itbis["nombre"],
                    "cantidad": 2,
                    "precio_unitario": 1000.0,
                    "descuento": 0,
                    "itbis": 360.0,
                    "total": 2360.0,
                },
                {
                    "producto_id": prod_sin_itbis["id"],
                    "descripcion": prod_sin_itbis["nombre"],
                    "cantidad": 3,
                    "precio_unitario": 500.0,
                    "descuento": 0,
                    "itbis": 0,
                    "total": 1500.0,
                },
            ],
        }
        resp = auth_client.post("/api/facturas", json=data)
        assert resp.status_code == 200
        factura = resp.json()
        assert factura["subtotal"] == 3500.0
        assert factura["itbis"] == 360.0
        assert factura["total"] == 3860.0


class TestNCFSequence:
    def test_ncf_format(self, auth_client):
        cliente = _create_client(auth_client)
        producto = _create_product(auth_client)
        data = {
            "cliente_id": cliente["id"],
            "tipo_ncf": "E41",
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": producto["nombre"],
                    "cantidad": 1,
                    "precio_unitario": 100.0,
                    "itbis": 18.0,
                    "total": 118.0,
                }
            ],
        }
        resp = auth_client.post("/api/facturas", json=data)
        assert resp.status_code == 200
        ncf = resp.json()["ncf"]
        assert ncf.startswith("E41")
        assert len(ncf) == 13  # E41 + 10 digits

    def test_ncf_types(self, auth_client):
        cliente = _create_client(auth_client)
        producto = _create_product(auth_client)
        for tipo in ("E31", "E41", "E43", "E44", "B01", "B02"):
            data = {
                "cliente_id": cliente["id"],
                "tipo_ncf": tipo,
                "detalles": [
                    {
                        "producto_id": producto["id"],
                        "descripcion": "Test",
                        "cantidad": 1,
                        "precio_unitario": 100.0,
                        "itbis": 18.0,
                        "total": 118.0,
                    }
                ],
            }
            resp = auth_client.post("/api/facturas", json=data)
            assert resp.status_code == 200, f"Error creando factura {tipo}: {resp.text}"
            ncf = resp.json()["ncf"]
            assert ncf.startswith(tipo), f"NCF {ncf} no empieza con {tipo}"
            assert len(ncf) == 13

    def test_ncf_secuencial(self, auth_client):
        cliente = _create_client(auth_client)
        producto = _create_product(auth_client)
        ncfs = []
        for _ in range(3):
            data = {
                "cliente_id": cliente["id"],
                "tipo_ncf": "E41",
                "detalles": [
                    {
                        "producto_id": producto["id"],
                        "descripcion": "Test",
                        "cantidad": 1,
                        "precio_unitario": 100.0,
                        "itbis": 18.0,
                        "total": 118.0,
                    }
                ],
            }
            resp = auth_client.post("/api/facturas", json=data)
            assert resp.status_code == 200
            ncfs.append(resp.json()["ncf"])

        assert len(set(ncfs)) == 3
        secuencias = [int(n[3:]) for n in ncfs]
        assert secuencias == sorted(secuencias)
        assert secuencias[1] - secuencias[0] == 1
        assert secuencias[2] - secuencias[1] == 1


class TestDGIIFlow:
    def test_send_invoice_to_dgii(self, auth_client):
        cliente = _create_client(auth_client, rnc="101234565")
        producto = _create_product(auth_client)
        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": producto["nombre"],
                    "cantidad": 1,
                    "precio_unitario": 1000.0,
                    "itbis": 180.0,
                    "total": 1180.0,
                }
            ],
        }
        factura = auth_client.post("/api/facturas", json=data).json()
        assert factura["estado"] == "PENDIENTE"

        resp = auth_client.post(f"/api/dgii/enviar/{factura['id']}")
        assert resp.status_code == 200, f"Error enviando a DGII: {resp.text}"
        result = resp.json()
        assert result["estado_factura"] == "ENVIADA_DGII"
        assert result["registro_dgii"]["estado"] in ("ENVIADO", "XML_GENERADO")
        assert result["registro_dgii"]["track_id"] is not None
        assert result["registro_dgii"]["xml_original"] is not None
        assert "eCF" in result["registro_dgii"]["xml_original"]

    def test_send_already_sent_fails(self, auth_client):
        cliente = _create_client(auth_client, rnc="101234565")
        producto = _create_product(auth_client)
        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": "Test",
                    "cantidad": 1,
                    "precio_unitario": 500.0,
                    "itbis": 90.0,
                    "total": 590.0,
                }
            ],
        }
        factura = auth_client.post("/api/facturas", json=data).json()
        auth_client.post(f"/api/dgii/enviar/{factura['id']}")

        resp = auth_client.post(f"/api/dgii/enviar/{factura['id']}")
        assert resp.status_code == 400
        assert "ya fue enviada" in resp.json()["detail"].lower()

    def test_send_anulled_fails(self, auth_client):
        cliente = _create_client(auth_client, rnc="101234565")
        producto = _create_product(auth_client)
        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": "Test",
                    "cantidad": 1,
                    "precio_unitario": 500.0,
                    "itbis": 90.0,
                    "total": 590.0,
                }
            ],
        }
        factura = auth_client.post("/api/facturas", json=data).json()
        auth_client.put(f"/api/facturas/{factura['id']}", json={"estado": "ANULADA"})

        resp = auth_client.post(f"/api/dgii/enviar/{factura['id']}")
        assert resp.status_code == 400
        assert "anulada" in resp.json()["detail"].lower()

    def test_send_without_client_rnc_fails(self, auth_client):
        cliente = _create_client(auth_client, rnc="")
        producto = _create_product(auth_client)
        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": "Test",
                    "cantidad": 1,
                    "precio_unitario": 500.0,
                    "itbis": 90.0,
                    "total": 590.0,
                }
            ],
        }
        factura = auth_client.post("/api/facturas", json=data).json()
        resp = auth_client.post(f"/api/dgii/enviar/{factura['id']}")
        assert resp.status_code == 400

    def test_consult_dgii_status(self, auth_client):
        cliente = _create_client(auth_client, rnc="101234565")
        producto = _create_product(auth_client)
        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": "Test",
                    "cantidad": 1,
                    "precio_unitario": 1000.0,
                    "itbis": 180.0,
                    "total": 1180.0,
                }
            ],
        }
        factura = auth_client.post("/api/facturas", json=data).json()
        auth_client.post(f"/api/dgii/enviar/{factura['id']}")

        resp = auth_client.post(f"/api/dgii/consultar/{factura['id']}")
        assert resp.status_code == 200
        result = resp.json()
        assert result["track_id"] is not None
        assert result["estado_dgii"] in ("ACEPTADO", "ENVIADO")

    def test_consult_nonexistent_fails(self, auth_client):
        cliente = _create_client(auth_client, rnc="101234565")
        producto = _create_product(auth_client)
        data = {
            "cliente_id": cliente["id"],
            "detalles": [
                {
                    "producto_id": producto["id"],
                    "descripcion": "Test",
                    "cantidad": 1,
                    "precio_unitario": 500.0,
                    "itbis": 90.0,
                    "total": 590.0,
                }
            ],
        }
        factura = auth_client.post("/api/facturas", json=data).json()

        resp = auth_client.post(f"/api/dgii/consultar/{factura['id']}")
        assert resp.status_code == 404

    def test_dgii_estadisticas(self, auth_client):
        resp = auth_client.get("/api/dgii/estadisticas")
        assert resp.status_code == 200
        stats = resp.json()
        assert "total_registros" in stats
        assert "conteo_estados" in stats

    def test_dgii_config_endpoint(self, auth_client):
        resp = auth_client.get("/api/dgii/config")
        assert resp.status_code == 200
        config = resp.json()
        assert config["mock_mode"] is True
        assert config["version"] == "1.0"
