-- ============================================================
-- J-LEARN INTEGRATED ACADEMIC ECOSYSTEM
-- Database Patch: Dosen Backup & Grade Security
-- ============================================================

-- 1. ADD BACKUP LECTURER COLUMN
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS backup_lecturer_id UUID REFERENCES profiles(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_classes_backup_lecturer ON classes(backup_lecturer_id);

-- 2. HELPER FUNCTION FOR LECTURER CHECK
CREATE OR REPLACE FUNCTION public.is_lecturer_or_backup(target_class_id UUID, user_id UUID)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes 
    WHERE id = target_class_id AND (lecturer_id = user_id OR backup_lecturer_id = user_id)
  );
$$;

-- Update helper for 'my lecturer class ids' to include backup classes
CREATE OR REPLACE FUNCTION public.get_my_lecturer_class_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT id FROM classes WHERE lecturer_id = auth.uid() OR backup_lecturer_id = auth.uid();
$$;

-- 3. UPDATE RLS POLICIES FOR CLASSES
DROP POLICY IF EXISTS "classes_select" ON classes;
CREATE POLICY "classes_select"
  ON classes FOR SELECT TO authenticated USING (
    lecturer_id = auth.uid() OR
    backup_lecturer_id = auth.uid() OR
    public.is_admin_user() OR
    id IN (SELECT public.get_my_enrolled_class_ids())
  );

DROP POLICY IF EXISTS "classes_update_lecturer" ON classes;
CREATE POLICY "classes_update_lecturer"
  ON classes FOR UPDATE TO authenticated
  USING (
    lecturer_id = auth.uid() OR
    backup_lecturer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. UPDATE RLS FOR ENROLLMENTS
DROP POLICY IF EXISTS "enrollments_update_lecturer" ON enrollments;
CREATE POLICY "enrollments_update_lecturer"
  ON enrollments FOR UPDATE TO authenticated
  USING (
    public.is_lecturer_or_backup(class_id, auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. UPDATE RLS FOR POSTS
DROP POLICY IF EXISTS "posts_select_class_members" ON posts;
CREATE POLICY "posts_select_class_members"
  ON posts FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM enrollments WHERE class_id = posts.class_id AND student_id = auth.uid() AND status = 'active') OR
    public.is_lecturer_or_backup(class_id, auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

DROP POLICY IF EXISTS "posts_insert_lecturer" ON posts;
CREATE POLICY "posts_insert_lecturer"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    public.is_lecturer_or_backup(class_id, auth.uid())
  );

-- 6. UPDATE RLS FOR ASSIGNMENTS
DROP POLICY IF EXISTS "assignments_select" ON assignments;
CREATE POLICY "assignments_select"
  ON assignments FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM enrollments WHERE class_id = assignments.class_id AND student_id = auth.uid() AND status = 'active') OR
    public.is_lecturer_or_backup(class_id, auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

DROP POLICY IF EXISTS "assignments_insert_lecturer" ON assignments;
CREATE POLICY "assignments_insert_lecturer"
  ON assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_lecturer_or_backup(class_id, auth.uid()));

DROP POLICY IF EXISTS "assignments_update_lecturer" ON assignments;
CREATE POLICY "assignments_update_lecturer"
  ON assignments FOR UPDATE TO authenticated
  USING (public.is_lecturer_or_backup(class_id, auth.uid()));

-- 7. UPDATE RLS FOR SUBMISSIONS
DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select"
  ON submissions FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM assignments a WHERE a.id = assignment_id AND public.is_lecturer_or_backup(a.class_id, auth.uid())) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

