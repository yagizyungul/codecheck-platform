"""
Submission İşleme Pipeline – 5 Adım
====================================
1. FETCH      → DB'den submission'ı al, status='processing' yap
2. EMBED      → sentence-transformers ile 384-dim kod embedding üret (pgvector)
3. SIMILARITY → pgvector cosine similarity ile kopya tespiti
4. AI_SCORE   → LM Studio (localhost:1234) veya fallback skor
5. FINALIZE   → status='done', hstore test_results, TimescaleDB metrik, PostGIS konum
"""
import os
import json
import time
import uuid
from datetime import datetime, timezone

import requests
import psycopg2
from psycopg2.extras import execute_values
from sqlalchemy import text

# PYTHONPATH=/app olduğu için app.* import çalışır
from sqlalchemy import text

from app.database import SessionLocal
from app.models import Submission, SubmissionMetric
from app.embedding_service import embed_code
from app.location_service import get_location_from_ip

LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://host.docker.internal:1234/v1/chat/completions")
LM_STUDIO_MODEL = os.getenv("LM_STUDIO_MODEL", "local-model")
LM_STUDIO_TIMEOUT = int(os.getenv("LM_STUDIO_TIMEOUT", "60"))


def _ai_score_code(code: str, language: str) -> tuple[int, str]:
    """
    Ollama/LM Studio'ya HTTP isteği atarak kod kalitesi skoru alır.
    Hata durumunda veya model 0 dönerse heuristic fallback kullanır.
    """
    system_prompt = "You are an expert code reviewer. You must respond ONLY with a JSON object in the format: {\"score\": <int 0-100>, \"feedback\": \"<turkish sentence>\"}. No other text allowed."
    user_prompt = f"""Score this {language} code based on logic and quality. 
A working solution should score at least 60.
If the code is extremely short or empty, score <= 20.

Code:
```{language}
{code[:2000]}
```"""

    try:
        resp = requests.post(
            LM_STUDIO_URL,
            json={
                "model": LM_STUDIO_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 150,
            },
            timeout=LM_STUDIO_TIMEOUT,
        )
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        
        # JSON'u parse et
        import re
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            result = json.loads(match.group())
            score = int(result.get("score", 0))
            feedback = str(result.get("feedback", ""))
            if 1 <= score <= 100:
                print(f" AI skoru: {score}")
                return score, feedback
        
        print("⚠️ AI geçersiz yanıt verdi veya 0 döndü, fallback kullanılıyor")
    except Exception as e:
        print(f"⚠️ AI servis hatası ({e}), fallback kullanılıyor")

    # Fallback: basit heuristic
    lines = len(code.strip().splitlines())
    has_docstring = '"""' in code or "'''" in code
    has_functions = "def " in code or "function " in code
    has_comments = "#" in code or "//" in code
    score = min(95, 40 + lines * 2 + (10 if has_docstring else 0) +
                (10 if has_functions else 0) + (10 if has_comments else 0))
    return score, "Otomatik değerlendirme (AI bağlantısı yok veya hatalı yanıt)"


def _get_similarity(db_session, submission_id: str, assignment_id: str, embedding: list[float]) -> float:
    """
    pgvector cosine similarity ile aynı ödevdeki diğer submission'larla karşılaştırır.
    En yüksek benzerlik skorunu döner (0.0 – 1.0).
    """
    try:
        from sqlalchemy import text
        # Embedding'i string formatına çevir
        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
        
        # Daha güvenli ve direkt sorgu (assignment_id parametre olarak geliyor)
        sid_str = str(submission_id)
        aid_str = str(assignment_id)
        rows = db_session.execute(text(f"""
            SELECT
                MAX(1 - (s.code_embedding <=> '{embedding_str}'::vector))::float AS max_similarity
            FROM submissions s
            WHERE
                s.id::text != '{sid_str}'
                AND s.assignment_id::text = '{aid_str}'
                AND s.code_embedding IS NOT NULL
        """)).fetchone()
        
        if rows and rows[0] is not None:
            return float(rows[0])
    except Exception as e:
        print(f"⚠️ Similarity hesaplama hatası: {e}")
        try:
            db_session.rollback()
        except Exception:
            pass
    return 0.0


