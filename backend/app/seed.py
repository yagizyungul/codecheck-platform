"""
Seed script – Veritabanına test verisi ekler.
FastAPI startup event olarak çalışır.
"""
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from .models import User, CourseTree, Assignment
from .database import SessionLocal
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Sabit UUID'ler (tekrar çalıştırılabilirlik için)
TEACHER_ID = uuid.UUID("a0000000-0000-0000-0000-000000000001")
STUDENT1_ID = uuid.UUID("b0000000-0000-0000-0000-000000000001")
STUDENT2_ID = uuid.UUID("b0000000-0000-0000-0000-000000000002")


def seed_database():
    """Veritabanını test verileriyle doldurur (zaten varsa atlar)."""
    db: Session = SessionLocal()
    try:
        # Kullanıcılar zaten var mı kontrol et
        existing = db.query(User).filter(User.id == TEACHER_ID).first()
        if existing:
            print("✅ Seed verisi zaten mevcut, atlanıyor.")
            return

        print("🌱 Seed verisi ekleniyor...")

        # ── Kullanıcılar ──
        teacher = User(
            id=TEACHER_ID,
            email="teacher@codecheck.dev",
            username="teacher1",
            password_hash=pwd_context.hash("teacher123"),
            full_name="Prof. Ayşe Yılmaz",
            role="teacher",
        )
        student1 = User(
            id=STUDENT1_ID,
            email="student1@codecheck.dev",
            username="student1",
            password_hash=pwd_context.hash("student123"),
            full_name="Mehmet Öz",
            role="student",
        )
        student2 = User(
            id=STUDENT2_ID,
            email="student2@codecheck.dev",
            username="student2",
            password_hash=pwd_context.hash("student123"),
            full_name="Zeynep Kara",
            role="student",
        )
        db.add_all([teacher, student1, student2])
        db.flush()

        # ── Ders ağacı (ltree) ──
        courses = [
            CourseTree(label="Computer Science", path="cs", description="Bilgisayar Bilimleri bölümü"),
            CourseTree(label="CS 101", path="cs.cs101", description="Programlamaya Giriş"),
            CourseTree(label="CS 201", path="cs.cs201", description="Veri Yapıları"),
            CourseTree(label="CS 301", path="cs.cs301", description="Algoritmalar"),
        ]
        db.add_all(courses)
        db.flush()

        # ── Ödevler ──
        from datetime import datetime, timedelta, timezone

        assignments = [
            Assignment(
                id=uuid.UUID("c0000000-0000-0000-0000-000000000001"),
                title="Değişkenler ve Veri Tipleri",
                description="Python ile temel değişken tanımlama ve veri tipi dönüşümleri.",
                course_path="cs.cs101",
                due_date=datetime.now(timezone.utc) + timedelta(days=7),
                created_by=TEACHER_ID,
            ),
            Assignment(
                id=uuid.UUID("c0000000-0000-0000-0000-000000000002"),
                title="Bağlı Liste Implementasyonu",
                description="Tek yönlü bağlı liste (singly linked list) sınıfı yazınız.",
                course_path="cs.cs201",
                due_date=datetime.now(timezone.utc) + timedelta(days=5),
                created_by=TEACHER_ID,
            ),
            Assignment(
                id=uuid.UUID("c0000000-0000-0000-0000-000000000003"),
                title="Binary Search Algoritması",
                description="Recursive ve iterative binary search fonksiyonları yazınız.",
                course_path="cs.cs301",
                due_date=datetime.now(timezone.utc) + timedelta(days=10),
                created_by=TEACHER_ID,
            ),
        ]
        db.add_all(assignments)

        db.commit()
        print("✅ Seed verisi başarıyla eklendi!")
        print("   👩‍🏫 Teacher: teacher@codecheck.dev / teacher123")
        print("   👨‍🎓 Student: student1@codecheck.dev / student123")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed hatası: {e}")
    finally:
        db.close()
