from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.database.connection import get_db
from app.models.inventory import Inventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.product import Product
from app.schemas.inventory import InventoryListResponse, InventoryOut, InventoryTransactionRequest, InventoryUpdate
from app.services.inventory_service import create_inventory_transaction, recalculate_inventory_values

router = APIRouter()


@router.get("", response_model=InventoryListResponse)
def list_inventory(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    stock_status: str | None = Query(default=None),
    supplier: str | None = Query(default=None),
    sort: str = Query(default="newest"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    query = db.query(Inventory).join(Product)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.product_name.ilike(term),
                Product.sku.ilike(term),
                Inventory.supplier_name.ilike(term),
                Inventory.warehouse_location.ilike(term),
            )
        )
    if status:
        query = query.filter(Product.status == status)
    if supplier:
        query = query.filter(Inventory.supplier_name.ilike(f"%{supplier.strip()}%"))
    if stock_status == "OUT":
        query = query.filter(Inventory.available_quantity <= 0)
    elif stock_status == "LOW":
        query = query.filter(Inventory.available_quantity > 0, Inventory.available_quantity <= Inventory.reorder_level)
    elif stock_status == "HEALTHY":
        query = query.filter(Inventory.available_quantity > Inventory.reorder_level)

    if sort == "name-asc":
        query = query.order_by(Product.product_name.asc())
    elif sort == "name-desc":
        query = query.order_by(Product.product_name.desc())
    elif sort == "stock-asc":
        query = query.order_by(Inventory.available_quantity.asc())
    elif sort == "stock-desc":
        query = query.order_by(Inventory.available_quantity.desc())
    elif sort == "reorder-asc":
        query = query.order_by(Inventory.reorder_level.asc())
    elif sort == "reorder-desc":
        query = query.order_by(Inventory.reorder_level.desc())
    else:
        query = query.order_by(Inventory.inventory_id.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "page": page, "page_size": page_size, "total": total, "total_pages": (total + page_size - 1) // page_size}


@router.get("/{product_id}", response_model=InventoryOut)
def get_inventory(product_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found for product")
    return inventory


@router.put("/{product_id}", response_model=InventoryOut)
def update_inventory(product_id: int, payload: InventoryUpdate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    if payload.stock_quantity < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    if payload.reserved_quantity < 0:
        raise HTTPException(status_code=400, detail="Reserved quantity cannot be negative")
    if payload.damaged_quantity < 0:
        raise HTTPException(status_code=400, detail="Damaged quantity cannot be negative")
    if payload.reserved_quantity > payload.stock_quantity:
        raise HTTPException(status_code=400, detail="Reserved quantity cannot exceed stock quantity")
    if payload.damaged_quantity > payload.stock_quantity:
        raise HTTPException(status_code=400, detail="Damaged quantity cannot exceed stock quantity")
    inventory.stock_quantity = payload.stock_quantity
    inventory.reserved_quantity = payload.reserved_quantity
    inventory.damaged_quantity = payload.damaged_quantity
    inventory.reorder_level = payload.reorder_level
    inventory.reorder_quantity = payload.reorder_quantity
    inventory.warehouse_location = payload.warehouse_location
    inventory.supplier_name = payload.supplier_name
    recalculate_inventory_values(inventory)
    db.commit()
    db.refresh(inventory)
    return inventory


@router.post("/{product_id}/adjust", response_model=InventoryOut)
def adjust_inventory(product_id: int, quantity: float, payload: InventoryTransactionRequest | None = Body(default=None), db: Session = Depends(get_db), current_user=Depends(require_admin)):
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    if quantity == 0:
        raise HTTPException(status_code=400, detail="Adjustment quantity cannot be zero")
    if inventory.stock_quantity + quantity < 0:
        raise HTTPException(status_code=400, detail="Inventory cannot become negative")
    create_inventory_transaction(db, inventory.product, inventory, "ADJUSTMENT", quantity, "INVENTORY", str(product_id), (payload.remarks if payload else None) or f"Manual inventory adjustment: {quantity}")
    db.commit()
    db.refresh(inventory)
    return inventory


@router.post("/{product_id}/restock", response_model=InventoryOut)
def restock_inventory(product_id: int, quantity: float, payload: InventoryTransactionRequest | None = Body(default=None), db: Session = Depends(get_db), current_user=Depends(require_admin)):
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Restock quantity must be positive")
    inventory.last_restocked_at = datetime.now(timezone.utc)
    create_inventory_transaction(db, inventory.product, inventory, "IN", quantity, "INVENTORY", str(product_id), (payload.remarks if payload else None) or f"Restock for product {product_id}")
    db.commit()
    db.refresh(inventory)
    return inventory


@router.get("/{product_id}/history")
def inventory_history(product_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    history = db.query(InventoryTransaction).filter(InventoryTransaction.product_id == product_id).order_by(InventoryTransaction.created_at.desc()).all()
    return history
