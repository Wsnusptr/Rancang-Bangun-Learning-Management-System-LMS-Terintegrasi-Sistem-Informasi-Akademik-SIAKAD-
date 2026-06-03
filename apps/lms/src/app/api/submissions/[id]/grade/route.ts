// ============================================================
// PATCH /api/submissions/[id]/grade - Grade a submission (lecturer)
// GET   /api/submissions/[id]/grade - Get submission detail
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  calculateLetterGrade,
} from '@/lib/utils'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, response } = await requireAuth()
    if (response) return response

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        profiles!submissions_student_id_fkey (id, name, nim, avatar_url),
        profiles!submissions_graded_by_fkey (id, name),
        assignments (
          id, title, max_score, type, rubric, late_penalty_pct,
          classes (id, class_name, lecturer_id)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) return notFoundResponse('Submission')

    // Access check
    const isOwner = data.student_id === user.id
    const isLecturer = (data.assignments as { classes: { lecturer_id: string } })?.classes?.lecturer_id === user.id
    const isAdmin = user.role === 'admin'

    if (!isOwner && !isLecturer && !isAdmin) {
      return errorResponse('Akses ditolak', 403)
    }

    return successResponse(data)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

const gradeSchema = z.object({
  score: z.number().min(0, 'Nilai tidak boleh negatif'),
  feedback: z.string().max(2000).optional().nullable(),
  status: z.enum(['graded', 'returned', 'revision_requested']).default('graded'),
})

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, response } = await requireAuth()
    if (response) return response

    if (user.role !== 'lecturer' && user.role !== 'admin') {
      return errorResponse('Hanya dosen yang dapat memberikan nilai', 403)
    }

    const body = await request.json()
    const parsed = gradeSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e: any) => e.message).join(', '),
        422
      )
    }

    const supabase = await createClient()

    // Get submission with assignment info
    const { data: submission } = await supabase
      .from('submissions')
      .select(`
        id, student_id, is_late, assignment_id,
        assignments (
          max_score, late_penalty_pct, class_id,
          classes (lecturer_id)
        )
      `)
      .eq('id', id)
      .single()

    if (!submission) return notFoundResponse('Submission')

    const assignment = submission.assignments as any

    // Verify lecturer owns this class
    if (user.role === 'lecturer' && assignment.classes.lecturer_id !== user.id) {
      return errorResponse('Anda bukan pengajar kelas ini', 403)
    }

    const { score, feedback, status } = parsed.data

    // Validate max score
    if (score > assignment.max_score) {
      return errorResponse(
        `Nilai tidak boleh melebihi nilai maksimum (${assignment.max_score})`,
        422
      )
    }

    // Calculate final score (apply late penalty if applicable)
    let finalScore = score
    if (submission.is_late && assignment.late_penalty_pct > 0) {
      finalScore = score * (1 - assignment.late_penalty_pct / 100)
      finalScore = Math.max(0, Math.round(finalScore * 100) / 100)
    }

    const { data: updated, error } = await supabase
      .from('submissions')
      .update({
        score,
        final_score: finalScore,
        feedback: feedback || null,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        status,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Notify student
    const { letter } = calculateLetterGrade((finalScore / assignment.max_score) * 100)

    const { data: classInfo } = await supabase
      .from('classes')
      .select('class_name')
      .eq('id', assignment.class_id)
      .single()

    const adminClient = createAdminClient()
    await adminClient.from('notifications').insert({
      user_id: submission.student_id,
      type: 'assignment_graded',
      title: 'Tugas Telah Dinilai',
      message: `Nilai kamu: ${finalScore}/${assignment.max_score} (${letter}) di ${classInfo?.class_name || 'kelas'}`,
      related_class_id: assignment.class_id,
      related_assignment_id: submission.assignment_id,
      action_url: `/class/${assignment.class_id}/grades`,
    })

    // Trigger grade summary recalculation
    await recalculateGradeSummary(supabase, submission.student_id, assignment.class_id)

    return successResponse(
      { ...updated, finalScore },
      `Nilai berhasil disimpan. Nilai akhir: ${finalScore}`
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}

// Recalculate grade summary for a student in a class
async function recalculateGradeSummary(
  supabase: any,
  studentId: string,
  classId: string
) {
  try {
    // Get class weights
    const { data: cls } = await supabase
      .from('classes')
      .select('weight_attendance, weight_assignments, weight_quiz, weight_midterm, weight_final')
      .eq('id', classId)
      .single()

    if (!cls) return

    // Get all graded submissions for this student in this class
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        final_score, score,
        assignments!inner (type, max_score, class_id)
      `)
      .eq('student_id', studentId)
      .not('graded_at', 'is', null)

    // Filter to this class
    const classSubmissions = submissions?.filter(
      (s: { assignments: { class_id: string } }) => s.assignments.class_id === classId
    ) || []

    // Calculate per-type averages
    const byType = {
      homework: [] as number[],
      quiz: [] as number[],
      project: [] as number[],
      midterm: null as number | null,
      final: null as number | null,
    }

    for (const sub of classSubmissions) {
      const a = sub.assignments as { type: string; max_score: number }
      const normalizedScore = ((sub.final_score || sub.score || 0) / a.max_score) * 100

      if (a.type === 'homework' || a.type === 'practice') byType.homework.push(normalizedScore)
      else if (a.type === 'quiz') byType.quiz.push(normalizedScore)
      else if (a.type === 'project') byType.homework.push(normalizedScore)
      else if (a.type === 'midterm') byType.midterm = normalizedScore
      else if (a.type === 'final') byType.final = normalizedScore
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    const assignmentScore = avg(byType.homework)
    const quizScore = avg(byType.quiz)

    // Get attendance
    const { data: gradeSummary } = await supabase
      .from('grade_summaries')
      .select('attendance_score, attendance_percentage, total_sessions, attended_sessions')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .single()

    const attendanceScore = gradeSummary?.attendance_score || 0
    const midtermScore = byType.midterm || 0
    const finalExamScore = byType.final || 0

    const weightedTotal =
      (attendanceScore * cls.weight_attendance) / 100 +
      (assignmentScore * cls.weight_assignments) / 100 +
      (quizScore * cls.weight_quiz) / 100 +
      (midtermScore * cls.weight_midterm) / 100 +
      (finalExamScore * cls.weight_final) / 100

    const { letter, gradePoints } = calculateLetterGrade(weightedTotal)

    await supabase
      .from('grade_summaries')
      .upsert({
        student_id: studentId,
        class_id: classId,
        assignment_score: Math.round(assignmentScore * 100) / 100,
        quiz_score: Math.round(quizScore * 100) / 100,
        midterm_score: midtermScore,
        final_exam_score: finalExamScore,
        weighted_total: Math.round(weightedTotal * 100) / 100,
        letter_grade: letter,
        grade_points: gradePoints,
        calculated_at: new Date().toISOString(),
      })
      .eq('student_id', studentId)

  } catch (err) {
    console.error('[Grade Recalculation Error]', err)
  }
}
