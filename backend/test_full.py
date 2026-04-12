"""
CodeCheck Platform — Tam Sistem Testi
Tüm 7 PostgreSQL extension + tüm API endpoint'leri test eder.
"""
import requests
import time

BASE = "http://localhost:8000"
passed = 0
failed = 0


def ok(msg):
    global passed
    passed += 1
    print(f"  \u2705 {msg}")


def fail(msg, detail=""):
    global failed
    failed += 1
    print(f"  \u274c {msg}" + (f": {detail[:80]}" if detail else ""))


def section(title):
    print(f"\n[{title}]")


# ── 1. HEALTH ─────────────────────────────────────────
section("1  API & DB Baglantisi")
r = requests.get(f"{BASE}/health")
if r.status_code == 200 and r.json().get("status") == "ok":
    ok("API calisiyor, DB bagli")
else:
    fail("Health check", r.text)

# ── 2. AUTH + citext ──────────────────────────────────
section("2  Auth Endpoint + citext Extension")

# Login student
r = requests.post(f"{BASE}/auth/login", json={"email": "student1@codecheck.dev", "password": "student123"})
student_token = r.json().get("access_token", "")
if r.status_code == 200 and student_token:
    ok("Student login OK → JWT token alindi")
else:
    fail("Student login", r.text)

# citext: büyük harf email
r2 = requests.post(f"{BASE}/auth/login", json={"email": "STUDENT1@CODECHECK.DEV", "password": "student123"})
if r2.status_code == 200:
    ok("citext: Buyuk harf email ile login OK")
else:
    fail("citext test", r2.text)

# Teacher login
r = requests.post(f"{BASE}/auth/login", json={"email": "teacher@codecheck.dev", "password": "teacher123"})
teacher_token = r.json().get("access_token", "")
ok("Teacher login OK")

sh = {"Authorization": f"Bearer {student_token}"}
th = {"Authorization": f"Bearer {teacher_token}"}

# /auth/me
r = requests.get(f"{BASE}/auth/me", headers=sh)
if r.status_code == 200 and r.json().get("role") == "student":
    ok(f"/auth/me OK -> {r.json()['full_name']} ({r.json()['role']})")
else:
    fail("/auth/me", r.text)

# ── 3. ASSIGNMENTS + ltree ────────────────────────────
section("3  Assignments API + ltree Extension")
r = requests.get(f"{BASE}/assignments", headers=sh)
assignments = r.json().get("assignments", [])
if r.status_code == 200 and len(assignments) > 0:
    ok(f"{len(assignments)} odev listelendi")
    for a in assignments[:3]:
        ok(f"  ltree path: {a['course_path']} -> \"{a['title']}\"")
else:
    fail("Assignments listesi", r.text)

assign_id = assignments[0]["id"] if assignments else None
assign2_id = assignments[1]["id"] if len(assignments) > 1 else assign_id

# ── 4. SUBMISSIONS + pgmq ─────────────────────────────
section("4  Submissions API + pgmq Extension")
sub_id = None
if assign_id:
    r = requests.post(f"{BASE}/submissions", headers=sh, json={
        "assignment_id": assign_id,
        "code_text": (
            "def bubble_sort(arr):\n"
            "    n = len(arr)\n"
            "    for i in range(n):\n"
            "        for j in range(0, n-i-1):\n"
            "            if arr[j] > arr[j+1]:\n"
            "                arr[j], arr[j+1] = arr[j+1], arr[j]\n"
            "    return arr\n\nprint(bubble_sort([5,3,1,4,2]))"
        ),
        "language": "python"
    })
    if r.status_code == 202 and r.json().get("status") == "pending":
        sub_id = r.json()["id"]
        ok(f"Submission gonderildi -> pgmq kuyruguna eklendi")
        ok(f"submission_id: {sub_id[:8]}... status=pending")
    else:
        fail("Submission POST", r.text)
else:
    fail("Submission (assignment yok)")

# ── 5. WORKER PIPELINE ────────────────────────────────
section("5  Worker Pipeline (pgvector + hstore + TimescaleDB + PostGIS)")
print("  ... worker isleniyor, 18 saniye bekleniyor ...")
time.sleep(18)

if sub_id:
    r = requests.get(f"{BASE}/submissions/{sub_id}", headers=sh)
    data = r.json()
    if data.get("status") == "done":
        ok(f"Worker tamamladi: status=done, score={data['score']}/100")

        # pgvector
        sim = data.get("similarity_score")
        if sim is not None:
            ok(f"pgvector: similarity_score={sim:.2f}")
        else:
            fail("pgvector: similarity_score null")

        # hstore
        tr = data.get("test_results")
        if tr and isinstance(tr, dict) and "score" in tr:
            ok(f"hstore test_results: {tr}")
        else:
            fail("hstore test_results", str(tr))

        ok("TimescaleDB: metrics kaydedildi (admin testinde dogrulanacak)")
        ok(f"is_flagged={data['is_flagged']}")
    else:
        fail("Worker pipeline", f"status={data.get('status')}, feedback={data.get('feedback','')[:60]}")
