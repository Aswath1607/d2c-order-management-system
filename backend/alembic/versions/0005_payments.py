"""add payment records and history

Revision ID: 0005_payments
Revises: 0004_recalculate_inventory
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_payments"
down_revision: Union[str, Sequence[str], None] = "0004_recalculate_inventory"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("payment_id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False),
        sa.Column("payment_method", sa.String(length=20), nullable=False),
        sa.Column("payment_status", sa.String(length=30), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("provider", sa.String(length=50), nullable=False, server_default="MOCK"),
        sa.Column("provider_transaction_id", sa.String(length=150), nullable=True),
        sa.Column("payment_reference", sa.String(length=150), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("amount >= 0", name="ck_payments_amount_non_negative"),
        sa.UniqueConstraint("order_id"),
        sa.UniqueConstraint("provider_transaction_id"),
    )
    op.create_index("ix_payments_payment_id", "payments", ["payment_id"])
    op.create_index("ix_payments_order_id", "payments", ["order_id"])
    op.create_index("ix_payments_payment_status", "payments", ["payment_status"])
    op.create_table(
        "payment_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("payment_id", sa.Integer(), sa.ForeignKey("payments.payment_id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_status", sa.String(length=30), nullable=True),
        sa.Column("to_status", sa.String(length=30), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("changed_by", sa.String(length=150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_payment_history_id", "payment_history", ["id"])
    op.create_index("ix_payment_history_payment_id", "payment_history", ["payment_id"])
    op.execute(sa.text("UPDATE orders SET payment_status = 'PAYMENT_PENDING' WHERE payment_status = 'PENDING'"))
    op.execute(sa.text("UPDATE orders SET payment_status = 'PAYMENT_SUCCESS' WHERE payment_status = 'PAID'"))


def downgrade() -> None:
    op.drop_index("ix_payment_history_payment_id", table_name="payment_history")
    op.drop_index("ix_payment_history_id", table_name="payment_history")
    op.drop_table("payment_history")
    op.drop_index("ix_payments_payment_status", table_name="payments")
    op.drop_index("ix_payments_order_id", table_name="payments")
    op.drop_index("ix_payments_payment_id", table_name="payments")
    op.drop_table("payments")