// ============================================================
// GET /api/classes/[id]/attendance - Attendance report
// GET /api/attendance/session/[id] - Single session detail
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireClassEnrollment } from '@/lib/auth'
import { successResponse, serverErrorResponse } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, response } = await requireClassEnrollment(id)
    if (response) return response

    const supabase = await createClient()

    // Get all attendance sessions for this class
    const { data: sessions, error: sessionsError } = await supabase
      .from('attendance_sessions')
      .select(`
        id, meeting_number, topic, session_date,
        opened_at, closes_at, is_open, campus_radius_m,
        attendance_records (
          id, student_id, status, distance_meters,
          geo_validated, check_in_method, checked_at,
          profiles!attendance_records_student_id_fkey (id, name, nim, avatar_url)
        )
      `)
      .eq('class_id', id)
      .order('session_date', { ascending: false })

    if (sessionsError) throw sessionsError

    // If student: get their own attendance summary
    if (user.role === 'student') {
      const totalSessions = sessions?.length || 0
      const attendedSessions = sessions?.filter(s =>
        s.attendance_records?.some(
          (r: { student_id: string; status: string }) =>
            r.student_id === user.id && ['present', 'late', 'excused'].includes(r.status)
        )
      ).length || 0

      const percentage = totalSessions > 0
        ? Math.round((attendedSessions / totalSessions) * 1000) / 10
        : 0

      // Get student's records only
      const studentSessions = sessions?.map(session => ({
        ...session,
        my_record: session.attendance_records?.find(
          (r: { student_id: string }) => r.student_id === user.id
        ) || null,
        attendance_records: undefined, // Hide other students' data
      }))

      return successResponse({
        sessions: studentSessions,
        summary: {
          total_sessions: totalSessions,
          attended_sessions: attendedSessions,
          attendance_percentage: percentage,
          status: percentage >= 75 ? 'OK' : 'WARNING',
        },
      })
    }

    // Lecturer/Admin: full data with all records
    const enrichedSessions = sessions?.map(session => ({
      ...session,
      total_enrolled: 0, // Will be filled client-side
      present_count: session.attendance_records?.filter(
        (r: { status: string }) => r.status === 'present'
      ).length || 0,
      late_count: session.attendance_records?.filter(
        (r: { status: string }) => r.status === 'late'
      ).length || 0,
    }))

    // Get enrolled count for stats
    const { count: enrolledCount } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact' })
      .eq('class_id', id)
      .eq('status', 'active')

    return successResponse({
      sessions: enrichedSessions,
      enrolled_count: enrolledCount || 0,
      total_sessions: sessions?.length || 0,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
