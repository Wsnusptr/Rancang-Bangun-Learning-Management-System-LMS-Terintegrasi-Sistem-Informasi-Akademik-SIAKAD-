-- ============================================================
-- Fix: infinite recursion RLS antara classes <-> enrollments
-- Jalankan sekali di Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_lecturer_class_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM classes WHERE lecturer_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_enrolled_class_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT class_id FROM enrollments
  WHERE student_id = auth.uid() AND status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_lecturer_class_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_enrolled_class_ids() TO authenticated;

-- ---- CLASSES ----
DROP POLICY IF EXISTS "classes_select" ON classes;
CREATE POLICY "classes_select"
  ON classes FOR SELECT TO authenticated
  USING (
    lecturer_id = auth.uid()
    OR public.is_admin_user()
    OR id IN (SELECT public.get_my_enrolled_class_ids())
  );

-- ---- ENROLLMENTS ----
DROP POLICY IF EXISTS "enrollments_select" ON enrollments;
CREATE POLICY "enrollments_select"
  ON enrollments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_admin_user()
    OR class_id IN (SELECT public.get_my_lecturer_class_ids())
  );
