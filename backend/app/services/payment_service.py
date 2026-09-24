from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.payment import Payment, PaymentHistory

PAYMENT_METHODS = {"COD", "UPI", "CARD", "NET_BANKING"}
PAYMENT_STATUSES = {"PAYMENT_PENDING", "PAYMENT_PROCESSING", "PAYMENT_SUCCESS", "PAYMENT_FAILED", "PAYMENT_REFUNDED", "PAYMENT_CANCELLED"}
ONLINE_METHODS = PAYMENT_METHODS - {"COD"}


def normalize_payment_method(value: str | None) -> str:
    normalized = (value or "COD").strip().upper().replace(" ", "_")
    if normalized == "CREDIT_CARD" or normalized == "DEBIT_CARD":
        normalized = "CARD"
    if normalized not in PAYMENT_METHODS:
        raise HTTPException(status_code=422, detail="Unsupported payment method")
    return normalized


def record_payment_history(db: Session, payment: Payment, to_status: str, note: str, changed_by: str) -> None:
    db.add(PaymentHistory(
        payment_id=payment.payment_id,
        from_status=payment.payment_status,
        to_status=to_status,
        note=note,
        changed_by=changed_by,
    ))


def create_payment(db: Session, order: Order, payment_method: str) -> Payment:
    method = normalize_payment_method(payment_method)
    payment = Payment(
        order_id=order.order_id,
        payment_method=method,
        payment_status="PAYMENT_PENDING",
        amount=order.total_amount,
        currency="INR",
        provider="MOCK" if method != "COD" else "COD",
    )
    db.add(payment)
    db.flush()
    record_payment_history(db, payment, "PAYMENT_PENDING", "Payment created.", "system")
    return payment


def initiate_mock_payment(db: Session, payment: Payment, changed_by: str) -> Payment:
    if payment.payment_method == "COD":
        raise HTTPException(status_code=400, detail="COD payments are collected by an administrator")
    if payment.payment_status in {"PAYMENT_SUCCESS", "PAYMENT_REFUNDED", "PAYMENT_CANCELLED"}:
        raise HTTPException(status_code=409, detail="Payment cannot be retried in its current state")

    payment.payment_status = "PAYMENT_PROCESSING"
    record_payment_history(db, payment, "PAYMENT_PROCESSING", "Payment sent to the mock sandbox provider.", changed_by)
    payment.provider_transaction_id = payment.provider_transaction_id or f"MOCK-{uuid4().hex[:16].upper()}"
    payment.payment_reference = payment.provider_transaction_id
    payment.payment_status = "PAYMENT_SUCCESS"
    payment.paid_at = datetime.now(timezone.utc)
    record_payment_history(db, payment, "PAYMENT_SUCCESS", "Mock sandbox payment approved; no real funds were captured.", changed_by)
    payment.order.payment_status = payment.payment_status
    return payment


def mark_cod_paid(db: Session, payment: Payment, changed_by: str, reference: str | None = None) -> Payment:
    if payment.payment_method != "COD":
        raise HTTPException(status_code=400, detail="Only COD payments can be marked as collected")
    if payment.payment_status != "PAYMENT_PENDING":
        raise HTTPException(status_code=409, detail="COD payment is not pending")
    payment.payment_status = "PAYMENT_SUCCESS"
    payment.payment_reference = reference or f"COD-{uuid4().hex[:12].upper()}"
    payment.paid_at = datetime.now(timezone.utc)
    record_payment_history(db, payment, "PAYMENT_SUCCESS", "Cash on delivery collected.", changed_by)
    payment.order.payment_status = payment.payment_status
    return payment


def cancel_payment_for_order(db: Session, payment: Payment, changed_by: str) -> Payment:
    if payment.payment_status in {"PAYMENT_CANCELLED", "PAYMENT_REFUNDED"}:
        return payment
    target_status = "PAYMENT_REFUNDED" if payment.payment_status == "PAYMENT_SUCCESS" else "PAYMENT_CANCELLED"
    payment.payment_status = target_status
    record_payment_history(db, payment, target_status, "Payment updated because the order was cancelled.", changed_by)
    payment.order.payment_status = target_status
    return payment