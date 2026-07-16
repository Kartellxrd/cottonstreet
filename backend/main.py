from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

from routers import products, categories, orders
from routers import auth as auth_router
from routers import uploads
from routers import chat

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("✅ Cotton Street API starting up...")
    yield
    print("Cotton Street API shutting down...")

app = FastAPI(
    title="Cotton Street API",
    version="1.0.0",
    lifespan=lifespan,
)

# FIXED CORS: Hardcoded to ensure the Vercel app is allowed access
# We also include common local dev ports just in case
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cottonstreet-47mv.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(uploads.router, prefix="/api/upload", tags=["Uploads"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"]) # Added prefix for consistency

@app.get("/")
def root():
    return {"message": "Cotton Street API is running 🔥"}