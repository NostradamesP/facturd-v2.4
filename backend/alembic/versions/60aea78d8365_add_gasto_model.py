"""add_gasto_model

Revision ID: 60aea78d8365
Revises: ee05db1242b0
Create Date: 2026-05-12 13:35:23.436345

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '60aea78d8365'
down_revision: Union[str, Sequence[str], None] = 'ee05db1242b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('gastos',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('empresa_id', sa.String(), nullable=True),
    sa.Column('proveedor_id', sa.String(), nullable=True),
    sa.Column('factura_id', sa.String(), nullable=True),
    sa.Column('monto', sa.Float(), nullable=True),
    sa.Column('fecha', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('categoria', sa.Enum('INSUMOS', 'SERVICIOS', 'LOGISTICA', 'NOMINA', 'MARKETING', 'OFICINA', 'OTROS', name='categoriagasto'), nullable=True),
    sa.Column('nota', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ),
    sa.ForeignKeyConstraint(['factura_id'], ['facturas.id'], ),
    sa.ForeignKeyConstraint(['proveedor_id'], ['proveedores.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('gastos')
