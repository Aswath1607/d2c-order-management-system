from __future__ import annotations

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        CheckConstraint("current_stock >= 0", name="ck_alerts_current_stock_non_negative"),
        CheckConstraint("threshold >= 0", name="ck_alerts_threshold_non_negative"),
    )

    alert_id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(String(30), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    message = Column(Text, nullable=False)
    current_stock = Column(Integer, nullable=False)
    threshold = Column(Integer, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    product = relationship("Product", back_populates="alerts")
