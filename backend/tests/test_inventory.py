import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.connection import Base
from app.models.inventory import Inventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.product import Product
from app.services.inventory_service import create_inventory_transaction, recalculate_inventory_values


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def product_with_inventory(db_session, stock=10.0):
    product = Product(product_name="Test Product", sku="TEST-001", category="Test", category_id=1, price=10, cost_price=5)
    db_session.add(product)
    db_session.flush()
    inventory = Inventory(product_id=product.product_id, stock_quantity=stock, available_quantity=0)
    db_session.add(inventory)
    db_session.flush()
    return product, inventory


def test_recalculate_inventory_values_restores_available_quantity(db_session):
    _, inventory = product_with_inventory(db_session)
    inventory.reserved_quantity = 2
    inventory.damaged_quantity = 1

    recalculate_inventory_values(inventory)

    assert inventory.available_quantity == 7


def test_negative_adjustment_records_non_negative_transaction_quantity(db_session):
    product, inventory = product_with_inventory(db_session)

    create_inventory_transaction(db_session, product, inventory, "ADJUSTMENT", -3, "INVENTORY", "1", "Damage")
    db_session.commit()

    transaction = db_session.query(InventoryTransaction).one()
    assert inventory.stock_quantity == 7
    assert inventory.available_quantity == 7
    assert transaction.quantity == 3


def test_inventory_cannot_become_negative(db_session):
    product, inventory = product_with_inventory(db_session, stock=2)

    with pytest.raises(ValueError, match="negative"):
        create_inventory_transaction(db_session, product, inventory, "ADJUSTMENT", -3)