import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireClassLecturer } from '@/lib/auth'
import { successResponse, serverErrorResponse } from '@/lib/utils'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: classId } = await params
    const { response } = await requireClassLecturer(classId)
    if (response) return response

    const supabase = await createClient()
    const { updates } = await request.json()

    if (!updates || !Array.isArray(updates)) {
      return serverErrorResponse(new Error('Invalid updates format'))
    }

    // 1. Get or Create Assignments for Midterm & Final Exam
    let { data: assignments } = await supabase
      .from('assignments')
      .select('id, type')
      .eq('class_id', classId)
      .in('type', ['midterm', 'final'])

    let midtermAssignment = assignments?.find(a => a.type === 'midterm')
    let finalAssignment = assignments?.find(a => a.type === 'final')

    if (!midtermAssignment) {
      const { data } = await supabase.from('assignments').insert({
        class_id: classId,
        title: 'Ujian Tengah Semester',
        type: 'midterm',
        max_score: 100,
        is_published: true
      }).select().single()
      midtermAssignment = data
    }

    if (!finalAssignment) {
      const { data } = await supabase.from('assignments').insert({
        class_id: classId,
        title: 'Ujian Akhir Semester',
        type: 'final',
        max_score: 100,
        is_published: true
      }).select().single()
      finalAssignment = data
    }

    // 2. Process updates
    // By upserting into submissions, the DB trigger `on_submission_change` will automatically
    // recalculate the student's grade properly and persistently.
    for (const update of updates) {
      const promises = []

      // Process Midterm
      if (update.midterm_score !== undefined && midtermAssignment) {
        if (update.midterm_score === '') {
          promises.push(
            supabase.from('submissions').delete()
              .eq('assignment_id', midtermAssignment.id)
              .eq('student_id', update.studentId)
          )
        } else {
          promises.push(
            supabase.from('submissions').upsert({
              assignment_id: midtermAssignment.id,
              student_id: update.studentId,
              score: Number(update.midterm_score),
              final_score: Number(update.midterm_score),
              status: 'graded',
              submitted_at: new Date().toISOString()
            }, { onConflict: 'assignment_id,student_id' })
          )
        }
      }

      // Process Final Exam
      if (update.final_exam_score !== undefined && finalAssignment) {
        if (update.final_exam_score === '') {
          promises.push(
            supabase.from('submissions').delete()
              .eq('assignment_id', finalAssignment.id)
              .eq('student_id', update.studentId)
          )
        } else {
          promises.push(
            supabase.from('submissions').upsert({
              assignment_id: finalAssignment.id,
              student_id: update.studentId,
              score: Number(update.final_exam_score),
              final_score: Number(update.final_exam_score),
              status: 'graded',
              submitted_at: new Date().toISOString()
            }, { onConflict: 'assignment_id,student_id' })
          )
        }
      }

      // Execute submissions updates
      if (promises.length > 0) {
        await Promise.all(promises)
      }
    }

    // Since on_submission_change trigger recalculates the grade for each student individually,
    // we don't strictly need to run `recalculate_all_class_grades`, but we can run it just in case
    // to ensure the class weights are fully applied for everyone.
    const { error: rpcError } = await supabase.rpc('recalculate_all_class_grades', {
      p_class_id: classId,
    })

    if (rpcError) throw rpcError

    return successResponse(
      null,
      'Semua perubahan nilai berhasil disimpan!'
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}
