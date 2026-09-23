from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.alert import Alert
from app.models.category import Category
from app.models.inventory import Inventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.order_item import OrderItem
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductListResponse, ProductOut, ProductUpdate
from app.services.inventory_service import create_inventory_transaction

router = APIRouter()


@router.get("", response_model=ProductListResponse)
def list_products(
    name: str | None = Query(default=None),
    sku: str | None = Query(default=None),
    category: str | None = Query(default=None),
    category_id: int | None = Query(default=None, ge=1),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Product)
    public_catalog = current_user.role != "ADMIN"
    if public_catalog:
        query = query.join(Category).filter(Product.status == "ACTIVE", Category.status == "ACTIVE")
    if name:
        query = query.filter(Product.product_name.ilike(f"%{name}%"))
    if sku:
        query = query.filter(Product.sku.ilike(f"%{sku}%"))
    if category:
        if not public_catalog:
            query = query.join(Category)
        query = query.filter((Category.slug == category) | (Category.name.ilike(f"%{category}%")))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if status:
        query = query.filter(Product.status == status)
    total = query.count()
    items = query.order_by(Product.product_id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "page": page, "page_size": page_size, "total": total, "total_pages": (total + page_size - 1) // page_size}


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(Product).filter(Product.product_id == product_id)
    if current_user.role != "ADMIN":
        query = query.join(Category).filter(Product.status == "ACTIVE", Category.status == "ACTIVE")
    product = query.first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    existing = db.query(Product).filter(Product.sku == payload.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists")
    category = db.query(Category).filter(Category.category_id == payload.category_id, Category.status == "ACTIVE").first()
    if not category:
        raise HTTPException(status_code=422, detail="Please select a valid active category")
    product_data = payload.model_dump()
    product_data["category"] = category.name
    initial_stock = product_data.pop("initial_stock")
    reorder_level = product_data.pop("reorder_level")
    reorder_quantity = product_data.pop("reorder_quantity")
    warehouse_location = product_data.pop("warehouse_location")
    supplier_name = product_data.pop("supplier_name")
    product = Product(**product_data)
    db.add(product)
    db.flush()
    inventory = Inventory(
        product_id=product.product_id,
        stock_quantity=0,
        reserved_quantity=0,
        available_quantity=0,
        reorder_level=reorder_level,
        reorder_quantity=reorder_quantity,
        damaged_quantity=0,
        warehouse_location=warehouse_location,
        supplier_name=supplier_name,
    )
    db.add(inventory)
    db.flush()
    if initial_stock:
        create_inventory_transaction(db, product, inventory, "IN", initial_stock, "PRODUCT", str(product.product_id), "Initial product stock")
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    duplicate = db.query(Product).filter(Product.sku == payload.sku, Product.product_id != product_id).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists")
    category = db.query(Category).filter(Category.category_id == payload.category_id, Category.status == "ACTIVE").first()
    if not category:
        raise HTTPException(status_code=422, detail="Please select a valid active category")
    update_data = payload.model_dump()
    update_data["category"] = category.name
    for field, value in update_data.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if db.query(OrderItem).filter(OrderItem.product_id == product_id).first():
        raise HTTPException(status_code=409, detail="This product has historical orders and cannot be permanently deleted. Deactivate it instead.")
    db.query(Alert).filter(Alert.product_id == product_id).delete(synchronize_session=False)
    db.query(InventoryTransaction).filter(InventoryTransaction.product_id == product_id).delete(synchronize_session=False)
    db.query(Inventory).filter(Inventory.product_id == product_id).delete(synchronize_session=False)
    db.delete(product)
    db.commit()
