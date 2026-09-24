from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class WorkerProfileOut(BaseModel):
    id: int
    employee_code: str
    phone: str | None = None
    department: str | None = None
    shift: str | None = None

    model_config = {"from_attributes": True}


class DeliveryAgentProfileOut(BaseModel):
    id: int
    agent_code: str
    phone: str | None = None
    vehicle_type: str | None = None
    vehicle_number: str | None = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool
    worker_profile: WorkerProfileOut | None = None
    delivery_agent_profile: DeliveryAgentProfileOut | None = None

    model_config = {"from_attributes": True}
