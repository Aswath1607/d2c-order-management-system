"""add auditable order assignments

Revision ID: 0008_order_assignments
Revises: 0007_staff_roles_and_profiles
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008_order_assignments"
down_revision: Union[str, Sequence[str], None] = "0007_staff_roles_and_profiles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "order_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False),
        sa.Column("assigned_to_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("assignment_type", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ASSIGNED"),
        sa.Column("assigned_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("assignment_type IN ('WORKER', 'DELIVERY_AGENT')", name="ck_order_assignments_type"),
        sa.CheckConstraint("status IN ('ASSIGNED', 'ACCEPTED', 'COMPLETED', 'REASSIGNED', 'CANCELLED')", name="ck_order_assignments_status"),
    )
    op.create_index("ix_order_assignments_id", "order_assignments", ["id"])
    op.create_index("ix_order_assignments_order_id", "order_assignments", ["order_id"])
    op.create_index("ix_order_assignments_assigned_to_user_id", "order_assignments", ["assigned_to_user_id"])
    op.create_index("ix_order_assignments_assignment_type", "order_assignments", ["assignment_type"])
    op.create_index("ix_order_assignments_status", "order_assignments", ["status"])
    op.create_index("ix_order_assignments_assigned_by_user_id", "order_assignments", ["assigned_by_user_id"])


def downgrade() -> None:
    op.drop_index("ix_order_assignments_assigned_by_user_id", table_name="order_assignments")
    op.drop_index("ix_order_assignments_status", table_name="order_assignments")
    op.drop_index("ix_order_assignments_assignment_type", table_name="order_assignments")
    op.drop_index("ix_order_assignments_assigned_to_user_id", table_name="order_assignments")
    op.drop_index("ix_order_assignments_order_id", table_name="order_assignments")
    op.drop_index("ix_order_assignments_id", table_name="order_assignments")
    op.drop_table("order_assignments")