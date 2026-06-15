from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List, Any
from database import supabase
from auth import verify_token

router = APIRouter()


class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_town: str
    items_json: List[Any]
    total: Optional[float] = None
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str


@router.post("")
def create_order(data: OrderCreate):
    res = supabase.table("orders").insert(data.model_dump()).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create order")
    return res.data[0]


@router.get("")
def get_orders(
    status: Optional[str] = Query(None),
    _: str = Depends(verify_token),
):
    query = supabase.table("orders").select("*").order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    res = query.execute()
    return res.data


@router.get("/{id}")
def get_order(id: int, _: str = Depends(verify_token)):
    res = supabase.table("orders").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return res.data[0]


@router.patch("/{id}/status")
def update_status(id: int, data: OrderStatusUpdate, _: str = Depends(verify_token)):
    valid = ["pending", "confirmed", "delivered", "cancelled"]
    if data.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    res = supabase.table("orders").update({"status": data.status}).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"id": id, "status": data.status}
