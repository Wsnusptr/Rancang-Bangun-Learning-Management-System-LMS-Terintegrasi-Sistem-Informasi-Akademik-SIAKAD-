-- Fix Supabase Lint: 0010_security_definer_view
-- Modifikasi views publik agar menggunakan Security Invoker (menghargai RLS user yang login)

ALTER VIEW public.class_details SET (security_invoker = true);
ALTER VIEW public.student_class_overview SET (security_invoker = true);
ALTER VIEW public.assignment_with_status SET (security_invoker = true);
ALTER VIEW public.student_grade_summary SET (security_invoker = true);
ALTER VIEW public.course_grade_distribution SET (security_invoker = true);
