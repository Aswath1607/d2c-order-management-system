from __future__ import annotations

from sqlalchemy import CheckConstraint, Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint("length(trim(first_name)) >= 1", name="ck_customers_first_name"),
        CheckConstraint("length(trim(last_name)) >= 1", name="ck_customers_last_name"),
    )

    customer_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(30), index=True, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    status = Column(String(20), default="ACTIVE", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="customer")
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
