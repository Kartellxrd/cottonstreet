from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from database import supabase
from auth import verify_token

router = APIRouter()


class ProductCreate(BaseModel):
    name: str
    variant: Optional[str] = None
    price: float
    old_price: Optional[float] = None
    badge: Optional[str] = None
    category_id: Optional[int] = None
    image_url: Optional[str] = None
    cloudinary_id: Optional[str] = None
    in_stock: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    variant: Optional[str] = None
    price: Optional[float] = None
    old_price: Optional[float] = None
    badge: Optional[str] = None
    category_id: Optional[int] = None
    image_url: Optional[str] = None
    cloudinary_id: Optional[str] = None
    in_stock: Optional[bool] = None


@router.get("")
def get_products(
    category: Optional[str] = Query(None),
    in_stock: Optional[bool] = Query(None),
):
    query = supabase.table("products").select("*, categories(id, name, slug)")
    if in_stock is not None:
        query = query.eq("in_stock", in_stock)
    if category:
        cat = supabase.table("categories").select("id").eq("slug", category).execute()
        if cat.data:
            query = query.eq("category_id", cat.data[0]["id"])
    res = query.order("created_at", desc=True).execute()
    return res.data


@router.get("/{id}")
def get_product(id: int):
    res = supabase.table("products").select("*, categories(id, name, slug)").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return res.data[0]


@router.post("")
def create_product(data: ProductCreate, _: str = Depends(verify_token)):
    res = supabase.table("products").insert(data.model_dump()).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create product")
    return res.data[0]


@router.put("/{id}")
def update_product(id: int, data: ProductUpdate, _: str = Depends(verify_token)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    res = supabase.table("products").update(updates).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return res.data[0]


@router.delete("/{id}")
def delete_product(id: int, _: str = Depends(verify_token)):
    res = supabase.table("products").delete().eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}


@router.patch("/{id}/stock")
def toggle_stock(id: int, _: str = Depends(verify_token)):
    current = supabase.table("products").select("in_stock").eq("id", id).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Product not found")
    new_status = not current.data[0]["in_stock"]
    supabase.table("products").update({"in_stock": new_status}).eq("id", id).execute()
    return {"id": id, "in_stock": new_status}
