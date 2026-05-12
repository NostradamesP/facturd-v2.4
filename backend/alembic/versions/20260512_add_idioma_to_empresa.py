"""add_idioma_to_empresa

Revision ID: 20260512idioma
Revises: 20260511dgii
Create Date: 2026-05-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260512idioma"
down_revision: Union[str, Sequence[str], None] = "20260511dgii"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("empresas", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "idioma",
                sa.String(length=2),
                server_default="es",
                nullable=False,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("empresas", schema=None) as batch_op:
        batch_op.drop_column("idioma")
