import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.connection import Base
from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import PaymentHistory
from app.models.user import User
from app.services.payment_service import create_payment, initiate_mock_payment, mark_cod_paid


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def order_for(db_session, method):
    user = User(name="Payment User", email=f"{method.lower()}@example.com", password_hash="hash", role="CUSTOMER")
    db_session.add(user)
    db_session.flush()
    customer = Customer(user_id=user.id, first_name="Payment", last_name="User", email=user.email, status="ACTIVE")
    db_session.add(customer)
    db_session.flush()
    order = Order(order_number=f"ORD-{method}", customer_id=customer.customer_id, total_amount=125, payment_method=method, payment_status="PAYMENT_PENDING")
    db_session.add(order)
    db_session.flush()
    return order, user


@pytest.mark.parametrize("method", ["COD", "UPI", "CARD", "NET_BANKING"])
def test_payment_created_for_each_supported_method(db_session, method):
    order, _ = order_for(db_session, method)

    payment = create_payment(db_session, order, method)
    db_session.commit()

    assert payment.payment_method == method
    assert payment.payment_status == "PAYMENT_PENDING"
    assert payment.history[0].to_status == "PAYMENT_PENDING"


def test_mock_online_payment_records_safe_provider_metadata(db_session):
    order, user = order_for(db_session, "UPI")
    payment = create_payment(db_session, order, "UPI")

    initiate_mock_payment(db_session, payment, user.email)
    db_session.commit()

    assert payment.payment_status == "PAYMENT_SUCCESS"
    assert payment.provider == "MOCK"
    assert payment.provider_transaction_id.startswith("MOCK-")
    assert payment.order.payment_status == "PAYMENT_SUCCESS"
    assert len(payment.history) == 3


def test_admin_cod_collection_is_audited_and_cannot_repeat(db_session):
    order, user = order_for(db_session, "COD")
    payment = create_payment(db_session, order, "COD")

    mark_cod_paid(db_session, payment, user.email, "COD-REF-1")
    db_session.commit()

    assert payment.payment_status == "PAYMENT_SUCCESS"
    assert payment.payment_reference == "COD-REF-1"
    assert db_session.query(PaymentHistory).filter(PaymentHistory.to_status == "PAYMENT_SUCCESS").count() == 1
    with pytest.raises(HTTPException) as error:
        mark_cod_paid(db_session, payment, user.email)
    assert error.value.status_code == 409