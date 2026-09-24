from __future__ import annotations

from sqlalchemy import CheckConstraint, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_payments_amount_non_negative"),
    )

    payment_id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    payment_method = Column(String(20), nullable=False)
    payment_status = Column(String(30), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    provider = Column(String(50), nullable=False, default="MOCK")
    provider_transaction_id = Column(String(150), nullable=True, unique=True)
    payment_reference = Column(String(150), nullable=True)
    failure_reason = Column(Text, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    order = relationship("Order", back_populates="payment")
    history = relationship("PaymentHistory", back_populates="payment", cascade="all, delete-orphan", order_by="PaymentHistory.created_at")


class PaymentHistory(Base):
    __tablename__ = "payment_history"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.payment_id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=False)
    note = Column(Text, nullable=True)
    changed_by = Column(String(150), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    payment = relationship("Payment", back_populates="history")