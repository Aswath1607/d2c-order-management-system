"""create initial PostgreSQL schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-09-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="CUSTOMER"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("length(trim(name)) >= 2", name="ck_users_name_length"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "customers",
        sa.Column("customer_id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(length=20), nullable=True),
        sa.Column("address_line1", sa.String(length=255), nullable=True),
        sa.Column("address_line2", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("pincode", sa.String(length=20), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint("length(trim(first_name)) >= 1", name="ck_customers_first_name"),
        sa.CheckConstraint("length(trim(last_name)) >= 1", name="ck_customers_last_name"),
    )
    op.create_index("ix_customers_customer_id", "customers", ["customer_id"])
    op.create_index("ix_customers_user_id", "customers", ["user_id"], unique=True)
    op.create_index("ix_customers_email", "customers", ["email"], unique=True)
    op.create_index("ix_customers_phone", "customers", ["phone"])
    op.create_index("ix_customers_status", "customers", ["status"])

    op.create_table(
        "products",
        sa.Column("product_id", sa.Integer(), primary_key=True),
        sa.Column("product_name", sa.String(length=200), nullable=False),
        sa.Column("sku", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("cost_price", sa.Float(), nullable=False),
        sa.Column("discount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("tax_rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("brand", sa.String(length=100), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("weight", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("price >= 0", name="ck_products_price_non_negative"),
        sa.CheckConstraint("cost_price >= 0", name="ck_products_cost_price_non_negative"),
        sa.CheckConstraint("discount >= 0", name="ck_products_discount_non_negative"),
        sa.CheckConstraint("tax_rate >= 0", name="ck_products_tax_rate_non_negative"),
        sa.CheckConstraint("weight >= 0", name="ck_products_weight_non_negative"),
    )
    op.create_index("ix_products_product_id", "products", ["product_id"])
    op.create_index("ix_products_product_name", "products", ["product_name"])
    op.create_index("ix_products_sku", "products", ["sku"], unique=True)
    op.create_index("ix_products_category", "products", ["category"])
    op.create_index("ix_products_status", "products", ["status"])

    op.create_table(
        "orders",
        sa.Column("order_id", sa.Integer(), primary_key=True),
        sa.Column("order_number", sa.String(length=50), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("order_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("subtotal", sa.Float(), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("shipping_charge", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="PENDING"),
        sa.Column("payment_method", sa.String(length=20), nullable=True),
        sa.Column("order_status", sa.String(length=30), nullable=False, server_default="PENDING"),
        sa.Column("shipping_address", sa.Text(), nullable=True),
        sa.Column("tracking_number", sa.String(length=100), nullable=True),
        sa.Column("courier_name", sa.String(length=100), nullable=True),
        sa.Column("estimated_delivery", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.customer_id"], ondelete="RESTRICT"),
        sa.CheckConstraint("subtotal >= 0", name="ck_orders_subtotal_non_negative"),
        sa.CheckConstraint("discount_amount >= 0", name="ck_orders_discount_non_negative"),
        sa.CheckConstraint("tax_amount >= 0", name="ck_orders_tax_non_negative"),
        sa.CheckConstraint("shipping_charge >= 0", name="ck_orders_shipping_non_negative"),
        sa.CheckConstraint("total_amount >= 0", name="ck_orders_total_non_negative"),
    )
    op.create_index("ix_orders_order_id", "orders", ["order_id"])
    op.create_index("ix_orders_order_number", "orders", ["order_number"], unique=True)
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_orders_payment_status", "orders", ["payment_status"])
    op.create_index("ix_orders_order_status", "orders", ["order_status"])

    op.create_table(
        "inventory",
        sa.Column("inventory_id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("stock_quantity", sa.Float(), nullable=False, server_default="0"),
        sa.Column("reserved_quantity", sa.Float(), nullable=False, server_default="0"),
        sa.Column("damaged_quantity", sa.Float(), nullable=False, server_default="0"),
        sa.Column("reorder_level", sa.Float(), nullable=False, server_default="0"),
        sa.Column("reorder_quantity", sa.Float(), nullable=False, server_default="0"),
        sa.Column("warehouse_location", sa.String(length=200), nullable=True),
        sa.Column("supplier_name", sa.String(length=200), nullable=True),
        sa.Column("available_quantity", sa.Float(), nullable=False, server_default="0"),
        sa.Column("last_restocked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["product_id"], ["products.product_id"], ondelete="CASCADE"),
        sa.CheckConstraint("stock_quantity >= 0", name="ck_inventory_stock_non_negative"),
        sa.CheckConstraint("reserved_quantity >= 0", name="ck_inventory_reserved_non_negative"),
        sa.CheckConstraint("available_quantity >= 0", name="ck_inventory_available_non_negative"),
        sa.CheckConstraint("reorder_level >= 0", name="ck_inventory_reorder_level_non_negative"),
        sa.CheckConstraint("reorder_quantity >= 0", name="ck_inventory_reorder_quantity_non_negative"),
        sa.CheckConstraint("damaged_quantity >= 0", name="ck_inventory_damaged_non_negative"),
        sa.CheckConstraint("available_quantity <= stock_quantity", name="ck_inventory_available_lte_stock"),
    )
    op.create_index("ix_inventory_inventory_id", "inventory", ["inventory_id"])
    op.create_index("ix_inventory_product_id", "inventory", ["product_id"], unique=True)

    op.create_table(
        "order_items",
        sa.Column("order_item_id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("discount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("tax", sa.Float(), nullable=False, server_default="0"),
        sa.Column("subtotal", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["order_id"], ["orders.order_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.product_id"], ondelete="RESTRICT"),
        sa.CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        sa.CheckConstraint("unit_price >= 0", name="ck_order_items_unit_price_non_negative"),
        sa.CheckConstraint("discount >= 0", name="ck_order_items_discount_non_negative"),
        sa.CheckConstraint("tax >= 0", name="ck_order_items_tax_non_negative"),
        sa.CheckConstraint("subtotal >= 0", name="ck_order_items_subtotal_non_negative"),
    )
    op.create_index("ix_order_items_order_item_id", "order_items", ["order_item_id"])
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_items_product_id", "order_items", ["product_id"])

    op.create_table(
        "inventory_transactions",
        sa.Column("transaction_id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("inventory_id", sa.Integer(), nullable=True),
        sa.Column("transaction_type", sa.String(length=30), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("reference_type", sa.String(length=50), nullable=True),
        sa.Column("reference_id", sa.String(length=100), nullable=True),
        sa.Column("previous_stock", sa.Float(), nullable=False),
        sa.Column("new_stock", sa.Float(), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["product_id"], ["products.product_id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["inventory_id"], ["inventory.inventory_id"], ondelete="CASCADE"),
        sa.CheckConstraint("quantity >= 0", name="ck_inventory_transactions_quantity_non_negative"),
        sa.CheckConstraint("previous_stock >= 0", name="ck_inventory_transactions_previous_stock_non_negative"),
        sa.CheckConstraint("new_stock >= 0", name="ck_inventory_transactions_new_stock_non_negative"),
    )
    op.create_index("ix_inventory_transactions_transaction_id", "inventory_transactions", ["transaction_id"])
    op.create_index("ix_inventory_transactions_product_id", "inventory_transactions", ["product_id"])
    op.create_index("ix_inventory_transactions_inventory_id", "inventory_transactions", ["inventory_id"])
    op.create_index("ix_inventory_transactions_transaction_type", "inventory_transactions", ["transaction_type"])

    op.create_table(
        "alerts",
        sa.Column("alert_id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("alert_type", sa.String(length=30), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("current_stock", sa.Float(), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["product_id"], ["products.product_id"], ondelete="CASCADE"),
        sa.CheckConstraint("current_stock >= 0", name="ck_alerts_current_stock_non_negative"),
        sa.CheckConstraint("threshold >= 0", name="ck_alerts_threshold_non_negative"),
    )
    op.create_index("ix_alerts_alert_id", "alerts", ["alert_id"])
    op.create_index("ix_alerts_product_id", "alerts", ["product_id"])
    op.create_index("ix_alerts_alert_type", "alerts", ["alert_type"])
    op.create_index("ix_alerts_severity", "alerts", ["severity"])
    op.create_index("ix_alerts_is_read", "alerts", ["is_read"])


def downgrade() -> None:
    op.drop_table("alerts")
    op.drop_table("inventory_transactions")
    op.drop_table("order_items")
    op.drop_table("inventory")
    op.drop_table("orders")
    op.drop_table("products")
    op.drop_table("customers")
    op.drop_table("users")
