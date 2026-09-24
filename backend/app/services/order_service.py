from datetime import datetime, timedelta, timezone
from math import isclose

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_status_history import OrderStatusHistory
from app.models.product import Product
from app.models.user import User
from app.services.alert_service import evaluate_product_alerts
from app.services.inventory_service import create_inventory_transaction
from app.services.payment_service import cancel_payment_for_order, create_payment, normalize_payment_method

VALID_ORDER_STATUS_TRANSITIONS = {
    "PENDING": {"CONFIRMED", "CANCELLED"},
    "PLACED": {"CONFIRMED", "CANCELLED"},
    "CONFIRMED": {"PROCESSING", "CANCELLED"},
    "PROCESSING": {"PACKED", "CANCELLED"},
    "PACKED": {"SHIPPED", "CANCELLED"},
    "SHIPPED": {"OUT_FOR_DELIVERY", "CANCELLED"},
    "OUT_FOR_DELIVERY": {"DELIVERED", "CANCELLED"},
    "DELIVERED": set(),
    "CANCELLED": set(),
}


def transition_allowed(current_status: str, new_status: str) -> bool:
    if current_status == new_status:
        return True
    return new_status in VALID_ORDER_STATUS_TRANSITIONS.get(current_status, set())


def record_order_status_history(db: Session, order: Order, status: str, note: str | None = None, changed_by: str | None = None) -> OrderStatusHistory:
    if not transition_allowed(order.order_status, status):
        raise HTTPException(status_code=409, detail=f"Order cannot transition from {order.order_status} to {status}.")
    history = OrderStatusHistory(order_id=order.order_id, status=status, note=note, changed_by=changed_by)
    db.add(history)
    return history


def generate_order_number() -> str:
    return f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{abs(hash(str(datetime.now(timezone.utc)))) % 10000}"


def create_order_transaction(db: Session, customer: Customer, items: list[dict], shipping_address: str, payment_method: str) -> Order:
    if not items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    validated_items = []
    subtotal = 0.0
    tax_total = 0.0
    discount_total = 0.0
    for item in items:
        product = db.query(Product).filter(Product.product_id == item["product_id"], Product.status == "ACTIVE").first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item['product_id']} not found or inactive")
        inventory = db.query(Inventory).filter(Inventory.product_id == product.product_id).first()
        if not inventory:
            raise HTTPException(status_code=404, detail=f"Inventory not configured for product {product.product_id}")
        qty = float(item["quantity"])
        if qty <= 0:
            raise HTTPException(status_code=400, detail=f"Quantity for product {product.product_id} must be positive")
        if qty > inventory.available_quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient inventory for product {product.product_id}")

        unit_price = float(product.price)
        discount_amount = min(unit_price * qty, (unit_price * qty) * (float(product.discount) / 100 if product.discount else 0))
        line_tax = (unit_price * qty - discount_amount) * (float(product.tax_rate) / 100 if product.tax_rate else 0)
        line_subtotal = (unit_price * qty) - discount_amount + line_tax
        subtotal += unit_price * qty
        discount_total += discount_amount
        tax_total += line_tax
        validated_items.append({
            "product": product,
            "inventory": inventory,
            "quantity": qty,
            "unit_price": unit_price,
            "discount": discount_amount,
            "tax": line_tax,
            "subtotal": line_subtotal,
        })

    shipping_charge = 0.0 if subtotal >= 1000 else 50.0
    total_amount = subtotal - discount_total + tax_total + shipping_charge

    payment_method = normalize_payment_method(payment_method)
    order = Order(
        order_number=generate_order_number(),
        customer_id=customer.customer_id,
        subtotal=subtotal,
        discount_amount=discount_total,
        tax_amount=tax_total,
        shipping_charge=shipping_charge,
        total_amount=total_amount,
        payment_status="PAYMENT_PENDING",
        payment_method=payment_method,
        order_status="PENDING",
        shipping_address=shipping_address,
        estimated_delivery=datetime.now(timezone.utc) + timedelta(days=5),
    )
    db.add(order)
    db.flush()

    for entry in validated_items:
        inventory = entry["inventory"]
        product = entry["product"]
        create_inventory_transaction(
            db,
            product,
            inventory,
            "RESERVATION",
            entry["quantity"],
            "ORDER",
            str(order.order_id),
            f"Reserved stock for order {order.order_number}",
        )

        order_item = OrderItem(
            order_id=order.order_id,
            product_id=product.product_id,
            quantity=entry["quantity"],
            unit_price=entry["unit_price"],
            discount=entry["discount"],
            tax=entry["tax"],
            subtotal=entry["subtotal"],
        )
        db.add(order_item)

    order.order_status = "CONFIRMED"
    payment = create_payment(db, order, payment_method)
    order.payment_status = payment.payment_status
    record_order_status_history(db, order, "CONFIRMED", "Order confirmed and queued for fulfillment.", "system")
    db.flush()

    for entry in validated_items:
        inventory = entry["inventory"]
        product = entry["product"]
        inventory.reserved_quantity = max(0.0, inventory.reserved_quantity - entry["quantity"])
        inventory.available_quantity = max(0.0, inventory.stock_quantity - inventory.reserved_quantity - inventory.damaged_quantity)
        inventory.updated_at = datetime.now(timezone.utc)
        create_inventory_transaction(
            db,
            product,
            inventory,
            "OUT",
            entry["quantity"],
            "ORDER",
            str(order.order_id),
            f"Stock deducted for order {order.order_number}",
        )
        evaluate_product_alerts(db, product, inventory)

    return order


def cancel_order_transaction(db: Session, order: Order, changed_by: str, note: str | None = None) -> Order:
    if order.order_status == "CANCELLED":
        raise HTTPException(status_code=409, detail="Order is already cancelled")
    if not transition_allowed(order.order_status, "CANCELLED"):
        raise HTTPException(status_code=409, detail=f"Order cannot transition from {order.order_status} to CANCELLED.")

    for item in order.items:
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        inventory = db.query(Inventory).filter(Inventory.product_id == item.product_id).first()
        if product and inventory:
            create_inventory_transaction(
                db,
                product,
                inventory,
                "RETURN",
                item.quantity,
                "ORDER_CANCELLATION",
                str(order.order_id),
                f"Stock restored after order {order.order_number} cancellation",
            )

    order.order_status = "CANCELLED"
    order.cancelled_at = datetime.now(timezone.utc)
    cancel_payment_for_order(db, order.payment, changed_by) if order.payment else None
    record_order_status_history(db, order, "CANCELLED", note or "Order cancelled and stock restored.", changed_by)
    return order
