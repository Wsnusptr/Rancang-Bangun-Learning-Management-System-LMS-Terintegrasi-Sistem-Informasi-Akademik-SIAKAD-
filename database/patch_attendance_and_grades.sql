-- ============================================================
-- SQL Patch: Fix Manual Attendance Checkin & Automatic Grading
-- ============================================================

-- 1. Attendance Records RLS Policies
-- Allow Lecturers to manually insert attendance records for students in their classes
DROP POLICY IF EXISTS "attendance_records_insert_lecturer" ON public.attendance_records;
CREATE POLICY "attendance_records_insert_lecturer"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = session_id AND c.lecturer_id = auth.uid()
    )
  );

-- Allow Lecturers to manually delete attendance records in their classes (e.g. reset/undo)
DROP POLICY IF EXISTS "attendance_records_delete_lecturer" ON public.attendance_records;
CREATE POLICY "attendance_records_delete_lecturer"
  ON public.attendance_records FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = session_id AND c.lecturer_id = auth.uid()
    )
  );


-- 2. Grade Recalculation Engine
-- Security definer function to recalculate all grades for a single student in a class
CREATE OR REPLACE FUNCTION public.recalculate_student_grade(p_student_id UUID, p_class_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_sessions INT := 0;
  v_attended_sessions INT := 0;
  v_attendance_percentage DECIMAL := 0;
  v_attendance_score DECIMAL := 0;
  
  v_assignment_score DECIMAL := 0;
  v_quiz_score DECIMAL := 0;
  v_midterm_score DECIMAL := 0;
  v_final_score DECIMAL := 0;
  
  v_w_att DECIMAL := 0;
  v_w_asg DECIMAL := 0;
  v_w_qz DECIMAL := 0;
  v_w_mid DECIMAL := 0;
  v_w_fin DECIMAL := 0;
  
  v_weighted_total DECIMAL := 0;
  v_letter_grade TEXT := 'E';
  v_grade_points DECIMAL := 0.0;
BEGIN
  -- A. Fetch class component weights
  SELECT 
    COALESCE(weight_attendance, 0),
    COALESCE(weight_assignments, 0),
    COALESCE(weight_quiz, 0),
    COALESCE(weight_midterm, 0),
    COALESCE(weight_final, 0)
  INTO v_w_att, v_w_asg, v_w_qz, v_w_mid, v_w_fin
  FROM classes
  WHERE id = p_class_id;

  -- B. Calculate attendance percentage and score (Set to 14 meetings for standard Jayakarta university semester)
  v_total_sessions := 14;

  SELECT COUNT(*) INTO v_attended_sessions
  FROM attendance_records r
  JOIN attendance_sessions s ON r.session_id = s.id
  WHERE s.class_id = p_class_id
    AND r.student_id = p_student_id
    AND r.status IN ('present', 'late', 'excused');

  v_attendance_percentage := (v_attended_sessions::DECIMAL / v_total_sessions);
  v_attendance_score := v_attendance_percentage * 100;

  -- C. Calculate assignment average (homework, practice, project)
  SELECT COALESCE(AVG((COALESCE(s.final_score, s.score, 0) / a.max_score) * 100), 0)
  INTO v_assignment_score
  FROM submissions s
  JOIN assignments a ON s.assignment_id = a.id
  WHERE a.class_id = p_class_id
    AND s.student_id = p_student_id
    AND s.status = 'graded'
    AND a.type IN ('homework', 'practice', 'project');

  -- D. Calculate quiz average
  SELECT COALESCE(AVG((COALESCE(s.final_score, s.score, 0) / a.max_score) * 100), 0)
  INTO v_quiz_score
  FROM submissions s
  JOIN assignments a ON s.assignment_id = a.id
  WHERE a.class_id = p_class_id
    AND s.student_id = p_student_id
    AND s.status = 'graded'
    AND a.type = 'quiz';

  -- E. Calculate midterm high-score (normalized to 100 scale)
  SELECT COALESCE(MAX((COALESCE(s.final_score, s.score, 0) / a.max_score) * 100), 0)
  INTO v_midterm_score
  FROM submissions s
  JOIN assignments a ON s.assignment_id = a.id
  WHERE a.class_id = p_class_id
    AND s.student_id = p_student_id
    AND s.status = 'graded'
    AND a.type = 'midterm';

  -- F. Calculate final exam high-score (normalized to 100 scale)
  SELECT COALESCE(MAX((COALESCE(s.final_score, s.score, 0) / a.max_score) * 100), 0)
  INTO v_final_score
  FROM submissions s
  JOIN assignments a ON s.assignment_id = a.id
  WHERE a.class_id = p_class_id
    AND s.student_id = p_student_id
    AND s.status = 'graded'
    AND a.type = 'final';

  -- G. Compute weighted total score
  v_weighted_total := 
    (v_attendance_score * v_w_att) / 100 +
    (v_assignment_score * v_w_asg) / 100 +
    (v_quiz_score * v_w_qz) / 100 +
    (v_midterm_score * v_w_mid) / 100 +
    (v_final_score * v_w_fin) / 100;

  v_weighted_total := ROUND(v_weighted_total, 2);

  -- H. Determine letter grade and grade points
  SELECT letter, grade_points INTO v_letter_grade, v_grade_points
  FROM calculate_letter_grade(v_weighted_total);

  -- I. Upsert results into grade_summaries
  INSERT INTO grade_summaries (
    student_id, class_id, 
    attendance_score, assignment_score, quiz_score, 
    midterm_score, final_exam_score, weighted_total, 
    letter_grade, grade_points, 
    total_sessions, attended_sessions, attendance_percentage,
    sync_status, updated_at, calculated_at
  )
  VALUES (
    p_student_id, p_class_id,
    ROUND(v_attendance_score, 2), ROUND(v_assignment_score, 2), ROUND(v_quiz_score, 2),
    ROUND(v_midterm_score, 2), ROUND(v_final_score, 2), v_weighted_total,
    v_letter_grade, v_grade_points,
    v_total_sessions, v_attended_sessions, v_attendance_percentage,
    'pending', NOW(), NOW()
  )
  ON CONFLICT (student_id, class_id) DO UPDATE
  SET
    attendance_score = EXCLUDED.attendance_score,
    assignment_score = EXCLUDED.assignment_score,
    quiz_score = EXCLUDED.quiz_score,
    midterm_score = EXCLUDED.midterm_score,
    final_exam_score = EXCLUDED.final_exam_score,
    weighted_total = EXCLUDED.weighted_total,
    letter_grade = EXCLUDED.letter_grade,
    grade_points = EXCLUDED.grade_points,
    total_sessions = EXCLUDED.total_sessions,
    attended_sessions = EXCLUDED.attended_sessions,
    attendance_percentage = EXCLUDED.attendance_percentage,
    sync_status = 'pending',
    updated_at = NOW(),
    calculated_at = NOW();
END;
$$;

-- Global function to trigger recalculation for all active students in a class
CREATE OR REPLACE FUNCTION public.recalculate_all_class_grades(p_class_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_student RECORD;
BEGIN
  -- First ensure grade_summary exists for all active enrollments
  INSERT INTO grade_summaries (student_id, class_id)
  SELECT student_id, class_id 
  FROM enrollments 
  WHERE class_id = p_class_id AND status = 'active'
  ON CONFLICT (student_id, class_id) DO NOTHING;

  -- Then recalculate for each student
  FOR r_student IN (
    SELECT student_id 
    FROM enrollments 
    WHERE class_id = p_class_id AND status = 'active'
  ) LOOP
    PERFORM recalculate_student_grade(r_student.student_id, p_class_id);
  END LOOP;
END;
$$;


-- 3. Automatic Synchronization Triggers
-- A. Trigger for Attendance changes
CREATE OR REPLACE FUNCTION public.trg_on_attendance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id UUID;
  v_student_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT class_id INTO v_class_id FROM attendance_sessions WHERE id = OLD.session_id;
    v_student_id := OLD.student_id;
  ELSE
    SELECT class_id INTO v_class_id FROM attendance_sessions WHERE id = NEW.session_id;
    v_student_id := NEW.student_id;
  END IF;

  IF v_class_id IS NOT NULL AND v_student_id IS NOT NULL THEN
    PERFORM recalculate_student_grade(v_student_id, v_class_id);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_attendance_change ON public.attendance_records;
CREATE TRIGGER on_attendance_change
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_on_attendance_change();

-- B. Trigger for Submission grade changes
CREATE OR REPLACE FUNCTION public.trg_on_submission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id UUID;
  v_student_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT class_id INTO v_class_id FROM assignments WHERE id = OLD.assignment_id;
    v_student_id := OLD.student_id;
  ELSE
    SELECT class_id INTO v_class_id FROM assignments WHERE id = NEW.assignment_id;
    v_student_id := NEW.student_id;
  END IF;

  IF v_class_id IS NOT NULL AND v_student_id IS NOT NULL THEN
    PERFORM recalculate_student_grade(v_student_id, v_class_id);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_submission_change ON public.submissions;
CREATE TRIGGER on_submission_change
  AFTER INSERT OR UPDATE OR DELETE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_on_submission_change();

-- C. Trigger for Session modifications (e.g. deleting/adding a session changes total meetings)
CREATE OR REPLACE FUNCTION public.trg_on_session_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id UUID;
  r_student RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_class_id := OLD.class_id;
  ELSE
    v_class_id := NEW.class_id;
  END IF;

  IF v_class_id IS NOT NULL THEN
    FOR r_student IN (SELECT student_id FROM enrollments WHERE class_id = v_class_id AND status = 'active') LOOP
      PERFORM recalculate_student_grade(r_student.student_id, v_class_id);
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_session_change ON public.attendance_sessions;
CREATE TRIGGER on_session_change
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.trg_on_session_change();
