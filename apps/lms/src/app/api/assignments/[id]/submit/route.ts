// ============================================================
// POST /api/assignments/[id]/submit - Submit assignment (student)
// GET  /api/assignments/[id]/submit - Get own submission
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { successResponse, errorResponse, serverErrorResponse, isExpired } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, response } = await requireRole('student')
    if (response) return response

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        assignments (id, title, max_score, due_date, type, rubric)
      `)
      .eq('assignment_id', id)
      .eq('student_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return successResponse(data || null)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, response } = await requireRole('student')
    if (response) return response

    const supabase = await createClient()

    // Get assignment details
    const { data: assignment, error: assignErr } = await supabase
      .from('assignments')
      .select(`
        id, class_id, title, due_date, late_submission, late_penalty_pct,
        max_score, allow_file_upload, allowed_file_types, max_file_size_mb, is_published
      `)
      .eq('id', id)
      .single()

    if (assignErr || !assignment) {
      return errorResponse('Tugas tidak ditemukan', 404)
    }

    if (!assignment.is_published) {
      return errorResponse('Tugas belum dipublikasikan', 400)
    }

    // Check enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('class_id', assignment.class_id)
      .eq('student_id', user.id)
      .eq('status', 'active')
      .single()

    if (!enrollment) {
      return errorResponse('Anda tidak terdaftar di kelas ini', 403)
    }

    // Check deadline
    const isLate = assignment.due_date ? isExpired(assignment.due_date) : false

    if (isLate && !assignment.late_submission) {
      return errorResponse(
        `Deadline pengumpulan sudah lewat (${new Date(assignment.due_date!).toLocaleDateString('id-ID')})`,
        400
      )
    }

    // Check existing submission
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select('id, graded_at, attempt_number')
      .eq('assignment_id', id)
      .eq('student_id', user.id)
      .single()

    if (existingSubmission?.graded_at) {
      return errorResponse('Tugas sudah dinilai, tidak dapat diubah', 400)
    }

    // Parse body (could be JSON for text submission or check for file_url)
    const body = await request.json()
    const { content, fileUrl, fileName, fileSize, fileType } = body

    if (!content && !fileUrl) {
      return errorResponse('Konten atau file tugas wajib diisi', 422)
    }

    // Calculate late penalty (if late)
    let latePenaltyApplied = 0
    if (isLate && assignment.late_penalty_pct) {
      const daysLate = Math.ceil(
        (Date.now() - new Date(assignment.due_date!).getTime()) / (1000 * 60 * 60 * 24)
      )
      latePenaltyApplied = Math.min(assignment.late_penalty_pct * daysLate, 100)
    }

    let submission
    if (existingSubmission) {
      // Update existing submission
      const { data, error } = await supabase
        .from('submissions')
        .update({
          content: content || null,
          file_url: fileUrl || null,
          file_name: fileName || null,
          file_size: fileSize || null,
          file_type: fileType || null,
          is_late: isLate,
          submitted_at: new Date().toISOString(),
          attempt_number: existingSubmission.attempt_number + 1,
          status: 'submitted',
          score: null, // Reset grade on resubmit
          graded_at: null,
        })
        .eq('id', existingSubmission.id)
        .select()
        .single()

      if (error) throw error
      submission = data
    } else {
      // Create new submission
      const { data, error } = await supabase
        .from('submissions')
        .insert({
          assignment_id: id,
          student_id: user.id,
          content: content || null,
          file_url: fileUrl || null,
          file_name: fileName || null,
          file_size: fileSize || null,
          file_type: fileType || null,
          is_late: isLate,
          attempt_number: 1,
          status: 'submitted',
        })
        .select()
        .single()

      if (error) throw error
      submission = data
    }

    return successResponse(
      { ...submission, latePenaltyApplied, isLate },
      isLate
        ? `Tugas berhasil dikumpulkan (terlambat - penalti ${latePenaltyApplied}%)`
        : 'Tugas berhasil dikumpulkan',
      undefined,
      201
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, response } = await requireRole('student')
    if (response) return response

    const supabase = await createClient()

    // Get submission to check if graded
    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .select('id, graded_at')
      .eq('assignment_id', id)
      .eq('student_id', user.id)
      .single()

    if (subErr || !submission) {
      return errorResponse('Tugas belum diserahkan', 404)
    }

    if (submission.graded_at) {
      return errorResponse('Tugas sudah dinilai, tidak dapat dibatalkan', 400)
    }

    // Delete submission
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submission.id)

    if (error) throw error

    return successResponse(null, 'Penyerahan tugas berhasil dibatalkan')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
