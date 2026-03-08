from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import get_db
from .auth import router as auth_router
from .assignments import router as assignments_router
from .seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed veritabanı
    try:
        seed_database()
    except Exception as e:
        print(f"⚠️ Seed sırasında hata (DB henüz hazır olmayabilir): {e}")
    yield


app = FastAPI(title="CodeCheck API", version="0.2.0", lifespan=lifespan)

# ── CORS Middleware ───────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────
app.include_router(auth_router)
app.include_router(assignments_router)


# ── Root endpoints ────────────────────────────
@app.get("/")
def read_root():
    return {"message": "CodeCheck API is running", "version": "0.2.0"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=503, detail=f"Database connection failed: {str(e)}"
        )
