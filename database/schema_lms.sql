-- ============================================================
-- J-LEARN INTEGRATED ACADEMIC ECOSYSTEM — STMIK JAYAKARTA
-- Supabase SQL Schema v1.0 (Production-Grade)
-- Database: jlearn-lms (Supabase Project #1)
-- ============================================================
-- EXECUTION ORDER: Run sections in order 1 → 10
-- ============================================================

-- ============================================================
-- SECTION 1: EXTENSIONS & UTILITIES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search on names

-- Helper function: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function: generate random alphanumeric code
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 2: ACADEMIC STRUCTURE
-- (Faculties → Programs → Semesters → Course Catalog)
-- ============================================================

-- Faculties (Fakultas)
CREATE TABLE faculties (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,        -- e.g. "FTI"
  name          TEXT NOT NULL,               -- e.g. "Fakultas Teknologi Informasi"
  dean_name     TEXT,
  description   TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_faculties_updated_at BEFORE UPDATE ON faculties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Study Programs (Program Studi)
CREATE TABLE study_programs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id     UUID REFERENCES faculties(id) ON DELETE CASCADE,
  code           TEXT NOT NULL UNIQUE,       -- e.g. "S1-TI"
  name           TEXT NOT NULL,              -- e.g. "S1 Teknik Informatika"
  degree_level   TEXT CHECK (degree_level IN ('D3','S1','S2','S3')) NOT NULL,
  accreditation  TEXT DEFAULT 'B',
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_study_programs_updated_at BEFORE UPDATE ON study_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Academic Semesters (Tahun Akademik)
CREATE TABLE academic_semesters (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,      -- e.g. "20251" (2025 Ganjil), "20252" (2025 Genap)
  name            TEXT NOT NULL,             -- e.g. "Semester Ganjil 2025/2026"
  academic_year   TEXT NOT NULL,             -- e.g. "2025/2026"
  semester_type   TEXT CHECK (semester_type IN ('Ganjil','Genap','Pendek')) NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  is_active       BOOLEAN DEFAULT FALSE,     -- Only one can be active
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Course Catalog (Katalog Mata Kuliah)
CREATE TABLE courses (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  study_program_id UUID REFERENCES study_programs(id),
  code            TEXT NOT NULL UNIQUE,      -- e.g. "IF301"
  name            TEXT NOT NULL,             -- e.g. "Pemrograman Web"
  credits         INTEGER NOT NULL DEFAULT 3, -- SKS
  semester_order  INTEGER,                   -- Recommended semester (1-8)
  description     TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Course Prerequisites
CREATE TABLE course_prerequisites (
  course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  min_grade       TEXT DEFAULT 'C',          -- Minimum grade to pass prerequisite
  PRIMARY KEY (course_id, prerequisite_id)
);

-- Rooms / Locations
CREATE TABLE rooms (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,      -- e.g. "R301", "LAB-A"
  name            TEXT NOT NULL,
  capacity        INTEGER DEFAULT 40,
  room_type       TEXT CHECK (room_type IN ('classroom','laboratory','seminar','online')) DEFAULT 'classroom',
  building        TEXT,
  floor           INTEGER,
  is_active       BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- SECTION 3: USER MANAGEMENT
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name            TEXT NOT NULL,
  role            TEXT CHECK (role IN ('student','lecturer','admin','staff')) NOT NULL DEFAULT 'student',
  -- Student specific
  nim             TEXT UNIQUE,               -- Nomor Induk Mahasiswa
  study_program_id UUID REFERENCES study_programs(id),
  enrollment_year INTEGER,                   -- Angkatan (e.g. 2023)
  -- Lecturer/Staff specific
  nip             TEXT UNIQUE,               -- Nomor Induk Pegawai
  nidn            TEXT UNIQUE,               -- Nomor Induk Dosen Nasional
  -- Common
  phone           TEXT,
  date_of_birth   DATE,
  gender          TEXT CHECK (gender IN ('L','P')),
  address         TEXT,
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_profiles_nim ON profiles(nim) WHERE nim IS NOT NULL;
CREATE INDEX idx_profiles_nip ON profiles(nip) WHERE nip IS NOT NULL;
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_study_program ON profiles(study_program_id);

-- ============================================================
-- SECTION 4: CLASS MANAGEMENT
-- ============================================================

-- Classes (Kelas — specific instance of a course in a semester)
CREATE TABLE classes (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id         UUID REFERENCES courses(id) NOT NULL,
  semester_id       UUID REFERENCES academic_semesters(id) NOT NULL,
  room_id           UUID REFERENCES rooms(id),
  lecturer_id       UUID REFERENCES profiles(id) NOT NULL,
  -- Class identity
  class_code        TEXT NOT NULL UNIQUE DEFAULT generate_class_code(), -- 6-char join code
  class_name        TEXT NOT NULL,           -- e.g. "Pemrograman Web — Kelas A"
  class_section     TEXT,                    -- e.g. "A", "B", "C"
  -- Metadata
  cover_color       TEXT DEFAULT '#1A3A6B',
  cover_image_url   TEXT,
  description       TEXT,
  -- Schedule
  day_of_week       TEXT CHECK (day_of_week IN ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu')),
  start_time        TIME,
  end_time          TIME,
  -- Configuration
  max_students      INTEGER DEFAULT 40,
  min_attendance_pct DECIMAL DEFAULT 75.0,  -- Min % kehadiran untuk lulus
  is_active         BOOLEAN DEFAULT TRUE,
  -- Grade components weight (must sum to 100)
  weight_attendance DECIMAL DEFAULT 10.0,   -- Bobot kehadiran
  weight_assignments DECIMAL DEFAULT 20.0,  -- Bobot tugas harian
  weight_quiz       DECIMAL DEFAULT 10.0,   -- Bobot kuis
  weight_midterm    DECIMAL DEFAULT 30.0,   -- Bobot UTS
  weight_final      DECIMAL DEFAULT 30.0,   -- Bobot UAS
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_classes_lecturer ON classes(lecturer_id);
CREATE INDEX idx_classes_semester ON classes(semester_id);
CREATE INDEX idx_classes_course ON classes(course_id);
CREATE INDEX idx_classes_code ON classes(class_code);

-- Enrollments (Mahasiswa join kelas)
CREATE TABLE enrollments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  class_id        UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  status          TEXT CHECK (status IN ('active','dropped','completed','failed')) DEFAULT 'active',
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  dropped_at      TIMESTAMPTZ,
  final_grade     TEXT,                      -- A, B+, B, C+, C, D, E (final result)
  UNIQUE(student_id, class_id)
);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_class ON enrollments(class_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- ============================================================
-- SECTION 5: CONTENT & ASSIGNMENTS
-- ============================================================

-- Posts (Stream: announcements, materials, assignments)
CREATE TABLE posts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id        UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  author_id       UUID REFERENCES profiles(id) NOT NULL,
  type            TEXT CHECK (type IN ('announcement','material','assignment','discussion')) NOT NULL,
  title           TEXT,
  content         TEXT NOT NULL,
  is_pinned       BOOLEAN DEFAULT FALSE,
  is_draft        BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_posts_class ON posts(class_id);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_published ON posts(published_at DESC);

-- Post Attachments (multiple files per post)
CREATE TABLE post_attachments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id         UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,             -- Supabase Storage URL
  file_type       TEXT,                      -- MIME type
  file_size       BIGINT,                    -- bytes
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Post Comments (for discussion posts)
CREATE TABLE post_comments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id         UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  author_id       UUID REFERENCES profiles(id) NOT NULL,
  parent_id       UUID REFERENCES post_comments(id), -- for nested replies
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_comments_post ON post_comments(post_id);

-- Assignments (detailed assignment records)
CREATE TABLE assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id        UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  post_id         UUID REFERENCES posts(id),  -- linked to stream post
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT CHECK (type IN ('homework','quiz','project','midterm','final','practice')) DEFAULT 'homework',
  max_score       DECIMAL DEFAULT 100,
  passing_score   DECIMAL DEFAULT 60,
  due_date        TIMESTAMPTZ,
  late_submission BOOLEAN DEFAULT FALSE,      -- Allow late submission?
  late_penalty_pct DECIMAL DEFAULT 0,        -- % deduction per day late
  -- File requirements
  allow_file_upload BOOLEAN DEFAULT TRUE,
  allowed_file_types TEXT[] DEFAULT ARRAY['pdf','doc','docx','zip','jpg','png'],
  max_file_size_mb INTEGER DEFAULT 10,
  -- Rubric
  rubric          JSONB,                      -- Flexible rubric as JSON
  -- Visibility
  is_published    BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_assignments_type ON assignments(type);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

-- Submissions (student work)
CREATE TABLE submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id   UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  student_id      UUID REFERENCES profiles(id) NOT NULL,
  -- Submission data
  content         TEXT,                       -- Text response (optional)
  file_url        TEXT,                       -- Supabase Storage path
  file_name       TEXT,
  file_size       BIGINT,
  file_type       TEXT,
  -- Submission metadata
  attempt_number  INTEGER DEFAULT 1,
  is_late         BOOLEAN DEFAULT FALSE,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  -- Grading
  score           DECIMAL CHECK (score >= 0),
  final_score     DECIMAL,                    -- After late penalty applied
  feedback        TEXT,
  graded_by       UUID REFERENCES profiles(id),
  graded_at       TIMESTAMPTZ,
  -- Status
  status          TEXT CHECK (status IN ('submitted','graded','returned','revision_requested')) DEFAULT 'submitted',
  UNIQUE(assignment_id, student_id)
);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_graded ON submissions(graded_at) WHERE graded_at IS NOT NULL;

-- ============================================================
-- SECTION 6: ATTENDANCE SYSTEM
-- ============================================================

-- Attendance Sessions (opened by lecturer per meeting)
CREATE TABLE attendance_sessions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id          UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  meeting_number    INTEGER NOT NULL,         -- Pertemuan ke-N
  topic             TEXT,                     -- Topic/materi hari ini
  -- Token & QR
  token             TEXT UNIQUE NOT NULL,     -- 6-char alphanumeric
  qr_payload        TEXT NOT NULL,            -- JSON string for QR Code
  -- Timing
  session_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  opened_at         TIMESTAMPTZ DEFAULT NOW(),
  closes_at         TIMESTAMPTZ NOT NULL,     -- expires_at (opened_at + 15 min)
  closed_at         TIMESTAMPTZ,              -- actual close time
  is_open           BOOLEAN DEFAULT TRUE,
  -- Geolocation validation
  campus_lat        DECIMAL(10,8) DEFAULT -6.208800,
  campus_lng        DECIMAL(11,8) DEFAULT 106.845600,
  campus_radius_m   INTEGER DEFAULT 100,
  geolocation_required BOOLEAN DEFAULT TRUE,
  -- Notes
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_attendance_sessions_class ON attendance_sessions(class_id);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_attendance_sessions_token ON attendance_sessions(token);

-- Attendance Records (per-student per-session)
CREATE TABLE attendance_records (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id      UUID REFERENCES profiles(id) NOT NULL,
  -- Status
  status          TEXT CHECK (status IN ('present','late','excused','absent')) DEFAULT 'present',
  -- Geolocation data (audit trail)
  student_lat     DECIMAL(10,8),
  student_lng     DECIMAL(11,8),
  distance_meters DECIMAL,                   -- Distance from campus at check-in
  geo_validated   BOOLEAN DEFAULT FALSE,
  -- Metadata
  check_in_method TEXT CHECK (check_in_method IN ('token','qr','manual')) DEFAULT 'token',
  checked_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Manual override by lecturer
  overridden_by   UUID REFERENCES profiles(id),
  override_reason TEXT,
  UNIQUE(session_id, student_id)
);
CREATE INDEX idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);

-- ============================================================
-- SECTION 7: GRADES & ACADEMIC RECORDS
-- ============================================================

-- Grade Components (running total per student per class)
CREATE TABLE grade_summaries (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id            UUID REFERENCES profiles(id) NOT NULL,
  class_id              UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  -- Component scores (0-100 scale)
  attendance_score      DECIMAL DEFAULT 0,    -- % kehadiran → bobot
  assignment_score      DECIMAL DEFAULT 0,    -- Rata-rata nilai tugas
  quiz_score            DECIMAL DEFAULT 0,    -- Rata-rata nilai kuis
  midterm_score         DECIMAL DEFAULT 0,    -- Nilai UTS
  final_exam_score      DECIMAL DEFAULT 0,    -- Nilai UAS
  -- Computed
  weighted_total        DECIMAL,              -- Final weighted score
  letter_grade          TEXT,                 -- A, B+, B, C+, C, D, E
  grade_points          DECIMAL,              -- 4.0 scale
  -- Attendance stats
  total_sessions        INTEGER DEFAULT 0,
  attended_sessions     INTEGER DEFAULT 0,
  attendance_percentage DECIMAL DEFAULT 0,
  -- Sync to SIAKAD
  sync_status           TEXT CHECK (sync_status IN ('pending','synced','failed')) DEFAULT 'pending',
  sync_error            TEXT,
  synced_at             TIMESTAMPTZ,
  -- Timestamps
  calculated_at         TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id)
);
CREATE TRIGGER set_grade_summaries_updated_at BEFORE UPDATE ON grade_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_grade_summaries_student ON grade_summaries(student_id);
CREATE INDEX idx_grade_summaries_class ON grade_summaries(class_id);
CREATE INDEX idx_grade_summaries_sync ON grade_summaries(sync_status);

-- Grade letter mapping function
CREATE OR REPLACE FUNCTION calculate_letter_grade(score DECIMAL)
RETURNS TABLE(letter TEXT, grade_points DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN score >= 85 THEN 'A'
      WHEN score >= 80 THEN 'A-'
      WHEN score >= 75 THEN 'B+'
      WHEN score >= 70 THEN 'B'
      WHEN score >= 65 THEN 'B-'
      WHEN score >= 60 THEN 'C+'
      WHEN score >= 55 THEN 'C'
      WHEN score >= 50 THEN 'C-'
      WHEN score >= 40 THEN 'D'
      ELSE 'E'
    END,
    CASE
      WHEN score >= 85 THEN 4.0
      WHEN score >= 80 THEN 3.7
      WHEN score >= 75 THEN 3.3
      WHEN score >= 70 THEN 3.0
      WHEN score >= 65 THEN 2.7
      WHEN score >= 60 THEN 2.3
      WHEN score >= 55 THEN 2.0
      WHEN score >= 50 THEN 1.7
      WHEN score >= 40 THEN 1.0
      ELSE 0.0
    END;
END;
$$ LANGUAGE plpgsql;

-- Student Academic Transcripts (per-semester summary)
CREATE TABLE student_transcripts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id      UUID REFERENCES profiles(id) NOT NULL,
  semester_id     UUID REFERENCES academic_semesters(id) NOT NULL,
  -- Semester stats
  credits_taken   INTEGER DEFAULT 0,          -- SKS diambil
  credits_passed  INTEGER DEFAULT 0,          -- SKS lulus
  semester_gpa    DECIMAL(4,2),               -- IP Semester
  cumulative_gpa  DECIMAL(4,2),               -- IPK kumulatif
  total_credits_cumulative INTEGER DEFAULT 0,
  -- Status
  academic_status TEXT CHECK (academic_status IN ('active','warning','probation','suspended','graduated')) DEFAULT 'active',
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, semester_id)
);

-- Sync Logs (history of all SIAKAD synchronizations)
CREATE TABLE siakad_sync_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiated_by    UUID REFERENCES profiles(id) NOT NULL,
  class_id        UUID REFERENCES classes(id),
  -- Batch info
  batch_id        UUID DEFAULT gen_random_uuid(),
  total_records   INTEGER DEFAULT 0,
  synced_records  INTEGER DEFAULT 0,
  failed_records  INTEGER DEFAULT 0,
  -- Status
  status          TEXT CHECK (status IN ('pending','in_progress','completed','partial','failed')) DEFAULT 'pending',
  error_message   TEXT,
  -- Timing
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,
  -- Payload snapshot (for debugging)
  payload_snapshot JSONB
);
CREATE INDEX idx_sync_logs_class ON siakad_sync_logs(class_id);
CREATE INDEX idx_sync_logs_status ON siakad_sync_logs(status);
CREATE INDEX idx_sync_logs_initiated ON siakad_sync_logs(initiated_by);

-- ============================================================
-- SECTION 8: NOTIFICATIONS & COMMUNICATION
-- ============================================================

-- Notifications
CREATE TABLE notifications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type            TEXT CHECK (type IN (
    'new_assignment','assignment_graded','new_announcement','new_material',
    'attendance_opened','sync_success','sync_failed','deadline_reminder',
    'enrollment_confirmed','class_updated','comment_reply','system'
  )) NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT,
  -- Reference data
  related_class_id UUID REFERENCES classes(id),
  related_post_id  UUID REFERENCES posts(id),
  related_assignment_id UUID REFERENCES assignments(id),
  action_url      TEXT,                       -- Deep link URL
  -- Status
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Enable Realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- SECTION 9: SYSTEM SETTINGS & AUDIT
-- ============================================================

-- System Settings (key-value store for app configuration)
CREATE TABLE system_settings (
  key             TEXT PRIMARY KEY,
  value           TEXT NOT NULL,
  description     TEXT,
  is_public       BOOLEAN DEFAULT FALSE,      -- Can frontend read this?
  updated_by      UUID REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
  ('campus_name', 'STMIK Jayakarta', 'Nama institusi', TRUE),
  ('campus_lat', '-6.208800', 'Latitude kampus untuk geolokasi', TRUE),
  ('campus_lng', '106.845600', 'Longitude kampus untuk geolokasi', TRUE),
  ('campus_radius_meters', '150', 'Radius validasi absensi (meter)', TRUE),
  ('attendance_token_duration_minutes', '15', 'Durasi token absensi (menit)', FALSE),
  ('max_file_upload_mb', '10', 'Batas ukuran file upload (MB)', TRUE),
  ('siakad_api_url', '', 'URL endpoint SIAKAD dummy', FALSE),
  ('siakad_api_key', '', 'API Key untuk integrasi SIAKAD', FALSE),
  ('academic_year_active', '2025/2026', 'Tahun akademik aktif', TRUE),
  ('lms_version', '1.0.0', 'Versi sistem J-Learn', TRUE);

-- Audit Log (track important system actions)
CREATE TABLE audit_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES profiles(id),
  action          TEXT NOT NULL,              -- e.g. 'CREATE_CLASS', 'SYNC_SIAKAD', 'DELETE_USER'
  entity_type     TEXT,                       -- e.g. 'class', 'grade', 'user'
  entity_id       UUID,
  old_value       JSONB,
  new_value       JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- SECTION 10: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE siakad_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----
CREATE POLICY "profiles_select_all_authenticated"
  ON profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ---- PUBLIC REFERENCE DATA ----
CREATE POLICY "faculties_public_read" ON faculties FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "study_programs_public_read" ON study_programs FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "academic_semesters_public_read" ON academic_semesters FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "courses_public_read" ON courses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "rooms_public_read" ON rooms FOR SELECT TO authenticated USING (TRUE);

-- Admin-only write for reference data
CREATE POLICY "faculties_admin_write" ON faculties FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---- RLS helpers (hindari rekursi classes <-> enrollments) ----
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'));
$$;
CREATE OR REPLACE FUNCTION public.get_my_lecturer_class_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT id FROM classes WHERE lecturer_id = auth.uid();
$$;
CREATE OR REPLACE FUNCTION public.get_my_enrolled_class_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT class_id FROM enrollments WHERE student_id = auth.uid() AND status = 'active';
$$;

-- ---- CLASSES ----
CREATE POLICY "classes_select"
  ON classes FOR SELECT TO authenticated USING (
    lecturer_id = auth.uid() OR
    public.is_admin_user() OR
    id IN (SELECT public.get_my_enrolled_class_ids())
  );
CREATE POLICY "classes_insert_lecturer"
  ON classes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lecturer','admin'))
    AND lecturer_id = auth.uid()
  );
CREATE POLICY "classes_update_lecturer"
  ON classes FOR UPDATE TO authenticated
  USING (
    lecturer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "classes_delete_admin"
  ON classes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---- ENROLLMENTS ----
CREATE POLICY "enrollments_select"
  ON enrollments FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR
    public.is_admin_user() OR
    class_id IN (SELECT public.get_my_lecturer_class_ids())
  );
CREATE POLICY "enrollments_insert_student"
  ON enrollments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student'));
CREATE POLICY "enrollments_update_lecturer"
  ON enrollments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE id = class_id AND lecturer_id = auth.uid()) OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---- POSTS ----
CREATE POLICY "posts_select_class_members"
  ON posts FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM enrollments WHERE class_id = posts.class_id AND student_id = auth.uid() AND status = 'active') OR
    EXISTS (SELECT 1 FROM classes WHERE id = posts.class_id AND lecturer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );
