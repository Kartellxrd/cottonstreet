from fastapi import APIRouter, HTTPException, Depends, Query, Response
from pydantic import BaseModel
from typing import Optional, List, Any
from database import supabase
from auth import verify_token
import io

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(tags=["Orders"])


class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_town: str
    items_json: List[Any]
    total: float
    deposit: float
    balance: float
    fulfillment: str
    payment_method: str
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str


@router.post("")
def create_order(data: OrderCreate):
    """
    Inserts a new order into the normalized schema:
    1. Parent order summary into 'orders'
    2. Atomic line items into 'order_items' (1NF compliance)
    3. Payment tracking record into 'payments' (3NF compliance)
    """
    payload = data.model_dump()
    
    # 1. Insert main order record
    order_insert = {
        "customer_name": payload["customer_name"],
        "customer_phone": payload["customer_phone"],
        "customer_town": payload["customer_town"],
        "status": "pending",
        "fulfillment": payload["fulfillment"],
        "payment_method": payload["payment_method"],
        "total": payload["total"],
        "deposit": payload["deposit"],
        "balance": payload["balance"],
        "notes": payload.get("notes")
    }

    res = supabase.table("orders").insert(order_insert).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create order")
    
    created_order = res.data[0]
    order_id = created_order["id"]

    # 2. Insert normalized order items (1NF)
    items = payload.get("items_json", [])
    for item in items:
        item_insert = {
            "order_id": order_id,
            "product_name": item.get("name", item.get("note", "Custom Item")),
            "variant": item.get("variant", "Standard"),
            "quantity": int(item.get("qty", 1)),
            "price": float(item.get("price", 0.0))
        }
        supabase.table("order_items").insert(item_insert).execute()

    # 3. Insert decoupled payment record (3NF)
    payment_insert = {
        "order_id": order_id,
        "payment_method": payload["payment_method"],
        "payment_status": "pending" if payload["payment_method"].lower() != "stripe" else "paid",
        "amount": payload["deposit"] if payload.get("deposit") else payload["total"]
    }
    supabase.table("payments").insert(payment_insert).execute()

    return created_order


@router.get("")
def get_orders(
    status: Optional[str] = Query(None),
    _: str = Depends(verify_token),
):
    """
    Fetches orders and dynamically attaches their relational items 
    and payments so the admin panel displays them cleanly.
    """
    query = supabase.table("orders").select("*").order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    res = query.execute()
    orders = res.data

    # Attach items_json and payment info for backward compatibility with frontend rendering
    for order in orders:
        items_res = supabase.table("order_items").select("*").eq("order_id", order["id"]).execute()
        # Map back to items_json structure expected by frontend cards & PDF generator
        order["items_json"] = [
            {
                "name": item["product_name"],
                "variant": item["variant"],
                "qty": item["quantity"],
                "price": item["price"]
            } for item in items_res.data
        ]

    return orders


@router.get("/{id}")
def get_order(id: int, _: str = Depends(verify_token)):
    res = supabase.table("orders").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = res.data[0]
    items_res = supabase.table("order_items").select("*").eq("order_id", order["id"]).execute()
    order["items_json"] = [
        {
            "name": item["product_name"],
            "variant": item["variant"],
            "qty": item["quantity"],
            "price": item["price"]
        } for item in items_res.data
    ]
    return order


@router.patch("/{id}/status")
def update_status(id: int, data: OrderStatusUpdate, _: str = Depends(verify_token)):
    valid = ["pending", "confirmed", "delivered", "cancelled"]
    if data.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    res = supabase.table("orders").update({"status": data.status}).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"id": id, "status": data.status}


@router.get("/{id}/receipt-pdf")
def download_order_receipt_pdf(id: int):
    """
    Generates and streams a downloadable ReportLab PDF deposit receipt 
    directly from the normalized relational tables.
    """
    res = supabase.table("orders").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found for receipt generation")
    
    order = res.data[0]
    items_res = supabase.table("order_items").select("*").eq("order_id", order["id"]).execute()
    items = items_res.data

    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        elements = []
        
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'DocTitle', parent=styles['Heading1'], fontName='Helvetica-Bold',
            fontSize=18, textColor=colors.HexColor('#d4af37'), spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'DocSub', parent=styles['Normal'], fontName='Helvetica',
            fontSize=10, textColor=colors.HexColor('#666666'), spaceAfter=15
        )
        body_style = ParagraphStyle(
            'BodyDark', parent=styles['Normal'], fontName='Helvetica',
            fontSize=9, textColor=colors.HexColor('#222222'), leading=12
        )

        elements.append(Paragraph("COTTON STREET APPAREL", title_style))
        elements.append(Paragraph("Official Deposit Receipt & Order Confirmation", subtitle_style))
        elements.append(Spacer(1, 10))

        meta_data = [
            [Paragraph(f"<b>Order Reference:</b> #{order.get('id')}", body_style), Paragraph(f"<b>Date:</b> {str(order.get('created_at', 'Recent'))[:10]}", body_style)],
            [Paragraph(f"<b>Customer:</b> {order.get('customer_name')}", body_style), Paragraph(f"<b>Phone:</b> {order.get('customer_phone')}", body_style)],
            [Paragraph(f"<b>Fulfillment:</b> {str(order.get('fulfillment')).upper()}", body_style), Paragraph(f"<b>Town:</b> {order.get('customer_town')}", body_style)]
        ]
        meta_table = Table(meta_data, colWidths=[270, 270])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f9f9f9')),
            ('PADDING', (0,0), (-1,-1), 8),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#dddddd'))
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 15))

        table_data = [["Item Description", "Qty", "Unit Price (P)", "Total (P)"]]
        for item in items:
            name = item.get('product_name', 'Product')
            qty = item.get('quantity', 1)
            price = float(item.get('price', 0))
            variant = item.get('variant', 'Standard')
            table_data.append([
                f"{name} ({variant})",
                str(qty),
                f"{price:,.2f}",
                f"{price * qty:,.2f}"
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

        total_val = float(order.get('total', 0))
        deposit_val = float(order.get('deposit', total_val * 0.5))
        balance_val = float(order.get('balance', total_val - deposit_val))

        summary_data = [
            ["Grand Total:", f"P {total_val:,.2f}"],
            ["Required 50% Deposit:", f"P {deposit_val:,.2f}"],
            ["Balance Due on Delivery:", f"P {balance_val:,.2f}"]
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

        notice_text = Paragraph(
            "<b>Note:</b> Official electronic deposit receipt for Cotton Street Apparel. Please keep this document as proof of payment.",
            body_style
        )
        elements.append(notice_text)

        doc.build(elements)
        buffer.seek(0)

        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=Receipt-Order-{order.get('id')}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")