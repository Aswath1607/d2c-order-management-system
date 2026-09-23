from __future__ import annotations

from sqlalchemy import CheckConstraint, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_inventory_transactions_quantity_non_negative"),
        CheckConstraint("previous_stock >= 0", name="ck_inventory_transactions_previous_stock_non_negative"),
        CheckConstraint("new_stock >= 0", name="ck_inventory_transactions_new_stock_non_negative"),
    )

    transaction_id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id", ondelete="RESTRICT"), nullable=False, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.inventory_id", ondelete="CASCADE"), nullable=True, index=True)
    transaction_type = Column(String(30), nullable=False, index=True)
    quantity = Column(Float, nullable=False)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(String(100), nullable=True)
    previous_stock = Column(Float, nullable=False)
    new_stock = Column(Float, nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    product = relationship("Product", back_populates="inventory_transactions")
    inventory = relationship("Inventory", back_populates="transactions")
