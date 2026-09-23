from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    slug: Optional[str] = Field(default=None, max_length=140)
    description: Optional[str] = None
    image_url: Optional[str] = None
    status: str = "ACTIVE"


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    category_id: int
    product_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class CategoryListResponse(BaseModel):
    items: list[CategoryOut]
    page: int
    page_size: int
    total: int
    total_pages: int
