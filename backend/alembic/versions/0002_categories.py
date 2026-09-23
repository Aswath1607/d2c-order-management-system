"""normalize product categories

Revision ID: 0002_categories
Revises: 0001_initial_schema
"""
import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_categories"
down_revision: Union[str, Sequence[str], None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "category"


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("category_id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("name", name="uq_categories_name"),
        sa.UniqueConstraint("slug", name="uq_categories_slug"),
        sa.CheckConstraint("length(trim(name)) >= 1", name="ck_categories_name_not_empty"),
        sa.CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_categories_status"),
    )
    op.create_index("ix_categories_category_id", "categories", ["category_id"])
    op.create_index("ix_categories_name", "categories", ["name"])
    op.create_index("ix_categories_slug", "categories", ["slug"])
    op.create_index("ix_categories_status", "categories", ["status"])
    op.add_column("products", sa.Column("category_id", sa.Integer(), nullable=True))

    connection = op.get_bind()
    product_rows = connection.execute(sa.text("SELECT DISTINCT category FROM products ORDER BY category")).mappings().all()
    used_slugs: set[str] = set()
    for row in product_rows:
        name = row["category"].strip()
        base_slug = slugify(name)
        slug = base_slug
        suffix = 2
        while slug in used_slugs:
            slug = f"{base_slug}-{suffix}"
            suffix += 1
        used_slugs.add(slug)
        connection.execute(sa.text("INSERT INTO categories (name, slug, status) VALUES (:name, :slug, 'ACTIVE')"), {"name": name, "slug": slug})

    connection.execute(sa.text("UPDATE products p SET category_id = c.category_id FROM categories c WHERE c.name = p.category"))
    op.alter_column("products", "category_id", nullable=False)
    op.create_foreign_key("fk_products_category_id", "products", "categories", ["category_id"], ["category_id"], ondelete="RESTRICT")
    op.create_index("ix_products_category_id", "products", ["category_id"])


def downgrade() -> None:
    op.drop_index("ix_products_category_id", table_name="products")
    op.drop_constraint("fk_products_category_id", "products", type_="foreignkey")
    op.drop_column("products", "category_id")
    op.drop_index("ix_categories_status", table_name="categories")
    op.drop_index("ix_categories_slug", table_name="categories")
    op.drop_index("ix_categories_name", table_name="categories")
    op.drop_index("ix_categories_category_id", table_name="categories")
    op.drop_table("categories")
