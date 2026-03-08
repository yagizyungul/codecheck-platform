"""
Pydantic request/response şemaları – CodeCheck Platform
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID


# ── Auth ──────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str
    full_name: str = ""


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    full_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Assignments ───────────────────────────────

class AssignmentResponse(BaseModel):
    id: UUID
    title: str
    description: str
    course_path: str
    due_date: Optional[datetime] = None
    created_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AssignmentListResponse(BaseModel):
    assignments: list[AssignmentResponse]
    total: int
