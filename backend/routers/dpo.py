from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import httpx
import os
import xml.etree.ElementTree as ET
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(tags=["DPO Payments"])

DPO_COMPANY_TOKEN = os.getenv("DPO_COMPANY_TOKEN", "TEST_COMPANY_TOKEN")
DPO_SERVICE_ID = os.getenv("DPO_SERVICE_ID", "TEST_SERVICE_ID")
DPO_API_URL = "https://secure.3gdirectpay.com/API/v6/"
DPO_PAY_URL = "https://secure.3gdirectpay.com/payv3.php?ID="

class DPOCheckoutRequest(BaseModel):
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: str
    deposit_amount: float
    currency: str = "BWP"

@router.post("/create-checkout-session")
def create_dpo_checkout(data: DPOCheckoutRequest, request: Request):
    try:
        frontend_url = request.headers.get("origin") or os.getenv("FRONTEND_URL", "http://localhost:5500")
        return_url = f"{frontend_url}/order-complete.html"
        back_url = f"{frontend_url}/checkout.html"

        first_name = data.customer_name.split()[0]
        last_name = data.customer_name.split()[-1] if len(data.customer_name.split()) > 1 else "Customer"
        company_ref = f"CS-{os.urandom(3).hex().upper()}"

        xml_payload = f"""<?xml version="1.0" encoding="utf-8"?>
        <API3G>
            <CompanyToken>{DPO_COMPANY_TOKEN}</CompanyToken>
            <Request>createToken</Request>
            <Transaction>
                <PaymentAmount>{data.deposit_amount:.2f}</PaymentAmount>
                <PaymentCurrency>{data.currency}</PaymentCurrency>
                <CompanyRef>{company_ref}</CompanyRef>
                <RedirectURL>{return_url}</RedirectURL>
                <BackURL>{back_url}</BackURL>
                <CompanyServices>
                    <CompanyService>
                        <ServiceType>{DPO_SERVICE_ID}</ServiceType>
                        <ServiceDescription>Cotton Street 50% Deposit Order</ServiceDescription>
                        <ServiceDate>2026-07-24 12:00</ServiceDate>
                    </CompanyService>
                </CompanyServices>
                <customerFirstName>{first_name}</customerFirstName>
                <customerLastName>{last_name}</customerLastName>
                <customerEmail>{data.customer_email or 'client@cottonstreet.bw'}</customerEmail>
                <customerPhone>{data.customer_phone}</customerPhone>
            </Transaction>
        </API3G>"""

        response = httpx.post(
            DPO_API_URL,
            data=xml_payload,
            headers={"Content-Type": "application/xml"},
            timeout=15.0
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to connect to DPO payment gateway.")

        root = ET.fromstring(response.text)
        result = root.find("Result").text if root.find("Result") is not None else "1"
        result_explanation = root.find("ResultExplanation").text if root.find("ResultExplanation") is not None else "Unknown error"

        if result != "00":
            raise HTTPException(status_code=400, detail=f"DPO Error: {result_explanation}")

        transaction_token = root.find("TransToken").text

        return {
            "clientSecret": transaction_token,  # Kept key name so minimal frontend refactoring is needed
            "payment_url": f"{DPO_PAY_URL}{transaction_token}"
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/verify-session/{session_id}")
def verify_dpo_session(session_id: str):
    try:
        xml_payload = f"""<?xml version="1.0" encoding="utf-8"?>
        <API3G>
            <CompanyToken>{DPO_COMPANY_TOKEN}</CompanyToken>
            <Request>verifyToken</Request>
            <TransactionToken>{session_id}</TransactionToken>
        </API3G>"""

        response = httpx.post(
            DPO_API_URL,
            data=xml_payload,
            headers={"Content-Type": "application/xml"},
            timeout=15.0
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to verify transaction with DPO.")

        root = ET.fromstring(response.text)
        result = root.find("Result").text if root.find("Result") is not None else "1"
        
        # Result "000" or "00" typically indicates a paid/successful transaction depending on DPO status codes
        payment_status = "paid" if result in ["00", "000"] else "pending"
        
        amount = root.find("CustomerAmount")
        currency = root.find("CustomerCurrency")
        email = root.find("customerEmail")
        name = root.find("customerName")

        return {
            "status": payment_status,
            "customer_name": name.text if name is not None else "Cotton Street Buyer",
            "customer_email": email.text if email is not None else "Provided via DPO",
            "amount_total": float(amount.text) if amount is not None else 0.0,
            "currency": currency.text if currency is not None else "BWP"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))