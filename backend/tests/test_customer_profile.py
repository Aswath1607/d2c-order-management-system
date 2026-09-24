import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.connection import Base
from app.models.customer import Customer
from app.models.user import User
from app.routes.customers import update_my_customer
from app.schemas.customer import CustomerProfileUpdate


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def customer_pair(db_session, email: str, first_name: str = "Test"):
    user = User(name=f"{first_name} User", email=email, password_hash="hash", role="CUSTOMER")
    db_session.add(user)
    db_session.flush()
    customer = Customer(user_id=user.id, first_name=first_name, last_name="User", email=email, status="ACTIVE")
    db_session.add(customer)
    db_session.commit()
    return user, customer


def profile_payload(email: str):
    return CustomerProfileUpdate(
        first_name="Updated",
        last_name="Customer",
        email=email,
        phone="+91 9876543210",
        address_line1="10 Market Street",
        city="Bengaluru",
        state="Karnataka",
        pincode="560001",
        country="India",
    )


def test_customer_can_update_own_profile(db_session):
    user, customer = customer_pair(db_session, "owner@example.com")

    updated = update_my_customer(profile_payload("owner@example.com"), db_session, user)

    assert updated.customer_id == customer.customer_id
    assert updated.first_name == "Updated"
    assert updated.address_line1 == "10 Market Street"
    assert user.name == "Updated Customer"


def test_customer_update_is_scoped_to_authenticated_identity(db_session):
    user, customer = customer_pair(db_session, "owner@example.com")
    _, other_customer = customer_pair(db_session, "other@example.com", "Other")

    assert db_session.query(Customer).filter(Customer.user_id == user.id).one().customer_id == customer.customer_id
    with pytest.raises(HTTPException) as error:
        update_my_customer(profile_payload("other@example.com"), db_session, user)

    assert error.value.status_code == 409
    db_session.refresh(other_customer)
    assert other_customer.first_name == "Other"


def test_duplicate_profile_email_is_rejected(db_session):
    user, _ = customer_pair(db_session, "owner@example.com")
    customer_pair(db_session, "other@example.com", "Other")

    with pytest.raises(HTTPException) as error:
        update_my_customer(profile_payload("other@example.com"), db_session, user)

    assert error.value.status_code == 409


def test_invalid_profile_data_is_rejected():
    with pytest.raises(ValueError):
        CustomerProfileUpdate(
            first_name="Updated",
            last_name="Customer",
            email="owner@example.com",
            address_line1="10 Market Street",
            city="Bengaluru",
            state="Karnataka",
            pincode="bad",
            country="India",
        )


def test_single_word_profile_name_uses_safe_last_name(db_session):
    user, _ = customer_pair(db_session, "owner@example.com")
    payload = CustomerProfileUpdate(
        first_name="Aswath",
        last_name="",
        email="owner@example.com",
        address_line1="10 Market Street",
        city="Bengaluru",
        state="Karnataka",
        pincode="560001",
        country="India",
    )

    updated = update_my_customer(payload, db_session, user)

    assert updated.first_name == "Aswath"
    assert updated.last_name == "Customer"