DROP POLICY IF EXISTS "submissions_update" ON submissions;
CREATE POLICY "submissions_update"
  ON submissions FOR UPDATE TO authenticated USING (
    student_id = auth.uid() AND graded_at IS NULL OR  -- Student can edit before graded
    EXISTS (SELECT 1 FROM assignments a WHERE a.id = assignment_id AND public.is_lecturer_or_backup(a.class_id, auth.uid())) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 8. UPDATE RLS FOR ATTENDANCE
DROP POLICY IF EXISTS "attendance_sessions_select" ON attendance_sessions;
CREATE POLICY "attendance_sessions_select"
  ON attendance_sessions FOR SELECT TO authenticated USING (
    public.is_lecturer_or_backup(class_id, auth.uid()) OR
    EXISTS (SELECT 1 FROM enrollments WHERE class_id = attendance_sessions.class_id AND student_id = auth.uid() AND status = 'active') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

DROP POLICY IF EXISTS "attendance_sessions_insert_lecturer" ON attendance_sessions;
CREATE POLICY "attendance_sessions_insert_lecturer"
  ON attendance_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_lecturer_or_backup(class_id, auth.uid()));

DROP POLICY IF EXISTS "attendance_sessions_update_lecturer" ON attendance_sessions;
CREATE POLICY "attendance_sessions_update_lecturer"
  ON attendance_sessions FOR UPDATE TO authenticated
  USING (public.is_lecturer_or_backup(class_id, auth.uid()));

DROP POLICY IF EXISTS "attendance_records_select" ON attendance_records;
CREATE POLICY "attendance_records_select"
  ON attendance_records FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM attendance_sessions s WHERE s.id = session_id AND public.is_lecturer_or_backup(s.class_id, auth.uid())) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

DROP POLICY IF EXISTS "attendance_records_update_lecturer" ON attendance_records;
CREATE POLICY "attendance_records_update_lecturer"
  ON attendance_records FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM attendance_sessions s WHERE s.id = session_id AND public.is_lecturer_or_backup(s.class_id, auth.uid())));

-- 9. UPDATE RLS FOR GRADE SUMMARIES
DROP POLICY IF EXISTS "grade_summaries_select" ON grade_summaries;
CREATE POLICY "grade_summaries_select"
  ON grade_summaries FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR
    public.is_lecturer_or_backup(class_id, auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

-- ============================================================
-- 10. STUDENT GRADE FORGERY PREVENTION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_student_grade_forgery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We only restrict updates from students (role = 'student').
  -- Service roles and DB functions bypass this due to context or superuser privileges.
  -- But to be safe, we check if the auth.uid() belongs to a student profile.
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student') THEN
    -- Student is attempting an update. They can ONLY update non-grade fields.
    -- If any grading fields are changed, we raise an exception.
    IF NEW.score IS DISTINCT FROM OLD.score OR 
       NEW.final_score IS DISTINCT FROM OLD.final_score OR 
       NEW.feedback IS DISTINCT FROM OLD.feedback OR
       NEW.graded_by IS DISTINCT FROM OLD.graded_by OR
       NEW.graded_at IS DISTINCT FROM OLD.graded_at 
    THEN
      RAISE EXCEPTION 'Keamanan Sistem: Mahasiswa dilarang mengubah nilai atau feedback tugas (Security Violation).';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_grade_forgery ON submissions;
CREATE TRIGGER trg_prevent_grade_forgery
  BEFORE UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_student_grade_forgery();

-- 11. UPDATE CLASS DETAILS VIEW
DROP VIEW IF EXISTS class_details CASCADE;
CREATE VIEW class_details WITH (security_invoker = true) AS
SELECT
  c.id,
  c.lecturer_id,
  c.backup_lecturer_id,
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
  -- Backup Lecturer info
  bp.name AS backup_lecturer_name,
  bp.avatar_url AS backup_lecturer_avatar,
  -- Room info
  r.code AS room_code,
  r.name AS room_name,
  -- Stats
  (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id AND e.status = 'active') AS enrolled_count,
  (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id AND a.is_published = TRUE) AS assignment_count
FROM classes c
LEFT JOIN courses co ON c.course_id = co.id
LEFT JOIN academic_semesters s ON c.semester_id = s.id
LEFT JOIN rooms r ON c.room_id = r.id
LEFT JOIN profiles p ON c.lecturer_id = p.id
LEFT JOIN profiles bp ON c.backup_lecturer_id = bp.id;

-- 12. RECREATE DEPENDENT VIEWS
CREATE VIEW student_class_overview WITH (security_invoker = true) AS
SELECT
  e.id AS enrollment_id,
  e.student_id,
  e.status AS enrollment_status,
  e.joined_at,
  cd.*,
  gs.attendance_score,
  gs.weighted_total,
  gs.letter_grade,
  gs.attendance_percentage,
  gs.sync_status
FROM enrollments e
JOIN class_details cd ON e.class_id = cd.id
LEFT JOIN grade_summaries gs ON gs.student_id = e.student_id AND gs.class_id = cd.id;
