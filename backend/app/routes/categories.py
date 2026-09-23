import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryCreate, CategoryListResponse, CategoryOut, CategoryUpdate

router = APIRouter()


def make_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "category"


def normalize_category(payload: CategoryCreate | CategoryUpdate) -> dict[str, str | None]:
    data = payload.model_dump()
    data["name"] = data["name"].strip()
    data["slug"] = make_slug(data["slug"] or data["name"])
    return data


def category_output(category: Category, product_count: int) -> dict:
    return {**{field: getattr(category, field) for field in ("category_id", "name", "slug", "description", "image_url", "status", "created_at", "updated_at")}, "product_count": product_count}


@router.get("", response_model=CategoryListResponse)
def list_categories(
    search: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    sort: str = Query(default="newest", pattern="^(newest|oldest|name-asc|name-desc|products)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Category, func.count(Product.product_id).label("product_count")).outerjoin(Product).group_by(Category.category_id)
    if current_user.role != "ADMIN":
        query = query.filter(Category.status == "ACTIVE")
    elif status_filter:
        query = query.filter(Category.status == status_filter)
    if search:
        query = query.filter((Category.name.ilike(f"%{search}%")) | (Category.slug.ilike(f"%{search}%")))
    if sort == "oldest": query = query.order_by(Category.category_id.asc())
    elif sort == "name-asc": query = query.order_by(Category.name.asc())
    elif sort == "name-desc": query = query.order_by(Category.name.desc())
    elif sort == "products": query = query.order_by(func.count(Product.product_id).desc(), Category.name.asc())
    else: query = query.order_by(Category.category_id.desc())
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    items = [category_output(category, count) for category, count in rows]
    return {"items": items, "page": page, "page_size": page_size, "total": total, "total_pages": (total + page_size - 1) // page_size}


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(category_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    category = db.query(Category).filter(Category.category_id == category_id).first()
    if not category or (current_user.role != "ADMIN" and category.status != "ACTIVE"):
        raise HTTPException(status_code=404, detail="Category not found")
    count = db.query(func.count(Product.product_id)).filter(Product.category_id == category_id).scalar() or 0
    return category_output(category, count)


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    data = normalize_category(payload)
    if db.query(Category).filter((Category.name == data["name"]) | (Category.slug == data["slug"])).first():
        raise HTTPException(status_code=400, detail="Category name or slug already exists")
    category = Category(**data)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category_output(category, 0)


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    category = db.query(Category).filter(Category.category_id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    data = normalize_category(payload)
    duplicate = db.query(Category).filter(Category.category_id != category_id, (Category.name == data["name"]) | (Category.slug == data["slug"])).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Category name or slug already exists")
    for field, value in data.items(): setattr(category, field, value)
    db.query(Product).filter(Product.category_id == category_id).update({Product.category: data["name"]}, synchronize_session=False)
    db.commit()
    db.refresh(category)
    count = db.query(func.count(Product.product_id)).filter(Product.category_id == category_id).scalar() or 0
    return category_output(category, count)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    category = db.query(Category).filter(Category.category_id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if db.query(Product).filter(Product.category_id == category_id).first():
        raise HTTPException(status_code=409, detail="This category contains products and cannot be permanently deleted. Deactivate it instead.")
    db.delete(category)
    db.commit()
