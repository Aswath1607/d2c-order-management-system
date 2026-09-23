from __future__ import annotations

from sqlalchemy import CheckConstraint, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        CheckConstraint("length(trim(name)) >= 1", name="ck_categories_name_not_empty"),
        CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_categories_status"),
    )

    category_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True, index=True)
    slug = Column(String(140), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default="ACTIVE", server_default="ACTIVE", index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    products = relationship("Product", back_populates="category_record")
