"""higiene: estatus/activo nulos en clientes y productos

Revision ID: 20260822higiene
Revises: 20260822provfix
Create Date: 2026-08-22

"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260822higiene"
down_revision: Union[str, Sequence[str], None] = "20260822provfix"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE clientes SET estatus = 'ACTIVO' WHERE estatus IS NULL")
    op.execute("UPDATE productos SET activo = TRUE WHERE activo IS NULL")


def downgrade() -> None:
    pass