CREATE POLICY "posts_insert_lecturer"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND lecturer_id = auth.uid())
  );
CREATE POLICY "posts_update_own"
  ON posts FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "posts_delete_lecturer"
  ON posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---- POST ATTACHMENTS & COMMENTS ----
CREATE POLICY "post_attachments_select" ON post_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM posts p
    JOIN classes c ON p.class_id = c.id
    WHERE p.id = post_id AND (
      c.lecturer_id = auth.uid() OR
      EXISTS (SELECT 1 FROM enrollments WHERE class_id = c.id AND student_id = auth.uid() AND status = 'active')
    )
  ));
CREATE POLICY "post_attachments_insert" ON post_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE id = post_id AND author_id = auth.uid()));

CREATE POLICY "post_comments_select" ON post_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM posts p
    JOIN classes c ON p.class_id = c.id
    WHERE p.id = post_id AND (
      c.lecturer_id = auth.uid() OR
      EXISTS (SELECT 1 FROM enrollments WHERE class_id = c.id AND student_id = auth.uid() AND status = 'active')
    )
  ));
CREATE POLICY "post_comments_insert" ON post_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "post_comments_update_own" ON post_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

-- ---- ASSIGNMENTS ----
CREATE POLICY "assignments_select"
  ON assignments FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM enrollments WHERE class_id = assignments.class_id AND student_id = auth.uid() AND status = 'active') OR
    EXISTS (SELECT 1 FROM classes WHERE id = assignments.class_id AND lecturer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );
