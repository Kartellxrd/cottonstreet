from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

from routers import products, categories, orders
from routers import auth as auth_router
from routers import uploads

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
    allow_origins=[
        os.getenv("FRONTEND_URL", "*"),
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(uploads.router, prefix="/api/upload", tags=["Uploads"])


@app.get("/")
def root():
    return {"message": "Cotton Street API is running 🔥"}
