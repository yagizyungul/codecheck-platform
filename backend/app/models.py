"""
SQLAlchemy ORM modelleri – CodeCheck Platform
"""
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, HSTORE, INET
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    full_name = Column(Text, nullable=False, default="")
    role = Column(String(20), nullable=False, default="student")
    ip_address = Column(INET, nullable=True)
    submitted_lat = Column(Float, nullable=True)
    submitted_lng = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assignments_created = relationship("Assignment", back_populates="creator")
    submissions = relationship("Submission", back_populates="student")


class CourseTree(Base):
    __tablename__ = "course_tree"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label = Column(Text, nullable=False)
    path = Column(String, unique=True, nullable=False)  # ltree
    description = Column(Text, default="")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    description = Column(Text, default="")
    course_path = Column(String, nullable=False)  # ltree
    due_date = Column(DateTime(timezone=True))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="assignments_created")
    submissions = relationship("Submission", back_populates="assignment")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    code_text = Column(Text, nullable=False, default="")
    language = Column(String(30), nullable=False, default="python")
    status = Column(String(30), nullable=False, default="pending")
    score = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    # pgvector: 384-boyutlu kod embedding (sentence-transformers all-MiniLM-L6-v2)
    code_embedding = Column(Vector(384), nullable=True)
    # pgvector cosine similarity: 0.0 (farklı) → 1.0 (aynı)
    similarity_score = Column(Float, nullable=True)
    is_flagged = Column(Boolean, nullable=False, default=False)
    # hstore: esnek test sonuçları { test_1=>pass, runtime=>142ms, score=>85 }
    test_results = Column(HSTORE, nullable=True)
    # PostGIS: IP bazlı konum tespiti
    ip_address = Column(INET, nullable=True)
    submitted_lat = Column(Float, nullable=True)
    submitted_lng = Column(Float, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")


class SubmissionMetric(Base):
    """TimescaleDB hypertable – submission başına zaman serisi metrik"""
    __tablename__ = "submission_metrics"

    time = Column(DateTime(timezone=True), primary_key=True, server_default=func.now())
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    similarity_score = Column(Float, nullable=True)
