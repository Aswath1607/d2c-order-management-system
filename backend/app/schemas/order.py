from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.assignment import AssignmentOut


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)


class OrderCreate(BaseModel):
    customer_id: int | None = None
    shipping_address: str
    payment_method: str = "COD"
    items: list[OrderItemCreate]


class OrderItemOut(BaseModel):
    order_item_id: int
    product_id: int
    quantity: float
    unit_price: float
    discount: float
    tax: float
    subtotal: float

    model_config = {"from_attributes": True}


class OrderStatusHistoryOut(BaseModel):
    id: int
    order_id: int
    status: str
    note: str | None = None
    changed_by: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaymentHistoryOut(BaseModel):
    id: int
    from_status: str | None = None
    to_status: str
    note: str | None = None
    changed_by: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaymentOut(BaseModel):
    payment_id: int
    order_id: int
    payment_method: str
    payment_status: str
    amount: float
    currency: str
    provider: str
    provider_transaction_id: str | None = None
    payment_reference: str | None = None
    failure_reason: str | None = None
    paid_at: datetime | None = None
    history: list[PaymentHistoryOut] = []

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    order_id: int
    order_number: str
    customer_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    items_count: int = 0
    order_date: datetime | None = None
    subtotal: float
    discount_amount: float
    tax_amount: float
    shipping_charge: float
    total_amount: float
    payment_status: str
    payment_method: str | None = None
    order_status: str
    shipping_address: Optional[str] = None
    tracking_number: Optional[str] = None
    courier_name: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    items: list[OrderItemOut] = []
    status_history: list[OrderStatusHistoryOut] = []
    payment: PaymentOut | None = None
    assignments: list[AssignmentOut] = []

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    items: list[OrderOut]
    page: int
    page_size: int
    total: int
    total_pages: int
