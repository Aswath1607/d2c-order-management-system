from datetime import date, datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import require_admin
from app.database.connection import Base
from app.models.customer import Customer
from app.models.order import Order
from app.models.order_assignment import OrderAssignment
from app.models.order_tracking_history import OrderTrackingHistory
from app.models.payment import Payment
from app.models.user import User
from app.routes.assignments import complete_assignment
from app.routes.orders import update_order_status, update_order_tracking
from app.schemas.order import TrackingUpdate
from app.services.assignment_service import assign_order


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def setup_shipping(db_session, order_status="CONFIRMED"):
    admin = User(name="Admin User", email="shipping-admin@example.com", password_hash="hash", role="ADMIN")
    customer_user = User(name="Customer User", email="shipping-customer@example.com", password_hash="hash", role="CUSTOMER")
    worker = User(name="Worker User", email="shipping-worker@example.com", password_hash="hash", role="WORKER")
    agent = User(name="Agent User", email="shipping-agent@example.com", password_hash="hash", role="DELIVERY_AGENT")
    db_session.add_all([admin, customer_user, worker, agent])
    db_session.flush()
    customer = Customer(user_id=customer_user.id, first_name="Customer", last_name="User", email=customer_user.email, status="ACTIVE")
    db_session.add(customer)
    db_session.flush()
    order = Order(order_number="ORD-SHIPPING-1", customer_id=customer.customer_id, total_amount=100, payment_status="PAYMENT_PENDING", payment_method="COD", order_status=order_status)
    db_session.add(order)
    db_session.flush()
    payment = Payment(order_id=order.order_id, payment_method="COD", payment_status="PAYMENT_PENDING", amount=100, currency="INR", provider="COD")
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(order)
    return order, admin, customer_user, worker, agent, payment


def test_tracking_schema_trims_and_rejects_invalid_payloads():
    payload = TrackingUpdate(tracking_number="  TRK-001  ", courier_name="  Courier A ", estimated_delivery=date(2026, 10, 1))
    assert payload.tracking_number == "TRK-001"
    assert payload.courier_name == "Courier A"

    with pytest.raises(ValidationError):
        TrackingUpdate()
    with pytest.raises(ValidationError):
        TrackingUpdate(tracking_number="   ")
    with pytest.raises(ValidationError):
        TrackingUpdate(estimated_delivery="not-a-date")
    with pytest.raises(ValidationError):
        TrackingUpdate(tracking_number="TRK-001", unexpected="value")


def test_admin_tracking_update_creates_after_state_history(db_session):
    order, admin, _, _, _, _ = setup_shipping(db_session)
    updated = update_order_tracking(order.order_id, TrackingUpdate(tracking_number="  TRK-001 ", courier_name="Courier A", estimated_delivery=date(2026, 10, 1)), db_session, admin)
    history = db_session.query(OrderTrackingHistory).one()
    assert updated.tracking_number == "TRK-001"
    assert updated.courier_name == "Courier A"
    assert updated.estimated_delivery.date() == date(2026, 10, 1)
    assert history.changed_by_user_id == admin.id
    assert history.tracking_number == "TRK-001"
    assert history.courier_name == "Courier A"
    assert history.estimated_delivery.date() == date(2026, 10, 1)


def test_tracking_partial_update_preserves_existing_values(db_session):
    order, admin, _, _, _, _ = setup_shipping(db_session)
    update_order_tracking(order.order_id, TrackingUpdate(tracking_number="TRK-001", courier_name="Courier A"), db_session, admin)
    update_order_tracking(order.order_id, TrackingUpdate(courier_name="Courier B"), db_session, admin)
    db_session.refresh(order)
    assert order.tracking_number == "TRK-001"
    assert order.courier_name == "Courier B"
    assert db_session.query(OrderTrackingHistory).count() == 2


def test_only_admin_can_update_tracking(db_session):
    _, _, customer, worker, agent, _ = setup_shipping(db_session)
    for user in (customer, worker, agent):
        with pytest.raises(HTTPException) as error:
            require_admin(user)
        assert error.value.status_code == 403


def test_admin_can_ship_packed_order_once_with_history(db_session):
    order, admin, _, _, _, payment = setup_shipping(db_session, order_status="PACKED")
    update_order_status(order.order_id, {"status": "SHIPPED"}, db_session, admin)
    assert order.order_status == "SHIPPED"
    assert len(order.status_history) == 1
    assert payment.payment_status == "PAYMENT_PENDING"


@pytest.mark.parametrize("current_status", ["CONFIRMED", "PROCESSING", "PACKED"])
def test_admin_shipping_rejects_invalid_source_statuses(db_session, current_status):
    order, admin, _, _, _, _ = setup_shipping(db_session, order_status=current_status)
    target = "SHIPPED" if current_status != "PACKED" else "OUT_FOR_DELIVERY"
    with pytest.raises(HTTPException) as error:
        update_order_status(order.order_id, {"status": target}, db_session, admin)
    assert error.value.status_code == 409
    db_session.rollback()
    db_session.refresh(order)
    assert order.order_status == current_status
    assert order.status_history == []


def test_admin_delivered_sets_timestamp_once(db_session):
    order, admin, _, _, _, _ = setup_shipping(db_session, order_status="OUT_FOR_DELIVERY")
    update_order_status(order.order_id, {"status": "DELIVERED"}, db_session, admin)
    delivered_at = order.delivered_at
    assert delivered_at is not None
    update_order_status(order.order_id, {"status": "DELIVERED"}, db_session, admin)
    assert order.delivered_at == delivered_at


def test_cancelled_order_cannot_become_delivered(db_session):
    order, admin, _, _, _, _ = setup_shipping(db_session, order_status="CANCELLED")
    with pytest.raises(HTTPException) as error:
        update_order_status(order.order_id, {"status": "DELIVERED"}, db_session, admin)
    assert error.value.status_code == 409
    db_session.rollback()
    assert order.delivered_at is None


def test_legacy_complete_requires_strict_fulfillment_state(db_session):
    order, admin, _, worker, _, _ = setup_shipping(db_session, order_status="CONFIRMED")
    assignment = assign_order(db_session, order, worker, admin, "WORKER")
    assignment.status = "ACCEPTED"
    db_session.commit()
    with pytest.raises(HTTPException) as error:
        complete_assignment(assignment.id, db_session, worker)
    assert error.value.status_code == 409
    db_session.rollback()
    db_session.refresh(order)
    db_session.refresh(assignment)
    assert order.order_status == "CONFIRMED"
    assert assignment.status == "ACCEPTED"


def test_legacy_accept_rejects_cross_role_assignment(db_session):
    order, admin, _, worker, agent, _ = setup_shipping(db_session)
    assignment = assign_order(db_session, order, worker, admin, "WORKER")
    db_session.commit()
    from app.routes.assignments import accept_assignment

    with pytest.raises(HTTPException) as error:
        accept_assignment(assignment.id, db_session, agent)
    assert error.value.status_code == 403
