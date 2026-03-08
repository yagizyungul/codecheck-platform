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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Course tree tablosu (ltree extension ile hiyerarşik ders yapısı)
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
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_text TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    score INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_course_tree_path ON course_tree USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments USING GIST (course_path);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions (assignment_id);
