-- Patch: tambah kolom lecturer_id ke view class_details
-- WAJIB: DROP dulu karena CREATE OR REPLACE tidak bisa mengubah urutan/nama kolom view

DROP VIEW IF EXISTS student_class_overview CASCADE;
DROP VIEW IF EXISTS class_details CASCADE;

CREATE VIEW class_details WITH (security_invoker = true) AS
SELECT
  c.id,
  c.lecturer_id,
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
  co.code AS course_code,
  co.name AS course_name,
  co.credits AS course_credits,
  s.name AS semester_name,
  s.academic_year,
  s.semester_type,
  p.name AS lecturer_name,
  p.nip AS lecturer_nip,
  p.avatar_url AS lecturer_avatar,
  r.code AS room_code,
  r.name AS room_name,
  (SELECT COUNT(*)::int FROM enrollments e WHERE e.class_id = c.id AND e.status = 'active') AS enrolled_count,
  (SELECT COUNT(*)::int FROM assignments a WHERE a.class_id = c.id AND a.is_published = TRUE) AS assignment_count
FROM classes c
JOIN courses co ON c.course_id = co.id
JOIN academic_semesters s ON c.semester_id = s.id
JOIN profiles p ON c.lecturer_id = p.id
LEFT JOIN rooms r ON c.room_id = r.id;

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
