from __future__ import annotations

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class OrderAssignment(Base):
    __tablename__ = "order_assignments"
    __table_args__ = (
        CheckConstraint("assignment_type IN ('WORKER', 'DELIVERY_AGENT')", name="ck_order_assignments_type"),
        CheckConstraint("status IN ('ASSIGNED', 'ACCEPTED', 'COMPLETED', 'REASSIGNED', 'CANCELLED')", name="ck_order_assignments_status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    assignment_type = Column(String(20), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="ASSIGNED", index=True)
    assigned_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    order = relationship("Order", back_populates="assignments")
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id], back_populates="assigned_order_assignments")
    assigned_by = relationship("User", foreign_keys=[assigned_by_user_id], back_populates="created_order_assignments")

    @property
    def order_number(self) -> str:
        return self.order.order_number

    @property
    def order_status(self) -> str:
        return self.order.order_status

    @property
    def assigned_to_name(self) -> str:
        return self.assigned_to.name