from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import auth, categories, customers, dashboard, inventory, orders, products

app = FastAPI(
    title="D2C Order Management System",
    version="1.0.0",
    description="Production-style direct-to-consumer order management backend.",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(customers.router, prefix="/api/customers", tags=["customers"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])

