from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

app = FastAPI(title="CodeCheck API")

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://codecheck_user:codecheck_password@db:5432/codecheck_db"
)

# SQLAlchemy engine and session initialization
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "CodeCheck API is running"}

@app.get("/health")
def health_check(db = Depends(get_db)):
    try:
        # Simple SELECT 1 query to check database connection
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")
