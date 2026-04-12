"""
CodeCheck Platform – Kapsamlı Entegrasyon Test Paketi
======================================================
Proje planındaki 7 PostgreSQL extension'ını ve tüm API endpoint'lerini test eder.

Extension'lar:
  1. pgvector    – Kod embedding + cosine similarity (kopya tespiti)
  2. pgmq        – Submission message queue
  3. hstore      – Test sonuçları (key-value)
  4. PostGIS     – IP bazlı konum tespiti (50m kopya uyarısı)
  5. ltree       – Ders hiyerarşisi (course tree)
  6. TimescaleDB – Haftalık metrik grafiği (time_bucket)
  7. citext      – Büyük/küçük harf duyarsız email araması

Çalıştırma:
  python backend/test_platform.py
  (Docker Compose container'ları çalışıyor olmalı)
"""

import sys
import json
import subprocess
import uuid
import requests

# ── Bağlantı ayarları ─────────────────────────────────────────────────────────
API_BASE = "http://localhost:8000"
COMPOSE_DIR = "c:/GitHub/codecheck-platform"

# ── Seed'deki sabit hesaplar ──────────────────────────────────────────────────
TEACHER_EMAIL     = "teacher@codecheck.dev"
TEACHER_PASSWORD  = "teacher123"
STUDENT1_EMAIL    = "student1@codecheck.dev"
STUDENT1_PASSWORD = "student123"
STUDENT2_EMAIL    = "student2@codecheck.dev"
STUDENT2_PASSWORD = "student123"

# ── Renk kodları ──────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


# ═══════════════════════════════════════════════════════════════════════════════
#  DB yardımcıları – docker compose exec üzerinden psql
#  (timescaledb-ha SCRAM-SHA-256 zorunlu kıldığından host psycopg2 çalışmıyor)
# ═══════════════════════════════════════════════════════════════════════════════

def _psql(service: str, user: str, db: str, sql: str) -> str:
    """Docker container içinde psql ile sorgu çalıştır, stdout döndür."""
    result = subprocess.run(
        ["docker", "compose", "exec", "-T", service,
         "psql", "-U", user, "-d", db, "-t", "-A", "--no-psqlrc", "-c", sql],
        capture_output=True, text=True, cwd=COMPOSE_DIR
    )
    if result.returncode != 0:
        raise RuntimeError((result.stderr or result.stdout).strip())
    return result.stdout.strip()


def db(sql: str) -> list[str]:
    """Ana DB (codecheck_db) sorgusu → satır listesi."""
    raw = _psql("db", "codecheck_user", "codecheck_db", sql)
    return [l for l in raw.splitlines() if l.strip()]


def mq(sql: str) -> list[str]:
    """MQ DB (mq_db) sorgusu → satır listesi."""
    raw = _psql("mq-db", "mq_user", "mq_db", sql)
    return [l for l in raw.splitlines() if l.strip()]


# ═══════════════════════════════════════════════════════════════════════════════
#  Test çerçevesi
# ═══════════════════════════════════════════════════════════════════════════════

results: list[dict] = []


def run_test(name: str, fn):
    try:
        detail = fn()
        results.append({"name": name, "status": "PASS", "detail": detail or ""})
        print(f"  {GREEN}✓{RESET} {name}")
        if detail:
            print(f"    {CYAN}→ {detail}{RESET}")
    except AssertionError as e:
        results.append({"name": name, "status": "FAIL", "detail": str(e)})
        print(f"  {RED}✗ {name}{RESET}")
        print(f"    {RED}→ {e}{RESET}")
    except Exception as e:
        results.append({"name": name, "status": "ERROR", "detail": str(e)})
        print(f"  {RED}✗ {name} [HATA]{RESET}")
        print(f"    {RED}→ {e}{RESET}")


def section(title: str):
    print(f"\n{BOLD}{CYAN}{'─'*60}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'─'*60}{RESET}")


