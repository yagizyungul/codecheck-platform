# 🔍 CodeCheck — AI Destekli Ödev Değerlendirme Platformu

> **SE 4458 — Software Architecture & Design of Modern Large Scale Systems**
> Assignment 1 — PostgreSQL Advanced Features Demo

**Takım Üyeleri:**
| Üye | Rol |
|------|-----|
| Yağız Yüngül | Backend & DB Lead |
| Özgür Can Güngör | Frontend & DevOps |

---

## 📋 Proje Açıklaması

CodeCheck; öğrencilerin kodlama ödevlerini gönderdiği, arka planda yapay zekâ tabanlı kontrol ve test case değerlendirmesinin otomatik gerçekleştiği bir **mini HackerRank** platformudur.

### Kullanılan 7 PostgreSQL Extension

| Extension | Kategori | Kullanım |
|-----------|---------|----------|
| **pgvector** | Vektör Benzerliği | Öğrenci kodunu AI kodu ile karşılaştır, kopya tespit et |
| **pgmq** | Mesaj Kuyruğu | Ödev submit → kuyruk → worker işleme zinciri |
| **hstore** | Anahtar-Değer | Esnek test sonuçları (`test_1=>pass, runtime=>142ms`) |
| **PostGIS** | Coğrafi Veri | IP konumu → 50m çapında aynı noktadan ödev tespiti |
| **ltree** | Hiyerarşi | `cs.datastructures.trees.inorder` ders ağacı |
| **TimescaleDB** | Zaman Serisi | Öğrenci gelişimi, haftalık grafikler |
| **citext** | Metin Araması | Büyük/küçük harf duyarsız email & username |

---

## 🏗️ Mimari

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│  Backend API │────▶│  PostgreSQL  │
│   Next.js    │     │   FastAPI    │     │  + 7 ext.    │
│   Port 3001  │     │   Port 8000  │     │  Port 5432   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────▼───────┐     ┌──────────────┐
                     │  pgmq Queue  │────▶│  AI Worker   │
                     │  Port 5433   │     │  LM Studio   │
                     └──────────────┘     └──────────────┘
```

---

## 🛠️ Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Veritabanı | PostgreSQL 16 (TimescaleDB HA image) |
| Backend API | FastAPI (Python) — SQLAlchemy, pgvector |
| AI Worker | sentence-transformers + LM Studio |
| Frontend | Next.js 16 — TypeScript, Tailwind CSS |
| Mesaj Kuyruğu | pgmq (PostgreSQL-native) |
| DevOps | Docker Compose |

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Docker & Docker Compose
- LM Studio (opsiyonel, AI Worker için)

### Kurulum

```bash
# 1. Repo'yu klonla
git clone https://github.com/yagizyungul/codecheck-platform.git
cd codecheck-platform

# 2. Tüm servisler ayağa kaldır
docker-compose up -d

