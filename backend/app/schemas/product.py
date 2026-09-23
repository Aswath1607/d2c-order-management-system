from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    product_name: str = Field(..., min_length=1)
    sku: str = Field(..., min_length=1)
    category_id: int = Field(..., gt=0)
    description: Optional[str] = None
    price: float = Field(..., ge=0)
    cost_price: float = Field(..., ge=0)
    discount: float = Field(default=0, ge=0, le=100)
    tax_rate: float = Field(default=0, ge=0, le=100)
    brand: Optional[str] = None
    image_url: Optional[str] = None
    weight: float = Field(default=0, ge=0)
    status: str = "ACTIVE"


class ProductCreate(ProductBase):
    initial_stock: float = Field(default=0, ge=0)
    reorder_level: float = Field(default=0, ge=0)
    reorder_quantity: float = Field(default=0, ge=0)
    warehouse_location: Optional[str] = None
    supplier_name: Optional[str] = None


class ProductUpdate(ProductBase):
    pass


class ProductOut(ProductBase):
    product_id: int
    category: str
    category_slug: str | None = None
    available_quantity: float | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    items: list[ProductOut]
    page: int
    page_size: int
    total: int
    total_pages: int
