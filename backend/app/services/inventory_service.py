from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.product import Product


def validate_inventory_state(inventory: Inventory) -> None:
    if inventory.stock_quantity < 0:
        raise ValueError("Inventory stock cannot become negative")
    if inventory.reserved_quantity < 0:
        raise ValueError("Reserved quantity cannot be negative")
    if inventory.damaged_quantity < 0:
        raise ValueError("Damaged quantity cannot be negative")
    if inventory.reserved_quantity > inventory.stock_quantity:
        raise ValueError("Reserved quantity cannot exceed stock quantity")
    if inventory.damaged_quantity > inventory.stock_quantity:
        raise ValueError("Damaged quantity cannot exceed stock quantity")


def recalculate_inventory_values(inventory: Inventory) -> None:
    validate_inventory_state(inventory)
    inventory.available_quantity = max(0.0, inventory.stock_quantity - inventory.reserved_quantity - inventory.damaged_quantity)
    inventory.updated_at = datetime.now(timezone.utc)


def create_inventory_transaction(
    db: Session,
    product: Product,
    inventory: Inventory,
    transaction_type: str,
    quantity: float,
    reference_type: str | None = None,
    reference_id: str | None = None,
    remarks: str | None = None,
) -> None:
    previous_stock = inventory.stock_quantity
    if transaction_type in {"IN", "RETURN"}:
        inventory.stock_quantity += quantity
    elif transaction_type in {"OUT", "DAMAGE", "RESERVATION", "ADJUSTMENT"}:
        if transaction_type == "RESERVATION":
            if inventory.reserved_quantity + quantity > inventory.stock_quantity:
                raise ValueError("Reserved quantity cannot exceed stock quantity")
            inventory.reserved_quantity += quantity
        elif transaction_type == "ADJUSTMENT":
            inventory.stock_quantity += quantity
        else:
            if inventory.stock_quantity - quantity < 0:
                raise ValueError("Inventory cannot become negative")
            inventory.stock_quantity -= quantity
    elif transaction_type == "RELEASE":
        inventory.reserved_quantity = max(0.0, inventory.reserved_quantity - quantity)
    validate_inventory_state(inventory)
    recalculate_inventory_values(inventory)
    new_stock = inventory.stock_quantity
    tx = InventoryTransaction(
        product_id=product.product_id,
        inventory_id=inventory.inventory_id,
        transaction_type=transaction_type,
        quantity=abs(quantity),
        reference_type=reference_type,
        reference_id=str(reference_id) if reference_id is not None else None,
        previous_stock=previous_stock,
        new_stock=new_stock,
        remarks=remarks,
        created_at=datetime.now(timezone.utc),
    )
    db.add(tx)
