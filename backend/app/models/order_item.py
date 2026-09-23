from __future__ import annotations

from sqlalchemy import CheckConstraint, Column, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_order_items_unit_price_non_negative"),
        CheckConstraint("discount >= 0", name="ck_order_items_discount_non_negative"),
        CheckConstraint("tax >= 0", name="ck_order_items_tax_non_negative"),
        CheckConstraint("subtotal >= 0", name="ck_order_items_subtotal_non_negative"),
    )

    order_item_id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    discount = Column(Float, default=0.0, nullable=False)
    tax = Column(Float, default=0.0, nullable=False)
    subtotal = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
