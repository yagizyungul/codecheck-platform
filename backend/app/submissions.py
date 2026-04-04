"""
Submissions router – Kod gönderme ve sonuç sorgulama endpoint'leri
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db
from .models import Submission, Assignment
from .schemas import SubmissionRequest, SubmissionResponse, SubmissionListResponse
from .auth import decode_access_token
from .mq_database import send_submission

router = APIRouter(prefix="/submissions", tags=["submissions"])

security = HTTPBearer()


def _get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("", response_model=SubmissionResponse, status_code=202)
def submit_code(
    req: SubmissionRequest,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Kod gönder → DB'ye 'pending' olarak kaydet → pgmq kuyruğuna ekle → 202 döner.
    Frontend submission_id ile GET /submissions/{id} üzerinden polling yapar.
    """
    payload = decode_access_token(credentials.credentials)
    student_id = uuid.UUID(payload["sub"])

    # Assignment var mı kontrol
    assignment = db.query(Assignment).filter(Assignment.id == req.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Ödev bulunamadı")

    # IP adresini al
    ip_address = _get_client_ip(request)

    # Submission'ı DB'ye yaz (status: pending)
    submission = Submission(
        assignment_id=req.assignment_id,
        student_id=student_id,
        code_text=req.code_text,
        language=req.language,
        status="pending",
        ip_address=ip_address,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # pgmq kuyruğuna submission_id gönder
    try:
        send_submission(str(submission.id))
    except Exception as e:
        print(f"⚠️ pgmq send hatası (submission devam ediyor): {e}")

    return submission


@router.get("/my", response_model=SubmissionListResponse)
def my_submissions(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Giriş yapmış öğrencinin tüm submission'larını listeler."""
    payload = decode_access_token(credentials.credentials)
    student_id = uuid.UUID(payload["sub"])

    submissions = (
        db.query(Submission)
        .filter(Submission.student_id == student_id)
        .order_by(Submission.submitted_at.desc())
        .all()
    )
    return SubmissionListResponse(submissions=submissions, total=len(submissions))


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Submission durumu ve sonuçları.
    Frontend bu endpoint'i polling ile çağırır: status 'done' olana kadar.
    """
    payload = decode_access_token(credentials.credentials)
    student_id = uuid.UUID(payload["sub"])

    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission bulunamadı")

    # Sadece kendi submission'ına erişebilir (admin/teacher hariç)
    if str(submission.student_id) != str(student_id) and payload.get("role") not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Erişim reddedildi")

    return submission
