"""add_productos_servicios_costo_to_proveedor

Revision ID: ee05db1242b0
Revises: 60ccbcdb0e4a
Create Date: 2026-05-12 13:33:30.584982

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'ee05db1242b0'
down_revision: Union[str, Sequence[str], None] = '60ccbcdb0e4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('proveedores', schema=None) as batch_op:
        batch_op.add_column(sa.Column('productos_servicios', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('costo_promedio', sa.Float(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('proveedores', schema=None) as batch_op:
        batch_op.drop_column('costo_promedio')
        batch_op.drop_column('productos_servicios')
