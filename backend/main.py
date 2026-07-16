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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(uploads.router, prefix="/api/upload", tags=["Uploads"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


@app.get("/")
def root():
    return {"message": "Cotton Street API is running 🔥"}