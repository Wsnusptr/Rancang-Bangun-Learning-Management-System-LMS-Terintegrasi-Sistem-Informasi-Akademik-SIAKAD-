-- ============================================================
-- SQL PATCH: Robust and Type-Safe Supabase Storage Policies
-- Run in the Supabase SQL Editor to resolve UUID casting errors
-- ============================================================

-- 1. Safely drop ALL potential old policies on storage.objects to avoid conflicts or duplicate checks
DROP POLICY IF EXISTS "Public Access Materials" ON storage.objects;
DROP POLICY IF EXISTS "Lecturer Upload Materials" ON storage.objects;
DROP POLICY IF EXISTS "Lecturer Delete Materials" ON storage.objects;
DROP POLICY IF EXISTS "Lecturer Update Materials" ON storage.objects;
DROP POLICY IF EXISTS "materials_upload_lecturer" ON storage.objects;
DROP POLICY IF EXISTS "materials_view_class_members" ON storage.objects;
DROP POLICY IF EXISTS "materials_delete_lecturer" ON storage.objects;

DROP POLICY IF EXISTS "submissions_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "submissions_view_own" ON storage.objects;
DROP POLICY IF EXISTS "submissions_delete_own" ON storage.objects;

-- 2. Ensure both buckets exist with proper public visibility settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('materials', 'materials', TRUE, 52428800, 
   ARRAY['application/pdf','application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-powerpoint',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'video/mp4','video/webm','image/jpeg','image/png','image/webp',
         'application/zip','application/x-zip-compressed','text/plain']),
  ('submissions', 'submissions', FALSE, 10485760, 
   ARRAY['application/pdf','application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/zip','application/x-zip-compressed',
         'image/jpeg','image/png','image/gif','image/webp',
         'text/plain','text/csv',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Create bulletproof policies for "materials" bucket
-- Checks if the path segment is a valid UUID before casting it to avoid runtime exceptions.
-- Supports both "{class_id}/..." and "materials/{class_id}/..." paths.

CREATE POLICY "materials_upload_lecturer"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'materials' AND (
      (
        -- Pattern 1: {class_id}/{filename} where segment 1 is a valid UUID
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND EXISTS (
          SELECT 1 FROM classes 
          WHERE id = (storage.foldername(name))[1]::uuid 
          AND lecturer_id = auth.uid()
        )
      ) OR (
        -- Pattern 2: materials/{class_id}/{filename} where segment 2 is a valid UUID
        (storage.foldername(name))[1] = 'materials'
        AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND EXISTS (
          SELECT 1 FROM classes 
          WHERE id = (storage.foldername(name))[2]::uuid 
          AND lecturer_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "materials_view_class_members"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'materials' AND (
      (
        -- Pattern 1: {class_id}/{filename} where segment 1 is a valid UUID
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND (
          EXISTS (
            SELECT 1 FROM classes 
            WHERE id = (storage.foldername(name))[1]::uuid 
            AND lecturer_id = auth.uid()
          ) OR
          EXISTS (
            SELECT 1 FROM enrollments 
            WHERE class_id = (storage.foldername(name))[1]::uuid 
            AND student_id = auth.uid() 
            AND status = 'active'
          )
        )
      ) OR (
        -- Pattern 2: materials/{class_id}/{filename} where segment 2 is a valid UUID
        (storage.foldername(name))[1] = 'materials'
        AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND (
          EXISTS (
            SELECT 1 FROM classes 
            WHERE id = (storage.foldername(name))[2]::uuid 
            AND lecturer_id = auth.uid()
          ) OR
          EXISTS (
            SELECT 1 FROM enrollments 
            WHERE class_id = (storage.foldername(name))[2]::uuid 
            AND student_id = auth.uid() 
            AND status = 'active'
          )
        )
      ) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
    )
  );

CREATE POLICY "materials_delete_lecturer"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'materials' AND (
      (
        -- Pattern 1: {class_id}/{filename} where segment 1 is a valid UUID
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND (
          EXISTS (
            SELECT 1 FROM classes 
            WHERE id = (storage.foldername(name))[1]::uuid 
            AND lecturer_id = auth.uid()
          ) OR
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
      ) OR (
        -- Pattern 2: materials/{class_id}/{filename} where segment 2 is a valid UUID
        (storage.foldername(name))[1] = 'materials'
        AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND (
          EXISTS (
            SELECT 1 FROM classes 
            WHERE id = (storage.foldername(name))[2]::uuid 
            AND lecturer_id = auth.uid()
          ) OR
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
      )
    )
  );

-- 4. Create robust policies for "submissions" bucket
-- Supports both "{student_id}/{assignment_id}/..." and "submissions/{student_id}/{assignment_id}/..." paths.

CREATE POLICY "submissions_upload_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'submissions' AND (
      (
        -- Pattern 1: {student_id}/{assignment_id}/{filename}
        (storage.foldername(name))[1] = auth.uid()::text
      ) OR (
        -- Pattern 2: submissions/{student_id}/{assignment_id}/{filename}
        (storage.foldername(name))[1] = 'submissions'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

CREATE POLICY "submissions_view_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions' AND (
      (
        -- Pattern 1: {student_id}/{assignment_id}/{filename}
        (storage.foldername(name))[1] = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lecturer','admin','staff')
        )
      ) OR (
        -- Pattern 2: submissions/{student_id}/{assignment_id}/{filename}
        ((storage.foldername(name))[1] = 'submissions' AND (storage.foldername(name))[2] = auth.uid()::text) OR
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('lecturer','admin','staff')
        )
      )
    )
  );

CREATE POLICY "submissions_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'submissions' AND (
      (
        -- Pattern 1: {student_id}/{assignment_id}/{filename}
        (storage.foldername(name))[1] = auth.uid()::text OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      ) OR (
        -- Pattern 2: submissions/{student_id}/{assignment_id}/{filename}
        ((storage.foldername(name))[1] = 'submissions' AND (storage.foldername(name))[2] = auth.uid()::text) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );
