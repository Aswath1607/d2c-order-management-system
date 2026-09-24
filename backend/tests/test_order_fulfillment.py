import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.connection import Base
from app.models.category import Category
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.order_assignment import OrderAssignment
from app.models.payment import Payment
from app.models.product import Product
from app.models.user import User
from app.services.assignment_service import assign_order, fulfill_assignment, update_assignment_status


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def setup_fulfillment(db_session, order_status="CONFIRMED", assignment_type="WORKER", assignment_status="ACCEPTED"):
    admin = User(name="Admin User", email="fulfill-admin@example.com", password_hash="hash", role="ADMIN")
    worker = User(name="Worker A", email="fulfill-worker@example.com", password_hash="hash", role="WORKER")
    other_worker = User(name="Worker B", email="other-worker@example.com", password_hash="hash", role="WORKER")
    agent = User(name="Agent A", email="fulfill-agent@example.com", password_hash="hash", role="DELIVERY_AGENT")
    other_agent = User(name="Agent B", email="other-agent@example.com", password_hash="hash", role="DELIVERY_AGENT")
    customer_user = User(name="Customer User", email="fulfill-customer@example.com", password_hash="hash", role="CUSTOMER")
    db_session.add_all([admin, worker, other_worker, agent, other_agent, customer_user])
    db_session.flush()

    customer = Customer(user_id=customer_user.id, first_name="Customer", last_name="User", email=customer_user.email, status="ACTIVE")
    category = Category(name="Fulfillment", slug="fulfillment", status="ACTIVE")
    db_session.add_all([customer, category])
    db_session.flush()
    product = Product(product_name="Fulfillment Product", sku="FULFILL-1", category="Fulfillment", category_id=category.category_id, price=100, cost_price=50, weight=1)
    db_session.add(product)
    db_session.flush()
    inventory = Inventory(product_id=product.product_id, stock_quantity=10, reserved_quantity=2, available_quantity=8)
    order = Order(order_number="ORD-FULFILL-1", customer_id=customer.customer_id, total_amount=100, payment_status="PAYMENT_PENDING", payment_method="COD", order_status=order_status)
    db_session.add_all([inventory, order])
    db_session.flush()
    payment = Payment(order_id=order.order_id, payment_method="COD", payment_status="PAYMENT_PENDING", amount=100, currency="INR", provider="COD")
    db_session.add(payment)
    target = worker if assignment_type == "WORKER" else agent
    assignment = OrderAssignment(order_id=order.order_id, assigned_to_user_id=target.id, assignment_type=assignment_type, status=assignment_status, assigned_by_user_id=admin.id)
    db_session.add(assignment)
    db_session.commit()
    db_session.refresh(order)
    db_session.refresh(assignment)
    return order, assignment, admin, worker, other_worker, agent, other_agent, inventory, payment


def fulfill(db_session, assignment, user, action):
    result = fulfill_assignment(db_session, assignment.id, user, action)
    db_session.commit()
    db_session.refresh(assignment)
    db_session.refresh(assignment.order)
    return result


def test_worker_can_start_processing_own_accepted_assignment(db_session):
    order, assignment, _, worker, _, _, _, _, _ = setup_fulfillment(db_session)
    fulfill(db_session, assignment, worker, "START_PROCESSING")
    assert order.order_status == "PROCESSING"
    assert assignment.status == "ACCEPTED"
    assert len(order.status_history) == 1
    assert order.status_history[0].status == "PROCESSING"
    assert order.status_history[0].changed_by == worker.email
    assert order.delivered_at is None


def test_worker_can_mark_packed_and_completes_assignment(db_session):
    order, assignment, _, worker, _, _, _, _, _ = setup_fulfillment(db_session, order_status="PROCESSING")
    fulfill(db_session, assignment, worker, "MARK_PACKED")
    assert order.order_status == "PACKED"
    assert assignment.status == "COMPLETED"
    assert assignment.completed_at is not None
    assert len(order.status_history) == 1


def test_delivery_agent_can_mark_out_for_delivery(db_session):
    order, assignment, _, _, _, agent, _, _, _ = setup_fulfillment(db_session, order_status="SHIPPED", assignment_type="DELIVERY_AGENT")
    fulfill(db_session, assignment, agent, "MARK_OUT_FOR_DELIVERY")
    assert order.order_status == "OUT_FOR_DELIVERY"
    assert assignment.status == "ACCEPTED"
    assert order.delivered_at is None


def test_delivery_agent_can_mark_delivered_and_completes_assignment(db_session):
    order, assignment, _, _, _, agent, _, _, _ = setup_fulfillment(db_session, order_status="OUT_FOR_DELIVERY", assignment_type="DELIVERY_AGENT")
    fulfill(db_session, assignment, agent, "MARK_DELIVERED")
    assert order.order_status == "DELIVERED"
    assert assignment.status == "COMPLETED"
    assert assignment.completed_at is not None
    assert order.delivered_at is not None


