-- Fix: trigger enrollment gagal karena RLS grade_summaries (42501)
-- Jalankan sekali di Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO grade_summaries (student_id, class_id)
  VALUES (NEW.student_id, NEW.class_id)
  ON CONFLICT (student_id, class_id) DO NOTHING;
  RETURN NEW;
END;
$$;
