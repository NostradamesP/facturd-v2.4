"""backfill proveedores.costo_promedio nulos

Revision ID: 20260822provfix
Revises: 1359fd196129
Create Date: 2026-08-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision: str = "20260822provfix"
down_revision: Union[str, Sequence[str], None] = "1359fd196129"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    columnas = {c["name"] for c in insp.get_columns("proveedores")}
    with op.batch_alter_table("proveedores") as batch_op:
        if "productos_servicios" not in columnas:
            batch_op.add_column(sa.Column("productos_servicios", sa.Text(), nullable=True))
        if "costo_promedio" not in columnas:
            batch_op.add_column(sa.Column("costo_promedio", sa.Float(), nullable=True))
    op.execute("UPDATE proveedores SET costo_promedio = 0 WHERE costo_promedio IS NULL")


def downgrade() -> None:
    pass