CREATE POLICY "assignments_insert_lecturer"
  ON assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE id = class_id AND lecturer_id = auth.uid()));
CREATE POLICY "assignments_update_lecturer"
  ON assignments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE id = class_id AND lecturer_id = auth.uid()));

-- ---- SUBMISSIONS ----
CREATE POLICY "submissions_select"
  ON submissions FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM assignments a JOIN classes c ON a.class_id = c.id
      WHERE a.id = assignment_id AND c.lecturer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );
CREATE POLICY "submissions_insert_student"
  ON submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student'));
CREATE POLICY "submissions_update"
  ON submissions FOR UPDATE TO authenticated USING (
    student_id = auth.uid() AND graded_at IS NULL OR  -- Student can edit before graded
    EXISTS (SELECT 1 FROM assignments a JOIN classes c ON a.class_id = c.id
      WHERE a.id = assignment_id AND c.lecturer_id = auth.uid()) OR -- Lecturer can grade
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---- ATTENDANCE ----
CREATE POLICY "attendance_sessions_select"
  ON attendance_sessions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND lecturer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM enrollments WHERE class_id = attendance_sessions.class_id AND student_id = auth.uid() AND status = 'active') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );
CREATE POLICY "attendance_sessions_insert_lecturer"
  ON attendance_sessions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE id = class_id AND lecturer_id = auth.uid()));
