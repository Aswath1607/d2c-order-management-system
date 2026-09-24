from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_status_history import OrderStatusHistory
from app.models.order_tracking_history import OrderTrackingHistory
from app.models.product import Product
from app.models.user import User
from app.schemas.order import OrderCreate, OrderListResponse, OrderOut, OrderStatusHistoryOut, PaymentOut, TrackingUpdate
from app.services.order_service import cancel_order_transaction, create_order_transaction, record_order_status_history, transition_allowed
from app.services.payment_service import initiate_mock_payment, mark_cod_paid

router = APIRouter()


@router.get("", response_model=OrderListResponse)
def list_orders(
    search: str | None = Query(default=None),
    order_number: str | None = Query(default=None),
    status: str | None = Query(default=None),
    payment_status: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    sort: str = Query(default="newest", pattern="^(newest|oldest|highest|lowest)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        orders = db.query(Order).join(Customer).filter(Customer.user_id == current_user.id)
    else:
        orders = db.query(Order).join(Customer).join(User, User.id == Customer.user_id)
    if search:
        orders = orders.filter((Order.order_number.ilike(f"%{search}%")) | (Customer.email.ilike(f"%{search}%")) | (User.name.ilike(f"%{search}%")))
    if order_number:
        orders = orders.filter(Order.order_number.ilike(f"%{order_number}%"))
    if status:
        orders = orders.filter(Order.order_status == status)
    if payment_status:
        orders = orders.filter(Order.payment_status == payment_status)
    if date_from:
        orders = orders.filter(Order.order_date >= date_from)
    if date_to:
        orders = orders.filter(Order.order_date <= date_to)
    if sort == "oldest": orders = orders.order_by(Order.order_date.asc())
    elif sort == "highest": orders = orders.order_by(Order.total_amount.desc())
    elif sort == "lowest": orders = orders.order_by(Order.total_amount.asc())
    else: orders = orders.order_by(Order.order_date.desc())
    total = orders.count()
    items = orders.offset((page - 1) * page_size).limit(page_size).all()
    for order in items:
        setattr(order, "customer_name", order.customer.user.name if order.customer and order.customer.user else None)
        setattr(order, "customer_email", order.customer.email if order.customer else None)
        setattr(order, "items_count", len(order.items))
    return {"items": items, "page": page, "page_size": page_size, "total": total, "total_pages": (total + page_size - 1) // page_size}


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role != "ADMIN":
        customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
        if order.customer_id != customer.customer_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    setattr(order, "customer_name", order.customer.user.name if order.customer and order.customer.user else None)
    setattr(order, "customer_email", order.customer.email if order.customer else None)
    setattr(order, "items_count", len(order.items))
    return order


@router.post("", response_model=OrderOut)
def create_order(payload: OrderCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "CUSTOMER":
        raise HTTPException(status_code=403, detail="Only customers can place orders")
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer profile not found")
    try:
        order = create_order_transaction(db, customer, [item.model_dump() for item in payload.items], payload.shipping_address, payload.payment_method)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Order could not be created")
    db.refresh(order)
    return order


@router.post("/{order_id}/payment", response_model=PaymentOut)
def initiate_payment(order_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role != "ADMIN":
        customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
        if not customer or order.customer_id != customer.customer_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    if not order.payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    try:
        payment = initiate_mock_payment(db, order.payment, current_user.email)
        db.commit()
        db.refresh(payment)
        return payment
    except HTTPException:
        db.rollback()
        raise


@router.patch("/{order_id}/payment/cod", response_model=PaymentOut)
def update_cod_payment(order_id: int, payload: dict | None = None, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not order.payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    try:
        payment = mark_cod_paid(db, order.payment, current_user.email, (payload or {}).get("reference"))
        db.commit()
        db.refresh(payment)
        return payment
    except HTTPException:
        db.rollback()
        raise


@router.patch("/{order_id}/status")
def update_order_status(order_id: int, payload: dict, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    new_status = str(payload.get("status", "")).upper()
    if not new_status:
        raise HTTPException(status_code=400, detail="Order status is required")
    if not transition_allowed(order.order_status, new_status):
        raise HTTPException(status_code=409, detail=f"Order cannot transition from {order.order_status} to {new_status}.")
    try:
        if new_status == "CANCELLED":
            cancel_order_transaction(db, order, current_user.email, payload.get("note"))
        else:
            order.order_status = new_status
            record_order_status_history(db, order, new_status, payload.get("note"), current_user.email)
            if new_status == "DELIVERED" and order.delivered_at is None:
                order.delivered_at = datetime.now(timezone.utc)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Order status update could not be completed")
    db.refresh(order)
    return order


@router.patch("/{order_id}/tracking")
def update_order_tracking(order_id: int, payload: TrackingUpdate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    try:
        if payload.tracking_number is not None:
            order.tracking_number = payload.tracking_number
        if payload.courier_name is not None:
            order.courier_name = payload.courier_name
        if payload.estimated_delivery is not None:
            order.estimated_delivery = datetime.combine(payload.estimated_delivery, time.min, tzinfo=timezone.utc)
        db.add(OrderTrackingHistory(
            order_id=order.order_id,
            changed_by_user_id=current_user.id,
            tracking_number=order.tracking_number,
            courier_name=order.courier_name,
            estimated_delivery=order.estimated_delivery,
        ))
        db.commit()
        db.refresh(order)
        return order
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Tracking information could not be updated")


@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    cancel_order_transaction(db, order, current_user.email, "Order cancelled by administrator.")
    db.commit()
    return {"message": "Order cancelled"}
