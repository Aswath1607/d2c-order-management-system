import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.connection import Base
from app.models.category import Category
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.payment import Payment
from app.models.product import Product
from app.models.user import User
from app.services.order_service import cancel_order_transaction


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def order_with_stock(db_session, payment_status="PAYMENT_PENDING"):
    category = Category(name="Test", slug="test", status="ACTIVE")
    db_session.add(category)
    db_session.flush()
    user = User(name="Order User", email="order@example.com", password_hash="hash", role="CUSTOMER")
    db_session.add(user)
    db_session.flush()
    customer = Customer(user_id=user.id, first_name="Order", last_name="User", email=user.email, status="ACTIVE")
    db_session.add(customer)
    db_session.flush()
    product = Product(product_name="Test Product", sku="ORDER-001", category="Test", category_id=category.category_id, price=10, cost_price=5)
    db_session.add(product)
    db_session.flush()
    inventory = Inventory(product_id=product.product_id, stock_quantity=7, available_quantity=7)
    db_session.add(inventory)
    order = Order(order_number="ORD-CANCEL-1", customer_id=customer.customer_id, total_amount=30, payment_method="COD", payment_status=payment_status, order_status="CONFIRMED")
    db_session.add(order)
    db_session.flush()
    db_session.add(OrderItem(order_id=order.order_id, product_id=product.product_id, quantity=3, unit_price=10, discount=0, tax=0, subtotal=30))
    db_session.add(Payment(order_id=order.order_id, payment_method="COD", payment_status=payment_status, amount=30, currency="INR", provider="COD"))
    db_session.commit()
    db_session.refresh(order)
    db_session.refresh(inventory)
    return order, inventory


def test_cancellation_restores_stock_and_cancels_pending_payment(db_session):
    order, inventory = order_with_stock(db_session)

    cancel_order_transaction(db_session, order, "admin@example.com")
    db_session.commit()

    assert order.order_status == "CANCELLED"
    assert order.cancelled_at is not None
    assert inventory.stock_quantity == 10
    assert inventory.available_quantity == 10
    assert order.payment.payment_status == "PAYMENT_CANCELLED"
    assert db_session.query(InventoryTransaction).filter(InventoryTransaction.transaction_type == "RETURN").count() == 1


def test_successful_payment_becomes_refunded_on_cancellation(db_session):
    order, _ = order_with_stock(db_session, payment_status="PAYMENT_SUCCESS")

    cancel_order_transaction(db_session, order, "admin@example.com")
    db_session.commit()

    assert order.payment.payment_status == "PAYMENT_REFUNDED"


def test_repeated_cancellation_is_rejected(db_session):
    order, _ = order_with_stock(db_session)
    cancel_order_transaction(db_session, order, "admin@example.com")
    db_session.commit()

    with pytest.raises(HTTPException) as error:
        cancel_order_transaction(db_session, order, "admin@example.com")

    assert error.value.status_code == 409