# 3. Bekle — DB init + seed otomatik çalışır
# Frontend: http://localhost:3001
# Backend API: http://localhost:8000/docs
```

### Test Hesapları

| Rol | Email | Şifre |
|-----|-------|-------|
| 👩‍🏫 Öğretmen | `teacher@codecheck.dev` | `teacher123` |
| 👨‍🎓 Öğrenci 1 | `student1@codecheck.dev` | `student123` |
| 👨‍🎓 Öğrenci 2 | `student2@codecheck.dev` | `student123` |

---

## 📁 Proje Yapısı

```
codecheck-platform/
├── backend/                  # FastAPI uygulaması
│   ├── app/
│   │   ├── main.py           # FastAPI app + startup
│   │   ├── auth.py           # JWT authentication
│   │   ├── submissions.py    # Kod gönderim API
│   │   ├── assignments.py    # Ödev listeleme API
│   │   ├── admin.py          # Admin panel API
│   │   ├── models.py         # SQLAlchemy modelleri
│   │   ├── schemas.py        # Pydantic şemaları
│   │   ├── seed.py           # Demo veri seed
│   │   └── database.py       # DB bağlantı
│   ├── worker/               # pgmq consumer + AI analiz
│   └── tests/                # Pytest testleri
├── frontend/                 # Next.js uygulaması
│   └── app/
│       ├── page.tsx          # Landing page
│       ├── login/            # Giriş sayfası
│       ├── dashboard/        # Ana dashboard
│       │   ├── page.tsx      # Ödev listesi
│       │   ├── submissions/  # Gönderim listesi + detay
│       │   ├── assignments/  # Ödev detay + kod submit
│       │   └── admin/        # Admin panel (5 tab)
│       ├── components/       # Sidebar, Navbar
│       └── lib/              # API client, Auth provider
├── db/
│   └── init/01_schema.sql    # Tüm tablo + extension tanımları
├── mq-db/                    # pgmq PostgreSQL init
└── docker-compose.yml        # Tüm servisleri orkestre eder
```

---

## 🖥️ Frontend Sayfaları

### Öğrenci Sayfaları
- **Dashboard** — Mevcut ödevler, istatistikler
- **Ödev Detay** — Kod editörü, dil seçimi, kod gönderme
- **Gönderimlerim** — Tüm gönderimler listesi (skor, durum, tarih)
- **Gönderim Detay** — AI skoru, benzerlik skoru, test sonuçları (hstore), geri bildirim, polling

### Admin Paneli (5 Sekme)
| Sekme | Extension | Açıklama |
|-------|-----------|----------|
| 📊 Tüm Sonuçlar | — | Tüm öğrenci gönderimlerinin listesi |
| 📍 PostGIS Uyarılar | PostGIS ST_DWithin | 50m içinde gönderim yapan öğrenci çiftleri |
| 📈 Haftalık Grafik | TimescaleDB time_bucket | Haftalık ort. skor + gönderim sayısı |
| 🌳 Ders Ağacı | ltree nlevel + subpath | Hiyerarşik ders yapısı görselleştirme |
| 🔍 Benzerlik | pgvector cosine | Submission ID ile en benzer kodları bul |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/auth/register` | Kayıt ol |
| POST | `/auth/login` | Giriş yap (JWT token döner) |
| GET | `/auth/me` | Mevcut kullanıcı bilgisi |

### Assignments
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/assignments` | Tüm ödevler |
| GET | `/assignments/{id}` | Ödev detayı |

### Submissions
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/submissions` | Kod gönder (→ pgmq kuyruğu) |
| GET | `/submissions/my` | Benim gönderimlerim |
| GET | `/submissions/{id}` | Gönderim detayı (polling) |

### Admin (teacher/admin rolü gerekir)
| Method | Endpoint | Extension |
|--------|----------|-----------|
| GET | `/admin/results` | — |
| GET | `/admin/flagged?radius_meters=50` | PostGIS |
| GET | `/admin/metrics/weekly` | TimescaleDB |
| GET | `/admin/courses/tree` | ltree |
| GET | `/admin/similarity/{id}` | pgvector |

---

## 🐳 Docker Servisleri

| Servis | Port | Açıklama |
|--------|------|----------|
| `frontend` | 3001 | Next.js (dev mode) |
| `api` | 8000 | FastAPI (uvicorn) |
| `db` | 5432 | TimescaleDB HA (7 extension) |
| `mq-db` | 5433 | pgmq PostgreSQL |
| `worker` | — | AI analiz consumer |

---

## 📊 Demo Akışı

1. **Login** → Teacher veya Student hesabıyla giriş
2. **Ödev Seç** → Dashboard'dan bir ödeve tıkla
3. **Kod Gönder** → Python/JS/Java kodunu yaz, dil seç, gönder
4. **Polling** → Sistem kodu pgmq ile kuyruğa atar, worker işler
5. **Sonuç** → AI skoru, benzerlik skoru, hstore test sonuçları
6. **Admin Panel** → PostGIS uyarıları, TimescaleDB grafikleri, ltree ders ağacı, pgvector benzerlik raporu

---

**CodeCheck Platform © 2026 — Yağız Yüngül & Özgür Can Güngör**
