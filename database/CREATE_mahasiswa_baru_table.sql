-- ============================================================
-- Create mahasiswa_baru table for PMB (Prospective Students)
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mahasiswa_baru (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  google_id       TEXT UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  date_of_birth   DATE,
  address         TEXT,
  phone           TEXT,
  intended_program TEXT,
  enrollment_year  INTEGER DEFAULT extract(year from current_date),
  status          TEXT CHECK (status IN ('registered', 'document_verification', 'accepted', 'rejected', 'enrolled')) DEFAULT 'registered',
  assigned_nim    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER set_mahasiswa_baru_updated_at 
BEFORE UPDATE ON public.mahasiswa_baru
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mb_email ON public.mahasiswa_baru(email);
CREATE INDEX IF NOT EXISTS idx_mb_status ON public.mahasiswa_baru(status);

-- Enable RLS
ALTER TABLE public.mahasiswa_baru ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public insert on mahasiswa_baru" 
ON public.mahasiswa_baru FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on mahasiswa_baru" 
ON public.mahasiswa_baru FOR SELECT USING (true);

CREATE POLICY "Allow public update on mahasiswa_baru" 
ON public.mahasiswa_baru FOR UPDATE USING (true);
