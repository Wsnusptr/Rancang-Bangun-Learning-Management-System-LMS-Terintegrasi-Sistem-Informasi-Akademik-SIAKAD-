-- ============================================================
-- Storage Buckets & Policies for J-Learn LMS
-- Run AFTER schema_lms.sql in Supabase SQL Editor
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('submissions', 'submissions', FALSE, 10485760, -- 10MB
   ARRAY['application/pdf','application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/zip','application/x-zip-compressed',
         'image/jpeg','image/png','image/gif',
         'text/plain','text/csv',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('materials', 'materials', FALSE, 52428800, -- 50MB for course materials
   ARRAY['application/pdf','application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-powerpoint',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'video/mp4','video/webm','image/jpeg','image/png',
         'application/zip','text/plain']),
  ('avatars', 'avatars', TRUE, 2097152, -- 2MB for profile pictures
   ARRAY['image/jpeg','image/png','image/webp','image/gif']);

-- ============================================================
-- STORAGE POLICIES — submissions bucket
-- Path convention: submissions/{student_id}/{assignment_id}/{filename}
-- ============================================================

-- Students can upload to their own folder
CREATE POLICY "submissions_upload_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'submissions' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Students can view their own submissions
CREATE POLICY "submissions_view_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lecturer','admin','staff')
      )
    )
  );

-- Students can delete/update their own submissions (before graded)
CREATE POLICY "submissions_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'submissions' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ============================================================
-- STORAGE POLICIES — materials bucket
-- Path convention: materials/{class_id}/{post_id}/{filename}
-- ============================================================

-- Lecturers can upload materials for their classes
CREATE POLICY "materials_upload_lecturer"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'materials' AND
    EXISTS (
      SELECT 1 FROM classes WHERE id = (storage.foldername(name))[1]::uuid AND lecturer_id = auth.uid()
    )
  );

-- Class members can view materials
CREATE POLICY "materials_view_class_members"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'materials' AND (
      EXISTS (
        SELECT 1 FROM classes WHERE id = (storage.foldername(name))[1]::uuid AND lecturer_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM enrollments WHERE
          class_id = (storage.foldername(name))[1]::uuid AND
          student_id = auth.uid() AND
          status = 'active'
      ) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
    )
  );

-- Lecturers can delete their materials
CREATE POLICY "materials_delete_lecturer"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'materials' AND (
      EXISTS (
        SELECT 1 FROM classes WHERE id = (storage.foldername(name))[1]::uuid AND lecturer_id = auth.uid()
      ) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ============================================================
-- STORAGE POLICIES — avatars bucket (public)
-- ============================================================

CREATE POLICY "avatars_upload_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_view_all"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
