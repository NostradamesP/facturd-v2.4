from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
from datetime import datetime
import logging

from app.database import get_db
from app.middleware.auth import get_current_empresa
from app.models import models

logger = logging.getLogger("facturd")

router = APIRouter(prefix="/api/pdf", tags=["PDF"])


def _generar_pdf_factura(invoice: dict) -> BytesIO:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
    import base64
    import re

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            topMargin=0.6*inch, bottomMargin=0.5*inch,
                            leftMargin=0.6*inch, rightMargin=0.6*inch)
    styles = getSampleStyleSheet()
    elements = []

    emp = invoice.get("empresa", {})
    cli = invoice.get("cliente", {})
    primary = colors.HexColor("#1a1a2e")

    style_h1 = ParagraphStyle("h1", fontSize=18, fontName="Helvetica-Bold", textColor=primary, spaceAfter=2)
    style_p = ParagraphStyle("p", fontSize=9, fontName="Helvetica", textColor=colors.HexColor("#333333"), spaceAfter=1, leading=12)
    style_p_small = ParagraphStyle("ps", fontSize=8, fontName="Helvetica", textColor=colors.HexColor("#666666"), spaceAfter=1, leading=10)
    style_th = ParagraphStyle("th", fontSize=8, fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_CENTER)
    style_td_left = ParagraphStyle("tdl", fontSize=8, fontName="Helvetica", textColor=colors.HexColor("#333333"), alignment=TA_LEFT)
    style_td_right = ParagraphStyle("tdr", fontSize=8, fontName="Helvetica", textColor=colors.HexColor("#333333"), alignment=TA_RIGHT)

    # Encabezado: logo (opcional) + empresa + factura info
    logo_url = emp.get("logo_url", "")
    logo_img = None
    if logo_url and logo_url.startswith("data:image"):
        try:
            img_data = re.sub(r'^data:image/\w+;base64,', '', logo_url)
            img_bytes = base64.b64decode(img_data)
            logo_img = Image(BytesIO(img_bytes), width=0.8*inch, height=0.8*inch)
        except Exception:
            pass

    empresa_nombre = emp.get('nombre_sistema') or emp.get('nombre', 'Empresa')
    factura_tit = ParagraphStyle("factura_tit", fontSize=16, fontName="Helvetica-Bold", textColor=primary, alignment=TA_RIGHT)

    if logo_img:
        enc_data = [
            [logo_img, Paragraph("<b>FACTURA</b>", factura_tit)],
            [Paragraph(f"<b>{empresa_nombre}</b>", style_h1), ""],
        ]
    else:
        enc_data = [[
            Paragraph(f"<b>{empresa_nombre}</b>", style_h1),
            Paragraph("<b>FACTURA</b>", factura_tit),
        ]]
    enc_table = Table(enc_data, colWidths=[3.5*inch, 3.5*inch])
    enc_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(enc_table)
    elements.append(Spacer(1, 4))

    # Info empresa y cliente lado a lado
    info_data = [[
        Paragraph(
            f"{emp.get('direccion', '')}<br/>"
            f"RNC: {emp.get('rnc', '')}<br/>"
            f"Tel: {emp.get('telefono', '')}<br/>"
            f"{emp.get('email', '')}",
            style_p_small
        ),
        Paragraph(
            f"<b>NCF:</b> {invoice.get('ncf', 'N/A')}<br/>"
            f"<b>Fecha:</b> {invoice.get('fecha', '')}<br/>"
            f"<b>Vence:</b> {invoice.get('fecha_vencimiento', '')}",
            ParagraphStyle("factura_info", fontSize=9, fontName="Helvetica", textColor=colors.HexColor("#333333"), alignment=TA_RIGHT, leading=14)
        ),
    ]]
    info_table = Table(info_data, colWidths=[3.5*inch, 3.5*inch])
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 16))

    # Línea separadora
    sep = Table([[""]], colWidths=[7*inch])
    sep.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#cccccc")),
    ]))
    elements.append(sep)
    elements.append(Spacer(1, 12))

    # Cliente
    cliente_lines = [f"<b>Cliente:</b> {cli.get('nombre', 'N/A')}"]
    if cli.get("rnc"):
        cliente_lines.append(f"RNC/Cédula: {cli['rnc']}")
    if cli.get("direccion"):
        cliente_lines.append(f"Dirección: {cli['direccion']}")
    if cli.get("telefono"):
        cliente_lines.append(f"Tel: {cli['telefono']}")
    if cli.get("email"):
        cliente_lines.append(f"Email: {cli['email']}")
    elements.append(Paragraph("<br/>".join(cliente_lines), style_p))
    elements.append(Spacer(1, 16))

    # Tabla de detalles
    header_color = primary
    data = [
        [Paragraph("<b>Concepto</b>", style_th),
         Paragraph("<b>Cant.</b>", style_th),
         Paragraph("<b>Precio</b>", style_th),
         Paragraph("<b>ITBIS</b>", style_th),
         Paragraph("<b>Total</b>", style_th)],
    ]
    for det in invoice.get("detalles", []):
        data.append([
            Paragraph(det.get("descripcion", ""), style_td_left),
            Paragraph(str(det.get("cantidad", 0)), ParagraphStyle("tdc", fontSize=8, fontName="Helvetica", textColor=colors.HexColor("#333333"), alignment=TA_CENTER)),
            Paragraph(f"RD$ {det.get('precio_unitario', 0):,.2f}", style_td_right),
            Paragraph(f"RD$ {det.get('itbis', 0):,.2f}", style_td_right),
            Paragraph(f"RD$ {det.get('total', 0):,.2f}", style_td_right),
        ])

    col_widths = [2.6*inch, 0.6*inch, 1.1*inch, 1.1*inch, 1.1*inch]
    detail_table = Table(data, colWidths=col_widths, repeatRows=1)
    detail_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_color),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(detail_table)
    elements.append(Spacer(1, 12))

    # Totales
    totals_data = [
        ["Subtotal:", f"RD$ {invoice.get('subtotal', 0):,.2f}"],
    ]
    if invoice.get("descuento", 0):
        totals_data.insert(0, ["Descuento:", f"-RD$ {invoice['descuento']:,.2f}"])
    totals_data.append(["ITBIS:", f"RD$ {invoice.get('itbis', 0):,.2f}"])
    totals_data.append(["TOTAL:", f"RD$ {invoice.get('total', 0):,.2f}"])

    totals_table = Table(totals_data, colWidths=[5.8*inch, 1.2*inch])
    totals_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (-1, -2), "Helvetica"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 11),
        ("TEXTCOLOR", (0, -1), (-1, -1), primary),
        ("LINEBELOW", (0, -1), (-1, -1), 2, primary),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 4),
    ]))
    elements.append(totals_table)

    if invoice.get("nota"):
        elements.append(Spacer(1, 16))
        elements.append(Paragraph(f"<i>{invoice['nota']}</i>", style_p_small))

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

    empresa = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    cliente = db.query(models.Cliente).filter(models.Cliente.id == factura.cliente_id).first()
    detalles = db.query(models.DetalleFactura).filter(
        models.DetalleFactura.factura_id == factura.id
    ).all()

    invoice = {
        "ncf": factura.ncf,
        "fecha": factura.fecha.strftime("%d/%m/%Y") if factura.fecha else "",
        "fecha_vencimiento": factura.fecha_vencimiento.strftime("%d/%m/%Y") if factura.fecha_vencimiento else "",
        "subtotal": factura.subtotal or 0,
        "descuento": factura.descuento or 0,
        "itbis": factura.itbis or 0,
        "total": factura.total or 0,
        "nota": factura.nota or "",
        "empresa": {
            "nombre": empresa.nombre if empresa else "",
            "rnc": empresa.rnc if empresa else "",
            "direccion": empresa.direccion or "",
            "telefono": empresa.telefono or "",
            "email": empresa.email or "",
            "logo_url": empresa.logo_url or "",
            "nombre_sistema": empresa.nombre_sistema or "",
        },
        "cliente": {
            "nombre": cliente.nombre if cliente else "N/A",
            "rnc": cliente.rnc if cliente else "",
            "direccion": cliente.direccion or "",
            "telefono": cliente.telefono or "",
            "email": cliente.email or "",
        },
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
        pdf_buf = _generar_pdf_factura(invoice)
        return StreamingResponse(
            pdf_buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=factura_{factura.ncf}.pdf"},
        )
    except Exception as e:
        logger.exception("Error generating PDF for factura %s", factura_id)
        raise HTTPException(status_code=500, detail="Error generando PDF")
