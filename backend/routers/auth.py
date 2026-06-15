from fastapi import APIRouter, HTTPException, Depends
from pydantic import EmailStr, BaseModel
from database import supabase
from auth import hash_password, verify_password, create_access_token, verify_token

router = APIRouter()


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(data: AdminLogin):
    res = supabase.table("admins").select("*").eq("email", data.email).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    admin = res.data[0]
    if not verify_password(data.password, admin["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": admin["email"]})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
def get_me(email: str = Depends(verify_token)):
    res = supabase.table("admins").select("id, email, created_at").eq("email", email).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Admin not found")
    return res.data[0]


# SETUP ONLY — remove after creating your first admin
@router.post("/setup")
def setup_admin(data: AdminLogin):
    existing = supabase.table("admins").select("id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Admin already exists")
    supabase.table("admins").insert({
        "email": data.email,
        "hashed_password": hash_password(data.password)
    }).execute()
    return {"message": f"Admin {data.email} created successfully"}
