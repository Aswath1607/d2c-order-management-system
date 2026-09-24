from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


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


class CustomerProfileUpdate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(default="Customer", max_length=100)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=20)
    address_line1: str = Field(..., min_length=1, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    pincode: str = Field(..., min_length=4, max_length=10)
    country: str = Field(..., min_length=1, max_length=100)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is not None and (not value.strip() or not all(character.isdigit() or character in "+-() ." for character in value)):
            raise ValueError("Enter a valid phone number")
        return value.strip() if value else None

    @field_validator("first_name", "last_name")
    @classmethod
    def normalize_name_part(cls, value: str, info) -> str:
        normalized = value.strip()
        if info.field_name == "last_name" and not normalized:
            return "Customer"
        if not normalized:
            raise ValueError("Name cannot be empty")
        return normalized

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.isdigit():
            raise ValueError("Pincode must contain only digits")
        return normalized


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
