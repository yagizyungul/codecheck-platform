"""
Admin router – Öğretmen/admin paneli endpoint'leri
Tüm endpoint'ler teacher veya admin rolü gerektirir.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text

from .database import get_db
from .auth import decode_access_token
from .schemas import (
    FlaggedSubmissionResponse,
    WeeklyMetricResponse,
    SimilarSubmissionResponse,
    SubmissionListResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])

security = HTTPBearer()


def _require_teacher_or_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_access_token(credentials.credentials)
    if payload.get("role") not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Bu endpoint sadece öğretmen/admin erişimine açık")
    return payload


# ── Tüm submission'lar ────────────────────────

@router.get("/results")
def all_results(
    payload: dict = Depends(_require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    """Tüm submission'ları öğrenci + ödev bilgisiyle döndürür."""
    rows = db.execute(text("""
        SELECT
            s.id,
            s.status,
            s.score,
            s.similarity_score,
            s.is_flagged,
            s.language,
            s.submitted_at,
            s.processed_at,
            u.username AS student_username,
            u.full_name AS student_full_name,
            a.title AS assignment_title
        FROM submissions s
        JOIN users u ON u.id = s.student_id
        JOIN assignments a ON a.id = s.assignment_id
        ORDER BY s.submitted_at DESC
        LIMIT 200
    """)).mappings().all()
    return {"results": [dict(r) for r in rows], "total": len(rows)}


# ── PostGIS: Şüpheli konum tespiti ───────────

@router.get("/flagged", response_model=list[FlaggedSubmissionResponse])
def flagged_by_location(
    radius_meters: float = 50.0,
    payload: dict = Depends(_require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    """
    PostGIS ST_DWithin kullanarak aynı ödev için 50m mesafe içindeki
    farklı öğrenci submission çiftlerini döndürür.
    Muhtemel kopya çekme göstergesi.
    """
    rows = db.execute(text("""
        SELECT
            s1.id::text  AS submission_id_1,
            s2.id::text  AS submission_id_2,
            s1.student_id::text AS student_id_1,
            s2.student_id::text AS student_id_2,
            s1.assignment_id::text AS assignment_id,
            ST_Distance(
                ST_MakePoint(s1.submitted_lng, s1.submitted_lat)::geography,
                ST_MakePoint(s2.submitted_lng, s2.submitted_lat)::geography
            ) AS distance_meters
        FROM submissions s1
        JOIN submissions s2
            ON  s1.assignment_id = s2.assignment_id
            AND s1.student_id    < s2.student_id
        WHERE
            s1.submitted_lat IS NOT NULL
            AND s1.submitted_lng IS NOT NULL
            AND s2.submitted_lat IS NOT NULL
            AND s2.submitted_lng IS NOT NULL
            AND ST_DWithin(
                ST_MakePoint(s1.submitted_lng, s1.submitted_lat)::geography,
                ST_MakePoint(s2.submitted_lng, s2.submitted_lat)::geography,
                :radius
            )
        ORDER BY distance_meters ASC
        LIMIT 100
    """), {"radius": radius_meters}).mappings().all()

    return [FlaggedSubmissionResponse(**dict(r)) for r in rows]


# ── TimescaleDB: Haftalık metrikler ──────────

@router.get("/metrics/weekly", response_model=list[WeeklyMetricResponse])
def weekly_metrics(
    payload: dict = Depends(_require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    """
    TimescaleDB time_bucket fonksiyonu ile haftalık ortalama skor
    ve submission sayısını döndürür. Frontend Chart.js grafiği için.
    """
    rows = db.execute(text("""
        SELECT
            time_bucket('1 week', time) AS week,
            AVG(score)::float           AS avg_score,
            COUNT(*)::int               AS submission_count
        FROM submission_metrics
        GROUP BY week
        ORDER BY week DESC
        LIMIT 12
    """)).mappings().all()

    return [WeeklyMetricResponse(**dict(r)) for r in rows]


# ── pgvector: Benzerlik raporu ────────────────

@router.get("/similarity/{submission_id}", response_model=list[SimilarSubmissionResponse])
def similarity_report(
    submission_id: str,
    top_k: int = 5,
    payload: dict = Depends(_require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    """
    pgvector cosine similarity ile belirli bir submission'a en benzer
    diğer submission'ları döndürür. Kopya tespiti için.
    """
    rows = db.execute(text("""
        SELECT
            s.id::text      AS submission_id,
            s.student_id::text AS student_id,
            (1 - (s.code_embedding <=> target.code_embedding))::float AS similarity
        FROM submissions s
        CROSS JOIN LATERAL (
            SELECT code_embedding FROM submissions WHERE id = :sid
        ) target
        WHERE
            s.id != :sid
            AND s.code_embedding IS NOT NULL
            AND target.code_embedding IS NOT NULL
        ORDER BY s.code_embedding <=> target.code_embedding
        LIMIT :k
    """), {"sid": submission_id, "k": top_k}).mappings().all()

    return [SimilarSubmissionResponse(**dict(r)) for r in rows]


# ── ltree: Kurs ağacı ────────────────────────

@router.get("/courses/tree")
def course_tree(
    payload: dict = Depends(_require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    """
    ltree kullanarak kurs hiyerarşisini döndürür.
    Örnek: cs → cs.cs101 → cs.cs101.week1
    """
    rows = db.execute(text("""
        SELECT
            id::text,
            label,
            path::text,
            description,
            nlevel(path) AS depth,
            subpath(path, 0, nlevel(path) - 1)::text AS parent_path
        FROM course_tree
        ORDER BY path
    """)).mappings().all()

    return {"courses": [dict(r) for r in rows]}


# ── ltree: Belirli kursun alt ağacı ──────────

@router.get("/courses/{course_path:path}/subtree")
def course_subtree(
    course_path: str,
    payload: dict = Depends(_require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    """
    ltree <@ operatörü ile belirli kursun tüm alt dallarını getirir.
    Örnek: /admin/courses/cs.cs101/subtree → cs.cs101 ve altındaki tüm nodelar
    """
    rows = db.execute(text("""
        SELECT id::text, label, path::text, description
        FROM course_tree
        WHERE path <@ :cpath::ltree
        ORDER BY path
    """), {"cpath": course_path}).mappings().all()

    if not rows:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı")

    return {"subtree": [dict(r) for r in rows]}
