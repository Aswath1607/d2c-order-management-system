from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


AssignmentType = Literal["WORKER", "DELIVERY_AGENT"]
AssignmentStatus = Literal["ASSIGNED", "ACCEPTED", "COMPLETED", "REASSIGNED", "CANCELLED"]
FulfillmentAction = Literal["START_PROCESSING", "MARK_PACKED", "MARK_OUT_FOR_DELIVERY", "MARK_DELIVERED"]


class AssignmentCreate(BaseModel):
    assigned_to_user_id: int = Field(..., gt=0)
    assignment_type: AssignmentType
    notes: str | None = None

class FulfillmentActionRequest(BaseModel):
    action: FulfillmentAction


class AssignmentOut(BaseModel):
    id: int
    order_id: int
    order_number: str
    order_status: str
    assigned_to_user_id: int
    assigned_to_name: str
    assignment_type: AssignmentType
    status: AssignmentStatus
    assigned_by_user_id: int
    assigned_at: datetime
    accepted_at: datetime | None = None
    completed_at: datetime | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class AssignmentListResponse(BaseModel):
    items: list[AssignmentOut]