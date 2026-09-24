"""add worker and delivery agent roles and profiles

Revision ID: 0007_staff_roles_and_profiles
Revises: 0006_backfill_order_payments
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007_staff_roles_and_profiles"
down_revision: Union[str, Sequence[str], None] = "0006_backfill_order_payments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_users_role",
        "users",
        "role IN ('ADMIN', 'CUSTOMER', 'WORKER', 'DELIVERY_AGENT')",
    )
    op.create_table(
        "worker_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_code", sa.String(length=50), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("shift", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id"),
        sa.UniqueConstraint("employee_code"),
    )
    op.create_index("ix_worker_profiles_id", "worker_profiles", ["id"])
    op.create_index("ix_worker_profiles_user_id", "worker_profiles", ["user_id"])
    op.create_index("ix_worker_profiles_employee_code", "worker_profiles", ["employee_code"])
    op.create_table(
        "delivery_agent_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("agent_code", sa.String(length=50), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("vehicle_type", sa.String(length=50), nullable=True),
        sa.Column("vehicle_number", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id"),
        sa.UniqueConstraint("agent_code"),
    )
    op.create_index("ix_delivery_agent_profiles_id", "delivery_agent_profiles", ["id"])
    op.create_index("ix_delivery_agent_profiles_user_id", "delivery_agent_profiles", ["user_id"])
    op.create_index("ix_delivery_agent_profiles_agent_code", "delivery_agent_profiles", ["agent_code"])


def downgrade() -> None:
    op.drop_index("ix_delivery_agent_profiles_agent_code", table_name="delivery_agent_profiles")
    op.drop_index("ix_delivery_agent_profiles_user_id", table_name="delivery_agent_profiles")
    op.drop_index("ix_delivery_agent_profiles_id", table_name="delivery_agent_profiles")
    op.drop_table("delivery_agent_profiles")
    op.drop_index("ix_worker_profiles_employee_code", table_name="worker_profiles")
    op.drop_index("ix_worker_profiles_user_id", table_name="worker_profiles")
    op.drop_index("ix_worker_profiles_id", table_name="worker_profiles")
    op.drop_table("worker_profiles")
    op.drop_constraint("ck_users_role", "users", type_="check")