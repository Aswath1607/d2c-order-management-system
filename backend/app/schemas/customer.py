from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class CustomerBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None
    status: str = "ACTIVE"


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    customer_id: int
    user_id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class CustomerAdminOut(CustomerOut):
    name: str
    is_active: bool
    total_orders: int = 0
    total_spent: float = 0.0
    average_order_value: float = 0.0
    last_order_date: datetime | None = None


class CustomerAdminUpdate(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    phone: Optional[str] = None
    is_active: bool = True


class CustomerStatistics(BaseModel):
    total_orders: int
    total_spent: float
    average_order_value: float
    last_order_date: datetime | None = None


class CustomerListResponse(BaseModel):
    items: list[CustomerAdminOut]
    page: int
    page_size: int
    total: int
    total_pages: int
