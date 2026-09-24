from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.order import Order
from app.models.order_assignment import OrderAssignment
from app.models.user import User
from app.schemas.assignment import AssignmentCreate, AssignmentListResponse, AssignmentOut, FulfillmentActionRequest
from app.services.assignment_service import ACTIVE_ASSIGNMENT_STATUSES, assign_order, assignment_payload, cancel_assignment, fulfill_assignment, update_assignment_status

router = APIRouter()


@router.post("/orders/{order_id}/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(order_id: int, payload: AssignmentCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    target = db.query(User).filter(User.id == payload.assigned_to_user_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not target:
        raise HTTPException(status_code=404, detail="Assignment target not found")
    try:
        assignment = assign_order(db, order, target, current_user, payload.assignment_type, payload.notes)
        db.commit()
        db.refresh(assignment)
        return assignment_payload(assignment)
    except HTTPException:
        db.rollback()
        raise


@router.get("/orders/{order_id}/assignments", response_model=AssignmentListResponse)
def list_order_assignments(order_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if not db.query(Order).filter(Order.order_id == order_id).first():
        raise HTTPException(status_code=404, detail="Order not found")
    items = db.query(OrderAssignment).filter(OrderAssignment.order_id == order_id).order_by(OrderAssignment.created_at.asc()).all()
    return {"items": [assignment_payload(item) for item in items]}


@router.patch("/assignments/{assignment_id}/cancel", response_model=AssignmentOut)
def cancel_order_assignment(assignment_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    assignment = db.query(OrderAssignment).filter(OrderAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    try:
        cancel_assignment(db, assignment)
        db.commit()
        db.refresh(assignment)
        return assignment_payload(assignment)
    except HTTPException:
        db.rollback()
        raise


@router.get("/assignments/{assignment_id}", response_model=AssignmentOut)
def get_assignment(assignment_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    assignment = db.query(OrderAssignment).filter(OrderAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if current_user.role != "ADMIN" and assignment.assigned_to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not assigned to this order")
    return assignment_payload(assignment)


def list_my_assignments(role: str, db: Session, current_user: User):
    if current_user.role != role:
        raise HTTPException(status_code=403, detail=f"{role.replace('_', ' ').title()} access required")
    items = db.query(OrderAssignment).filter(
        OrderAssignment.assigned_to_user_id == current_user.id,
        OrderAssignment.assignment_type == role,
    ).order_by(OrderAssignment.created_at.desc()).all()
    return {"items": [assignment_payload(item) for item in items]}


@router.get("/worker/assignments", response_model=AssignmentListResponse)
def list_worker_assignments(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return list_my_assignments("WORKER", db, current_user)


@router.get("/delivery-agent/assignments", response_model=AssignmentListResponse)
def list_delivery_agent_assignments(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return list_my_assignments("DELIVERY_AGENT", db, current_user)


@router.patch("/assignments/{assignment_id}/accept", response_model=AssignmentOut)
def accept_assignment(assignment_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    assignment = db.query(OrderAssignment).filter(OrderAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    try:
        update_assignment_status(db, assignment, current_user, "ACCEPTED")
        db.commit()
        db.refresh(assignment)
        return assignment_payload(assignment)
    except HTTPException:
        db.rollback()
        raise


@router.patch("/assignments/{assignment_id}/complete", response_model=AssignmentOut)
def complete_assignment(assignment_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    assignment = db.query(OrderAssignment).filter(OrderAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    try:
        update_assignment_status(db, assignment, current_user, "COMPLETED")
        db.commit()
        db.refresh(assignment)
        return assignment_payload(assignment)
    except HTTPException:
        db.rollback()
        raise


@router.patch("/assignments/{assignment_id}/fulfillment", response_model=AssignmentOut)
def fulfill_order_assignment(assignment_id: int, payload: FulfillmentActionRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        assignment = fulfill_assignment(db, assignment_id, current_user, payload.action)
        db.commit()
        db.refresh(assignment)
        return assignment_payload(assignment)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Unable to fulfill assignment")