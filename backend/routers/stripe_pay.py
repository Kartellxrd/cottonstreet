from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/api/stripe", tags=["Stripe Payments"])

class StripeCheckoutRequest(BaseModel):
    total_amount: float
    deposit_amount: float
    customer_name: str
    customer_email: Optional[str] = None

@router.post("/create-checkout-session")
def create_stripe_checkout(data: StripeCheckoutRequest):
    try:
        # Stripe expects amounts in the smallest currency unit (e.g., cents/thebe), 
        # or you can charge in USD/BWP depending on your Stripe account setup. 
        # Here we convert the deposit amount to integer cents/thebe:
        unit_amount_cents = int(data.deposit_amount * 100)

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "bwp", # Or "usd" if your Stripe account requires USD
                    "product_data": {
                        "name": f"50% Deposit for Cotton Street Order ({data.customer_name})",
                    },
                    "unit_amount": unit_amount_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=os.getenv("FRONTEND_URL", "http://localhost:3000") + "/?success=true&session_id={CHECKOUT_SESSION_ID}",
            cancel_url=os.getenv("FRONTEND_URL", "http://localhost:3000") + "/?canceled=true",
        )
        return {"url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))