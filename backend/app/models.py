"""
SQLAlchemy ORM modelleri – CodeCheck Platform
"""
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # İlişkiler
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

    # İlişkiler
    creator = relationship("User", back_populates="assignments_created")
    submissions = relationship("Submission", back_populates="assignment")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    code_text = Column(Text, nullable=False, default="")
    status = Column(String(30), nullable=False, default="pending")
    score = Column(Integer)
    feedback = Column(Text)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # İlişkiler
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")
