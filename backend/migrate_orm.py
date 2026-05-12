import sqlite3
from datetime import datetime
from app.database import SessionLocal as PgSession
from app.models import models

sq = sqlite3.connect("facturd.db")
sq.row_factory = sqlite3.Row

def copy_table(model_cls, table_name):
    rows = sq.execute(f"SELECT * FROM {table_name}").fetchall()
    if not rows:
        print(f"  {table_name}: 0 rows (skip)")
        return 0

    pg = PgSession()
    count = 0
    for row in rows:
        data = dict(row)
        data = {k: v for k, v in data.items() if v is not None}

        model_cols = set(c.name for c in model_cls.__table__.columns)
        for key in list(data.keys()):
            if key not in model_cols:
                del data[key]

        for col in list(data.keys()):
            if isinstance(data[col], str) and data[col].strip() == "":
                if col.endswith("_id") or col in ("nota",):
                    data[col] = None

        for col in model_cls.__table__.columns:
            if col.name not in data and col.name != "detalles":
                data[col.name] = None

        try:
            obj = model_cls(**data)
            pg.add(obj)
            pg.flush()
            count += 1
        except Exception as e:
            print(f"  ERROR {table_name} (id={data.get('id','?')}): {e}")
            pg.rollback()
            pg.close()
            return count
    pg.commit()
    pg.close()
    print(f"  {table_name}: {count}/{len(rows)} inserted")
    return count

MODEL_MAP = [
    (models.Empresa, "empresas"),
    (models.User, "usuarios"),
    (models.Cliente, "clientes"),
    (models.Producto, "productos"),
    (models.Proveedor, "proveedores"),
    (models.PlantillaFactura, "plantillas_factura"),
    (models.Factura, "facturas"),
    (models.DetalleFactura, "detalles_factura"),
    (models.Pago, "pagos"),
    (models.Cotizacion, "cotizaciones"),
    (models.DetalleCotizacion, "detalles_cotizacion"),
    (models.NotaCredito, "notas_credito"),
    (models.NotaDebito, "notas_debito"),
    (models.Kardex, "kardex"),
    (models.RegistroDGII, "registros_dgii"),
    (models.Gasto, "gastos"),
]

print("=== MIGRACION ORM SQLite -> Supabase ===")
print()
for model_cls, table_name in MODEL_MAP:
    copy_table(model_cls, table_name)

sq.close()
print()
print("Migracion completada.")
