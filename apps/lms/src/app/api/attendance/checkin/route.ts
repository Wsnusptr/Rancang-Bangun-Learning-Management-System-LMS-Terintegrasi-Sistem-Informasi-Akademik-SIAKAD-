// ============================================================
// POST /api/attendance/checkin - Student check-in with token + geolocation
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  isExpired,
  parseUTCDate,
} from '@/lib/utils'
import { calculateDistance } from '@/lib/geolocation'
import { z } from 'zod'

const checkinSchema = z.object({
  token: z.string().length(6).toUpperCase(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireRole('student')
    if (response) return response

    const body = await request.json()
    const parsed = checkinSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e: any) => e.message).join(', '),
        422
      )
    }

    const { token, latitude, longitude } = parsed.data
    const supabase = await createClient()

    // Find the session by token
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return errorResponse('Token absensi tidak valid atau tidak ditemukan', 404)
    }

    // Check if session is still open
    if (!session.is_open) {
      return errorResponse('Sesi absensi sudah ditutup', 400)
    }

    // Check if token is expired
    if (isExpired(session.closes_at)) {
      // Auto-close the session
      await supabase
        .from('attendance_sessions')
        .update({ is_open: false, closed_at: new Date().toISOString() })
        .eq('id', session.id)

      return errorResponse(
        `Token absensi sudah kedaluwarsa pada ${new Date(session.closes_at).toLocaleTimeString('id-ID')}`,
        400
      )
    }

    // Check if student is enrolled in this class
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('class_id', session.class_id)
      .eq('student_id', user.id)
      .eq('status', 'active')
      .single()

    if (!enrollment) {
      return errorResponse('Anda tidak terdaftar di kelas ini', 403)
    }

    // Check if already checked in
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id, checked_at')
      .eq('session_id', session.id)
      .eq('student_id', user.id)
      .single()

    if (existing) {
      return errorResponse(
        `Anda sudah absen pada pukul ${new Date(existing.checked_at).toLocaleTimeString('id-ID')}`,
        409
      )
    }

    // Geolocation validation
    let geoValidated = false
    let distanceMeters: number | null = null
    let attendanceStatus: 'present' | 'late' = 'present'

    if (session.geolocation_required) {
      if (!latitude || !longitude) {
        return errorResponse(
          'Lokasi GPS diperlukan untuk absensi di kelas ini. Aktifkan GPS dan izinkan akses lokasi.',
          422
        )
      }

      distanceMeters = Math.round(
        calculateDistance(latitude, longitude, session.campus_lat, session.campus_lng)
      )

      if (distanceMeters > session.campus_radius_m) {
        return errorResponse(
          `Anda berada di luar area kampus. Jarak Anda dari kampus: ${distanceMeters} meter (batas: ${session.campus_radius_m} meter). Pastikan Anda berada di dalam kampus.`,
          400
        )
      }

      geoValidated = true
    } else if (latitude && longitude) {
      // Geo not required but provided - still calculate distance for audit
      distanceMeters = Math.round(
        calculateDistance(latitude, longitude, session.campus_lat, session.campus_lng)
      )
      geoValidated = true
    }

    // Determine if late (check in after 15 minutes of session open)
    const openedAt = parseUTCDate(session.opened_at)
    const fifteenMinutesAfterOpen = new Date(openedAt.getTime() + 15 * 60 * 1000)
    if (new Date() > fifteenMinutesAfterOpen) {
      attendanceStatus = 'late'
    }

    // Record attendance
    const { data: record, error: recordError } = await supabase
      .from('attendance_records')
      .insert({
        session_id: session.id,
        student_id: user.id,
        status: attendanceStatus,
        student_lat: latitude || null,
        student_lng: longitude || null,
        distance_meters: distanceMeters,
        geo_validated: geoValidated,
        check_in_method: 'token',
        checked_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (recordError) {
      if (recordError.code === '23505') {
        return errorResponse('Anda sudah melakukan absensi', 409)
      }
      throw recordError
    }

    // Update grade summary attendance stats
    await updateAttendanceSummary(supabase, user.id, session.class_id)

    const message =
      attendanceStatus === 'late'
        ? `Absensi berhasil (Terlambat). ${geoValidated ? `Jarak dari kampus: ${distanceMeters}m` : ''}`
        : `Absensi berhasil! ${geoValidated ? `Jarak dari kampus: ${distanceMeters}m` : ''}`

    return successResponse(
      {
        record,
        status: attendanceStatus,
        distanceMeters,
        meeting: `Pertemuan ${session.meeting_number}`,
        topic: session.topic,
      },
      message
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}

async function updateAttendanceSummary(
  supabase: any,
  studentId: string,
  classId: string
) {
  try {
    // Count total sessions and attended
    const { count: totalSessions } = await supabase
      .from('attendance_sessions')
      .select('id', { count: 'exact' })
      .eq('class_id', classId)

    const { count: attendedSessions } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact' })
      .eq('student_id', studentId)
      .in('status', ['present', 'late', 'excused'])
      .in(
        'session_id',
        (
          await supabase
            .from('attendance_sessions')
            .select('id')
            .eq('class_id', classId)
        ).data?.map((s: any) => s.id) || []
      )

    const total = totalSessions || 0
    const attended = attendedSessions || 0
    const percentage = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0
    const attendanceScore = percentage // Score out of 100 based on % attendance

    await supabase
      .from('grade_summaries')
      .upsert({
        student_id: studentId,
        class_id: classId,
        total_sessions: total,
        attended_sessions: attended,
        attendance_percentage: percentage,
        attendance_score: attendanceScore,
      })
      .eq('student_id', studentId)
  } catch (err) {
    console.error('[Attendance Summary Update Error]', err)
  }
}

