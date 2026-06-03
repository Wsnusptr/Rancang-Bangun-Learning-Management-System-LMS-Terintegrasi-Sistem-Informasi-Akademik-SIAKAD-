import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireClassLecturer } from '@/lib/auth'
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: classId } = await params
    const { response } = await requireClassLecturer(classId)
    if (response) return response

    const supabase = await createClient()
    const body = await request.json()
    const { studentId, midterm_score, final_exam_score } = body

    if (!studentId) {
      return errorResponse('Student ID is required', 400)
    }

    // 1. Update the grade_summaries for this specific student
    const { error: updateError } = await supabase
      .from('grade_summaries')
      .update({
        midterm_score: midterm_score !== undefined ? Number(midterm_score) : undefined,
        final_exam_score: final_exam_score !== undefined ? Number(final_exam_score) : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('class_id', classId)
      .eq('student_id', studentId)

    if (updateError) throw updateError

    // 2. Trigger automatic recalculation for the whole class to reflect the new weights instantly
    const { error: rpcError } = await supabase.rpc('recalculate_all_class_grades', {
      p_class_id: classId,
    })

    if (rpcError) throw rpcError

    return successResponse(
      null,
      'Nilai mahasiswa berhasil diperbarui'
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}
