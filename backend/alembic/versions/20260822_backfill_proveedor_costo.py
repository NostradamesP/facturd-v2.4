"""backfill proveedores.costo_promedio nulos

Revision ID: 20260822provfix
Revises: 1359fd196129
Create Date: 2026-08-22

"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260822provfix"
down_revision: Union[str, Sequence[str], None] = "1359fd196129"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE proveedores SET costo_promedio = 0 WHERE costo_promedio IS NULL")


def downgrade() -> None:
    pass
