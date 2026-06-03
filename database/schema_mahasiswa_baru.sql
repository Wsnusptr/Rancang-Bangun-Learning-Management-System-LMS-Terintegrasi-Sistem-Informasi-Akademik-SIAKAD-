-- ============================================================
-- J-LEARN INTEGRATED ACADEMIC ECOSYSTEM — STMIK JAYAKARTA
-- Supabase SQL Schema Extension — SIAKAD DUMMY
-- Database: jlearn-siakad-dummy (Supabase Project #2)
-- Table: mahasiswa_baru (Prospective Students / Guests)
-- ============================================================

CREATE TABLE IF NOT EXISTS mahasiswa_baru (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Identify via Google Auth if applicable
  google_id       TEXT UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  
  -- Personal Details
  date_of_birth   DATE,
  address         TEXT,
  phone           TEXT,
  
  -- Academic Intent
  intended_program TEXT, -- e.g., 'S1-TI', 'S1-SI'
  enrollment_year  INTEGER DEFAULT extract(year from current_date),
  
  -- Status flow
  status          TEXT CHECK (status IN ('registered', 'document_verification', 'accepted', 'rejected', 'enrolled')) DEFAULT 'registered',
  
  -- Once enrolled and fully verified, they get a NIM
  assigned_nim    TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Helper trigger to update updated_at if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END
$$;

DROP TRIGGER IF EXISTS set_mahasiswa_baru_updated_at ON mahasiswa_baru;
CREATE TRIGGER set_mahasiswa_baru_updated_at BEFORE UPDATE ON mahasiswa_baru
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_mb_email ON mahasiswa_baru(email);
CREATE INDEX idx_mb_status ON mahasiswa_baru(status);

-- Enable RLS
ALTER TABLE mahasiswa_baru ENABLE ROW LEVEL SECURITY;

-- Allow system or admin to view/insert
CREATE POLICY "mahasiswa_baru_public_insert" ON mahasiswa_baru FOR INSERT WITH CHECK (true);
CREATE POLICY "mahasiswa_baru_select" ON mahasiswa_baru FOR SELECT USING (true);
CREATE POLICY "mahasiswa_baru_update" ON mahasiswa_baru FOR UPDATE USING (true);
