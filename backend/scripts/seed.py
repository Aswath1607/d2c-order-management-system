from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.core.security import get_password_hash
from app.database.connection import SessionLocal
from app.models.alert import Alert
from app.models.category import Category
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_status_history import OrderStatusHistory
from app.models.product import Product
from app.models.user import User
from app.services.alert_service import evaluate_product_alerts

PRODUCTS = [
    ("Everyday Cotton Tee", "APP-TEE-001", "Apparel", "Soft cotton everyday t-shirt", 24.99, 9.50, "Northstar", 200.0, 20.0, "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80"),
    ("Classic Denim Jacket", "APP-JKT-002", "Apparel", "Midweight denim jacket", 89.00, 38.00, "Northstar", 140.0, 20.0, "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80"),
    ("Trail Running Shoes", "FTW-SHO-003", "Footwear", "Lightweight trail running shoes", 119.00, 52.00, "Pace", 55.0, 20.0, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"),
    ("Leather Crossbody Bag", "ACC-BAG-004", "Accessories", "Full grain leather crossbody bag", 74.00, 31.00, "Morrow", 30.0, 15.0, "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"),
    ("Merino Wool Socks", "APP-SOC-005", "Apparel", "Breathable merino wool socks", 18.00, 6.00, "Pace", 60.0, 15.0, "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=800&q=80"),
    ("Canvas Weekender", "ACC-BAG-006", "Accessories", "Structured canvas travel bag", 68.00, 27.00, "Morrow", 70.0, 15.0, "https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=800&q=80"),
    ("Insulated Water Bottle", "HOM-BOT-007", "Home", "Double-wall stainless steel bottle", 32.00, 12.00, "Terra", 80.0, 20.0, "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80"),
    ("Ceramic Pour Over Set", "HOM-COF-008", "Home", "Hand-finished pour over coffee set", 44.00, 18.00, "Terra", 50.0, 10.0, "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80"),
    ("Everyday Backpack", "ACC-BAG-009", "Accessories", "Recycled nylon commuter backpack", 82.00, 34.00, "Morrow", 65.0, 15.0, "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"),
    ("Linen Lounge Shorts", "APP-SHO-010", "Apparel", "Relaxed linen lounge shorts", 39.00, 15.00, "Northstar", 60.0, 15.0, "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80"),
    ("Minimal Desk Lamp", "HOM-LMP-011", "Home", "Warm LED desk lamp", 58.00, 23.00, "Terra", 45.0, 10.0, "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80"),
    ("Daily Journal", "STA-JRN-012", "Stationery", "Lay-flat recycled paper journal", 16.00, 5.00, "Morrow", 75.0, 20.0, "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80"),
]

CATEGORY_META = {
    "Apparel": ("apparel", "Everyday clothing and essentials", "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80"),
    "Footwear": ("footwear", "Shoes for everyday movement", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"),
    "Accessories": ("accessories", "Useful finishing touches", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"),
    "Home": ("home", "Thoughtful pieces for home", "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80"),
    "Stationery": ("stationery", "Tools for ideas and notes", "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80"),
}

CUSTOMERS = [
    ("Ava", "Sharma", "ava.sharma@example.com", "555-0101"),
    ("Noah", "Williams", "noah.williams@example.com", "555-0102"),
    ("Mia", "Patel", "mia.patel@example.com", "555-0103"),
    ("Liam", "Chen", "liam.chen@example.com", "555-0104"),
    ("Sofia", "Garcia", "sofia.garcia@example.com", "555-0105"),
]

# Product 1 and product 2 intentionally move much faster than the rest.
ORDER_LINES = [
    [(1, 8), (2, 3)],
    [(1, 6), (3, 2)],
    [(2, 5), (4, 2)],
    [(1, 7), (5, 3)],
    [(1, 5), (2, 4)],
    [(3, 4), (6, 2)],
    [(1, 9), (7, 2)],
    [(2, 6), (8, 2)],
    [(1, 8), (9, 2)],
    [(4, 5), (10, 2)],
    [(1, 7), (2, 3)],
    [(3, 3), (11, 2)],
    [(1, 6), (12, 3)],
    [(2, 5), (5, 3)],
    [(1, 8), (6, 2)],
    [(3, 3), (7, 2)],
    [(1, 7), (2, 4)],
    [(4, 4), (8, 2)],
    [(1, 6), (9, 2)],
    [(2, 5), (10, 2)],
]


def clear_development_data(db) -> None:
    for model in (Alert, InventoryTransaction, OrderItem, Order, Inventory, Product, Category, Customer, User):
        db.query(model).delete(synchronize_session=False)


def create_users_and_customers(db) -> list[Customer]:
    admin = User(
        name="D2C Administrator",
        email="admin@example.com",
        password_hash=get_password_hash("admin1234"),
        role="ADMIN",
    )
    db.add(admin)

    customers: list[Customer] = []
    for first_name, last_name, email, phone in CUSTOMERS:
        user = User(
            name=f"{first_name} {last_name}",
            email=email,
            password_hash=get_password_hash("customer123"),
            role="CUSTOMER",
        )
        db.add(user)
        db.flush()
        customer = Customer(
            user_id=user.id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            address_line1=f"{100 + user.id} Market Street",
            city="Bengaluru",
            state="Karnataka",
            pincode="560001",
            country="India",
            status="ACTIVE",
        )
        db.add(customer)
        customers.append(customer)

    db.flush()
    return customers


def create_categories(db) -> dict[str, Category]:
    categories = {}
    for name, (slug, description, image_url) in CATEGORY_META.items():
        category = Category(name=name, slug=slug, description=description, image_url=image_url, status="ACTIVE")
        db.add(category)
        categories[name] = category
    db.flush()
    return categories


def create_products_and_inventory(db, categories: dict[str, Category]) -> dict[int, tuple[Product, Inventory]]:
    product_inventory: dict[int, tuple[Product, Inventory]] = {}
    for product_slot, (name, sku, category, description, price, cost_price, brand, opening_stock, reorder_level, image_url) in enumerate(PRODUCTS, start=1):
        product = Product(
            product_name=name,
            sku=sku,
            category=category,
            category_id=categories[category].category_id,
            description=description,
            price=price,
            cost_price=cost_price,
            discount=0.0,
            tax_rate=5.0,
            brand=brand,
            image_url=image_url,
            weight=0.5,
            status="ACTIVE",
        )
        db.add(product)
        db.flush()
        inventory = Inventory(
            product_id=product.product_id,
            stock_quantity=opening_stock,
            reserved_quantity=0.0,
            available_quantity=opening_stock,
            reorder_level=reorder_level,
            reorder_quantity=max(reorder_level * 2, 10),
            damaged_quantity=0.0,
            warehouse_location="Bengaluru DC",
            supplier_name=f"{brand} Supply Co.",
            last_restocked_at=datetime.now(timezone.utc) - timedelta(days=45),
        )
        db.add(inventory)
        db.flush()
        db.add(InventoryTransaction(
            product_id=product.product_id,
            inventory_id=inventory.inventory_id,
            transaction_type="IN",
            quantity=opening_stock,
            reference_type="SEED",
            reference_id="opening-balance",
            previous_stock=0.0,
            new_stock=opening_stock,
            remarks="Development seed opening stock",
            created_at=datetime.now(timezone.utc) - timedelta(days=45),
        ))
        product_inventory[product_slot] = (product, inventory)
    db.flush()
    return product_inventory


def create_historical_orders(db, customers: list[Customer], product_inventory: dict[int, tuple[Product, Inventory]]) -> None:
    now = datetime.now(timezone.utc)
    for order_index, lines in enumerate(ORDER_LINES, start=1):
        order_date = now - timedelta(days=order_index + 1)
        customer = customers[(order_index - 1) % len(customers)]
        subtotal = 0.0
        tax_total = 0.0
        order_items: list[tuple[Product, Inventory, float, float, float]] = []

        for product_id, quantity in lines:
            product, inventory = product_inventory[product_id]
            unit_price = float(product.price)
            line_subtotal = unit_price * quantity
            line_tax = line_subtotal * (float(product.tax_rate) / 100)
            subtotal += line_subtotal
            tax_total += line_tax
            order_items.append((product, inventory, float(quantity), unit_price, line_tax))

        shipping_charge = 0.0 if subtotal >= 100.0 else 10.0
        total_amount = subtotal + tax_total + shipping_charge
        order = Order(
            order_number=f"SEED-{order_date.strftime('%Y%m%d')}-{order_index:04d}",
            customer_id=customer.customer_id,
            order_date=order_date,
            subtotal=subtotal,
            discount_amount=0.0,
            tax_amount=tax_total,
            shipping_charge=shipping_charge,
            total_amount=total_amount,
            payment_status="PAID",
            payment_method="CARD" if order_index % 2 else "UPI",
            order_status="DELIVERED",
            shipping_address=f"{customer.address_line1}, {customer.city}, {customer.state} {customer.pincode}",
            tracking_number=f"TRK{order_index:08d}",
            courier_name="BlueDart" if order_index % 2 else "Delhivery",
            estimated_delivery=order_date + timedelta(days=5),
            delivered_at=order_date + timedelta(days=4),
            created_at=order_date,
            updated_at=order_date + timedelta(days=4),
        )
        db.add(order)
        db.flush()
        db.add(OrderStatusHistory(order_id=order.order_id, status=order.order_status, note="Seeded historical order state", changed_by="system", created_at=order_date))

        for product, inventory, quantity, unit_price, line_tax in order_items:
            previous_stock = inventory.stock_quantity
            inventory.stock_quantity -= quantity
            inventory.available_quantity = inventory.stock_quantity - inventory.reserved_quantity - inventory.damaged_quantity
            db.add(OrderItem(
                order_id=order.order_id,
                product_id=product.product_id,
                quantity=quantity,
                unit_price=unit_price,
                discount=0.0,
                tax=line_tax,
                subtotal=unit_price * quantity + line_tax,
                created_at=order_date,
            ))
            db.add(InventoryTransaction(
                product_id=product.product_id,
                inventory_id=inventory.inventory_id,
                transaction_type="OUT",
                quantity=quantity,
                reference_type="ORDER",
                reference_id=str(order.order_id),
                previous_stock=previous_stock,
                new_stock=inventory.stock_quantity,
                remarks=f"Historical seed order {order.order_number}",
                created_at=order_date,
            ))

    db.flush()

    for product, inventory in product_inventory.values():
        evaluate_product_alerts(db, product, inventory)
    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        clear_development_data(db)
        customers = create_users_and_customers(db)
        categories = create_categories(db)
        product_inventory = create_products_and_inventory(db, categories)
        create_historical_orders(db, customers, product_inventory)
        print("Seed complete: 1 admin, 5 customers, 12 products, 20 orders, inventory transactions, and alerts created.")
        print("Admin login: admin@example.com / admin1234")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
