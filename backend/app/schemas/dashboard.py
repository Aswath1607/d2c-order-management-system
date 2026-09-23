from typing import Any

from pydantic import BaseModel


class SummaryMetric(BaseModel):
    label: str
    value: float | int
    trend: float | int | None = None


class DashboardSummary(BaseModel):
    total_sales: float
    total_orders: int
    total_customers: int
    total_products: int
    todays_sales: float
    todays_orders: int
    low_stock_products: int
    out_of_stock_products: int


class FastMovingProductRow(BaseModel):
    product_id: int
    product_name: str
    units_sold: float
    sales_velocity: float
    available_quantity: float
    reorder_level: float
    days_of_stock: float | None = None


class AlertRow(BaseModel):
    alert_id: int
    product_id: int
    product_name: str
    alert_type: str
    severity: str
    message: str
    current_stock: int
    threshold: int
    is_read: bool
    created_at: str


class InventoryStatusRow(BaseModel):
    status: str
    count: int


class OrderStatusRow(BaseModel):
    status: str
    count: int


class SalesSeries(BaseModel):
    period: str
    sales: float
    orders: int


class TopProductRow(BaseModel):
    product_id: int
    product_name: str
    units_sold: float
    revenue: float


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class PaginatedResponse(BaseModel):
    items: list[Any]
    page: int
    page_size: int
    total: int
    total_pages: int
