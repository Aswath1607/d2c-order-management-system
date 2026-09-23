from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product


def get_dashboard_summary(db: Session):
    today = datetime.now(timezone.utc).date()
    now = datetime.now(timezone.utc)
    last_30 = now - timedelta(days=30)
    last_7 = now - timedelta(days=7)
    last_90 = now - timedelta(days=90)
    last_year = now - timedelta(days=365)

    total_sales = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(Order.order_status != "CANCELLED").scalar() or 0
    total_orders = db.query(func.count(Order.order_id)).filter(Order.order_status != "CANCELLED").scalar() or 0
    total_customers = db.query(func.count(Customer.customer_id)).scalar() or 0
    total_products = db.query(func.count(Product.product_id)).scalar() or 0
    todays_sales = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(func.date(Order.order_date) == today, Order.order_status != "CANCELLED").scalar() or 0
    todays_orders = db.query(func.count(Order.order_id)).filter(func.date(Order.order_date) == today, Order.order_status != "CANCELLED").scalar() or 0
    low_stock_products = db.query(func.count(Inventory.inventory_id)).filter(Inventory.available_quantity <= Inventory.reorder_level).scalar() or 0
    out_of_stock_products = db.query(func.count(Inventory.inventory_id)).filter(Inventory.available_quantity <= 0).scalar() or 0

    return {
        "total_sales": float(total_sales),
        "total_orders": int(total_orders),
        "total_customers": int(total_customers),
        "total_products": int(total_products),
        "todays_sales": float(todays_sales),
        "todays_orders": int(todays_orders),
        "low_stock_products": int(low_stock_products),
        "out_of_stock_products": int(out_of_stock_products),
    }


def get_sales_over_time(db: Session, days=30):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    rows = (
        db.query(func.date(Order.order_date).label("period"), func.sum(Order.total_amount).label("sales"), func.count(Order.order_id).label("orders"))
        .filter(Order.order_date >= start, Order.order_date <= end, Order.order_status != "CANCELLED")
        .group_by(func.date(Order.order_date))
        .order_by(func.date(Order.order_date))
        .all()
    )
    return [{"period": row.period.strftime("%Y-%m-%d"), "sales": float(row.sales or 0), "orders": int(row.orders or 0)} for row in rows]


def get_top_products(db: Session, limit=5):
    rows = (
        db.query(Product.product_id, Product.product_name, func.sum(OrderItem.quantity).label("units_sold"), func.sum(OrderItem.subtotal).label("revenue"))
        .join(OrderItem, OrderItem.product_id == Product.product_id)
        .join(Order, Order.order_id == OrderItem.order_id)
        .filter(Order.order_status != "CANCELLED")
        .group_by(Product.product_id, Product.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
        .all()
    )
    return [{"product_id": row.product_id, "product_name": row.product_name, "units_sold": float(row.units_sold or 0), "revenue": float(row.revenue or 0)} for row in rows]


def get_fast_moving_products(db: Session, days=30):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    rows = (
        db.query(
            Product.product_id,
            Product.product_name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.avg(OrderItem.unit_price).label("avg_price"),
            Inventory.available_quantity,
            Inventory.reorder_level,
        )
        .join(OrderItem, OrderItem.product_id == Product.product_id)
        .join(Order, Order.order_id == OrderItem.order_id)
        .join(Inventory, Inventory.product_id == Product.product_id)
        .filter(OrderItem.created_at >= start, OrderItem.created_at <= end, Order.order_status != "CANCELLED")
        .group_by(Product.product_id, Product.product_name, Inventory.available_quantity, Inventory.reorder_level)
        .order_by(func.sum(OrderItem.quantity).desc())
        .all()
    )
    result = []
    for row in rows:
        units_sold = float(row.units_sold or 0)
        sales_velocity = units_sold / max(days, 1)
        available_quantity = float(row.available_quantity or 0)
        days_of_stock = (available_quantity / sales_velocity) if sales_velocity else None
        result.append({
            "product_id": row.product_id,
            "product_name": row.product_name,
            "units_sold": units_sold,
            "sales_velocity": sales_velocity,
            "available_quantity": available_quantity,
            "reorder_level": float(row.reorder_level or 0),
            "days_of_stock": days_of_stock,
        })
    return result


def get_inventory_status(db: Session):
    rows = (
        db.query(
            case((Inventory.available_quantity <= 0, "OUT_OF_STOCK"), (Inventory.available_quantity <= Inventory.reorder_level, "LOW_STOCK"), else_="HEALTHY").label("status"),
            func.count(Inventory.inventory_id).label("count"),
        )
        .group_by("status")
        .all()
    )
    return [{"status": row.status, "count": int(row.count)} for row in rows]


def get_alerts(db: Session):
    rows = (
        db.query(Alert, Product.product_name)
        .join(Product, Product.product_id == Alert.product_id)
        .order_by(Alert.created_at.desc())
        .all()
    )
    return [{
        "alert_id": alert.alert_id,
        "product_id": alert.product_id,
        "product_name": product_name,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "message": alert.message,
        "current_stock": alert.current_stock,
        "threshold": alert.threshold,
        "is_read": alert.is_read,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
    } for alert, product_name in rows]
