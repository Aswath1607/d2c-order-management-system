from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.order_assignment import OrderAssignment
from app.models.user import User
from app.services.order_service import record_order_status_history, transition_allowed

ACTIVE_ASSIGNMENT_STATUSES = {"ASSIGNED", "ACCEPTED"}
FULFILLMENT_RULES = {
    "START_PROCESSING": ("WORKER", "CONFIRMED", "PROCESSING", False),
    "MARK_PACKED": ("WORKER", "PROCESSING", "PACKED", True),
    "MARK_OUT_FOR_DELIVERY": ("DELIVERY_AGENT", "SHIPPED", "OUT_FOR_DELIVERY", False),
    "MARK_DELIVERED": ("DELIVERY_AGENT", "OUT_FOR_DELIVERY", "DELIVERED", True),
}


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
    if assignment.assignment_type != user.role:
        raise HTTPException(status_code=403, detail="This assignment is not valid for your role")
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


def fulfill_assignment(db: Session, assignment_id: int, user: User, action: str) -> OrderAssignment:
    rule = FULFILLMENT_RULES.get(action)
    if not rule:
        raise HTTPException(status_code=400, detail="Unsupported fulfillment action")

    assignment = db.query(OrderAssignment).filter(OrderAssignment.id == assignment_id).with_for_update().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.assigned_to_user_id != user.id:
        raise HTTPException(status_code=403, detail="You are not assigned to this order")
    expected_type, expected_order_status, target_order_status, completes_assignment = rule
    if user.role != expected_type or assignment.assignment_type != expected_type:
        raise HTTPException(status_code=403, detail="This assignment is not valid for your role")
    if assignment.status != "ACCEPTED":
        raise HTTPException(status_code=409, detail="Assignment must be accepted first")

    order = db.query(Order).filter(Order.order_id == assignment.order_id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.order_status != expected_order_status:
        raise HTTPException(status_code=409, detail=f"Order must be {expected_order_status} before {action}")
    if not transition_allowed(order.order_status, target_order_status):
        raise HTTPException(status_code=409, detail=f"Order cannot transition from {order.order_status} to {target_order_status}")

    record_order_status_history(db, order, target_order_status, f"{action.replace('_', ' ').title()} by {user.email}.", user.email)
    order.order_status = target_order_status
    if action == "MARK_DELIVERED":
        order.delivered_at = datetime.now(timezone.utc)
    if completes_assignment:
        update_assignment_status(db, assignment, user, "COMPLETED")
    db.flush()
    return assignment