import math


def test_itbis_18_percent():
    precio = 1000.0
    cantidad = 5
    tasa = 0.18
    subtotal = precio * cantidad
    itbis = subtotal * tasa
    total = subtotal + itbis
    assert subtotal == 5000.0
    assert itbis == 900.0
    assert total == 5900.0


def test_itbis_zero():
    precio = 1000.0
    cantidad = 3
    tasa = 0.0
    subtotal = precio * cantidad
    itbis = subtotal * tasa
    total = subtotal + itbis
    assert subtotal == 3000.0
    assert itbis == 0.0
    assert total == 3000.0


def test_descuento_10_percent():
    subtotal = 5000.0
    itbis = 900.0
    descuento_pct = 10
    descuento = subtotal * (descuento_pct / 100)
    total = subtotal + itbis - descuento
    assert descuento == 500.0
    assert total == 5400.0


def test_descuento_100_percent():
    subtotal = 1000.0
    itbis = 180.0
    descuento_pct = 100
    descuento = subtotal * (descuento_pct / 100)
    total = subtotal + itbis - descuento
    assert descuento == 1000.0
    assert total == 180.0


def test_descuento_exacto():
    subtotal = 2500.0
    itbis = 450.0
    descuento_monto = 250.0
    total = subtotal + itbis - descuento_monto
    assert total == 2700.0
    # Verify ITBIS proportion
    assert math.isclose(itbis / subtotal, 0.18)


def test_grand_total_with_taxes():
    items = [
        {"precio": 100.0, "cant": 2, "itbis": True},
        {"precio": 200.0, "cant": 1, "itbis": True},
        {"precio": 50.0, "cant": 5, "itbis": False},
    ]
    subtotal = 0.0
    itbis_total = 0.0
    for item in items:
        base = item["precio"] * item["cant"]
        subtotal += base
        if item["itbis"]:
            itbis_total += base * 0.18

    descuento_pct = 5
    descuento = subtotal * (descuento_pct / 100)
    total = subtotal + itbis_total - descuento

    assert subtotal == 650.0  # 200 + 200 + 250
    assert itbis_total == 72.0  # 36 + 36 + 0
    assert descuento == 32.5
    assert total == 689.5


def test_itbis_reduced_rate():
    precio = 1000.0
    cantidad = 10
    tasa_reducida = 0.13
    subtotal = precio * cantidad
    itbis = subtotal * tasa_reducida
    total = subtotal + itbis
    assert subtotal == 10000.0
    assert itbis == 1300.0
    assert total == 11300.0
