from __future__ import annotations

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(trim(name)) >= 2", name="ck_users_name_length"),
        CheckConstraint("role IN ('ADMIN', 'CUSTOMER', 'WORKER', 'DELIVERY_AGENT')", name="ck_users_role"),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="CUSTOMER")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    customer = relationship("Customer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    worker_profile = relationship("WorkerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    delivery_agent_profile = relationship("DeliveryAgentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    assigned_order_assignments = relationship("OrderAssignment", foreign_keys="OrderAssignment.assigned_to_user_id", back_populates="assigned_to")
    created_order_assignments = relationship("OrderAssignment", foreign_keys="OrderAssignment.assigned_by_user_id", back_populates="assigned_by")
