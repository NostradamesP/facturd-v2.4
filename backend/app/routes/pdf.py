from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
import logging

from app.database import get_db
from app.middleware.auth import get_current_empresa
from app.models import models
from app.utils import generar_id

logger = logging.getLogger("facturd")

router = APIRouter(prefix="/api/pdf", tags=["PDF"])


def _generar_pdf_reporte(invoice: dict) -> BytesIO:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"Factura: {invoice.get('ncf', 'N/A')}", styles["Title"]))
    elements.append(Spacer(1, 12))

    data = [
        ["Concepto", "Cantidad", "Precio", "ITBIS", "Total"],
    ]
    for det in invoice.get("detalles", []):
        data.append([
            det.get("descripcion", ""),
            str(det.get("cantidad", 0)),
            f"{det.get('precio_unitario', 0):.2f}",
            f"{det.get('itbis', 0):.2f}",
            f"{det.get('total', 0):.2f}",
        ])

    data.append(["", "", "", "Subtotal:", f"{invoice.get('subtotal', 0):.2f}"])
    data.append(["", "", "", "ITBIS:", f"{invoice.get('itbis', 0):.2f}"])
    data.append(["", "", "", "Descuento:", f"{invoice.get('descuento', 0):.2f}"])
    data.append(["", "", "", "Total:", f"{invoice.get('total', 0):.2f}"])

    table = Table(data, colWidths=[200, 60, 70, 60, 70])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2E7D32")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -4), 0.5, colors.grey),
        ("LINEBELOW", (0, -4), (-1, -4), 1, colors.black),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
    ]))
    elements.append(table)

    doc.build(elements)
    buf.seek(0)
    return buf


@router.post("/invoice/{factura_id}")
def generate_invoice_pdf(
    factura_id: str,
    empresa_id: str = Depends(get_current_empresa),
    db: Session = Depends(get_db),
):
    factura = db.query(models.Factura).filter(
        models.Factura.id == factura_id,
        models.Factura.empresa_id == empresa_id,
    ).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    cliente = db.query(models.Cliente).filter(models.Cliente.id == factura.cliente_id).first()
    detalles = db.query(models.DetalleFactura).filter(
        models.DetalleFactura.factura_id == factura.id
    ).all()

    invoice = {
        "ncf": factura.ncf,
        "cliente": cliente.nombre if cliente else "N/A",
        "fecha": str(factura.fecha) if factura.fecha else "",
        "subtotal": factura.subtotal or 0,
        "descuento": factura.descuento or 0,
        "itbis": factura.itbis or 0,
        "total": factura.total or 0,
        "detalles": [
            {
                "descripcion": d.descripcion,
                "cantidad": d.cantidad or 0,
                "precio_unitario": d.precio_unitario or 0,
                "itbis": d.itbis or 0,
                "total": d.total or 0,
            }
            for d in detalles
        ],
    }

    try:
        pdf_buf = _generar_pdf_reporte(invoice)
        return StreamingResponse(
            pdf_buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=factura_{factura.ncf}.pdf"},
        )
    except Exception as e:
        logger.exception("Error generating PDF for factura %s", factura_id)
        raise HTTPException(status_code=500, detail="Error generando PDF")
