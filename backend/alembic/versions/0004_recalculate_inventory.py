"""recalculate persisted inventory availability

Revision ID: 0004_recalculate_inventory
Revises: 0003_order_status_history
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_recalculate_inventory"
down_revision: Union[str, Sequence[str], None] = "0003_order_status_history"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(sa.text(
        "UPDATE inventory SET available_quantity = GREATEST(0, stock_quantity - reserved_quantity - damaged_quantity)"
    ))


def downgrade() -> None:
    pass