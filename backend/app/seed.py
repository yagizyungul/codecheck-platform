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
        print("🌱 Seed kontrolü yapılıyor...")

        # ── Kullanıcılar ──
        existing_teacher = db.query(User).filter(User.id == TEACHER_ID).first()
        if not existing_teacher:
            print("👤 Kullanıcılar ekleniyor...")
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

        # ── Ek Öğrenciler ──
        extra_students = [
            User(id=uuid.uuid4(), email="ali.yilmaz@edu.tr", username="aliyilmaz",
                 password_hash=pwd_context.hash("student123"), full_name="Ali Yılmaz", role="student"),
            User(id=uuid.uuid4(), email="ayse.fatma@edu.tr", username="aysefatma",
                 password_hash=pwd_context.hash("student123"), full_name="Ayşe Fatma", role="student"),
            User(id=uuid.uuid4(), email="deniz.aksu@edu.tr", username="denizaksu",
                 password_hash=pwd_context.hash("student123"), full_name="Deniz Aksu", role="student"),
            User(id=uuid.uuid4(), email="can.demir@edu.tr", username="candemir",
                 password_hash=pwd_context.hash("student123"), full_name="Can Demir", role="student"),
            User(id=uuid.uuid4(), email="elif.sahin@edu.tr", username="elifsahin",
                 password_hash=pwd_context.hash("student123"), full_name="Elif Şahin", role="student"),
        ]
        for s in extra_students:
            exists = db.query(User).filter(User.email == s.email).first()
            if not exists:
                db.add(s)
                print(f"👤 Öğrenci eklendi: {s.full_name}")
        db.flush()

        # ── Ders ağacı (ltree) ──
        existing_course = db.query(CourseTree).filter(CourseTree.path == "cs").first()
        if not existing_course:
            print("📚 Ders ağacı ekleniyor...")
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

        assignments_data = [
            {
                "id": uuid.UUID("c0000000-0000-0000-0000-000000000001"),
                "title": "Değişkenler ve Veri Tipleri",
                "description": "Python ile temel değişken tanımlama ve veri tipi dönüşümleri.",
                "course_path": "cs.cs101",
                "due_date": datetime.now(timezone.utc) + timedelta(days=7),
            },
            {
                "id": uuid.UUID("c0000000-0000-0000-0000-000000000002"),
                "title": "Bağlı Liste Implementasyonu",
                "description": "Tek yönlü bağlı liste (singly linked list) sınıfı yazınız.",
                "course_path": "cs.cs201",
                "due_date": datetime.now(timezone.utc) + timedelta(days=5),
            },
            {
                "id": uuid.UUID("c0000000-0000-0000-0000-000000000003"),
                "title": "Binary Search Algoritması",
                "description": "Recursive ve iterative binary search fonksiyonları yazınız.",
                "course_path": "cs.cs301",
                "due_date": datetime.now(timezone.utc) + timedelta(days=10),
            },
            {
                "id": uuid.UUID("c0000000-0000-0000-0000-000000000004"),
                "title": "Java ile Sınıf Yapısı",
                "description": "Java dilinde 'Araba' sınıfı oluşturun ve getter/setter metotlarını yazın.",
                "course_path": "cs.cs101",
                "due_date": datetime.now(timezone.utc) + timedelta(days=3),
            },
            {
                "id": uuid.UUID("c0000000-0000-0000-0000-000000000005"),
                "title": "Python: Matplotlib ile Grafik Çizimi",
                "description": "Verilen bir veri kümesini Matplotlib kullanarak çizgi grafiği haline getirin.",
                "course_path": "cs.cs201",
                "due_date": datetime.now(timezone.utc) + timedelta(days=12),
            },
            {
                "id": uuid.UUID("c0000000-0000-0000-0000-000000000006"),
                "title": "Dijkstra Kısa Yol Algoritması",
                "description": "Python kullanarak bir graf üzerinde en kısa yol bulan Dijkstra algoritmasını yazın.",
                "course_path": "cs.cs301",
                "due_date": datetime.now(timezone.utc) + timedelta(days=15),
            },
            {
                "id": uuid.UUID("c0000000-0000-0000-0000-000000000007"),
                "title": "Java: JDBC Veritabanı Bağlantısı",
                "description": "PostgreSQL veritabanına JDBC kullanarak bağlanın ve bir 'SELECT' sorgusu çalıştırın.",
                "course_path": "cs.cs201",
                "due_date": datetime.now(timezone.utc) + timedelta(days=8),
            },
            {
                "id": uuid.UUID("c0000000-0000-0000-0000-000000000008"),
                "title": "Süresi Geçmiş Ödev (Test)",
                "description": "Bu ödevin süresi dolmuştur. Uzatma özelliğini test etmek için kullanılacaktır.",
                "course_path": "cs.cs101",
                "due_date": datetime.now(timezone.utc) - timedelta(days=1),
            },
        ]

        for data in assignments_data:
            exists = db.query(Assignment).filter(Assignment.id == data["id"]).first()
            if not exists:
                assignment = Assignment(
                    id=data["id"],
                    title=data["title"],
                    description=data["description"],
                    course_path=data["course_path"],
                    due_date=data["due_date"],
                    created_by=TEACHER_ID,
                )
                db.add(assignment)
                print(f"📝 Ödev eklendi: {data['title']}")

        # ── Submission Metrics (Geçmişe Dönük Veri) ──
        from .models import SubmissionMetric
        import random
        
        metrics_exist = db.query(SubmissionMetric).filter(SubmissionMetric.time < datetime.now(timezone.utc) - timedelta(hours=1)).first()
        if not metrics_exist:
            print("📈 Grafikler için geçmişe dönük metrik verileri üretiliyor...")
            now = datetime.now(timezone.utc)
            hist_metrics = []
            # Son 30 gün için veri üret
            for d in range(30):
                day_date = now - timedelta(days=d)
                # Her gün için 2-5 arası rastgele gönderim
                for _ in range(random.randint(2, 5)):
                    m = SubmissionMetric(
                        time=day_date - timedelta(minutes=random.randint(0, 1440)),
                        student_id=STUDENT1_ID if random.random() > 0.5 else STUDENT2_ID,
                        assignment_id=assignments_data[random.randint(0, len(assignments_data)-1)]["id"],
                        score=random.randint(55, 98),
                        processing_time_ms=random.randint(200, 3500),
                        similarity_score=random.random() * 0.25
                    )
                    hist_metrics.append(m)
            db.add_all(hist_metrics)
            db.flush()

        db.commit()
        print("✅ Seed verisi başarıyla eklendi!")
        print("   👩‍🏫 Teacher: teacher@codecheck.dev / teacher123")
        print("   👨‍🎓 Student: student1@codecheck.dev / student123")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed hatası: {e}")
    finally:
        db.close()
