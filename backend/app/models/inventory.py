from __future__ import annotations

from sqlalchemy import CheckConstraint, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (
        CheckConstraint("stock_quantity >= 0", name="ck_inventory_stock_non_negative"),
        CheckConstraint("reserved_quantity >= 0", name="ck_inventory_reserved_non_negative"),
        CheckConstraint("available_quantity >= 0", name="ck_inventory_available_non_negative"),
        CheckConstraint("reorder_level >= 0", name="ck_inventory_reorder_level_non_negative"),
        CheckConstraint("reorder_quantity >= 0", name="ck_inventory_reorder_quantity_non_negative"),
        CheckConstraint("damaged_quantity >= 0", name="ck_inventory_damaged_non_negative"),
        CheckConstraint("available_quantity <= stock_quantity", name="ck_inventory_available_lte_stock"),
    )

    inventory_id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    stock_quantity = Column(Float, default=0.0, nullable=False)
    reserved_quantity = Column(Float, default=0.0, nullable=False)
    damaged_quantity = Column(Float, default=0.0, nullable=False)
    reorder_level = Column(Float, default=0.0, nullable=False)
    reorder_quantity = Column(Float, default=0.0, nullable=False)
    warehouse_location = Column(String(200), nullable=True)
    supplier_name = Column(String(200), nullable=True)
    available_quantity = Column(Float, default=0.0, nullable=False)
    last_restocked_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    product = relationship("Product", back_populates="inventory")
    transactions = relationship("InventoryTransaction", back_populates="inventory")

    @property
    def product_name(self) -> str | None:
        return self.product.product_name if self.product else None

    @property
    def sku(self) -> str | None:
        return self.product.sku if self.product else None

    @property
    def category(self) -> str | None:
        return self.product.category if self.product else None

    @property
    def product_status(self) -> str | None:
        return self.product.status if self.product else None
