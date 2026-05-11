"""prepare_publish_and_dgii_audit

Revision ID: 20260511dgii
Revises: 173d86932210
Create Date: 2026-05-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260511dgii"
down_revision: Union[str, Sequence[str], None] = "2eb38d78af14"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("facturas", schema=None) as batch_op:
        batch_op.add_column(sa.Column("fecha_vencimiento", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("visual_settings", sa.Text(), nullable=True))
        batch_op.create_index("ix_facturas_empresa_id", ["empresa_id"], unique=False)
        batch_op.create_index("ix_facturas_cliente_id", ["cliente_id"], unique=False)
        batch_op.create_index("ix_facturas_secuencia", ["secuencia"], unique=False)
        batch_op.create_index("ix_facturas_estado", ["estado"], unique=False)

    op.create_table(
        "registros_dgii",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("empresa_id", sa.String(), nullable=True),
        sa.Column("factura_id", sa.String(), nullable=True),
        sa.Column("ncf", sa.String(), nullable=True),
        sa.Column("track_id", sa.String(), nullable=True),
        sa.Column(
            "estado",
            sa.Enum(
                "PENDIENTE",
                "XML_GENERADO",
                "FIRMADO",
                "ENVIADO",
                "ACEPTADO",
                "RECHAZADO",
                "ERROR",
                name="estadodgii",
            ),
            nullable=True,
        ),
        sa.Column("xml_original", sa.Text(), nullable=True),
        sa.Column("xml_firmado", sa.Text(), nullable=True),
        sa.Column("respuesta_dgii", sa.Text(), nullable=True),
        sa.Column("pdf_generado", sa.Text(), nullable=True),
        sa.Column("logs", sa.Text(), nullable=True),
        sa.Column("auditoria", sa.Text(), nullable=True),
        sa.Column("firmado_at", sa.DateTime(), nullable=True),
        sa.Column("enviado_at", sa.DateTime(), nullable=True),
        sa.Column("respondido_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["empresa_id"], ["empresas.id"]),
        sa.ForeignKeyConstraint(["factura_id"], ["facturas.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("factura_id"),
    )
    op.create_index("ix_registros_dgii_empresa_id", "registros_dgii", ["empresa_id"], unique=False)
    op.create_index("ix_registros_dgii_factura_id", "registros_dgii", ["factura_id"], unique=False)
    op.create_index("ix_registros_dgii_ncf", "registros_dgii", ["ncf"], unique=False)
    op.create_index("ix_registros_dgii_track_id", "registros_dgii", ["track_id"], unique=False)
    op.create_index("ix_registros_dgii_estado", "registros_dgii", ["estado"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_registros_dgii_estado", table_name="registros_dgii")
    op.drop_index("ix_registros_dgii_track_id", table_name="registros_dgii")
    op.drop_index("ix_registros_dgii_ncf", table_name="registros_dgii")
    op.drop_index("ix_registros_dgii_factura_id", table_name="registros_dgii")
    op.drop_index("ix_registros_dgii_empresa_id", table_name="registros_dgii")
    op.drop_table("registros_dgii")

    with op.batch_alter_table("facturas", schema=None) as batch_op:
        batch_op.drop_index("ix_facturas_estado")
        batch_op.drop_index("ix_facturas_secuencia")
        batch_op.drop_index("ix_facturas_cliente_id")
        batch_op.drop_index("ix_facturas_empresa_id")
        batch_op.drop_column("visual_settings")
        batch_op.drop_column("fecha_vencimiento")
