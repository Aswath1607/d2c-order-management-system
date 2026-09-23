from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.database.connection import get_db
from app.models.alert import Alert
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.product import Product
from app.services.analytics_service import get_alerts, get_dashboard_summary, get_fast_moving_products, get_inventory_status, get_sales_over_time, get_top_products

router = APIRouter()


@router.get("/summary")
def summary(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return get_dashboard_summary(db)


@router.get("/sales")
def sales(days: int = Query(default=30, ge=1), db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return get_sales_over_time(db, days)


@router.get("/orders")
def orders(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    rows = db.query(Order.order_status, Order.order_id).all()
    return {"items": [{"order_status": row.order_status, "order_id": row.order_id} for row in rows]}


@router.get("/top-products")
def top_products(limit: int = Query(default=5, ge=1), db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return get_top_products(db, limit)


@router.get("/fast-moving-products")
def fast_moving_products(days: int = Query(default=30, ge=1), db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return get_fast_moving_products(db, days)


@router.get("/inventory")
def inventory_summary(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return get_inventory_status(db)


@router.get("/alerts")
def alerts(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return get_alerts(db)
