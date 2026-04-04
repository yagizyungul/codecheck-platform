"""
Pytest fixtures – CodeCheck Platform
Test DB: in-memory SQLite (pgvector/hstore özel tipleri mock'lanır)
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import get_db
from app.models import Base, User, CourseTree, Assignment
from app.auth import hash_password

# ── Test DB kurulumu ──────────────────────────
SQLALCHEMY_TEST_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# SQLite'da pgvector / hstore / ltree tipleri yoktur.
# Tabloları text tipine düşürerek oluşturuyoruz.
@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_conn, _):
    dbapi_conn.execute("PRAGMA foreign_keys=ON")


TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# pgvector, hstore, INET sütunları SQLite için Text olarak davranır
# Tabloyu manuel oluştur (SQLite uyumlu DDL)
def _create_test_tables(conn):
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL DEFAULT '',
            role TEXT NOT NULL DEFAULT 'student',
            ip_address TEXT,
            submitted_lat REAL,
            submitted_lng REAL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS course_tree (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            path TEXT UNIQUE NOT NULL,
            description TEXT DEFAULT ''
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS assignments (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            course_path TEXT NOT NULL,
            due_date TEXT,
            created_by TEXT REFERENCES users(id),
            created_at TEXT DEFAULT (datetime('now'))
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS submissions (
            id TEXT PRIMARY KEY,
            assignment_id TEXT NOT NULL REFERENCES assignments(id),
            student_id TEXT NOT NULL REFERENCES users(id),
            code_text TEXT NOT NULL DEFAULT '',
            language TEXT NOT NULL DEFAULT 'python',
            status TEXT NOT NULL DEFAULT 'pending',
            score INTEGER,
            feedback TEXT,
            code_embedding TEXT,
            similarity_score REAL,
            is_flagged INTEGER NOT NULL DEFAULT 0,
            test_results TEXT,
            ip_address TEXT,
            submitted_lat REAL,
            submitted_lng REAL,
            submitted_at TEXT DEFAULT (datetime('now')),
            processed_at TEXT
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS submission_metrics (
            time TEXT DEFAULT (datetime('now')),
            student_id TEXT NOT NULL REFERENCES users(id),
            assignment_id TEXT NOT NULL REFERENCES assignments(id),
            score INTEGER,
            processing_time_ms INTEGER,
            similarity_score REAL
        )
    """))
    conn.commit()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    with test_engine.connect() as conn:
        _create_test_tables(conn)
    yield
    test_engine.dispose()


@pytest.fixture
def db():
    conn = test_engine.connect()
    transaction = conn.begin()
    session = TestSessionLocal(bind=conn)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        conn.close()


@pytest.fixture
def client(db):
    def _override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Test verisi fixtures ──────────────────────

TEACHER_ID = str(uuid.UUID("a0000000-0000-0000-0000-000000000001"))
STUDENT_ID = str(uuid.UUID("b0000000-0000-0000-0000-000000000001"))
ASSIGNMENT_ID = str(uuid.UUID("c0000000-0000-0000-0000-000000000001"))


@pytest.fixture
def teacher_user(db):
    db.execute(text("""
        INSERT OR IGNORE INTO users (id, email, username, password_hash, full_name, role)
        VALUES (:id, :email, :username, :pw, :fn, 'teacher')
    """), {
        "id": TEACHER_ID,
        "email": "teacher@test.com",
        "username": "teacher1",
        "pw": hash_password("teacher123"),
        "fn": "Test Teacher",
    })
    db.commit()
    return {"id": TEACHER_ID, "email": "teacher@test.com", "password": "teacher123", "role": "teacher"}


@pytest.fixture
def student_user(db):
    db.execute(text("""
        INSERT OR IGNORE INTO users (id, email, username, password_hash, full_name, role)
        VALUES (:id, :email, :username, :pw, :fn, 'student')
    """), {
        "id": STUDENT_ID,
        "email": "student@test.com",
        "username": "student1",
        "pw": hash_password("student123"),
        "fn": "Test Student",
    })
    db.commit()
    return {"id": STUDENT_ID, "email": "student@test.com", "password": "student123", "role": "student"}


@pytest.fixture
def sample_assignment(db, teacher_user):
    db.execute(text("""
        INSERT OR IGNORE INTO assignments (id, title, description, course_path, created_by)
        VALUES (:id, :title, :desc, :cp, :cb)
    """), {
        "id": ASSIGNMENT_ID,
        "title": "Test Ödevi",
        "desc": "Test açıklaması",
        "cp": "cs.cs101",
        "cb": TEACHER_ID,
    })
    db.commit()
    return {"id": ASSIGNMENT_ID, "title": "Test Ödevi"}


@pytest.fixture
def student_token(client, student_user):
    """Öğrenci için JWT token alır."""
    resp = client.post("/auth/login", json={
        "email": student_user["email"],
        "password": student_user["password"],
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def teacher_token(client, teacher_user):
    """Öğretmen için JWT token alır."""
    resp = client.post("/auth/login", json={
        "email": teacher_user["email"],
        "password": teacher_user["password"],
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]
