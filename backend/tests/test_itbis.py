def test_itbis_calculation():
    precio_unitario = 1000
    cantidad = 5
    itbis_tasa = 0.18
    
    # Calculation
    subtotal = precio_unitario * cantidad
    itbis = subtotal * itbis_tasa
    total = subtotal + itbis
    
    assert itbis == 900.0
    assert total == 5900.0

def test_descuento_calculation():
    subtotal = 5000
    itbis = 900
    descuento_porcentaje = 10
    
    descuento = subtotal * (descuento_porcentaje / 100)
    total = subtotal + itbis - descuento
    
    assert descuento == 500.0
    assert total == 5400.0
