from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.connection import Base
from app.models.customer import Customer
from app.models.order import Order
from app.models.order_assignment import OrderAssignment
from app.models.user import User
from app.routes.assignments import get_assignment, list_my_assignments
from app.schemas.assignment import AssignmentCreate
from app.services.assignment_service import assign_order, assignment_payload, cancel_assignment, update_assignment_status


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def setup_order(db_session):
    admin = User(name="Admin User", email="assign-admin@example.com", password_hash="hash", role="ADMIN")
    worker_a = User(name="Worker A", email="worker-a@example.com", password_hash="hash", role="WORKER")
    worker_b = User(name="Worker B", email="worker-b@example.com", password_hash="hash", role="WORKER")
    agent_a = User(name="Agent A", email="agent-a@example.com", password_hash="hash", role="DELIVERY_AGENT")
    agent_b = User(name="Agent B", email="agent-b@example.com", password_hash="hash", role="DELIVERY_AGENT")
    customer_user = User(name="Customer User", email="assignment-customer@example.com", password_hash="hash", role="CUSTOMER")
    db_session.add_all([admin, worker_a, worker_b, agent_a, agent_b, customer_user])
    db_session.flush()
    customer = Customer(user_id=customer_user.id, first_name="Customer", last_name="User", email=customer_user.email, status="ACTIVE")
    db_session.add(customer)
    db_session.flush()
    order = Order(order_number="ORD-ASSIGN-1", customer_id=customer.customer_id, total_amount=100, payment_status="PAYMENT_PENDING", payment_method="COD", order_status="CONFIRMED")
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order, admin, worker_a, worker_b, agent_a, agent_b, customer_user


def test_admin_assigns_worker_and_delivery_agent_without_changing_order(db_session):
    order, admin, worker_a, _, agent_a, _, _ = setup_order(db_session)

    worker_assignment = assign_order(db_session, order, worker_a, admin, "WORKER", "Pick this order")
    agent_assignment = assign_order(db_session, order, agent_a, admin, "DELIVERY_AGENT")
    db_session.commit()

    assert worker_assignment.status == "ASSIGNED"
    assert agent_assignment.status == "ASSIGNED"
    assert order.order_status == "CONFIRMED"
    assert assignment_payload(worker_assignment)["assigned_to_name"] == "Worker A"


def test_invalid_or_inactive_assignment_target_is_rejected(db_session):
    order, admin, worker_a, _, _, _, customer_user = setup_order(db_session)
    with pytest.raises(HTTPException) as error:
        assign_order(db_session, order, customer_user, admin, "WORKER")
    assert error.value.status_code == 400

    worker_a.is_active = False
    with pytest.raises(HTTPException) as error:
        assign_order(db_session, order, worker_a, admin, "WORKER")
    assert error.value.status_code == 400


def test_reassignment_preserves_history_and_only_one_active_assignment(db_session):
    order, admin, worker_a, worker_b, _, _, _ = setup_order(db_session)
    first = assign_order(db_session, order, worker_a, admin, "WORKER")
    second = assign_order(db_session, order, worker_b, admin, "WORKER")
    db_session.commit()

    history = db_session.query(OrderAssignment).filter(OrderAssignment.order_id == order.order_id).order_by(OrderAssignment.id).all()
    assert first.status == "REASSIGNED"
    assert second.status == "ASSIGNED"
    assert len([item for item in history if item.status in {"ASSIGNED", "ACCEPTED"}]) == 1


def test_worker_and_delivery_agent_can_accept_and_complete_only_own_assignment(db_session):
    order, admin, worker_a, _, agent_a, _, _ = setup_order(db_session)
    worker_assignment = assign_order(db_session, order, worker_a, admin, "WORKER")
    agent_assignment = assign_order(db_session, order, agent_a, admin, "DELIVERY_AGENT")

    update_assignment_status(db_session, worker_assignment, worker_a, "ACCEPTED")
    update_assignment_status(db_session, worker_assignment, worker_a, "COMPLETED")
    update_assignment_status(db_session, agent_assignment, agent_a, "ACCEPTED")
    db_session.commit()

    assert worker_assignment.completed_at is not None
    assert agent_assignment.accepted_at is not None
    with pytest.raises(HTTPException) as error:
        update_assignment_status(db_session, worker_assignment, agent_a, "ACCEPTED")
    assert error.value.status_code == 403


def test_invalid_assignment_transitions_and_cancelled_assignment_are_rejected(db_session):
    order, admin, worker_a, _, _, _, _ = setup_order(db_session)
    assignment = assign_order(db_session, order, worker_a, admin, "WORKER")
    cancel_assignment(db_session, assignment)
    db_session.commit()

    with pytest.raises(HTTPException) as error:
        update_assignment_status(db_session, assignment, worker_a, "ACCEPTED")
    assert error.value.status_code == 409

    with pytest.raises(HTTPException) as error:
        cancel_assignment(db_session, assignment)
    assert error.value.status_code == 409


def test_workers_see_only_their_own_assignments_and_customers_are_denied(db_session):
    order, admin, worker_a, worker_b, _, _, customer_user = setup_order(db_session)
    first = assign_order(db_session, order, worker_a, admin, "WORKER")
    second = assign_order(db_session, order, worker_b, admin, "WORKER")
    db_session.commit()

    own = list_my_assignments("WORKER", db_session, worker_a)
    assert [item["id"] for item in own["items"]] == [first.id]
    with pytest.raises(HTTPException) as error:
        get_assignment(second.id, db_session, worker_a)
    assert error.value.status_code == 403
    with pytest.raises(HTTPException) as error:
        list_my_assignments("WORKER", db_session, customer_user)
    assert error.value.status_code == 403


def test_worker_cannot_use_delivery_agent_assignment_scope(db_session):
    order, admin, worker_a, _, agent_a, _, _ = setup_order(db_session)
    assignment = assign_order(db_session, order, agent_a, admin, "DELIVERY_AGENT")
    db_session.commit()

    with pytest.raises(HTTPException) as error:
        get_assignment(assignment.id, db_session, worker_a)
    assert error.value.status_code == 403