def process_submission(submission_id: str) -> None:
    """
    Tek bir submission'ı 5 adımda işler.
    Worker consumer.py tarafından çağrılır.
    """
    start_time = time.time()
    db = SessionLocal()

    try:
        # ── ADIM 1: FETCH ─────────────────────────
        print(f"📥 [1/5] Submission alınıyor: {submission_id}")
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            print(f"❌ Submission bulunamadı: {submission_id}")
            return

        submission.status = "processing"
        db.commit()

        # ── ADIM 2: EMBED (pgvector) ───────────────
        print(f"🧠 [2/5] Kod embedding üretiliyor...")
        embedding = embed_code(submission.code_text)
        if embedding:
            # ORM yerine raw SQL — pgvector ::vector cast için zorunlu
            # f-string kullanıyoruz çünkü :param::type SQLAlchemy ile çakışıyor
            embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
            sid_str = str(submission_id)
            db.execute(text(
                f"UPDATE submissions SET code_embedding = '{embedding_str}'::vector WHERE id = '{sid_str}'"
            ))
            db.commit()
            print(f"✅ Embedding hazır (384-dim)")
        else:
            print("⚠️ Embedding üretilemedi, devam ediliyor")

        # ── ADIM 3: SIMILARITY (pgvector) ─────────
        print(f"🔍 [3/5] Benzerlik kontrolü yapılıyor...")
        similarity = 0.0
        if embedding:
            similarity = _get_similarity(db, submission_id, submission.assignment_id, embedding)
            submission.similarity_score = similarity
            if similarity > 0.85:
                submission.is_flagged = True
                print(f"🚨 Yüksek benzerlik tespit edildi: {similarity:.2%} → flagged!")
            else:
                print(f"✅ Benzerlik: {similarity:.2%}")
            db.commit()

        # ── ADIM 4: AI SCORE (hstore) ─────────────
        print(f"🤖 [4/5] AI değerlendirmesi yapılıyor...")
        score, feedback = _ai_score_code(submission.code_text, submission.language)
        processing_ms = int((time.time() - start_time) * 1000)

        # hstore: { score=>85, runtime=>142ms, style=>good, similarity=>0.12 }
        submission.test_results = {
            "score": str(score),
            "runtime": f"{processing_ms}ms",
            "style": "good" if score >= 70 else "needs_improvement",
            "similarity": f"{similarity:.2f}",
            "flagged": "true" if submission.is_flagged else "false",
        }
        submission.score = score
        submission.feedback = feedback
        print(f"✅ AI skoru: {score}/100")
        db.commit()

        # ── ADIM 5: FINALIZE ──────────────────────
        print(f"📍 [5/5] Konum çözülüyor ve metrik yazılıyor...")

        # PostGIS: Konum çöz (Manuel koordinat yoksa IP'den çöz)
        if submission.submitted_lat is None or submission.submitted_lng is None:
            if submission.ip_address:
                lat, lng = get_location_from_ip(str(submission.ip_address))
                if lat and lng:
                    submission.submitted_lat = lat
                    submission.submitted_lng = lng
                    print(f"📍 IP'den konum atandı: {lat}, {lng}")
        else:
            print(f"📍 Manuel konum kullanılıyor: {submission.submitted_lat}, {submission.submitted_lng}")
        

        # Status = done
        submission.status = "done"
        submission.processed_at = datetime.now(timezone.utc)
        db.commit()

        # TimescaleDB: submission_metrics'e metrik yaz
        metric = SubmissionMetric(
            student_id=submission.student_id,
            assignment_id=submission.assignment_id,
            score=score,
            processing_time_ms=processing_ms,
            similarity_score=similarity,
        )
        db.add(metric)
        db.commit()

        total_ms = int((time.time() - start_time) * 1000)
        print(f"✅ Submission işlendi: {submission_id} | Skor: {score} | Süre: {total_ms}ms")

    except Exception as e:
        print(f"❌ Pipeline hatası ({submission_id}): {e}")
        import traceback
        traceback.print_exc()
        try:
            db.rollback()
            submission = db.query(Submission).filter(Submission.id == submission_id).first()
            if submission:
                submission.status = "error"
                submission.feedback = f"İşleme hatası: {str(e)}"
                db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()
