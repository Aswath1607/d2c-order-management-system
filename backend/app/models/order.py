from __future__ import annotations

from sqlalchemy import CheckConstraint, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_orders_subtotal_non_negative"),
        CheckConstraint("discount_amount >= 0", name="ck_orders_discount_non_negative"),
        CheckConstraint("tax_amount >= 0", name="ck_orders_tax_non_negative"),
        CheckConstraint("shipping_charge >= 0", name="ck_orders_shipping_non_negative"),
        CheckConstraint("total_amount >= 0", name="ck_orders_total_non_negative"),
    )

    order_id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.customer_id", ondelete="RESTRICT"), nullable=False, index=True)
    order_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    subtotal = Column(Float, default=0.0, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    shipping_charge = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    payment_status = Column(String(30), default="PAYMENT_PENDING", nullable=False, index=True)
    payment_method = Column(String(20), nullable=True)
    order_status = Column(String(30), default="PENDING", nullable=False, index=True)
    shipping_address = Column(Text, nullable=True)
    tracking_number = Column(String(100), nullable=True)
    courier_name = Column(String(100), nullable=True)
    estimated_delivery = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False, cascade="all, delete-orphan")
