-- Bucket banner kelas (upload dosen)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'class-covers',
  'class-covers',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "class_covers_upload_lecturer" ON storage.objects;
CREATE POLICY "class_covers_upload_lecturer"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'class-covers' AND
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = (storage.foldername(name))[1]::uuid
      AND lecturer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "class_covers_update_lecturer" ON storage.objects;
CREATE POLICY "class_covers_update_lecturer"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'class-covers' AND
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = (storage.foldername(name))[1]::uuid
      AND lecturer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "class_covers_view_all" ON storage.objects;
CREATE POLICY "class_covers_view_all"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'class-covers');

DROP POLICY IF EXISTS "class_covers_public_read" ON storage.objects;
CREATE POLICY "class_covers_public_read"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'class-covers');
