from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(tags=["Stripe Payments"])

class StripeCheckoutSessionRequest(BaseModel):
    total_amount: Optional[float] = None
    deposit_amount: float
    customer_name: str
    customer_email: Optional[str] = None

@router.post("/create-checkout-session")
def create_checkout_session(data: StripeCheckoutSessionRequest, request: Request):
    try:
        unit_amount_cents = int(data.deposit_amount * 100)
        
        # Dynamically capture the origin of the frontend request (handles Codespaces URLs automatically)
        frontend_url = request.headers.get("origin") or os.getenv("FRONTEND_URL", "http://localhost:5500")
        return_url = f"{frontend_url}/order-complete.html?session_id={{CHECKOUT_SESSION_ID}}"

        session = stripe.checkout.Session.create(
            ui_mode='embedded_page',
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'bwp',
                    'product_data': {
                        'name': f"50% Deposit for Cotton Street Order ({data.customer_name})",
                    },
                    'unit_amount': unit_amount_cents,
                },
                'quantity': 1,
            }],
            mode='payment',
            return_url=return_url,
            metadata={
                "customer_name": data.customer_name,
                "customer_email": data.customer_email or ""
            }
        )
        return {"clientSecret": session.client_secret}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/verify-session/{session_id}")
def verify_session(session_id: str):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return {
            "status": session.payment_status,
            "customer_name": session.metadata.get("customer_name") or (session.customer_details.name if session.customer_details else "N/A"),
            "customer_email": session.customer_email or (session.customer_details.email if session.customer_details else "N/A"),
            "amount_total": session.amount_total / 100,  # Convert back from cents
            "currency": session.currency.upper()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))