from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_password_hash, require_admin
from app.database.connection import get_db
from app.models.delivery_agent_profile import DeliveryAgentProfile
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.schemas.staff import DeliveryAgentCreate, StaffProfilePatch, StaffUserOut, WorkerCreate

workers_router = APIRouter(prefix="/workers")
delivery_agents_router = APIRouter(prefix="/delivery-agents")


def staff_payload(user: User, profile: WorkerProfile | DeliveryAgentProfile) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "profile_id": profile.id,
        "code": profile.employee_code if isinstance(profile, WorkerProfile) else profile.agent_code,
        "phone": profile.phone,
        "department": getattr(profile, "department", None),
        "shift": getattr(profile, "shift", None),
        "vehicle_type": getattr(profile, "vehicle_type", None),
        "vehicle_number": getattr(profile, "vehicle_number", None),
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


def create_staff_user(db: Session, name: str, email: str, password: str, role: str) -> User:
    normalized_email = email.lower()
    if db.query(User).filter(User.email == normalized_email).first():
        raise HTTPException(status_code=400, detail="User with this email already exists")
    user = User(name=name, email=normalized_email, password_hash=get_password_hash(password), role=role)
    db.add(user)
    db.flush()
    return user


@workers_router.post("", response_model=StaffUserOut, status_code=status.HTTP_201_CREATED)
def create_worker(payload: WorkerCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if db.query(WorkerProfile).filter(WorkerProfile.employee_code == payload.employee_code.strip()).first():
        raise HTTPException(status_code=400, detail="Employee code already exists")
    try:
        user = create_staff_user(db, payload.name, str(payload.email), payload.password, "WORKER")
        profile = WorkerProfile(user_id=user.id, employee_code=payload.employee_code.strip(), phone=payload.phone, department=payload.department, shift=payload.shift)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return staff_payload(user, profile)
    except HTTPException:
        db.rollback()
        raise
    except (IntegrityError, SQLAlchemyError):
        db.rollback()
        raise HTTPException(status_code=400, detail="Worker account could not be created")


@workers_router.get("", response_model=list[StaffUserOut])
def list_workers(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return [staff_payload(profile.user, profile) for profile in db.query(WorkerProfile).all()]


@workers_router.get("/me", response_model=StaffUserOut)
def get_worker_me(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "WORKER":
        raise HTTPException(status_code=403, detail="Worker access required")
    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Worker profile not found")
    return staff_payload(current_user, profile)


@workers_router.get("/{user_id}", response_model=StaffUserOut)
def get_worker(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id, User.role == "WORKER").first()
    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == user_id).first()
    if not user or not profile:
        raise HTTPException(status_code=404, detail="Worker not found")
    return staff_payload(user, profile)


@workers_router.patch("/{user_id}", response_model=StaffUserOut)
def update_worker(user_id: int, payload: StaffProfilePatch, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id, User.role == "WORKER").first()
    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == user_id).first()
    if not user or not profile:
        raise HTTPException(status_code=404, detail="Worker not found")
    for field in ("phone", "department", "shift"):
        value = getattr(payload, field)
        if value is not None:
            setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return staff_payload(user, profile)


def set_worker_active(user_id: int, active: bool, db: Session, current_user: User):
    user = db.query(User).filter(User.id == user_id, User.role == "WORKER").first()
    if not user:
        raise HTTPException(status_code=404, detail="Worker not found")
    user.is_active = active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}


@workers_router.patch("/{user_id}/activate")
def activate_worker(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return set_worker_active(user_id, True, db, current_user)


@workers_router.patch("/{user_id}/deactivate")
def deactivate_worker(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return set_worker_active(user_id, False, db, current_user)


@delivery_agents_router.post("", response_model=StaffUserOut, status_code=status.HTTP_201_CREATED)
def create_delivery_agent(payload: DeliveryAgentCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if db.query(DeliveryAgentProfile).filter(DeliveryAgentProfile.agent_code == payload.agent_code.strip()).first():
        raise HTTPException(status_code=400, detail="Agent code already exists")
    try:
        user = create_staff_user(db, payload.name, str(payload.email), payload.password, "DELIVERY_AGENT")
        profile = DeliveryAgentProfile(user_id=user.id, agent_code=payload.agent_code.strip(), phone=payload.phone, vehicle_type=payload.vehicle_type, vehicle_number=payload.vehicle_number)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return staff_payload(user, profile)
    except HTTPException:
        db.rollback()
        raise
    except (IntegrityError, SQLAlchemyError):
        db.rollback()
        raise HTTPException(status_code=400, detail="Delivery agent account could not be created")


@delivery_agents_router.get("", response_model=list[StaffUserOut])
def list_delivery_agents(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return [staff_payload(profile.user, profile) for profile in db.query(DeliveryAgentProfile).all()]


@delivery_agents_router.get("/me", response_model=StaffUserOut)
def get_delivery_agent_me(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "DELIVERY_AGENT":
        raise HTTPException(status_code=403, detail="Delivery agent access required")
    profile = db.query(DeliveryAgentProfile).filter(DeliveryAgentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Delivery agent profile not found")
    return staff_payload(current_user, profile)


@delivery_agents_router.get("/{user_id}", response_model=StaffUserOut)
def get_delivery_agent(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id, User.role == "DELIVERY_AGENT").first()
    profile = db.query(DeliveryAgentProfile).filter(DeliveryAgentProfile.user_id == user_id).first()
    if not user or not profile:
        raise HTTPException(status_code=404, detail="Delivery agent not found")
    return staff_payload(user, profile)


@delivery_agents_router.patch("/{user_id}", response_model=StaffUserOut)
def update_delivery_agent(user_id: int, payload: StaffProfilePatch, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id, User.role == "DELIVERY_AGENT").first()
    profile = db.query(DeliveryAgentProfile).filter(DeliveryAgentProfile.user_id == user_id).first()
    if not user or not profile:
        raise HTTPException(status_code=404, detail="Delivery agent not found")
    for field in ("phone", "vehicle_type", "vehicle_number"):
        value = getattr(payload, field)
        if value is not None:
            setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return staff_payload(user, profile)


def set_delivery_agent_active(user_id: int, active: bool, db: Session, current_user: User):
    user = db.query(User).filter(User.id == user_id, User.role == "DELIVERY_AGENT").first()
    if not user:
        raise HTTPException(status_code=404, detail="Delivery agent not found")
    user.is_active = active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}


@delivery_agents_router.patch("/{user_id}/activate")
def activate_delivery_agent(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return set_delivery_agent_active(user_id, True, db, current_user)


@delivery_agents_router.patch("/{user_id}/deactivate")
def deactivate_delivery_agent(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return set_delivery_agent_active(user_id, False, db, current_user)