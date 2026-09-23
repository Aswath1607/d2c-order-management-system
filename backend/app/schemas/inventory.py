from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class InventoryBase(BaseModel):
    stock_quantity: float = Field(default=0, ge=0)
    reserved_quantity: float = Field(default=0, ge=0)
    reorder_level: float = Field(default=0, ge=0)
    reorder_quantity: float = Field(default=0, ge=0)
    damaged_quantity: float = Field(default=0, ge=0)
    warehouse_location: Optional[str] = None
    supplier_name: Optional[str] = None


class InventoryUpdate(InventoryBase):
    pass


class InventoryTransactionRequest(BaseModel):
    remarks: Optional[str] = None


class InventoryOut(InventoryBase):
    inventory_id: int
    product_id: int
    product_name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    product_status: Optional[str] = None
    available_quantity: float
    last_restocked_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InventoryListResponse(BaseModel):
    items: list[InventoryOut]
    page: int
    page_size: int
    total: int
    total_pages: int
