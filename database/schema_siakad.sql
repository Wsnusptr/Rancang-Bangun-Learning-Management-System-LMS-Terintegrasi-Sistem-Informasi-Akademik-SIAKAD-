-- ============================================================
-- J-LEARN INTEGRATED ACADEMIC ECOSYSTEM — STMIK JAYAKARTA
-- Supabase SQL Schema — SIAKAD DUMMY v1.0
-- Database: jlearn-siakad-dummy (Supabase Project #2)
-- ============================================================
-- This is the Dummy SIAKAD (Sistem Informasi Akademik) database.
-- Its ONLY role is to receive synchronized grade data from J-Learn LMS
-- and store it in a structured academic records format.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STUDENTS (Minimal reference — NIM based)
-- ============================================================
CREATE TABLE students (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nim             TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  study_program   TEXT,
  academic_year   TEXT,                       -- Angkatan
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ACADEMIC RECORDS (Main table — receives data from J-Learn)
-- ============================================================
CREATE TABLE academic_records (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Student identity
  nim                   TEXT NOT NULL,
  student_name          TEXT NOT NULL,
  study_program         TEXT,
  -- Course identity
  course_code           TEXT NOT NULL,
  course_name           TEXT NOT NULL,
  credits               INTEGER DEFAULT 3,    -- SKS
  -- Academic period
  semester              TEXT NOT NULL,        -- e.g. "Genap"
  academic_year         TEXT NOT NULL,        -- e.g. "2025/2026"
  -- Grade data (from J-Learn)
  final_score           DECIMAL(5,2),
  attendance_percentage DECIMAL(5,2),
  -- Computed by SIAKAD
  letter_grade          TEXT GENERATED ALWAYS AS (
    CASE
      WHEN final_score >= 85 THEN 'A'
      WHEN final_score >= 80 THEN 'A-'
      WHEN final_score >= 75 THEN 'B+'
      WHEN final_score >= 70 THEN 'B'
      WHEN final_score >= 65 THEN 'B-'
      WHEN final_score >= 60 THEN 'C+'
      WHEN final_score >= 55 THEN 'C'
      WHEN final_score >= 50 THEN 'C-'
      WHEN final_score >= 40 THEN 'D'
      ELSE 'E'
    END
  ) STORED,
  grade_points          DECIMAL(3,2) GENERATED ALWAYS AS (
    CASE
      WHEN final_score >= 85 THEN 4.0
      WHEN final_score >= 80 THEN 3.7
      WHEN final_score >= 75 THEN 3.3
      WHEN final_score >= 70 THEN 3.0
      WHEN final_score >= 65 THEN 2.7
      WHEN final_score >= 60 THEN 2.3
      WHEN final_score >= 55 THEN 2.0
      WHEN final_score >= 50 THEN 1.7
      WHEN final_score >= 40 THEN 1.0
      ELSE 0.0
    END
  ) STORED,
  -- Sync metadata (from J-Learn)
  lms_class_id          TEXT,                 -- UUID of class in J-Learn
  batch_id              TEXT,                 -- Batch sync ID
  sync_source           TEXT DEFAULT 'J-Learn LMS',
  -- Status
  is_finalized          BOOLEAN DEFAULT FALSE, -- Locked after official input
  -- Timestamps
  received_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  -- Unique: one record per student per course per semester
  UNIQUE(nim, course_code, semester, academic_year)
);
CREATE TRIGGER set_academic_records_updated_at BEFORE UPDATE ON academic_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_records_nim ON academic_records(nim);
CREATE INDEX idx_records_course ON academic_records(course_code);
CREATE INDEX idx_records_semester ON academic_records(semester, academic_year);
CREATE INDEX idx_records_received ON academic_records(received_at DESC);

-- ============================================================
-- SYNC RECEIPTS (Log every sync received)
-- ============================================================
CREATE TABLE sync_receipts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id        TEXT NOT NULL,
  batch_index     INTEGER DEFAULT 1,
  total_batches   INTEGER DEFAULT 1,
  course_code     TEXT NOT NULL,
  course_name     TEXT NOT NULL,
  semester        TEXT NOT NULL,
  academic_year   TEXT NOT NULL,
  lms_class_id    TEXT,
  -- Stats
  records_received INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated  INTEGER DEFAULT 0,
  -- Status
  status          TEXT CHECK (status IN ('received','processed','error')) DEFAULT 'received',
  error_detail    TEXT,
  -- Timestamps
  received_at     TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);
CREATE INDEX idx_sync_receipts_batch ON sync_receipts(batch_id);
CREATE INDEX idx_sync_receipts_received ON sync_receipts(received_at DESC);

-- Enable Realtime (for live dashboard refresh)
ALTER PUBLICATION supabase_realtime ADD TABLE academic_records;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_receipts;

-- ============================================================
-- API KEYS (for validating requests from J-Learn)
-- ============================================================
CREATE TABLE api_keys (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash        TEXT NOT NULL UNIQUE,       -- Store hashed API key
  name            TEXT NOT NULL,             -- e.g. "J-Learn LMS Production"
  description     TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Student transcript summary
CREATE VIEW student_grade_summary WITH (security_invoker = true) AS
SELECT
  nim,
  student_name,
  academic_year,
  semester,
  COUNT(*) AS total_courses,
  SUM(credits) AS total_credits,
  ROUND(AVG(grade_points), 2) AS semester_gpa,
  COUNT(CASE WHEN letter_grade IN ('A','A-','B+','B','B-','C+','C') THEN 1 END) AS passed_courses,
  COUNT(CASE WHEN letter_grade IN ('D','E') THEN 1 END) AS failed_courses
FROM academic_records
GROUP BY nim, student_name, academic_year, semester
ORDER BY nim, academic_year, semester;

-- View: Course grade distribution
CREATE VIEW course_grade_distribution WITH (security_invoker = true) AS
SELECT
  course_code,
  course_name,
  semester,
  academic_year,
  COUNT(*) AS total_students,
  ROUND(AVG(final_score), 2) AS avg_score,
  ROUND(MIN(final_score), 2) AS min_score,
  ROUND(MAX(final_score), 2) AS max_score,
  COUNT(CASE WHEN letter_grade = 'A' THEN 1 END) AS grade_a,
  COUNT(CASE WHEN letter_grade = 'A-' THEN 1 END) AS grade_a_minus,
  COUNT(CASE WHEN letter_grade = 'B+' THEN 1 END) AS grade_b_plus,
  COUNT(CASE WHEN letter_grade = 'B' THEN 1 END) AS grade_b,
  COUNT(CASE WHEN letter_grade IN ('B-','C+','C','C-') THEN 1 END) AS grade_c_range,
  COUNT(CASE WHEN letter_grade IN ('D','E') THEN 1 END) AS grade_fail
FROM academic_records
GROUP BY course_code, course_name, semester, academic_year;

-- ============================================================
-- SEED: API Key (for J-Learn integration)
-- ============================================================
-- The actual API key value should be set in environment variables.
-- This inserts a placeholder — replace with bcrypt hash of actual key.
INSERT INTO api_keys (key_hash, name, description) VALUES
  ('REPLACE_WITH_BCRYPT_HASH_OF_SIAKAD_SECRET_KEY', 'J-Learn LMS Integration', 'Primary API key for J-Learn LMS to SIAKAD data synchronization');
