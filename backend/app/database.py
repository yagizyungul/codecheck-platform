"""
Database connection – SQLAlchemy engine & session factory
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://codecheck_user:codecheck_password@db:5432/codecheck_db",
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI Depends() ile kullanılacak DB session generator"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
