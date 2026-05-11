"""Add visual_settings

Revision ID: 173d86932210
Revises: 2eb38d78af14
Create Date: 2026-03-25 20:59:01.378542

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '173d86932210'
down_revision: Union[str, Sequence[str], None] = '2eb38d78af14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
