// ============================================================
// GET  /api/classes/[id]/gradebook - Get grade summaries for class
// POST /api/classes/[id]/gradebook - Recalculate all grade summaries
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireClassLecturer } from '@/lib/auth'
import { successResponse, serverErrorResponse } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { response } = await requireClassLecturer(id)
    if (response) return response

    const supabase = await createClient()

    // Fetch all data concurrently using Promise.all to prevent sequential database roundtrip waterfalls
    const [enrollmentsRes, summariesRes, clsRes, assignmentsRes, stAssignmentsRes] = await Promise.all([
      supabase
        .from('enrollments')
        .select(`
          id, status, joined_at,
          profiles!enrollments_student_id_fkey (
            id, name, nim, avatar_url
          )
        `)
        .eq('class_id', id), // Removed .order('profiles.name') to prevent DB crash
      supabase
        .from('grade_summaries')
        .select(`
          student_id,
          attendance_score, assignment_score, quiz_score,
          midterm_score, final_exam_score, weighted_total,
          letter_grade, grade_points,
          total_sessions, attended_sessions, attendance_percentage,
          sync_status, sync_error, synced_at, calculated_at
        `)
        .eq('class_id', id),
      supabase
        .from('classes')
        .select(`
          weight_attendance, weight_assignments, weight_quiz, weight_midterm, weight_final,
          min_attendance_pct
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('assignments')
        .select('id, title, type, max_score, due_date, is_published')
        .eq('class_id', id)
        .eq('is_published', true)
        .order('created_at'),
      supabase
        .from('submissions')
        .select('student_id, status, assignments!inner(type)')
        .eq('assignments.class_id', id)
        .in('status', ['submitted', 'graded', 'late'])
    ])

    if (enrollmentsRes.error) throw enrollmentsRes.error
    if (summariesRes.error) throw summariesRes.error
    if (stAssignmentsRes.error) console.error("Error fetching submissions:", stAssignmentsRes.error)

    const enrollments = enrollmentsRes.data
    const summaries = summariesRes.data
    const cls = clsRes.data
    const assignments = assignmentsRes.data
    const studentAssignments = stAssignmentsRes?.data || []

    // Compute counts per student
    const countsMap = new Map()
    if (enrollments) {
      for (const e of enrollments) {
         countsMap.set((e.profiles as any)?.id, { assignment_count: 0, quiz_count: 0 })
      }
    }
    if (studentAssignments.length > 0) {
      studentAssignments.forEach((sa: any) => {
        const sid = sa.student_id
        if (!countsMap.has(sid)) countsMap.set(sid, { assignment_count: 0, quiz_count: 0 })
        const counts = countsMap.get(sid)
        const type = sa.assignments?.type?.toLowerCase()
        if (type === 'tugas' || type === 'homework' || type === 'assignment') counts.assignment_count++
        if (type === 'kuis' || type === 'quiz') counts.quiz_count++
      })
    }

    // - CRITICAL FIX: Pre-build summary map for O(1) lookup instead of O(n) find
    const summaryMap = new Map(
      summaries?.map((s: any) => [s.student_id, s]) || []
    )

    const mappedStudents = enrollments?.map((enrollment: any) => {
      const studentId = enrollment.profiles?.id
      const classSummary = summaryMap.get(studentId) || null

      return {
        id: enrollment.id,
        status: enrollment.status,
        joined_at: enrollment.joined_at,
        profiles: enrollment.profiles,
        grade_summaries: classSummary,
        counts: countsMap.get(studentId) || { assignment_count: 0, quiz_count: 0 }
      }
    }) || []

    mappedStudents.sort((a: any, b: any) => {
      const nameA = a.profiles?.name?.toLowerCase() || ''
      const nameB = b.profiles?.name?.toLowerCase() || ''
      return nameA.localeCompare(nameB)
    })

    return successResponse({
      students: mappedStudents,
      classWeights: cls,
      assignments,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { response } = await requireClassLecturer(id)
    if (response) return response

    const supabase = await createClient()

    // Trigger high-performance DB recalculation for the entire class via RPC
    const { error: rpcError } = await supabase.rpc('recalculate_all_class_grades', {
      p_class_id: id,
    })

    if (rpcError) throw rpcError

    return successResponse(
      null,
      'Rekap nilai seluruh mahasiswa berhasil dihitung ulang!'
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { response } = await requireClassLecturer(id)
    if (response) return response

    const supabase = await createClient()
    const body = await request.json()

    const {
      weight_attendance,
      weight_assignments,
      weight_quiz,
      weight_midterm,
      weight_final,
      min_attendance_pct,
    } = body

    // 1. Update the class weights in the classes table
    const { error: updateError } = await supabase
      .from('classes')
      .update({
        weight_attendance,
        weight_assignments,
        weight_quiz,
        weight_midterm,
        weight_final,
        min_attendance_pct,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    // 2. Trigger automatic recalculation of all student grades to reflect the new weights instantly!
    const { error: rpcError } = await supabase.rpc('recalculate_all_class_grades', {
      p_class_id: id,
    })

    if (rpcError) throw rpcError

    return successResponse(
      null,
      'Bobot penilaian kelas berhasil diperbarui dan semua nilai mahasiswa telah dihitung ulang!'
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}
