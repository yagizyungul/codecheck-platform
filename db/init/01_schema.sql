-- =============================================
-- CodeCheck Platform – Database Schema
-- PostgreSQL Extensions + Tables
-- =============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "hstore";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- =============================================
-- TABLES
-- =============================================

-- Users tablosu (citext extension ile case-insensitive email/username)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT UNIQUE NOT NULL,
    username CITEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    -- PostGIS: IP'den türetilen coğrafi konum
    ip_address INET,
    submitted_lat DOUBLE PRECISION,
    submitted_lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Course tree tablosu (ltree extension ile hiyerarşik ders yapısı)
-- Örnek: cs → cs.cs101 → cs.cs101.week1
CREATE TABLE IF NOT EXISTS course_tree (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    path LTREE NOT NULL UNIQUE,
    description TEXT DEFAULT ''
);

-- Assignments tablosu
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    course_path LTREE NOT NULL,
    due_date TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Submissions tablosu
-- pgvector: code_embedding (384-dim, sentence-transformers)
-- hstore: test_results (test_1=>pass, runtime=>142ms, score=>85)
-- PostGIS: submitted_lat/lng (IP'den çözülen konum)
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_text TEXT NOT NULL DEFAULT '',
    language VARCHAR(30) NOT NULL DEFAULT 'python',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',  -- pending/processing/done/error
    score INTEGER,
    feedback TEXT,
    -- pgvector: kod embedding (384-boyutlu)
    code_embedding vector(384),
    -- pgvector cosine similarity sonucu
    similarity_score DOUBLE PRECISION,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    -- hstore: esnek test sonuçları
    test_results HSTORE,
    -- PostGIS: submission'ın yapıldığı konum (IP bazlı)
    ip_address INET,
    submitted_lat DOUBLE PRECISION,
    submitted_lng DOUBLE PRECISION,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- =============================================
-- TimescaleDB: Submission Metrikleri (haftalık grafik)
-- =============================================
CREATE TABLE IF NOT EXISTS submission_metrics (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    score INTEGER,
    processing_time_ms INTEGER,
    similarity_score DOUBLE PRECISION
);
SELECT create_hypertable('submission_metrics', 'time', if_not_exists => TRUE);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_course_tree_path ON course_tree USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments USING GIST (course_path);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_flagged ON submissions (is_flagged) WHERE is_flagged = TRUE;
-- TimescaleDB
CREATE INDEX IF NOT EXISTS idx_metrics_student ON submission_metrics (student_id, time DESC);
