from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import supabase
from auth import verify_token

router = APIRouter()


class CategoryCreate(BaseModel):
    name: str
    slug: str
    image_url: Optional[str] = None  # Allows saving a Cloudinary image link for the category card


@router.get("")
def get_categories():
    res = supabase.table("categories").select("*").order("name").execute()
    return res.data


@router.post("")
def create_category(data: CategoryCreate, _: str = Depends(verify_token)):
    res = supabase.table("categories").insert(data.model_dump()).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create category")
    return res.data[0]


@router.delete("/{id}")
def delete_category(id: int, _: str = Depends(verify_token)):
    res = supabase.table("categories").delete().eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}