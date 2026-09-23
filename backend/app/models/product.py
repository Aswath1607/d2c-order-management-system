from __future__ import annotations

from sqlalchemy import CheckConstraint, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_products_price_non_negative"),
        CheckConstraint("cost_price >= 0", name="ck_products_cost_price_non_negative"),
        CheckConstraint("discount >= 0", name="ck_products_discount_non_negative"),
        CheckConstraint("tax_rate >= 0", name="ck_products_tax_rate_non_negative"),
        CheckConstraint("weight >= 0", name="ck_products_weight_non_negative"),
    )

    product_id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(200), nullable=False, index=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(100), index=True, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.category_id", ondelete="RESTRICT"), nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    cost_price = Column(Float, nullable=False)
    discount = Column(Float, default=0.0, nullable=False)
    tax_rate = Column(Float, default=0.0, nullable=False)
    brand = Column(String(100), nullable=True)
    image_url = Column(String(500), nullable=True)
    weight = Column(Float, default=0.0, nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    inventory = relationship("Inventory", back_populates="product", uselist=False)
    order_items = relationship("OrderItem", back_populates="product")
    inventory_transactions = relationship("InventoryTransaction", back_populates="product")
    alerts = relationship("Alert", back_populates="product")
    category_record = relationship("Category", back_populates="products")

    @property
    def available_quantity(self) -> float | None:
        return self.inventory.available_quantity if self.inventory else None

    @property
    def category_slug(self) -> str | None:
        return self.category_record.slug if self.category_record else None
