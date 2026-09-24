"""add order tracking history

Revision ID: 0009_order_tracking_history
Revises: 0008_order_assignments
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009_order_tracking_history"
down_revision: Union[str, Sequence[str], None] = "0008_order_assignments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "order_tracking_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False),
        sa.Column("changed_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("tracking_number", sa.String(length=100), nullable=True),
        sa.Column("courier_name", sa.String(length=100), nullable=True),
        sa.Column("estimated_delivery", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_order_tracking_history_id", "order_tracking_history", ["id"])
    op.create_index("ix_order_tracking_history_order_id", "order_tracking_history", ["order_id"])
    op.create_index("ix_order_tracking_history_changed_by_user_id", "order_tracking_history", ["changed_by_user_id"])


def downgrade() -> None:
    op.drop_index("ix_order_tracking_history_changed_by_user_id", table_name="order_tracking_history")
    op.drop_index("ix_order_tracking_history_order_id", table_name="order_tracking_history")
    op.drop_index("ix_order_tracking_history_id", table_name="order_tracking_history")
    op.drop_table("order_tracking_history")
