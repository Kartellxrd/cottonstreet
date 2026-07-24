from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import List, Optional
import io

# ReportLab imports for professional PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Keep prefix empty here; define it when including the router in main.py
router = APIRouter(tags=["Receipts"])

class ReceiptItem(BaseModel):
    name: str
    qty: int
    price: float
    variant: Optional[str] = "Standard"

class ReceiptPayload(BaseModel):
    order_id: str
    customer_name: str
    customer_phone: str
    customer_town: str
    items: List[ReceiptItem]
    total: float
    deposit: float
    balance: float
    payment_method: str
    fulfillment: str

@router.post("/download-pdf")
def generate_deposit_receipt_pdf(payload: ReceiptPayload):
    """
    Generates a clean, professional PDF deposit receipt on-the-fly 
    for users who complete manual payments (e.g., Orange Money, FNB).
    """
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        elements = []
        
        styles = getSampleStyleSheet()
        
        # Custom Brand Styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            textColor=colors.HexColor('#d4af37'),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'DocSub',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=colors.HexColor('#666666'),
            spaceAfter=15
        )
        body_style = ParagraphStyle(
            'BodyDark',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            textColor=colors.HexColor('#222222'),
            leading=12
        )

        # Header Info
        elements.append(Paragraph("COTTON STREET APPAREL", title_style))
        elements.append(Paragraph("Official Deposit Receipt & Order Confirmation", subtitle_style))
        elements.append(Spacer(1, 10))

        # Meta Details Table
        meta_data = [
            [Paragraph(f"<b>Order Reference:</b> #{payload.order_id}", body_style), Paragraph(f"<b>Date:</b> 2026-07-24", body_style)],
            [Paragraph(f"<b>Customer:</b> {payload.customer_name}", body_style), Paragraph(f"<b>Phone:</b> {payload.customer_phone}", body_style)],
            [Paragraph(f"<b>Fulfillment:</b> {payload.fulfillment.upper()}", body_style), Paragraph(f"<b>Town:</b> {payload.customer_town}", body_style)]
        ]
        meta_table = Table(meta_data, colWidths=[270, 270])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f9f9f9')),
            ('PADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#dddddd'))
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 15))

        # Line Items Table Header
        table_data = [["Item Description", "Qty", "Unit Price (P)", "Total (P)"]]
        for item in payload.items:
            table_data.append([
                f"{item.name} ({item.variant})",
                str(item.qty),
                f"{item.price:,.2f}",
                f"{item.price * item.qty:,.2f}"
            ])

        items_table = Table(table_data, colWidths=[260, 60, 110, 110])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#121212')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#ffffff')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e0e0e0')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fcfcfc')]),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 15))

        # Financial Summary Table
        summary_data = [
            ["Grand Total:", f"P {payload.total:,.2f}"],
            ["Required 50% Deposit:", f"P {payload.deposit:,.2f}"],
            ["Balance Due on Delivery:", f"P {payload.balance:,.2f}"]
        ]
        summary_table = Table(summary_data, colWidths=[380, 160])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
            ('FONTNAME', (0,1), (-1,1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0,1), (-1,1), colors.HexColor('#d4af37')),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 25))

        # Footer Notice
        notice_text = Paragraph(
            f"<b>Note:</b> Paid via <b>{payload.payment_method}</b>. This is an official electronic receipt. Please ensure your transaction reference matches this order. Keep this document as your proof of deposit.",
            body_style
        )
        elements.append(notice_text)

        doc.build(elements)
        buffer.seek(0)

        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=CottonStreet-Receipt-{payload.order_id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")