@pytest.mark.parametrize(
    ("order_status", "assignment_type", "user_role", "action"),
    [
        ("CONFIRMED", "WORKER", "WORKER", "MARK_PACKED"),
        ("PACKED", "DELIVERY_AGENT", "DELIVERY_AGENT", "MARK_OUT_FOR_DELIVERY"),
        ("CONFIRMED", "DELIVERY_AGENT", "WORKER", "MARK_OUT_FOR_DELIVERY"),
        ("SHIPPED", "WORKER", "WORKER", "MARK_OUT_FOR_DELIVERY"),
    ],
)
def test_fulfillment_rejects_wrong_status_or_role(db_session, order_status, assignment_type, user_role, action):
    order, assignment, _, worker, _, agent, _, _, _ = setup_fulfillment(db_session, order_status=order_status, assignment_type=assignment_type)
    user = worker if user_role == "WORKER" else agent
    with pytest.raises(HTTPException) as error:
        fulfill_assignment(db_session, assignment.id, user, action)
    assert error.value.status_code in {403, 409}
    db_session.rollback()
    db_session.refresh(order)
    db_session.refresh(assignment)
    assert order.order_status == order_status
    assert assignment.status == "ACCEPTED"
    assert order.status_history == []


def test_worker_cannot_use_another_workers_assignment(db_session):
    order, assignment, _, worker, other_worker, _, _, _, _ = setup_fulfillment(db_session)
    with pytest.raises(HTTPException) as error:
        fulfill_assignment(db_session, assignment.id, other_worker, "START_PROCESSING")
    assert error.value.status_code == 403
    db_session.rollback()
    assert order.order_status == "CONFIRMED"
    assert assignment.status == "ACCEPTED"


@pytest.mark.parametrize("assignment_status", ["CANCELLED", "COMPLETED"])
def test_worker_cannot_fulfill_cancelled_or_completed_assignment(db_session, assignment_status):
    order, assignment, _, worker, _, _, _, _, _ = setup_fulfillment(db_session, assignment_status=assignment_status)
    with pytest.raises(HTTPException) as error:
        fulfill_assignment(db_session, assignment.id, worker, "START_PROCESSING")
    assert error.value.status_code == 409
    db_session.rollback()
    assert order.order_status == "CONFIRMED"
    assert assignment.status == assignment_status


def test_worker_cannot_skip_confirmed_to_packed(db_session):
    order, assignment, _, worker, _, _, _, _, _ = setup_fulfillment(db_session)
    with pytest.raises(HTTPException) as error:
        fulfill_assignment(db_session, assignment.id, worker, "MARK_PACKED")
    assert error.value.status_code == 409
    db_session.rollback()
    assert order.order_status == "CONFIRMED"
    assert assignment.status == "ACCEPTED"


def test_delivery_agent_cannot_access_another_agents_assignment(db_session):
    order, assignment, _, _, _, agent, other_agent, _, _ = setup_fulfillment(db_session, order_status="SHIPPED", assignment_type="DELIVERY_AGENT")
    with pytest.raises(HTTPException) as error:
        fulfill_assignment(db_session, assignment.id, other_agent, "MARK_OUT_FOR_DELIVERY")
    assert error.value.status_code == 403
    db_session.rollback()
    assert order.order_status == "SHIPPED"
    assert assignment.status == "ACCEPTED"


def test_repeated_fulfillment_action_is_rejected(db_session):
    order, assignment, _, worker, _, _, _, _, _ = setup_fulfillment(db_session, order_status="PROCESSING")
    fulfill(db_session, assignment, worker, "MARK_PACKED")
    with pytest.raises(HTTPException) as error:
        fulfill_assignment(db_session, assignment.id, worker, "MARK_PACKED")
    assert error.value.status_code == 409
    db_session.rollback()
    assert order.order_status == "PACKED"
    assert len(order.status_history) == 1


def test_fulfillment_does_not_mutate_inventory_or_payment(db_session):
    order, assignment, _, worker, _, _, _, inventory, payment = setup_fulfillment(db_session)
    inventory_before = (inventory.stock_quantity, inventory.reserved_quantity, inventory.available_quantity)
    payment_before = (payment.payment_status, payment.payment_reference, payment.paid_at)
    fulfill(db_session, assignment, worker, "START_PROCESSING")
    assert (inventory.stock_quantity, inventory.reserved_quantity, inventory.available_quantity) == inventory_before
    assert (payment.payment_status, payment.payment_reference, payment.paid_at) == payment_before
