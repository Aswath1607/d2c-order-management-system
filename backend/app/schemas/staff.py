from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class StaffAccountCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: str | None = Field(default=None, max_length=30)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2:
            raise ValueError("Name must contain at least two characters")
        return normalized

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is not None and (not value.strip() or not all(character.isdigit() or character in "+-() ." for character in value)):
            raise ValueError("Enter a valid phone number")
        return value.strip() if value else None


class WorkerCreate(StaffAccountCreate):
    employee_code: str = Field(..., min_length=1, max_length=50)
    department: str | None = Field(default=None, max_length=100)
    shift: str | None = Field(default=None, max_length=50)


class DeliveryAgentCreate(StaffAccountCreate):
    agent_code: str = Field(..., min_length=1, max_length=50)
    vehicle_type: str | None = Field(default=None, max_length=50)
    vehicle_number: str | None = Field(default=None, max_length=50)


class StaffProfilePatch(BaseModel):
    phone: str | None = Field(default=None, max_length=30)
    department: str | None = Field(default=None, max_length=100)
    shift: str | None = Field(default=None, max_length=50)
    vehicle_type: str | None = Field(default=None, max_length=50)
    vehicle_number: str | None = Field(default=None, max_length=50)


class StaffUserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool
    profile_id: int
    code: str
    phone: str | None = None
    department: str | None = None
    shift: str | None = None
    vehicle_type: str | None = None
    vehicle_number: str | None = None
    created_at: datetime
    updated_at: datetime
