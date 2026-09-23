"""add order status history

Revision ID: 0003_order_status_history
Revises: 0002_categories
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_order_status_history"
down_revision: Union[str, Sequence[str], None] = "0002_categories"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "order_status_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("changed_by", sa.String(length=150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_order_status_history_id", "order_status_history", ["id"])
    op.create_index("ix_order_status_history_order_id", "order_status_history", ["order_id"])
    op.create_index("ix_order_status_history_status", "order_status_history", ["status"])
    op.create_index("ix_order_status_history_changed_by", "order_status_history", ["changed_by"])

    connection = op.get_bind()
    connection.execute(sa.text("INSERT INTO order_status_history (order_id, status, note, changed_by, created_at) SELECT order_id, order_status, CONCAT('Initial ', order_status), 'system', COALESCE(updated_at, created_at) FROM orders"))


def downgrade() -> None:
    op.drop_index("ix_order_status_history_changed_by", table_name="order_status_history")
    op.drop_index("ix_order_status_history_status", table_name="order_status_history")
    op.drop_index("ix_order_status_history_order_id", table_name="order_status_history")
    op.drop_index("ix_order_status_history_id", table_name="order_status_history")
    op.drop_table("order_status_history")
