"""add_nombre_sistema_logo_to_empresa

Revision ID: 1359fd196129
Revises: 60aea78d8365
Create Date: 2026-05-12 13:45:15.439525

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1359fd196129'
down_revision: Union[str, Sequence[str], None] = '60aea78d8365'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('empresas', schema=None) as batch_op:
        batch_op.add_column(sa.Column('nombre_sistema', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('logo_url', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('empresas', schema=None) as batch_op:
        batch_op.drop_column('logo_url')
        batch_op.drop_column('nombre_sistema')
