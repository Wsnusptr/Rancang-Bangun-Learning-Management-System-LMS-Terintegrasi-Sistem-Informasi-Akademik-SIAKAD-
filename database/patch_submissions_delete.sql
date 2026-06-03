-- ============================================================
-- SQL Patch: Allow Students to Unsubmit (Delete Submission)
-- ============================================================

-- Add DELETE policy for students on the submissions table
-- A student can only delete their own submission, and only if it hasn't been graded yet.
DROP POLICY IF EXISTS "submissions_delete_student" ON public.submissions;
CREATE POLICY "submissions_delete_student"
  ON public.submissions FOR DELETE TO authenticated
  USING (student_id = auth.uid() AND graded_at IS NULL);
