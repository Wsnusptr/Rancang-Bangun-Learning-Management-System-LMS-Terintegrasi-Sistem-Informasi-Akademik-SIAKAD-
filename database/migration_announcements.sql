-- ============================================================
-- J-LEARN & SIAKAD — Migration: Dynamic Announcements
-- Run this in Supabase SQL Editor on the LMS project
-- ============================================================

-- 1. Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category      TEXT NOT NULL,               -- e.g. "Jalur Pendaftaran", "Program Studi", "Biaya & Beasiswa", "Fasilitas"
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  date_info     TEXT,                        -- e.g. "01 Juli – 31 Agustus 2026", or "Akreditasi: Unggul"
  media_url     TEXT,                        -- optional image/video url
  link_url      TEXT,                        -- optional external CTA link
  is_highlight  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for faster sorting/fetching
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_highlight ON public.announcements(is_highlight) WHERE is_highlight = TRUE;

-- 3. Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies
-- Allow anyone (public/authenticated) to read announcements
DROP POLICY IF EXISTS "Allow public read on announcements" ON public.announcements;
CREATE POLICY "Allow public read on announcements"
  ON public.announcements FOR SELECT USING (true);

-- Allow authenticated admins / staff to manage announcements
DROP POLICY IF EXISTS "Allow admins and staff full access to announcements" ON public.announcements;
CREATE POLICY "Allow admins and staff full access to announcements"
  ON public.announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- 5. Seed default announcements
INSERT INTO public.announcements (category, title, description, date_info, is_highlight)
VALUES
  ('Jalur Pendaftaran', 'Pendaftaran Mahasiswa Baru 2025/2026', 'STMIK Jayakarta membuka pendaftaran mahasiswa baru melalui tiga jalur: Reguler, Beasiswa Prestasi, dan Pindahan. Daftarkan diri Anda sebelum batas waktu.', '01 Juli – 31 Agustus 2026', TRUE),
  ('Program Studi', 'S1 Teknik Informatika', 'Program unggulan dengan kurikulum berbasis industri, diajarkan oleh dosen berpengalaman dan bersertifikasi internasional. Fokus pada AI, Cybersecurity, dan Software Engineering.', 'Akreditasi: Unggul (BAN-PT)', FALSE),
  ('Program Studi', 'S1 Sistem Informasi', 'Menggabungkan ilmu bisnis dan teknologi informasi. Lulusan siap berkarir di bidang analisis sistem, manajemen proyek IT, dan pengembangan bisnis digital.', 'Akreditasi: Baik Sekali (BAN-PT)', FALSE),
  ('Biaya & Beasiswa', 'Informasi Biaya Kuliah & Beasiswa', 'Tersedia berbagai skema beasiswa untuk mahasiswa berprestasi akademik maupun non-akademik. Cicilan SPP dapat disesuaikan dengan kemampuan orang tua/wali.', 'Hubungi: PMB@jayakarta.ac.id', FALSE),
  ('Fasilitas', 'Laboratorium & Infrastruktur Kampus', 'Kampus dilengkapi laboratorium komputer berstandar tinggi, perpustakaan digital, co-working space mahasiswa, dan jaringan WiFi di seluruh area kampus.', 'Kampus: Jl. Kampung Baru I No.11, Jakarta', FALSE)
ON CONFLICT DO NOTHING;
