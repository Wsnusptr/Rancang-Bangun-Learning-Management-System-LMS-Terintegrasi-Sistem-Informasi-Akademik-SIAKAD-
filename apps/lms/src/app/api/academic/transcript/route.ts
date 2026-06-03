// ============================================================
// /api/academic/transcript - Student Academic Transcript API
// ============================================================

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { successResponse, serverErrorResponse } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireRole('student')
    if (response) return response

    const admin = createAdminClient()

    // 1. Fetch grade summaries with detailed relationships
    const { data: grades, error } = await admin
      .from('grade_summaries')
      .select(`
        id, attendance_score, assignment_score, quiz_score, midterm_score, final_exam_score, weighted_total, letter_grade, grade_points,
        classes (
          id, class_code, class_name, class_section,
          courses (id, code, name, credits),
          profiles!classes_lecturer_id_fkey (id, name),
          academic_semesters (id, name, academic_year, semester_type)
        )
      `)
      .eq('student_id', user.id)

    if (error) throw error

    // 2. Transform the records into a highly readable and clean transcript format
    const transcript = (grades || []).map((g: any) => {
      const cls = g.classes || {}
      const course = cls.courses || {}
      const lecturer = cls.profiles || {}
      const sem = cls.academic_semesters || {}

      return {
        id: g.id,
        classId: cls.id,
        classCode: cls.class_code || '-',
        className: cls.class_name || '-',
        classSection: cls.class_section || '-',
        courseId: course.id,
        courseCode: course.code || '-',
        courseName: course.name || '-',
        credits: course.credits || 3,
        lecturerName: lecturer.name || 'Dosen Pengampu',
        semesterId: sem.id,
        semesterName: sem.name || 'Unknown Semester',
        academicYear: sem.academic_year || 'Unknown Year',
        semesterType: sem.semester_type || 'Unknown Type',
        scores: {
          attendance: g.attendance_score != null ? parseFloat(g.attendance_score) : 0,
          assignment: g.assignment_score != null ? parseFloat(g.assignment_score) : 0,
          quiz: g.quiz_score != null ? parseFloat(g.quiz_score) : 0,
          midterm: g.midterm_score != null ? parseFloat(g.midterm_score) : 0,
          final: g.final_exam_score != null ? parseFloat(g.final_exam_score) : 0,
        },
        finalScore: g.weighted_total != null ? parseFloat(g.weighted_total) : 0,
        letterGrade: g.letter_grade || null,
        gradePoints: g.grade_points != null ? parseFloat(g.grade_points) : null,
      }
    })

    return successResponse(transcript, 'Transkrip akademik berhasil dimuat.')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
