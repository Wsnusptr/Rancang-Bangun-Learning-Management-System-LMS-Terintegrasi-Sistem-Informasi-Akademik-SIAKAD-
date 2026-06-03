-- 1. Pastikan bucket 'materials' ada
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials',
  'materials',
  true,
  52428800, -- 50 MB
  '{image/*,application/pdf,application/zip,application/x-zip-compressed,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/plain}'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Bersihkan policy lama yang mungkin bermasalah (UUID casting error)
DROP POLICY IF EXISTS "Public Access Materials" ON storage.objects;
DROP POLICY IF EXISTS "Lecturer Upload Materials" ON storage.objects;
DROP POLICY IF EXISTS "Lecturer Delete Materials" ON storage.objects;
DROP POLICY IF EXISTS "Lecturer Update Materials" ON storage.objects;

-- 3. Buat policy baru yang aman
-- Gunakan casting ::text jika diperlukan untuk menghindari error UUID

CREATE POLICY "Public Access Materials"
ON storage.objects FOR SELECT
USING ( bucket_id = 'materials' );

CREATE POLICY "Lecturer Upload Materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'materials' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Lecturer Update Materials"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'materials'
  AND (auth.uid())::text = owner::text
);

CREATE POLICY "Lecturer Delete Materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'materials'
  AND (auth.uid())::text = owner::text
);