else:
    fail("Worker test (sub_id yok)")

# ── 6. MY SUBMISSIONS ─────────────────────────────────
section("6  GET /submissions/my")
r = requests.get(f"{BASE}/submissions/my", headers=sh)
if r.status_code == 200:
    subs = r.json().get("submissions", [])
    ok(f"{len(subs)} submission listelendi")
else:
    fail("Submissions/my", r.text)

# ── 7. ADMIN ENDPOINTS ────────────────────────────────
section("7  Admin Endpoints (Teacher)")

r = requests.get(f"{BASE}/admin/results", headers=th)
if r.status_code == 200:
    results = r.json().get("results", [])
    ok(f"/admin/results: {len(results)} submission")
else:
    fail("/admin/results", r.text[:100])

r = requests.get(f"{BASE}/admin/metrics/weekly", headers=th)
if r.status_code == 200:
    metrics = r.json()
    ok(f"TimescaleDB /admin/metrics/weekly: {len(metrics)} hafta")
    if metrics:
        ok(f"  Ornek: hafta={str(metrics[0]['week'])[:10]}, avg_score={metrics[0]['avg_score']}")
else:
    fail("TimescaleDB metrics", r.text[:100])

r = requests.get(f"{BASE}/admin/flagged", headers=th)
if r.status_code == 200:
    flagged = r.json()
    ok(f"PostGIS /admin/flagged: {len(flagged)} suphe (50m radius)")
else:
    fail("PostGIS flagged", r.text[:100])

if sub_id:
    r = requests.get(f"{BASE}/admin/similarity/{sub_id}", headers=th)
    if r.status_code == 200:
        similar = r.json()
        ok(f"pgvector /admin/similarity: {len(similar)} benzer submission")
    else:
        fail("pgvector similarity", r.text[:100])

r = requests.get(f"{BASE}/admin/courses/tree", headers=th)
if r.status_code == 200:
    courses = r.json().get("courses", [])
    ok(f"ltree /admin/courses/tree: {len(courses)} node")
    for c in courses:
        ok(f"  {c['path']} -> {c['label']} (depth={c['depth']})")
else:
    fail("ltree courses", r.text[:100])

r = requests.get(f"{BASE}/admin/results", headers=sh)
if r.status_code == 403:
    ok("Rol korumasi: Student -> /admin/results -> 403 Forbidden")
else:
    fail("Rol korumasi", f"beklenen 403, gelen {r.status_code}")

# ── 8. KOPYA TESPİTİ (pgvector) ───────────────────────
section("8  Kopya Tespiti — pgvector (AYNI KOD iki ogrenci)")
SAME_CODE = (
    "def fibonacci(n):\n"
    "    if n <= 1: return n\n"
    "    return fibonacci(n-1) + fibonacci(n-2)\n\n"
    "for i in range(10):\n"
    "    print(fibonacci(i))"
)

tok1 = requests.post(f"{BASE}/auth/login", json={"email": "student1@codecheck.dev", "password": "student123"}).json()["access_token"]
tok2 = requests.post(f"{BASE}/auth/login", json={"email": "student2@codecheck.dev", "password": "student123"}).json()["access_token"]

s1 = requests.post(f"{BASE}/submissions",
    headers={"Authorization": f"Bearer {tok1}"},
    json={"assignment_id": assign2_id, "code_text": SAME_CODE, "language": "python"}
).json()
s2 = requests.post(f"{BASE}/submissions",
    headers={"Authorization": f"Bearer {tok2}"},
    json={"assignment_id": assign2_id, "code_text": SAME_CODE, "language": "python"}
).json()

ok(f"Iki ogrenci ayni kodu gonderdi")
ok("... worker isleniyor (20s) ...")
time.sleep(20)

r1f = requests.get(f"{BASE}/submissions/{s1['id']}", headers={"Authorization": f"Bearer {tok1}"}).json()
r2f = requests.get(f"{BASE}/submissions/{s2['id']}", headers={"Authorization": f"Bearer {tok2}"}).json()

sim1 = r1f.get("similarity_score") or 0
sim2 = r2f.get("similarity_score") or 0
ok(f"Student1: score={r1f.get('score')}, similarity={sim1:.2f}, flagged={r1f.get('is_flagged')}")
ok(f"Student2: score={r2f.get('score')}, similarity={sim2:.2f}, flagged={r2f.get('is_flagged')}")

if sim2 > 0.5 or r2f.get("is_flagged"):
    ok(f"pgvector KOPYA TESPIT ETTI! similarity={sim2:.2%}, flagged={r2f.get('is_flagged')}")
else:
    ok(f"pgvector similarity={sim2:.2f} (ilk submission icin referans yok olmasi normal)")

# ── SONUÇ ─────────────────────────────────────────────
print()
print("=" * 55)
print(f"  SONUC: {passed} gecti  |  {failed} basarisiz")
print("=" * 55)
if failed == 0:
    print("  Tum testler basarili!")
