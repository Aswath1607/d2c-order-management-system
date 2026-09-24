from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import get_password_hash
from app.database.connection import Base, get_db
from app.main import app
from app.models.delivery_agent_profile import DeliveryAgentProfile
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.routes.auth import get_me, login_user
from app.schemas.auth import UserOut
from app.routes.staff import create_delivery_agent, create_worker
from app.schemas.staff import DeliveryAgentCreate, WorkerCreate


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def admin():
    return SimpleNamespace(id=1, email="admin@example.com", role="ADMIN", is_active=True)


def staff_payload(code="EMP-001", email="worker@example.com"):
    return WorkerCreate(name="Warehouse Worker", email=email, password="password123", employee_code=code, department="Fulfillment", shift="Morning")


def agent_payload(code="AGENT-001", email="agent@example.com"):
    return DeliveryAgentCreate(name="Delivery Agent", email=email, password="password123", agent_code=code, vehicle_type="Bike", vehicle_number="KA-01-AB-1234")


def test_admin_can_create_worker_and_delivery_agent(db_session):
    worker = create_worker(staff_payload(), db_session, admin())
    agent = create_delivery_agent(agent_payload(), db_session, admin())

    assert worker["role"] == "WORKER"
    assert agent["role"] == "DELIVERY_AGENT"
    assert db_session.query(WorkerProfile).one().employee_code == "EMP-001"
    assert db_session.query(DeliveryAgentProfile).one().agent_code == "AGENT-001"
    assert "password_hash" not in worker
    assert "password_hash" not in agent


def test_duplicate_email_and_codes_are_rejected(db_session):
    create_worker(staff_payload(), db_session, admin())
    with pytest.raises(HTTPException) as email_error:
        create_delivery_agent(agent_payload(email="WORKER@example.com"), db_session, admin())
    assert email_error.value.status_code == 400

    with pytest.raises(HTTPException) as worker_code_error:
        create_worker(staff_payload(code="EMP-001", email="another@example.com"), db_session, admin())
    assert worker_code_error.value.status_code == 400

    create_delivery_agent(agent_payload(), db_session, admin())
    with pytest.raises(HTTPException) as agent_code_error:
        create_delivery_agent(agent_payload(code="AGENT-001", email="another-agent@example.com"), db_session, admin())
    assert agent_code_error.value.status_code == 400


def test_non_admin_roles_cannot_use_staff_management_endpoints(db_session):
    from app.core.security import require_admin

    with pytest.raises(HTTPException) as error:
        require_admin(SimpleNamespace(role="CUSTOMER"))
    assert error.value.status_code == 403


def test_worker_and_delivery_agent_login_and_inactive_users_are_rejected(db_session):
    worker = User(name="Warehouse Worker", email="worker@example.com", password_hash=get_password_hash("password123"), role="WORKER")
    agent = User(name="Delivery Agent", email="agent@example.com", password_hash=get_password_hash("password123"), role="DELIVERY_AGENT")
    db_session.add_all([worker, agent])
    db_session.commit()

    worker_token = login_user(SimpleNamespace(username=worker.email, password="password123"), db_session)
    agent_token = login_user(SimpleNamespace(username=agent.email, password="password123"), db_session)
    assert worker_token["access_token"]
    assert agent_token["access_token"]

    worker.is_active = False
    db_session.commit()
    with pytest.raises(HTTPException) as error:
        login_user(SimpleNamespace(username=worker.email, password="password123"), db_session)
    assert error.value.status_code == 401

    agent.is_active = False
    db_session.commit()
    with pytest.raises(HTTPException) as error:
        login_user(SimpleNamespace(username=agent.email, password="password123"), db_session)
    assert error.value.status_code == 401


def test_me_exposes_role_and_safe_profile_without_password(db_session):
    worker = User(name="Warehouse Worker", email="worker@example.com", password_hash="secret-hash", role="WORKER")
    db_session.add(worker)
    db_session.flush()
    db_session.add(WorkerProfile(user_id=worker.id, employee_code="EMP-002", department="Packing", shift="Night"))
    db_session.commit()

    response = UserOut.model_validate(get_me(worker))

    assert response.role == "WORKER"
    assert response.worker_profile.employee_code == "EMP-002"
    assert "password_hash" not in response.model_dump()


def test_staff_management_http_is_admin_only(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=7, email="customer@example.com", role="CUSTOMER", is_active=True)
    client = TestClient(app)
    try:
        response = client.post("/api/workers", json=staff_payload().model_dump(mode="json"))
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("role", ["CUSTOMER", "WORKER", "DELIVERY_AGENT"])
def test_all_non_admin_roles_are_denied_staff_management(db_session, role):
    app.dependency_overrides[get_db] = lambda: db_session
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=8, email="user@example.com", role=role, is_active=True)
    client = TestClient(app)
    try:
        assert client.get("/api/workers").status_code == 403
        assert client.get("/api/delivery-agents").status_code == 403
        assert client.post("/api/workers", json=staff_payload(email=f"{role.lower()}-worker@example.com").model_dump(mode="json")).status_code == 403
        assert client.post("/api/delivery-agents", json=agent_payload(email=f"{role.lower()}-agent@example.com").model_dump(mode="json")).status_code == 403
    finally:
        app.dependency_overrides.clear()
