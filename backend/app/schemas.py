"""
Pydantic request/response şemaları – CodeCheck Platform
"""
from pydantic import BaseModel
from typing import Optional, Dict
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


# ── Submissions ───────────────────────────────

class SubmissionRequest(BaseModel):
    assignment_id: UUID
    code_text: str
    language: str = "python"
    custom_lat: Optional[float] = None
    custom_lng: Optional[float] = None


class SubmissionResponse(BaseModel):
    id: UUID
    assignment_id: UUID
    student_id: UUID
    code_text: str
    language: str
    status: str
    score: Optional[int] = None
    feedback: Optional[str] = None
    similarity_score: Optional[float] = None
    is_flagged: bool
    test_results: Optional[Dict[str, str]] = None
    submitted_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SubmissionListResponse(BaseModel):
    submissions: list[SubmissionResponse]
    total: int


# ── Admin ─────────────────────────────────────

class FlaggedSubmissionResponse(BaseModel):
    submission_id_1: str
    submission_id_2: str
    student_id_1: str
    student_id_2: str
    assignment_id: str
    distance_meters: float


class WeeklyMetricResponse(BaseModel):
    week: datetime
    avg_score: Optional[float]
    submission_count: int


class SimilarSubmissionResponse(BaseModel):
    submission_id: str
    student_id: str
    similarity: float


# ── Courses (ltree) ───────────────────────────

class CourseNodeResponse(BaseModel):
    id: UUID
    label: str
    path: str
    description: str
    children: list["CourseNodeResponse"] = []

    class Config:
        from_attributes = True


CourseNodeResponse.model_rebuild()
