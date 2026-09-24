from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.order_assignment import OrderAssignment
from app.models.user import User

ACTIVE_ASSIGNMENT_STATUSES = {"ASSIGNED", "ACCEPTED"}


def assignment_payload(assignment: OrderAssignment) -> dict:
    return {
        "id": assignment.id,
        "order_id": assignment.order_id,
        "order_number": assignment.order.order_number,
        "order_status": assignment.order.order_status,
        "assigned_to_user_id": assignment.assigned_to_user_id,
        "assigned_to_name": assignment.assigned_to.name,
        "assignment_type": assignment.assignment_type,
        "status": assignment.status,
        "assigned_by_user_id": assignment.assigned_by_user_id,
        "assigned_at": assignment.assigned_at,
        "accepted_at": assignment.accepted_at,
        "completed_at": assignment.completed_at,
        "notes": assignment.notes,
        "created_at": assignment.created_at,
        "updated_at": assignment.updated_at,
    }


def assign_order(db: Session, order: Order, target_user: User, admin: User, assignment_type: str, notes: str | None = None) -> OrderAssignment:
    expected_role = assignment_type
    if target_user.role != expected_role:
        raise HTTPException(status_code=400, detail=f"Assignment target must have role {expected_role}")
    if not target_user.is_active:
        raise HTTPException(status_code=400, detail="Assignment target is inactive")

    current = db.query(OrderAssignment).filter(
        OrderAssignment.order_id == order.order_id,
        OrderAssignment.assignment_type == assignment_type,
        OrderAssignment.status.in_(ACTIVE_ASSIGNMENT_STATUSES),
    ).first()
    if current:
        current.status = "REASSIGNED"

    assignment = OrderAssignment(
        order_id=order.order_id,
        assigned_to_user_id=target_user.id,
        assignment_type=assignment_type,
        status="ASSIGNED",
        assigned_by_user_id=admin.id,
        assigned_at=datetime.now(timezone.utc),
        notes=notes,
    )
    db.add(assignment)
    db.flush()
    return assignment


def cancel_assignment(db: Session, assignment: OrderAssignment) -> OrderAssignment:
    if assignment.status not in ACTIVE_ASSIGNMENT_STATUSES:
        raise HTTPException(status_code=409, detail="Only active assignments can be cancelled")
    assignment.status = "CANCELLED"
    db.flush()
    return assignment


def update_assignment_status(db: Session, assignment: OrderAssignment, user: User, target_status: str) -> OrderAssignment:
    if assignment.assigned_to_user_id != user.id:
        raise HTTPException(status_code=403, detail="You are not assigned to this order")
    if target_status == "ACCEPTED" and assignment.status != "ASSIGNED":
        raise HTTPException(status_code=409, detail="Only assigned work can be accepted")
    if target_status == "COMPLETED" and assignment.status != "ACCEPTED":
        raise HTTPException(status_code=409, detail="Only accepted work can be completed")
    if target_status not in {"ACCEPTED", "COMPLETED"}:
        raise HTTPException(status_code=400, detail="Unsupported assignment transition")

    now = datetime.now(timezone.utc)
    assignment.status = target_status
    if target_status == "ACCEPTED":
        assignment.accepted_at = now
    else:
        assignment.completed_at = now
    db.flush()
    return assignment