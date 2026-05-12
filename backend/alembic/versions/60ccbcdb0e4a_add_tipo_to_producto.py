"""add_tipo_to_producto

Revision ID: 60ccbcdb0e4a
Revises: 20260512idioma
Create Date: 2026-05-12 13:31:51.640437

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '60ccbcdb0e4a'
down_revision: Union[str, Sequence[str], None] = '20260512idioma'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('productos', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tipo', sa.Enum('PRODUCTO', 'SERVICIO', name='tipoproducto'), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('productos', schema=None) as batch_op:
        batch_op.drop_column('tipo')
