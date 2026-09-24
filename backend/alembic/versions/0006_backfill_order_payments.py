"""backfill payment records for existing orders

Revision ID: 0006_backfill_order_payments
Revises: 0005_payments
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_backfill_order_payments"
down_revision: Union[str, Sequence[str], None] = "0005_payments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(sa.text(
        """
        INSERT INTO payments (
            order_id, payment_method, payment_status, amount, currency, provider,
            payment_reference, created_at, updated_at
        )
        SELECT
            o.order_id,
            COALESCE(NULLIF(o.payment_method, ''), 'COD'),
            COALESCE(o.payment_status, 'PAYMENT_PENDING'),
            o.total_amount,
            'INR',
            CASE WHEN COALESCE(NULLIF(o.payment_method, ''), 'COD') = 'COD' THEN 'COD' ELSE 'MOCK' END,
            CASE WHEN COALESCE(o.payment_status, 'PAYMENT_PENDING') = 'PAYMENT_SUCCESS' THEN 'LEGACY-' || o.order_number ELSE NULL END,
            COALESCE(o.created_at, CURRENT_TIMESTAMP),
            COALESCE(o.updated_at, CURRENT_TIMESTAMP)
        FROM orders o
        LEFT JOIN payments p ON p.order_id = o.order_id
        WHERE p.payment_id IS NULL
        """
    ))
    connection.execute(sa.text(
        """
        INSERT INTO payment_history (payment_id, from_status, to_status, note, changed_by, created_at)
        SELECT p.payment_id, NULL, p.payment_status, 'Backfilled from the existing order payment fields.', 'migration', p.created_at
        FROM payments p
        LEFT JOIN payment_history h ON h.payment_id = p.payment_id
        WHERE h.id IS NULL
        """
    ))


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(sa.text(
        "DELETE FROM payments WHERE payment_id IN (SELECT payment_id FROM payment_history WHERE changed_by = 'migration')"
    ))