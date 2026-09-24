from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.user import User
from app.schemas.customer import CustomerAdminOut, CustomerAdminUpdate, CustomerCreate, CustomerListResponse, CustomerOut, CustomerProfileUpdate, CustomerStatistics

router = APIRouter()


@router.get("", response_model=CustomerListResponse)
def list_customers(
    search: str | None = Query(default=None),
    name: str | None = Query(default=None),
    email: str | None = Query(default=None),
    phone: str | None = Query(default=None),
    status: str | None = Query(default=None),
    sort: str = Query(default="newest", pattern="^(newest|oldest|name-asc|name-desc|orders|spending)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    order_stats = db.query(
        Order.customer_id.label("customer_id"),
        func.count(Order.order_id).label("total_orders"),
        func.coalesce(func.sum(Order.total_amount), 0).label("total_spent"),
        func.max(Order.order_date).label("last_order_date"),
    ).filter(Order.order_status != "CANCELLED").group_by(Order.customer_id).subquery()
    query = db.query(Customer, User, order_stats.c.total_orders, order_stats.c.total_spent, order_stats.c.last_order_date).join(User, User.id == Customer.user_id).outerjoin(order_stats, order_stats.c.customer_id == Customer.customer_id)
    search_term = search or name
    if search_term:
        pattern = f"%{search_term}%"
        query = query.filter((User.name.ilike(pattern)) | (User.email.ilike(pattern)) | (Customer.email.ilike(pattern)) | (Customer.phone.ilike(pattern)))
    if email:
        query = query.filter((User.email.ilike(f"%{email}%")) | (Customer.email.ilike(f"%{email}%")))
    if phone:
        query = query.filter(Customer.phone.ilike(f"%{phone}%"))
    if status == "ACTIVE": query = query.filter(User.is_active.is_(True))
    elif status == "INACTIVE": query = query.filter(User.is_active.is_(False))
    total = query.count()
    if sort == "oldest": query = query.order_by(Customer.customer_id.asc())
    elif sort == "name-asc": query = query.order_by(User.name.asc())
    elif sort == "name-desc": query = query.order_by(User.name.desc())
    elif sort == "orders": query = query.order_by(func.coalesce(order_stats.c.total_orders, 0).desc(), User.name.asc())
    elif sort == "spending": query = query.order_by(func.coalesce(order_stats.c.total_spent, 0).desc(), User.name.asc())
    else: query = query.order_by(Customer.customer_id.desc())
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    items = [admin_customer_payload(customer, user, total_orders, total_spent, last_order_date) for customer, user, total_orders, total_spent, last_order_date in rows]
    return {"items": items, "page": page, "page_size": page_size, "total": total, "total_pages": (total + page_size - 1) // page_size}


def admin_customer_payload(customer: Customer, user: User, total_orders=0, total_spent=0, last_order_date=None) -> dict:
    total_orders = int(total_orders or 0)
    total_spent = float(total_spent or 0)
    return {"customer_id": customer.customer_id, "user_id": customer.user_id, "first_name": customer.first_name, "last_name": customer.last_name, "email": customer.email, "phone": customer.phone, "date_of_birth": customer.date_of_birth, "gender": customer.gender, "address_line1": customer.address_line1, "address_line2": customer.address_line2, "city": customer.city, "state": customer.state, "pincode": customer.pincode, "country": customer.country, "status": customer.status, "created_at": customer.created_at, "updated_at": customer.updated_at, "name": user.name, "is_active": user.is_active, "total_orders": total_orders, "total_spent": total_spent, "average_order_value": total_spent / total_orders if total_orders else 0.0, "last_order_date": last_order_date}


@router.get("/me", response_model=CustomerOut)
def get_my_customer(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer: raise HTTPException(status_code=404, detail="Customer profile not found")
    return customer


@router.put("/me", response_model=CustomerOut)
def update_my_customer(payload: CustomerProfileUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer profile not found")

    email = payload.email.lower()
    duplicate_user = db.query(User).filter(User.email == email, User.id != current_user.id).first()
    duplicate_customer = db.query(Customer).filter(Customer.email == email, Customer.customer_id != customer.customer_id).first()
    if duplicate_user or duplicate_customer:
        raise HTTPException(status_code=409, detail="This email address is already in use.")

    customer_data = payload.model_dump()
    customer_data["email"] = email
    for field, value in customer_data.items():
        setattr(customer, field, value)
    current_user.name = f"{payload.first_name.strip()} {payload.last_name.strip()}"
    current_user.email = email

    try:
        db.commit()
        db.refresh(customer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This email address is already in use.")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Profile update could not be completed")
    return customer


@router.get("/{customer_id}", response_model=CustomerAdminOut)
def get_customer(customer_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if current_user.role != "ADMIN" and customer.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    user = db.query(User).filter(User.id == customer.user_id).first()
    stats = db.query(func.count(Order.order_id).label("total_orders"), func.coalesce(func.sum(Order.total_amount), 0).label("total_spent"), func.max(Order.order_date).label("last_order_date")).filter(Order.customer_id == customer_id, Order.order_status != "CANCELLED").first()
    return admin_customer_payload(customer, user, stats.total_orders, stats.total_spent, stats.last_order_date)


@router.get("/{customer_id}/statistics", response_model=CustomerStatistics)
def customer_statistics(customer_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    stats = db.query(func.count(Order.order_id).label("total_orders"), func.coalesce(func.sum(Order.total_amount), 0).label("total_spent"), func.max(Order.order_date).label("last_order_date")).filter(Order.customer_id == customer_id, Order.order_status != "CANCELLED").first()
    total_orders = int(stats.total_orders or 0)
    total_spent = float(stats.total_spent or 0)
    return {"total_orders": total_orders, "total_spent": total_spent, "average_order_value": total_spent / total_orders if total_orders else 0.0, "last_order_date": stats.last_order_date}


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if db.query(Customer).filter(Customer.email == payload.email.lower()).first():
        raise HTTPException(status_code=400, detail="Customer with this email already exists")
    customer = Customer(**payload.model_dump())
    customer.email = customer.email.lower()
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerAdminOut)
def update_customer(customer_id: int, payload: CustomerAdminUpdate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    duplicate = db.query(User).filter(User.email == payload.email.lower(), User.id != customer.user_id).first()
    if duplicate: raise HTTPException(status_code=409, detail="This email address is already in use.")
    user = db.query(User).filter(User.id == customer.user_id).first()
    first_name, *last_parts = payload.name.strip().split()
    customer.first_name = first_name
    customer.last_name = " ".join(last_parts) or first_name
    customer.phone = payload.phone
    customer.email = payload.email.lower()
    user.name = payload.name.strip()
    user.email = payload.email.lower()
    user.is_active = payload.is_active
    db.commit()
    db.refresh(customer)
    stats = db.query(func.count(Order.order_id).label("total_orders"), func.coalesce(func.sum(Order.total_amount), 0).label("total_spent"), func.max(Order.order_date).label("last_order_date")).filter(Order.customer_id == customer_id, Order.order_status != "CANCELLED").first()
    return admin_customer_payload(customer, user, stats.total_orders, stats.total_spent, stats.last_order_date)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    user = db.query(User).filter(User.id == customer.user_id).first()
    user.is_active = False
    db.commit()


@router.get("/{customer_id}/orders")
def customer_orders(customer_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    orders = db.query(Order).filter(Order.customer_id == customer_id).order_by(Order.created_at.desc()).all()
    if current_user.role != "ADMIN":
        customer = db.query(Customer).filter(Customer.customer_id == customer_id, Customer.user_id == current_user.id).first()
        if not customer:
            raise HTTPException(status_code=403, detail="Not authorized")
    return orders
