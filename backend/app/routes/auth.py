from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, get_current_user, get_password_hash, verify_password
from app.database.connection import get_db
from app.models.customer import Customer
from app.models.user import User
from app.schemas.auth import Token, UserCreate, UserLogin, UserOut

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    normalized_name = " ".join(payload.name.split())
    name_parts = normalized_name.split()
    if len(normalized_name) < 2 or not name_parts:
        raise HTTPException(status_code=422, detail="Name must contain at least two characters")

    email = payload.email.lower()
    first_name = name_parts[0]
    last_name = " ".join(name_parts[1:]) or "Customer"

    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(status_code=400, detail="User with this email already exists")

        user = User(
            name=normalized_name,
            email=email,
            password_hash=get_password_hash(payload.password),
            role="CUSTOMER",
        )
        db.add(user)
        db.flush()

        customer = Customer(
            user_id=user.id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            status="ACTIVE",
        )
        db.add(customer)
        db.commit()
        db.refresh(user)
        return user
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Registration could not be completed")


@router.post("/login", response_model=Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not user.is_active or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    token = create_access_token(user.email, access_token_expires)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login-json", response_model=Token)
def login_user_json(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    token = create_access_token(user.email, access_token_expires)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
