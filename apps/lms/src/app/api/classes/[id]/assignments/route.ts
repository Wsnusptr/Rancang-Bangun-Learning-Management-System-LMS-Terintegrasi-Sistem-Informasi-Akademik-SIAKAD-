// ============================================================
// GET  /api/classes/[id]/assignments - List assignments
// POST /api/classes/[id]/assignments - Create assignment
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireClassEnrollment, requireClassLecturer } from '@/lib/auth'
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, response } = await requireClassEnrollment(id)
    if (response) return response

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    // --------------------------------------------------------
    // PRE-FETCH ATTENDANCE DATA FOR CHEATING DETECTION
    // --------------------------------------------------------
    const { data: sessions } = await supabase
      .from('attendance_sessions')
      .select('id, session_date')
      .eq('class_id', id)
      
    const sessionIds = (sessions || []).map(s => s.id)
    let attendanceRecords: any[] = []
    
    // To avoid too large queries, only fetch if we have sessions
    if (sessionIds.length > 0) {
      // If user is student, we only need their attendance
      let attQuery = supabase
        .from('attendance_records')
        .select('session_id, student_id, status')
        .in('session_id', sessionIds)
        
      if (user.role === 'student') {
        attQuery = attQuery.eq('student_id', user.id)
      }
      
      const { data: records } = await attQuery
      attendanceRecords = records || []
    }
    // --------------------------------------------------------

    // For students: fetch assignments and ONLY their own submission
    if (user.role === 'student') {
      const [assignmentsRes, submissionsRes] = await Promise.all([
        supabase
          .from('assignments')
          .select('*')
          .eq('class_id', id)
          .eq('is_published', true)
          .order('due_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('submissions')
          .select('id, assignment_id, student_id, submitted_at, score, final_score, status, is_late')
          .eq('student_id', user.id)
      ])

      if (assignmentsRes.error) throw assignmentsRes.error
      if (submissionsRes.error) throw submissionsRes.error

      let filtered = assignmentsRes.data || []
      if (type) filtered = filtered.filter(a => a.type === type)

      // Map to flatten submissions array into assignment object for frontend
      filtered = filtered.map(assignment => {
        let is_absent = false
        // Find if there is a session on the assignment's creation date (YYYY-MM-DD)
        const assignmentDate = assignment.created_at.substring(0, 10)
        const sessionOnDate = (sessions || []).find(s => s.session_date === assignmentDate)
        
        if (sessionOnDate) {
          const record = attendanceRecords.find(r => r.session_id === sessionOnDate.id && r.student_id === user.id)
          if (!record || record.status === 'absent') {
            is_absent = true
          }
        }

        const sub = (submissionsRes.data || []).find(s => s.assignment_id === assignment.id)

        return { 
          ...assignment, 
          is_absent,
          submission_id: sub?.id || null,
          student_id: sub?.student_id || null,
          submitted_at: sub?.submitted_at || null,
          submission_score: sub?.score || null,
          submission_final_score: sub?.final_score || null,
          submission_status: sub?.status || null,
          is_late: sub?.is_late || false,
          display_status: sub?.status || 'assigned'
        }
      })

      return successResponse(filtered)
    }

    // For lecturers: fetch assignments only, get counts via aggregates
    // - CRITICAL FIX: Don't load full submissions here - fetch on-demand instead
    let query = supabase
      .from('assignments')
      .select(`
        id, title, description, type, due_date, created_at, is_published,
        max_score, class_id, updated_at, allow_file_upload, allowed_file_types,
        max_file_size_mb, late_submission, late_penalty_pct,
        submissions (
          id, student_id, submitted_at, score, final_score, status, is_late,
          content, file_url, file_name, file_size, file_type,
          profiles!submissions_student_id_fkey ( id, name, nim, avatar_url )
        )
      `)
      .eq('class_id', id)
      .order('created_at', { ascending: false })

    if (type) query = query.eq('type', type)

    const { data, error } = await query
    if (error) throw error

    // Get submission stats via separate, optimized queries
    const enriched = await Promise.all(
      (data || []).map(async (assignment) => {
        const [submissionsRes, gradedRes] = await Promise.all([
          // Count all submissions
          supabase
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id),
          // Count graded submissions
          supabase
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id)
            .not('score', 'is', null),
        ])
        
        // Find if there is a session on the assignment's creation date (YYYY-MM-DD)
        const assignmentDate = assignment.created_at.substring(0, 10)
        const sessionOnDate = (sessions || []).find(s => s.session_date === assignmentDate)
        
        // Map submissions to include is_absent flag
        const mappedSubmissions = (assignment.submissions || []).map((sub: any) => {
          let is_absent = false
          if (sessionOnDate) {
            const record = attendanceRecords.find(r => r.session_id === sessionOnDate.id && r.student_id === sub.student_id)
            if (!record || record.status === 'absent') {
              is_absent = true
            }
          }
          return { ...sub, is_absent }
        })

        return {
          ...assignment,
          submissions: mappedSubmissions,
          submission_count: submissionsRes.count || 0,
          graded_count: gradedRes.count || 0,
        }
      })
    )

    return successResponse(enriched)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

const createAssignmentSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(['homework', 'quiz', 'midterm', 'final']).default('homework'),
  maxScore: z.number().min(1).max(1000).default(100),
  passingScore: z.number().min(0).max(1000).default(60),
  dueDate: z.string().datetime().optional().nullable(),
  lateSubmission: z.boolean().default(false),
  latePenaltyPct: z.number().min(0).max(100).default(0),
  allowFileUpload: z.boolean().default(true),
  allowedFileTypes: z.array(z.string()).optional(),
  maxFileSizeMb: z.number().int().min(1).max(50).default(10),
  rubric: z.any().optional(),
  isPublished: z.boolean().default(true),
  postId: z.string().uuid().optional().nullable(),
})

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, response } = await requireClassLecturer(id)
    if (response) return response

    const body = await request.json()
    const parsed = createAssignmentSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        422
      )
    }

    const data = parsed.data
    const supabase = await createClient()

    // Validate: only one midterm and one final per class
    if (data.type === 'midterm' || data.type === 'final') {
      const { count } = await supabase
        .from('assignments')
        .select('id', { count: 'exact' })
        .eq('class_id', id)
        .eq('type', data.type)

      if (count && count > 0) {
        const label = data.type === 'midterm' ? 'UTS' : 'UAS'
        return errorResponse(`Kelas ini sudah memiliki ${label}`, 409)
      }
    }

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({
        class_id: id,
        post_id: data.postId || null,
        title: data.title,
        description: data.description || null,
        type: data.type,
        max_score: data.maxScore,
        passing_score: data.passingScore,
        due_date: data.dueDate || null,
        late_submission: data.lateSubmission,
        late_penalty_pct: data.latePenaltyPct,
        allow_file_upload: data.allowFileUpload,
        allowed_file_types: data.allowedFileTypes || ['pdf', 'doc', 'docx', 'zip', 'jpg', 'png'],
        max_file_size_mb: data.maxFileSizeMb,
        rubric: data.rubric || null,
        is_published: data.isPublished,
      })
      .select()
      .single()

    if (error) throw error

    // Notify enrolled students
    if (data.isPublished) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', id)
        .eq('status', 'active')

      const { data: classInfo } = await supabase
        .from('classes')
        .select('class_name')
        .eq('id', id)
        .single()

      if (enrollments?.length) {
        const adminClient = createAdminClient()
        await adminClient.from('notifications').insert(
          enrollments.map(e => ({
            user_id: e.student_id,
            type: 'new_assignment' as const,
            title: `Tugas Baru: ${data.title}`,
            message: `${classInfo?.class_name} - ${data.dueDate ? `Deadline: ${new Date(data.dueDate).toLocaleDateString('id-ID')}` : 'Tanpa deadline'}`,
            related_class_id: id,
            related_assignment_id: assignment.id,
            action_url: `/class/${id}/classwork`,
          }))
        )
      }
    }

    return successResponse(assignment, 'Tugas berhasil dibuat', undefined, 201)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

const updateAssignmentSchema = createAssignmentSchema.extend({
  id: z.string().uuid()
})

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, response } = await requireClassLecturer(id)
    if (response) return response

    const body = await request.json()
    const parsed = updateAssignmentSchema.safeParse(body)
    
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        422
      )
    }
    
    const data = parsed.data
    const supabase = await createClient()

    // Validate if assignment belongs to this class
    const { data: existing, error: checkError } = await supabase
      .from('assignments')
      .select('id')
      .eq('id', data.id)
      .eq('class_id', id)
      .single()

    if (checkError || !existing) return errorResponse('Tugas tidak ditemukan atau bukan bagian dari kelas ini', 404)
    
    // Validate: only one midterm and one final per class
    if (data.type === 'midterm' || data.type === 'final') {
      const { count } = await supabase
        .from('assignments')
        .select('id', { count: 'exact' })
        .eq('class_id', id)
        .eq('type', data.type)
        .neq('id', data.id)

      if (count && count > 0) {
        const label = data.type === 'midterm' ? 'UTS' : 'UAS'
        return errorResponse(`Kelas ini sudah memiliki ${label}`, 409)
      }
    }

    const { data: assignment, error } = await supabase
      .from('assignments')
      .update({
        title: data.title,
        description: data.description || null,
        type: data.type,
        max_score: data.maxScore,
        passing_score: data.passingScore,
        due_date: data.dueDate || null,
        late_submission: data.lateSubmission,
        late_penalty_pct: data.latePenaltyPct,
        allow_file_upload: data.allowFileUpload,
        allowed_file_types: data.allowedFileTypes || ['pdf', 'doc', 'docx', 'zip', 'jpg', 'png'],
        max_file_size_mb: data.maxFileSizeMb,
        is_published: data.isPublished,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id)
      .select()
      .single()

    if (error) throw error
    return successResponse(assignment, 'Tugas berhasil diperbarui')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