CREATE POLICY "attendance_sessions_update_lecturer"
  ON attendance_sessions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM classes WHERE id = class_id AND lecturer_id = auth.uid()));

CREATE POLICY "attendance_records_select"
  ON attendance_records FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM attendance_sessions s JOIN classes c ON s.class_id = c.id
      WHERE s.id = session_id AND c.lecturer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );
CREATE POLICY "attendance_records_insert_student"
  ON attendance_records FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "attendance_records_update_lecturer"
  ON attendance_records FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM attendance_sessions s JOIN classes c ON s.class_id = c.id
    WHERE s.id = session_id AND c.lecturer_id = auth.uid()));

-- ---- GRADE SUMMARIES ----
CREATE POLICY "grade_summaries_select"
  ON grade_summaries FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND lecturer_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );
CREATE POLICY "grade_summaries_upsert_system"
  ON grade_summaries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lecturer','admin')));

-- ---- TRANSCRIPTS ----
CREATE POLICY "transcripts_select"
  ON student_transcripts FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lecturer','admin','staff'))
  );

-- ---- SYNC LOGS ----
CREATE POLICY "sync_logs_select"
  ON siakad_sync_logs FOR SELECT TO authenticated USING (
    initiated_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );
CREATE POLICY "sync_logs_insert"
  ON siakad_sync_logs FOR INSERT TO authenticated
  WITH CHECK (initiated_by = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lecturer','admin')));
CREATE POLICY "sync_logs_update"
  ON siakad_sync_logs FOR UPDATE TO authenticated
  USING (initiated_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---- NOTIFICATIONS ----
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_system"
  ON notifications FOR INSERT TO authenticated WITH CHECK (TRUE); -- API routes handle this

-- ---- SYSTEM SETTINGS ----
CREATE POLICY "system_settings_public_read"
  ON system_settings FOR SELECT TO authenticated USING (is_public = TRUE OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff')));
CREATE POLICY "system_settings_admin_write"
  ON system_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---- AUDIT LOGS ----
CREATE POLICY "audit_logs_admin_only"
  ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "audit_logs_insert_authenticated"
  ON audit_logs FOR INSERT TO authenticated WITH CHECK (TRUE);

-- ============================================================
-- SECTION 11: AUTO-TRIGGER FUNCTIONS
-- ============================================================

-- Auto-create profile after user registers via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-create grade_summary row when student enrolls
CREATE OR REPLACE FUNCTION handle_new_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO grade_summaries (student_id, class_id)
  VALUES (NEW.student_id, NEW.class_id)
  ON CONFLICT (student_id, class_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_enrollment_created
  AFTER INSERT ON enrollments
  FOR EACH ROW EXECUTE FUNCTION handle_new_enrollment();

-- Auto-close attendance session when expires_at is reached
-- (handled by API route checking expires_at on each check-in request)

-- ============================================================
-- SECTION 12: USEFUL VIEWS (for API optimization)
-- ============================================================

-- View: Class detail with lecturer and course info
CREATE VIEW class_details WITH (security_invoker = true) AS
SELECT
  c.id,
  c.class_name,
  c.class_section,
  c.class_code,
  c.cover_color,
  c.cover_image_url,
  c.day_of_week,
  c.start_time,
  c.end_time,
  c.max_students,
  c.min_attendance_pct,
  c.weight_attendance,
  c.weight_assignments,
  c.weight_quiz,
  c.weight_midterm,
  c.weight_final,
  c.is_active,
  c.created_at,
  -- Course info
  co.code AS course_code,
  co.name AS course_name,
  co.credits AS course_credits,
  -- Semester info
  s.name AS semester_name,
  s.academic_year,
  s.semester_type,
  -- Lecturer info
  p.name AS lecturer_name,
  p.nip AS lecturer_nip,
  p.avatar_url AS lecturer_avatar,
  -- Room info
  r.code AS room_code,
  r.name AS room_name,
  -- Stats
  (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id AND e.status = 'active') AS enrolled_count,
  (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id AND a.is_published = TRUE) AS assignment_count
FROM classes c
JOIN courses co ON c.course_id = co.id
JOIN academic_semesters s ON c.semester_id = s.id
JOIN profiles p ON c.lecturer_id = p.id
LEFT JOIN rooms r ON c.room_id = r.id;

-- View: Student enrollment with class details
CREATE VIEW student_class_overview WITH (security_invoker = true) AS
SELECT
  e.id AS enrollment_id,
  e.student_id,
  e.status AS enrollment_status,
  e.joined_at,
  cd.*,
  -- Grade summary
  gs.attendance_score,
  gs.weighted_total,
  gs.letter_grade,
  gs.attendance_percentage,
  gs.sync_status
FROM enrollments e
JOIN class_details cd ON e.class_id = cd.id
LEFT JOIN grade_summaries gs ON gs.student_id = e.student_id AND gs.class_id = cd.id;

-- View: Assignment with submission status for a student
CREATE VIEW assignment_with_status WITH (security_invoker = true) AS
SELECT
  a.*,
  sub.id AS submission_id,
  sub.student_id,
  sub.submitted_at,
  sub.score AS submission_score,
  sub.final_score AS submission_final_score,
  sub.status AS submission_status,
  sub.is_late,
  -- Computed
  CASE
    WHEN sub.id IS NULL AND a.due_date < NOW() THEN 'missing'
    WHEN sub.id IS NULL THEN 'not_submitted'
    WHEN sub.graded_at IS NOT NULL THEN 'graded'
    ELSE 'submitted'
  END AS display_status
FROM assignments a
LEFT JOIN submissions sub ON sub.assignment_id = a.id;

-- ============================================================
-- SECTION 13: SEED DATA (Reference + Demo)
-- ============================================================

-- Seed: Faculty
INSERT INTO faculties (code, name, dean_name, description) VALUES
  ('FTI', 'Fakultas Teknologi Informasi', 'Dr. Ahmad Wijaya, M.Kom', 'Fakultas yang mengelola program studi di bidang teknologi informasi'),
  ('FEB', 'Fakultas Ekonomi dan Bisnis', 'Dr. Siti Rahayu, M.M', 'Fakultas yang mengelola program studi ekonomi dan bisnis');

-- Seed: Study Programs
INSERT INTO study_programs (faculty_id, code, name, degree_level, accreditation) VALUES
  ((SELECT id FROM faculties WHERE code = 'FTI'), 'S1-TI', 'S1 Teknik Informatika', 'S1', 'B'),
  ((SELECT id FROM faculties WHERE code = 'FTI'), 'S1-SI', 'S1 Sistem Informasi', 'S1', 'B'),
  ((SELECT id FROM faculties WHERE code = 'FTI'), 'D3-MI', 'D3 Manajemen Informatika', 'D3', 'B'),
  ((SELECT id FROM faculties WHERE code = 'FEB'), 'S1-AK', 'S1 Akuntansi', 'S1', 'C');

-- Seed: Academic Semesters
INSERT INTO academic_semesters (code, name, academic_year, semester_type, start_date, end_date, is_active) VALUES
  ('20251', 'Semester Ganjil 2025/2026', '2025/2026', 'Ganjil', '2025-09-01', '2026-01-31', FALSE),
  ('20252', 'Semester Genap 2025/2026', '2025/2026', 'Genap', '2026-02-01', '2026-06-30', TRUE),
  ('20241', 'Semester Ganjil 2024/2025', '2024/2025', 'Ganjil', '2024-09-01', '2025-01-31', FALSE),
  ('20242', 'Semester Genap 2024/2025', '2024/2025', 'Genap', '2025-02-01', '2025-06-30', FALSE);

-- Seed: Rooms
INSERT INTO rooms (code, name, capacity, room_type, building, floor) VALUES
  ('R201', 'Ruang Kelas 201', 40, 'classroom', 'Gedung A', 2),
  ('R202', 'Ruang Kelas 202', 40, 'classroom', 'Gedung A', 2),
  ('R301', 'Ruang Kelas 301', 35, 'classroom', 'Gedung A', 3),
  ('LAB-A', 'Lab Komputer A', 30, 'laboratory', 'Gedung B', 1),
  ('LAB-B', 'Lab Komputer B', 30, 'laboratory', 'Gedung B', 1),
  ('AULA', 'Aula Utama', 200, 'seminar', 'Gedung Utama', 1);

-- Seed: Courses (S1 Sistem Informasi)
INSERT INTO courses (study_program_id, code, name, credits, semester_order, description) VALUES
  -- Semester 1
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI101', 'Algoritma dan Pemrograman', 3, 1, 'Dasar-dasar algoritma dan pemrograman menggunakan Python'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI102', 'Basis Data', 3, 1, 'Konsep dan implementasi sistem basis data relasional'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI103', 'Matematika Diskrit', 2, 1, 'Matematika untuk ilmu komputer'),
  -- Semester 2
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI201', 'Struktur Data', 3, 2, 'Struktur data dan algoritma lanjutan'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI202', 'Pemrograman Berorientasi Objek', 3, 2, 'OOP menggunakan Java'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI203', 'Jaringan Komputer', 3, 2, 'Dasar jaringan komputer dan protokol'),
  -- Semester 3
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI301', 'Pemrograman Web', 3, 3, 'Pengembangan aplikasi web modern dengan HTML, CSS, JavaScript, dan framework'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI302', 'Rekayasa Perangkat Lunak', 3, 3, 'Metode dan proses pengembangan perangkat lunak'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI303', 'Sistem Informasi', 3, 3, 'Analisis dan perancangan sistem informasi'),
  -- Semester 4
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI401', 'Pemrograman Web Lanjut', 3, 4, 'Full-stack web development dengan framework modern'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI402', 'Keamanan Sistem Informasi', 3, 4, 'Prinsip dan implementasi keamanan sistem informasi'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI403', 'Data Mining', 3, 4, 'Teknik dan algoritma penambangan data'),
  -- Semester 5
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI501', 'Kecerdasan Buatan', 3, 5, 'Dasar-dasar kecerdasan buatan dan machine learning'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI502', 'Sistem Pendukung Keputusan', 3, 5, 'Metode SPK: AHP, SAW, TOPSIS'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI503', 'Manajemen Proyek TI', 2, 5, 'Manajemen proyek teknologi informasi'),
  -- Semester 6
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI601', 'Cloud Computing', 3, 6, 'Konsep dan implementasi cloud computing'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI602', 'Mobile Development', 3, 6, 'Pengembangan aplikasi mobile Android/iOS'),
  -- Semester 7-8
  ((SELECT id FROM study_programs WHERE code = 'SI-SI'), 'SI701', 'Kerja Praktik', 2, 7, 'Praktek kerja di industri'),
  ((SELECT id FROM study_programs WHERE code = 'S1-SI'), 'SI801', 'Skripsi', 6, 8, 'Tugas akhir mahasiswa');

-- Course prerequisites
INSERT INTO course_prerequisites (course_id, prerequisite_id, min_grade) VALUES
  ((SELECT id FROM courses WHERE code = 'SI201'), (SELECT id FROM courses WHERE code = 'SI101'), 'C'),
  ((SELECT id FROM courses WHERE code = 'SI401'), (SELECT id FROM courses WHERE code = 'SI301'), 'C'),
  ((SELECT id FROM courses WHERE code = 'SI501'), (SELECT id FROM courses WHERE code = 'SI201'), 'C');
