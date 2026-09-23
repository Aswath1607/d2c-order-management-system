from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.connection import Base
from app.models.order import Order
from app.routes.orders import update_order_status


@pytest.fixture
def db_session():
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_update_order_status_rejects_invalid_transition_before_commit(db_session):
    order = Order(
        order_id=1,
        order_number='ORD-TEST-1',
        customer_id=1,
        subtotal=100.0,
        discount_amount=0.0,
        tax_amount=0.0,
        shipping_charge=0.0,
        total_amount=100.0,
        payment_status='PAID',
        payment_method='COD',
        order_status='CONFIRMED',
        shipping_address='123 Test Street',
    )
    db_session.add(order)
    db_session.commit()

    admin = SimpleNamespace(email='admin@example.com', role='ADMIN')

    with pytest.raises(HTTPException, match='cannot transition|not allowed|Order cannot transition'):
        update_order_status(order_id=order.order_id, payload={'status': 'DELIVERED'}, db=db_session, current_user=admin)

    db_session.refresh(order)
    assert order.order_status == 'CONFIRMED'