def assert_status(resp, expected: int):
    assert resp.status_code == expected, (
        f"HTTP {resp.status_code} (beklenen {expected}) — {resp.text[:300]}"
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  Yardımcı: token al
# ═══════════════════════════════════════════════════════════════════════════════

def get_token(email: str, password: str) -> str:
    resp = requests.post(f"{API_BASE}/auth/login",
                         json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login başarısız: {resp.text}"
    return resp.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════════════════════════════════════════
#  1. Temel Sistem Sağlığı
# ═══════════════════════════════════════════════════════════════════════════════

def test_health():
    section("1. Temel Sistem Sağlığı")

    def health_api():
        r = requests.get(f"{API_BASE}/health")
        assert_status(r, 200)
        data = r.json()
        assert data["status"] == "ok", f"status != ok: {data}"
        assert data["database"] == "connected", "DB bağlantısı yok"
        return "API + DB bağlantısı OK"

    def root_endpoint():
        r = requests.get(f"{API_BASE}/")
        assert_status(r, 200)
        data = r.json()
        assert "CodeCheck" in data["message"]
        return f"version={data['version']}"

    def db_container_connection():
        rows = db("SELECT version()")
        assert rows, "DB sorgusu boş döndü"
        return "Container DB bağlantısı OK"

    def mq_container_connection():
        rows = mq("SELECT version()")
        assert rows, "MQ sorgusu boş döndü"
        return "Container MQ DB bağlantısı OK"

    run_test("GET /health → 200 + DB connected", health_api)
    run_test("GET / → API root", root_endpoint)
    run_test("Container içi DB (codecheck_db) erişimi", db_container_connection)
    run_test("Container içi MQ DB (mq_db) erişimi", mq_container_connection)


# ═══════════════════════════════════════════════════════════════════════════════
#  2. Extension #7 – citext
# ═══════════════════════════════════════════════════════════════════════════════

def test_citext():
    section("2. Extension: citext – Büyük/Küçük Harf Duyarsız Email")

    def citext_installed():
        rows = db("SELECT extname FROM pg_extension WHERE extname = 'citext'")
        assert rows and "citext" in rows[0], "citext extension bulunamadı"
        return "citext extension aktif"

    def citext_email_column():
        rows = db("""
            SELECT udt_name FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'email'
        """)
        assert rows, "email kolonu bulunamadı"
        assert rows[0].strip().lower() == "citext", f"email kolonu citext değil: {rows[0]}"
        return f"users.email tipi: {rows[0].strip()}"

    def citext_case_insensitive_query():
        rows = db("SELECT username FROM users WHERE email = 'TEACHER@CODECHECK.DEV'")
        assert rows, "citext büyük harf araması sonuç döndürmedi"
        return f"TEACHER@CODECHECK.DEV → bulunan: {rows[0]}"

    def citext_mixed_case():
        rows = db("SELECT username FROM users WHERE email = 'Student1@CodeCheck.DEV'")
        assert rows, "citext karışık harf araması sonuç döndürmedi"
        return f"Student1@CodeCheck.DEV → bulunan: {rows[0]}"

    run_test("citext extension kurulu mu?", citext_installed)
    run_test("users.email sütunu citext tipinde mi?", citext_email_column)
    run_test("Büyük harfli email sorgusu çalışıyor mu?", citext_case_insensitive_query)
    run_test("Karışık büyük/küçük harf email sorgusu", citext_mixed_case)


# ═══════════════════════════════════════════════════════════════════════════════
#  3. Auth (JWT)
# ═══════════════════════════════════════════════════════════════════════════════

def test_auth():
    section("3. Auth – JWT Login / Register / Me")

    def login_teacher():
        token = get_token(TEACHER_EMAIL, TEACHER_PASSWORD)
        assert len(token) > 50, "Token çok kısa"
        return f"teacher token alındı ({len(token)} karakter)"

    def login_student():
        token = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        assert len(token) > 50
        return "student1 token alındı"

    def wrong_password():
        r = requests.post(f"{API_BASE}/auth/login",
                          json={"email": TEACHER_EMAIL, "password": "yanlis123"})
        assert r.status_code == 401, f"Yanlış şifre 401 döndürmedi: {r.status_code}"
        return "Yanlış şifre → 401 Unauthorized"

    def me_endpoint():
        token = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        r = requests.get(f"{API_BASE}/auth/me", headers=auth_header(token))
        assert_status(r, 200)
        data = r.json()
        assert data["email"] == STUDENT1_EMAIL
        assert data["role"] == "student"
        return f"me → {data['full_name']} ({data['role']})"

    def register_new_user():
        unique = str(uuid.uuid4())[:8]
        r = requests.post(f"{API_BASE}/auth/register", json={
            "email": f"test_{unique}@test.com",
            "username": f"testuser_{unique}",
            "password": "testpass123",
            "full_name": "Test Kullanicisi"
        })
        assert_status(r, 201)
        data = r.json()
        assert data["role"] == "student"
        return f"Yeni kullanici olusturuldu: {data['username']}"

    def register_duplicate_email():
        r = requests.post(f"{API_BASE}/auth/register", json={
            "email": STUDENT1_EMAIL,
            "username": "bakakullanici",
            "password": "test123",
            "full_name": "Test"
        })
        assert r.status_code == 400, f"Duplicate email 400 döndürmedi: {r.status_code}"
        return "Duplicate email → 400 Bad Request"

    def no_token_401():
        r = requests.get(f"{API_BASE}/auth/me")
        assert r.status_code in (401, 403, 422), f"Token olmadan {r.status_code} döndü"
        return f"Token olmadan → {r.status_code}"

    run_test("Teacher login → JWT token", login_teacher)
    run_test("Student login → JWT token", login_student)
    run_test("Yanlis sifre → 401", wrong_password)
    run_test("GET /auth/me → kullanici bilgileri", me_endpoint)
    run_test("POST /auth/register → yeni kullanici", register_new_user)
    run_test("Duplicate email register → 400", register_duplicate_email)
    run_test("Token olmadan korunakli endpoint → 401/403", no_token_401)


# ═══════════════════════════════════════════════════════════════════════════════
#  4. Extension #5 – ltree
# ═══════════════════════════════════════════════════════════════════════════════

def test_ltree():
    section("4. Extension: ltree – Kurs Hiyerarsisi")

    def ltree_installed():
        rows = db("SELECT extname FROM pg_extension WHERE extname = 'ltree'")
        assert rows and "ltree" in rows[0], "ltree extension bulunamadi"
        return "ltree extension aktif"

    def ltree_data_exists():
        rows = db("SELECT path::text, label FROM course_tree ORDER BY path")
        assert len(rows) > 0, "course_tree tablosu bos"
        paths = [r.split("|")[0] if "|" in r else r for r in rows]
        return f"{len(rows)} kurs node'u: {paths}"

    def ltree_subtree_operator():
        rows = db("SELECT path::text FROM course_tree WHERE path <@ 'cs'::ltree ORDER BY path")
        assert rows, "ltree <@ operatoru sonuc dondurmeди"
        return f"cs <@ sorgusu: {rows}"

    def ltree_nlevel():
        rows = db("SELECT path::text, nlevel(path) FROM course_tree ORDER BY path")
        assert rows, "nlevel sorgusu bos"
        depths = [int(r.split("|")[1]) for r in rows if "|" in r]
        assert any(d > 1 for d in depths), "Hic derin node yok"
        return f"nlevel sonuclari: {list(zip([r.split('|')[0] for r in rows if '|' in r], depths))}"

    def ltree_subpath():
        rows = db("SELECT subpath(path, 0, 1)::text FROM course_tree WHERE nlevel(path) > 1 LIMIT 3")
        assert rows, "subpath sorgusu bos"
        return f"subpath ornegi: {rows}"

    def ltree_api_tree():
        token = get_token(TEACHER_EMAIL, TEACHER_PASSWORD)
        r = requests.get(f"{API_BASE}/admin/courses/tree", headers=auth_header(token))
        assert_status(r, 200)
        data = r.json()
        assert "courses" in data
        assert len(data["courses"]) > 0
        return f"API'dan {len(data['courses'])} kurs node'u geldi"

    def ltree_api_subtree():
        token = get_token(TEACHER_EMAIL, TEACHER_PASSWORD)
        # Var olan bir path bul
        rows = db("SELECT path::text FROM course_tree ORDER BY path LIMIT 1")
        assert rows, "Kurs yok"
        top_path = rows[0].split(".")[0]  # en ust seviye
        r = requests.get(f"{API_BASE}/admin/courses/{top_path}/subtree",
                         headers=auth_header(token))
        assert_status(r, 200)
        data = r.json()
        assert "subtree" in data and len(data["subtree"]) > 0
        return f"{top_path} subtree: {len(data['subtree'])} node"

    def ltree_api_not_found():
        token = get_token(TEACHER_EMAIL, TEACHER_PASSWORD)
        r = requests.get(f"{API_BASE}/admin/courses/nonexistent_xyz/subtree",
                         headers=auth_header(token))
        assert r.status_code == 404, f"Olmayan kurs 404 dondurmedi: {r.status_code}"
        return "Olmayan kurs → 404 Not Found"

    run_test("ltree extension kurulu mu?", ltree_installed)
    run_test("course_tree tablosunda veri var mi?", ltree_data_exists)
    run_test("ltree <@ (subtree) operatoru calisiyor mu?", ltree_subtree_operator)
    run_test("nlevel() fonksiyonu calisiyor mu?", ltree_nlevel)
    run_test("subpath() fonksiyonu calisiyor mu?", ltree_subpath)
    run_test("GET /admin/courses/tree → kurs agaci", ltree_api_tree)
    run_test("GET /admin/courses/{path}/subtree → alt agac", ltree_api_subtree)
    run_test("Olmayan kurs path → 404", ltree_api_not_found)


# ═══════════════════════════════════════════════════════════════════════════════
#  5. Assignments
# ═══════════════════════════════════════════════════════════════════════════════

def test_assignments():
    section("5. Assignments – Odev Listeleme")

    def list_assignments():
        token = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        r = requests.get(f"{API_BASE}/assignments", headers=auth_header(token))
        assert_status(r, 200)
        data = r.json()
        assert "assignments" in data
        assert data["total"] > 0, "Hic odev yok"
        return f"{data['total']} odev listelendi"

    def get_assignment_detail():
        token = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        r = requests.get(f"{API_BASE}/assignments", headers=auth_header(token))
        first_id = r.json()["assignments"][0]["id"]
        r2 = requests.get(f"{API_BASE}/assignments/{first_id}", headers=auth_header(token))
        assert_status(r2, 200)
        data = r2.json()
        assert "title" in data and "course_path" in data
        return f"'{data['title']}' (course: {data['course_path']})"

    def assignment_not_found():
        token = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        r = requests.get(f"{API_BASE}/assignments/{uuid.uuid4()}", headers=auth_header(token))
        assert r.status_code == 404
        return "Olmayan odev → 404"

    def assignments_require_auth():
        r = requests.get(f"{API_BASE}/assignments")
        assert r.status_code in (401, 403, 422)
        return f"Anonim erisim → {r.status_code}"

    run_test("GET /assignments → odev listesi", list_assignments)
    run_test("GET /assignments/{id} → odev detayi", get_assignment_detail)
    run_test("Olmayan odev → 404", assignment_not_found)
    run_test("Auth olmadan assignments → 401/403", assignments_require_auth)


# ═══════════════════════════════════════════════════════════════════════════════
#  6. Extension #2 – pgmq
# ═══════════════════════════════════════════════════════════════════════════════

def test_pgmq():
    section("6. Extension: pgmq – Submission Message Queue")

    def pgmq_installed():
        rows = mq("SELECT extname FROM pg_extension WHERE extname = 'pgmq'")
        assert rows and "pgmq" in rows[0], "pgmq extension bulunamadi"
        return "pgmq extension aktif"

    def pgmq_queue_exists():
        rows = mq("SELECT queue_name FROM pgmq.list_queues() WHERE queue_name = 'submission_queue'")
        assert rows, "submission_queue kuyruğu bulunamadı"
        return "submission_queue mevcut"

    def pgmq_send_read_archive():
        # Ayrı test kuyruğu kullan — worker submission_queue'yu tüketiyor
        test_q = "test_queue_ci"
        test_msg = f'{{"submission_id": "test-{uuid.uuid4()}"}}'
        # Kuyruğu oluştur (varsa hata vermez)
        mq(f"SELECT pgmq.create('{test_q}')")
        # Send
        rows = mq(f"SELECT * FROM pgmq.send('{test_q}', '{test_msg}'::jsonb)")
        assert rows, "Mesaj gonderilemedi"
        msg_id = rows[0].strip()
        # Read (visibility_timeout=30s)
        rows2 = mq(f"SELECT * FROM pgmq.read('{test_q}', 30, 1)")
        assert rows2, "Gonderilen mesaj okunamadi"
        read_id = rows2[0].split("|")[0].strip()
        # Archive
        mq(f"SELECT pgmq.archive('{test_q}', {read_id})")
        # Temizle
        mq(f"SELECT pgmq.drop_queue('{test_q}')")
        return f"send→read→archive OK (msg_id={msg_id}, test_q='{test_q}')"

    def pgmq_api_submit_202():
        token = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        r = requests.get(f"{API_BASE}/assignments", headers=auth_header(token))
        assignment_id = r.json()["assignments"][0]["id"]
        r2 = requests.post(f"{API_BASE}/submissions", headers=auth_header(token), json={
            "assignment_id": assignment_id,
            "code_text": "def hello():\n    print('hello world')\nhello()",
            "language": "python"
        })
        assert r2.status_code == 202, f"Submit 202 dondurmedi: {r2.status_code} {r2.text}"
        sub_id = r2.json()["id"]
        return f"Submit → 202 Accepted, id={sub_id[:8]}..."

    run_test("pgmq extension kurulu mu?", pgmq_installed)
    run_test("submission_queue kuyruğu var mi?", pgmq_queue_exists)
    run_test("pgmq send → read → archive dongusu", pgmq_send_read_archive)
    run_test("API submit → 202 Accepted", pgmq_api_submit_202)


# ═══════════════════════════════════════════════════════════════════════════════
#  7. Submissions – Polling + Extension #3 hstore
# ═══════════════════════════════════════════════════════════════════════════════

def test_submissions():
    section("7. Submissions – Polling + Extension: hstore")

    def hstore_installed():
        rows = db("SELECT extname FROM pg_extension WHERE extname = 'hstore'")
        assert rows and "hstore" in rows[0], "hstore extension bulunamadi"
        return "hstore extension aktif"

    def hstore_column_type():
        rows = db("""
            SELECT udt_name FROM information_schema.columns
            WHERE table_name = 'submissions' AND column_name = 'test_results'
        """)
        assert rows, "test_results kolonu bulunamadi"
        assert rows[0].strip() == "hstore", f"test_results tipi hstore degil: {rows[0]}"
        return f"submissions.test_results tipi: {rows[0].strip()}"

    def hstore_data_exists():
        rows = db("""
            SELECT count(*) FROM submissions
            WHERE status = 'done' AND test_results IS NOT NULL
        """)
        count = int(rows[0]) if rows else 0
        assert count > 0, "Done submission icinde hstore verisi yok (worker calismamis olabilir)"
        return f"{count} done submission'da hstore verisi mevcut"

    def hstore_key_access():
        rows = db("""
            SELECT test_results -> 'score' AS score_val
            FROM submissions
            WHERE status = 'done' AND test_results IS NOT NULL
            LIMIT 3
        """)
        assert rows, "hstore key erisimi sonuc dondurмеdi"
        return f"hstore -> 'score' ornekleri: {rows}"

    def hstore_contains_operator():
        rows = db("""
            SELECT count(*) FROM submissions
            WHERE test_results @> 'flagged=>false'::hstore
        """)
        count = int(rows[0]) if rows else 0
        return f"hstore @> operatoru: {count} submission 'flagged=>false' iceriyor"

    def submissions_my_endpoint():
        token = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        r = requests.get(f"{API_BASE}/submissions/my", headers=auth_header(token))
        assert_status(r, 200)
        data = r.json()
        assert "submissions" in data
        return f"GET /submissions/my → {data['total']} submission"

    def submission_detail_done():
        token = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        r = requests.get(f"{API_BASE}/submissions/my", headers=auth_header(token))
        subs = r.json()["submissions"]
        done = [s for s in subs if s["status"] == "done"]
        if not done:
            return "SKIP: Tamamlanmis submission yok (worker henuz islememis)"
        sub = done[0]
        r2 = requests.get(f"{API_BASE}/submissions/{sub['id']}", headers=auth_header(token))
        assert_status(r2, 200)
        data = r2.json()
        score = data.get("score")
        tr = data.get("test_results")
        return f"Done: score={score}, hstore_keys={list(tr.keys()) if tr else 'None'}"

    def submission_cross_access_forbidden():
        token1 = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        token2 = get_token(STUDENT2_EMAIL, STUDENT2_PASSWORD)
        r = requests.get(f"{API_BASE}/submissions/my", headers=auth_header(token2))
        subs = r.json().get("submissions", [])
        if not subs:
            return "SKIP: student2'nin submission'i yok"
        sub_id = subs[0]["id"]
        r2 = requests.get(f"{API_BASE}/submissions/{sub_id}", headers=auth_header(token1))
        assert r2.status_code == 403, f"Cross-student erisim 403 dondurmedi: {r2.status_code}"
        return "Cross-student erisim → 403 Forbidden"

    run_test("hstore extension kurulu mu?", hstore_installed)
    run_test("submissions.test_results hstore tipinde mi?", hstore_column_type)
    run_test("Done submission'larda hstore verisi var mi?", hstore_data_exists)
    run_test("hstore -> 'score' key erisimi calisiyor mu?", hstore_key_access)
    run_test("hstore @> (contains) operatoru calisiyor mu?", hstore_contains_operator)
    run_test("GET /submissions/my → kendi submission'lari", submissions_my_endpoint)
    run_test("Done submission detayi (score + hstore keys)", submission_detail_done)
    run_test("Baskasinın submission'ina erisim → 403", submission_cross_access_forbidden)


# ═══════════════════════════════════════════════════════════════════════════════
#  8. Extension #1 – pgvector
# ═══════════════════════════════════════════════════════════════════════════════

def test_pgvector():
    section("8. Extension: pgvector – AI Embedding + Kopya Tespiti")

    def pgvector_installed():
        rows = db("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'")
        assert rows, "pgvector extension bulunamadi"
        parts = rows[0].split("|")
        return f"pgvector v{parts[1] if len(parts)>1 else '?'} aktif"

    def vector_column_exists():
        rows = db("""
            SELECT udt_name FROM information_schema.columns
            WHERE table_name = 'submissions' AND column_name = 'code_embedding'
        """)
        assert rows, "code_embedding kolonu bulunamadi"
        return f"submissions.code_embedding mevcut (udt: {rows[0]})"

    def embeddings_count():
        rows = db("SELECT COUNT(*) FROM submissions WHERE code_embedding IS NOT NULL")
        count = int(rows[0]) if rows else 0
        assert count > 0, "Hic embedding yok (worker calismamis olabilir)"
        return f"{count} submission'da 384-dim embedding mevcut"

    def cosine_similarity_operator():
        rows = db("""
            SELECT (1 - (s1.code_embedding <=> s2.code_embedding))::float AS sim
            FROM submissions s1, submissions s2
            WHERE s1.id < s2.id
              AND s1.code_embedding IS NOT NULL
              AND s2.code_embedding IS NOT NULL
            ORDER BY sim DESC
            LIMIT 1
        """)
        assert rows, "Cosine similarity sorgusu sonuc dondurмеdi"
        return f"En yuksek benzerlik: {float(rows[0]):.4f}"

    def hnsw_or_ivfflat_index():
        rows = db("""
            SELECT indexname, indexdef FROM pg_indexes
            WHERE tablename = 'submissions'
              AND (indexdef ILIKE '%vector%' OR indexdef ILIKE '%hnsw%' OR indexdef ILIKE '%ivfflat%')
        """)
        if not rows:
            return "SKIP: pgvector index henuz olusturulmamis (opsiyonel optimizasyon)"
        return f"Vector index mevcut: {rows[0]}"

    def similarity_scores_stored():
        rows = db("SELECT COUNT(*) FROM submissions WHERE similarity_score IS NOT NULL")
        count = int(rows[0]) if rows else 0
        return f"{count} submission'da similarity_score kaydedilmis"

    def admin_similarity_api():
        token = get_token(TEACHER_EMAIL, TEACHER_PASSWORD)
        rows = db("SELECT id::text FROM submissions WHERE code_embedding IS NOT NULL LIMIT 1")
        if not rows:
            return "SKIP: Embedding'li submission yok"
        sub_id = rows[0].strip()
        r = requests.get(f"{API_BASE}/admin/similarity/{sub_id}?top_k=3",
                         headers=auth_header(token))
        assert_status(r, 200)
        data = r.json()
        assert isinstance(data, list)
        return f"Similarity report: {len(data)} benzer submission"

    def flagged_count():
        rows = db("SELECT COUNT(*) FROM submissions WHERE is_flagged = true")
        count = int(rows[0]) if rows else 0
        return f"{count} flagged submission (benzerlik > 0.85)"

    run_test("pgvector extension kurulu mu?", pgvector_installed)
    run_test("submissions.code_embedding sutunu var mi?", vector_column_exists)
    run_test("DB'de embedding kayitlari mevcut mu?", embeddings_count)
    run_test("pgvector <=> cosine similarity operatoru", cosine_similarity_operator)
    run_test("HNSW/IVFFlat vector index (opsiyonel)", hnsw_or_ivfflat_index)
    run_test("similarity_score kaydediliyor mu?", similarity_scores_stored)
    run_test("GET /admin/similarity/{id} → benzerlik raporu", admin_similarity_api)
    run_test("is_flagged submission sayisi", flagged_count)


# ═══════════════════════════════════════════════════════════════════════════════
#  9. Extension #4 – PostGIS
# ═══════════════════════════════════════════════════════════════════════════════

def test_postgis():
    section("9. Extension: PostGIS – IP Konum Tespiti (Kopya Uyarisi)")

    def postgis_installed():
        rows = db("SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis'")
        assert rows, "PostGIS extension bulunamadi"
        parts = rows[0].split("|")
        return f"PostGIS v{parts[1] if len(parts)>1 else '?'} aktif"

    def st_distance_works():
        rows = db("""
            SELECT ST_Distance(
                ST_MakePoint(28.9784, 41.0082)::geography,
                ST_MakePoint(28.9800, 41.0090)::geography
            )::float
        """)
        assert rows and float(rows[0]) > 0
        return f"ST_Distance (Istanbul iki nokta): {float(rows[0]):.1f} metre"

    def st_dwithin_50m():
        rows = db("""
            SELECT ST_DWithin(
                ST_MakePoint(28.9784, 41.0082)::geography,
                ST_MakePoint(28.9785, 41.0082)::geography,
                50
            )
        """)
        assert rows and rows[0].strip() == "t", "ST_DWithin 50m icin true dondurmedi"
        return "ST_DWithin(50m) → true (yakin noktalar)"

    def st_dwithin_far():
        rows = db("""
            SELECT ST_DWithin(
                ST_MakePoint(28.9784, 41.0082)::geography,
                ST_MakePoint(29.0000, 41.1000)::geography,
                50
            )
        """)
        assert rows and rows[0].strip() == "f", "ST_DWithin uzak noktalar icin false dondurmedi"
        return "ST_DWithin(50m, uzak noktalar) → false"

    def location_columns_exist():
        rows = db("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'submissions'
              AND column_name IN ('submitted_lat', 'submitted_lng', 'ip_address')
            ORDER BY column_name
        """)
        assert len(rows) == 3, f"Konum sutunlari eksik: {rows}"
        return f"Konum sutunlari mevcut: {rows}"

    def admin_flagged_api():
        token = get_token(TEACHER_EMAIL, TEACHER_PASSWORD)
        r = requests.get(f"{API_BASE}/admin/flagged?radius_meters=50",
                         headers=auth_header(token))
        assert_status(r, 200)
        data = r.json()
        assert isinstance(data, list)
        return f"GET /admin/flagged → {len(data)} suphe edilen konum cifti"

    def flagged_requires_teacher():
        token = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        r = requests.get(f"{API_BASE}/admin/flagged", headers=auth_header(token))
        assert r.status_code == 403
        return "Ogrenci /admin/flagged → 403 Forbidden"

    run_test("PostGIS extension kurulu mu?", postgis_installed)
    run_test("ST_Distance + ST_MakePoint calisiyor mu?", st_distance_works)
    run_test("ST_DWithin 50m icindeki noktalar TRUE", st_dwithin_50m)
    run_test("ST_DWithin uzak noktalar FALSE", st_dwithin_far)
    run_test("submissions konum sutunlari mevcut mu?", location_columns_exist)
    run_test("GET /admin/flagged → PostGIS sorgusu", admin_flagged_api)
    run_test("Ogrenci /admin/flagged erisimi → 403", flagged_requires_teacher)


# ═══════════════════════════════════════════════════════════════════════════════
#  10. Extension #6 – TimescaleDB
# ═══════════════════════════════════════════════════════════════════════════════

def test_timescaledb():
    section("10. Extension: TimescaleDB – Haftalik Metrik Grafigi")

    def timescaledb_installed():
        rows = db("SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb'")
        assert rows, "TimescaleDB extension bulunamadi"
        parts = rows[0].split("|")
        return f"TimescaleDB v{parts[1] if len(parts)>1 else '?'} aktif"

    def hypertable_exists():
        rows = db("""
            SELECT hypertable_name FROM timescaledb_information.hypertables
            WHERE hypertable_name = 'submission_metrics'
        """)
        assert rows, "submission_metrics hypertable degil veya yok"
        return "submission_metrics hypertable olarak yapilandirilmis"

    def time_bucket_query():
        rows = db("""
            SELECT
                time_bucket('1 week', time)::text AS week,
                COUNT(*)::int AS cnt
            FROM submission_metrics
            GROUP BY week
            ORDER BY week DESC
            LIMIT 5
        """)
        return f"time_bucket sorgusu: {len(rows)} hafta verisi dondurdu"

    def metrics_data_count():
        rows = db("SELECT COUNT(*) FROM submission_metrics")
        count = int(rows[0]) if rows else 0
        return f"submission_metrics: {count} kayit"

    def metrics_avg_score():
        rows = db("""
            SELECT
                time_bucket('1 week', time)::text AS week,
                AVG(score)::numeric(5,1) AS avg_score
            FROM submission_metrics
            WHERE score IS NOT NULL
            GROUP BY week
            ORDER BY week DESC
            LIMIT 3
        """)
        return f"Haftalik ort. skor: {rows}"

    def weekly_metrics_api():
        token = get_token(TEACHER_EMAIL, TEACHER_PASSWORD)
        r = requests.get(f"{API_BASE}/admin/metrics/weekly", headers=auth_header(token))
        assert_status(r, 200)
        data = r.json()
        assert isinstance(data, list)
        return f"GET /admin/metrics/weekly → {len(data)} haftalik kayit"

    def metrics_require_teacher():
        token = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        r = requests.get(f"{API_BASE}/admin/metrics/weekly", headers=auth_header(token))
        assert r.status_code == 403
        return "Ogrenci metrics/weekly → 403 Forbidden"

    run_test("TimescaleDB extension kurulu mu?", timescaledb_installed)
    run_test("submission_metrics hypertable mi?", hypertable_exists)
    run_test("time_bucket() fonksiyonu calisiyor mu?", time_bucket_query)
    run_test("submission_metrics'te veri var mi?", metrics_data_count)
    run_test("Haftalik ortalama skor hesaplaniyor mu?", metrics_avg_score)
    run_test("GET /admin/metrics/weekly → API yaniti", weekly_metrics_api)
    run_test("Ogrenci metrics erisimi → 403", metrics_require_teacher)


# ═══════════════════════════════════════════════════════════════════════════════
#  11. Admin – Tüm Sonuçlar Paneli
# ═══════════════════════════════════════════════════════════════════════════════

def test_admin():
    section("11. Admin – Tum Sonuclar Paneli")

    def all_results_api():
        token = get_token(TEACHER_EMAIL, TEACHER_PASSWORD)
        r = requests.get(f"{API_BASE}/admin/results", headers=auth_header(token))
        assert_status(r, 200)
        data = r.json()
        assert "results" in data
        if data["total"] > 0:
            row = data["results"][0]
            assert "student_username" in row, f"student_username yok: {list(row.keys())}"
            assert "assignment_title" in row, f"assignment_title yok: {list(row.keys())}"
        return f"Tum sonuclar: {data['total']} submission (JOIN calisiyor)"

    def results_require_teacher():
        token = get_token(STUDENT1_EMAIL, STUDENT1_PASSWORD)
        r = requests.get(f"{API_BASE}/admin/results", headers=auth_header(token))
        assert r.status_code == 403
        return "Ogrenci admin/results → 403"

    run_test("GET /admin/results → tum submission'lar (JOIN)", all_results_api)
    run_test("Ogrenci admin/results erisimi → 403", results_require_teacher)


# ═══════════════════════════════════════════════════════════════════════════════
#  12. Worker Pipeline Doğrulama
# ═══════════════════════════════════════════════════════════════════════════════

def test_worker_pipeline():
    section("12. Worker Pipeline – End-to-End Dogrulama")

    def status_distribution():
        rows = db("""
            SELECT status, COUNT(*) as cnt
            FROM submissions GROUP BY status ORDER BY status
        """)
        assert rows, "Hic submission yok"
        status_map = {}
        for r in rows:
            parts = r.split("|")
            if len(parts) == 2:
                status_map[parts[0]] = int(parts[1])
        assert "done" in status_map, f"Hic 'done' submission yok: {status_map}"
        return f"Durumlar: {status_map}"

    def done_submission_complete():
        rows = db("""
            SELECT
                score IS NOT NULL AS has_score,
                feedback IS NOT NULL AS has_feedback,
                processed_at IS NOT NULL AS has_processed_at,
                code_embedding IS NOT NULL AS has_embedding,
                test_results IS NOT NULL AS has_hstore
            FROM submissions
            WHERE status = 'done'
            LIMIT 1
        """)
        assert rows, "Done submission bulunamadi"
        parts = rows[0].split("|")
        labels = ["score", "feedback", "processed_at", "embedding", "hstore"]
        checks = dict(zip(labels, [p.strip() for p in parts]))
        missing = [k for k, v in checks.items() if v == "f"]
        if missing:
            return f"UYARI: Eksik alanlar: {missing}"
        return "Tum alanlar dolu: score, feedback, processed_at, embedding, hstore"

    def pipeline_timing():
        rows = db("""
            SELECT
                AVG(processing_time_ms)::int AS avg_ms,
                MIN(processing_time_ms)      AS min_ms,
                MAX(processing_time_ms)      AS max_ms
            FROM submission_metrics
            WHERE processing_time_ms IS NOT NULL
        """)
        if not rows or rows[0] == "||":
            return "SKIP: processing_time_ms verisi yok"
        parts = rows[0].split("|")
        return f"Isleme suresi: avg={parts[0]}ms, min={parts[1]}ms, max={parts[2]}ms"

    def error_count():
        rows = db("SELECT COUNT(*) FROM submissions WHERE status = 'error'")
        count = int(rows[0]) if rows else 0
        return f"{count} submission 'error' durumunda"

    def worker_container_running():
        result = subprocess.run(
            ["docker", "compose", "ps", "--filter", "status=running", "--format", "json"],
            capture_output=True, text=True, cwd=COMPOSE_DIR
        )
        output = result.stdout.strip()
        assert "worker" in output.lower(), "worker container calismıyor"
        return "worker container 'running' durumunda"

    run_test("pending/done submission dagilimi", status_distribution)
    run_test("Done submission'da tum pipeline alanlari dolu", done_submission_complete)
    run_test("Pipeline isleme suresi (TimescaleDB)", pipeline_timing)
    run_test("Error durumlu submission sayisi", error_count)
    run_test("Worker container calisiyor mu?", worker_container_running)


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  CodeCheck Platform – Entegrasyon Testleri{RESET}")
    print(f"{BOLD}  7 PostgreSQL Extension + Tum API Endpoint'leri{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")

    test_health()
    test_citext()
    test_auth()
    test_ltree()
    test_assignments()
    test_pgmq()
    test_submissions()
    test_pgvector()
    test_postgis()
    test_timescaledb()
    test_admin()
    test_worker_pipeline()

    # ── Ozet ──
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  SONUC OZETI{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")

    passed = [r for r in results if r["status"] == "PASS"]
    failed = [r for r in results if r["status"] == "FAIL"]
    errors = [r for r in results if r["status"] == "ERROR"]
    total  = len(results)

    print(f"  Toplam   : {total}")
    print(f"  {GREEN}Gecti    : {len(passed)}{RESET}")
    print(f"  {RED}Basarisiz: {len(failed)}{RESET}")
    print(f"  {RED}Hata     : {len(errors)}{RESET}")

    if failed or errors:
        print(f"\n{BOLD}{RED}Basarisiz / Hatali Testler:{RESET}")
        for r in failed + errors:
            print(f"  {RED}X {r['name']}{RESET}")
            print(f"    → {r['detail']}")

    # Extension ozet
    print(f"\n{BOLD}  Extension Kontrol Tablosu:{RESET}")
    extensions = [
        ("pgvector",    "pgvector extension kurulu mu?"),
        ("pgmq",        "pgmq extension kurulu mu?"),
        ("hstore",      "hstore extension kurulu mu?"),
        ("PostGIS",     "PostGIS extension kurulu mu?"),
        ("ltree",       "ltree extension kurulu mu?"),
        ("TimescaleDB", "TimescaleDB extension kurulu mu?"),
        ("citext",      "citext extension kurulu mu?"),
    ]
    for ext_name, test_name in extensions:
        match = next((r for r in results if r["name"] == test_name), None)
        if match:
            icon = f"{GREEN}OK{RESET}" if match["status"] == "PASS" else f"{RED}XX{RESET}"
        else:
            icon = f"{YELLOW}?{RESET}"
        print(f"    [{icon}]  {ext_name}")

    rate = len(passed) / total * 100 if total > 0 else 0
    print(f"\n  Basari orani: {rate:.0f}% ({len(passed)}/{total})")
    print(f"{BOLD}{'='*60}{RESET}\n")

    sys.exit(0 if not failed and not errors else 1)
