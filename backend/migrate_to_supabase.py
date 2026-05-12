import sqlite3
from sqlalchemy import text
from app.database import engine as pg_engine

sq = sqlite3.connect("facturd.db")
sq.row_factory = sqlite3.Row

TABLE_ORDER = [
    "empresas",
    "usuarios",
    "clientes",
    "productos",
    "proveedores",
    "plantillas_factura",
    "facturas",
    "detalles_factura",
    "pagos",
    "cotizaciones",
    "detalles_cotizacion",
    "notas_credito",
    "notas_debito",
    "kardex",
    "registros_dgii",
]

def get_pg_columns(pg, table):
    try:
        cols = pg.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND table_schema='public' ORDER BY ordinal_position")).fetchall()
        return [c[0] for c in cols]
    except Exception:
        return []

def sanitize(val):
    if val is None:
        return None
    if isinstance(val, str) and val.strip() == "":
        return None
    return val

def migrate_table(table, pg):
    pg_cols = get_pg_columns(pg, table)
    if not pg_cols:
        print(f"  {table}: tabla no existe en PG (skip)")
        return 0

    sq_cursor = sq.execute(f"SELECT * FROM {table}")
    rows = sq_cursor.fetchall()
    if not rows:
        print(f"  {table}: 0 rows (skip)")
        return 0

    sq_columns = [desc[0] for desc in sq_cursor.description]
    common_cols = [c for c in sq_columns if c in pg_cols]
    if not common_cols:
        print(f"  {table}: 0 columnas en comun (skip)")
        return 0

    inserted = 0
    for row in rows:
        vals = {col: sanitize(row[col]) for col in common_cols}
        if table == "plantillas_factura" and "tamano_fuente" in pg_cols and "tamaño_fuente" in sq_columns:
            vals["tamano_fuente"] = sanitize(row["tamaño_fuente"])
        cols = ", ".join(f'"{c}"' for c in vals)
        placeholders = ", ".join(f":{c}" for c in vals)
        upsert = f'INSERT INTO "{table}" ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
        try:
            pg.execute(text(upsert), vals)
            inserted += 1
        except Exception as e:
            print(f"  ERROR en {table} (id={vals.get('id','?')}): {e}")
    pg.commit()
    print(f"  {table}: {inserted}/{len(rows)} inserted")
    return inserted

with pg_engine.connect() as pg:
    print("=== MIGRACION SQLite -> Supabase ===")
    print()

    for table in TABLE_ORDER:
        migrate_table(table, pg)

    print()
    print("=== VERIFICACION ===")
    for table in TABLE_ORDER:
        try:
            count = pg.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar()
            print(f"  {table}: {count} rows")
        except Exception as e:
            print(f"  {table}: ERROR - {e}")

sq.close()
print()
print("Migracion completada.")
