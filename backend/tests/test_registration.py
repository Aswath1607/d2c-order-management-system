import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.connection import Base
from app.models.customer import Customer
from app.routes.auth import register_user
from app.schemas.auth import UserCreate


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_register_splits_multi_word_name(db_session):
    user = register_user(
        UserCreate(name="Aswath S", email="ASWATH@example.com", password="password123"),
        db_session,
    )

    customer = db_session.query(Customer).filter(Customer.user_id == user.id).one()
    assert user.name == "Aswath S"
    assert customer.first_name == "Aswath"
    assert customer.last_name == "S"
    assert user.email == "aswath@example.com"


def test_register_uses_fallback_last_name_for_single_word_name(db_session):
    user = register_user(
        UserCreate(name="Aswath", email="aswath@example.com", password="password123"),
        db_session,
    )

    customer = db_session.query(Customer).filter(Customer.user_id == user.id).one()
    assert customer.first_name == "Aswath"
    assert customer.last_name == "Customer"


def test_register_duplicate_email_returns_controlled_400(db_session):
    register_user(UserCreate(name="First User", email="same@example.com", password="password123"), db_session)

    with pytest.raises(HTTPException) as error:
        register_user(UserCreate(name="Second User", email="SAME@example.com", password="password123"), db_session)

    assert error.value.status_code == 400
    assert error.value.detail == "User with this email already exists"


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "Valid User", "email": "invalid-email", "password": "password123"},
        {"name": "Valid User", "email": "valid@example.com", "password": "short"},
    ],
)
def test_register_invalid_email_or_password_returns_422(payload):
    with pytest.raises(ValidationError):
        UserCreate(**payload)