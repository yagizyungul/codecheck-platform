"""
Assignments router – Ödev listeleme endpoint'leri
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db
from .models import Assignment
from .schemas import AssignmentResponse, AssignmentListResponse
from .auth import decode_access_token

router = APIRouter(prefix="/assignments", tags=["assignments"])

security = HTTPBearer()


@router.get("", response_model=AssignmentListResponse)
def list_assignments(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """JWT korumalı – tüm ödevleri listele"""
    payload = decode_access_token(credentials.credentials)

    assignments = db.query(Assignment).order_by(Assignment.due_date.asc()).all()
    return AssignmentListResponse(
        assignments=[AssignmentResponse.model_validate(a) for a in assignments],
        total=len(assignments),
    )


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(
    assignment_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Tek bir ödevin detayını döndürür"""
    payload = decode_access_token(credentials.credentials)

    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Ödev bulunamadı")
    return assignment
