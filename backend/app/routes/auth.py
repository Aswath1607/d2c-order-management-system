from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
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
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=get_password_hash(payload.password),
        role="CUSTOMER",
    )
    db.add(user)
    db.flush()

    customer = Customer(
        user_id=user.id,
        first_name=payload.name.split()[0] if payload.name else "Customer",
        last_name=" ".join(payload.name.split()[1:]) if len(payload.name.split()) > 1 else "",
        email=payload.email.lower(),
        status="ACTIVE",
    )
    db.add(customer)
    db.commit()
    db.refresh(user)
    return user


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
