// ============================================================
// POST /api/attendance/open - Open attendance session (lecturer)
//      Generates 6-char token + QR payload, auto-expires in N minutes
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  generateAttendanceToken,
  addMinutes,
} from '@/lib/utils'
import QRCode from 'qrcode'
import { z } from 'zod'

const openAttendanceSchema = z.object({
  classId: z.string().uuid(),
  meetingNumber: z.number().int().min(1).max(99),
  topic: z.string().max(200).optional(),
  durationMinutes: z.number().int().min(5).max(60).default(15),
  geolocationRequired: z.boolean().default(true),
  campusLat: z.number().optional(),
  campusLng: z.number().optional(),
  campusRadiusM: z.number().int().min(50).max(500).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireRole('lecturer', 'admin')
    if (response) return response

    const body = await request.json()
    const parsed = openAttendanceSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e: any) => e.message).join(', '),
        422
      )
    }

    const {
      classId,
      meetingNumber,
      topic,
      durationMinutes,
      geolocationRequired,
      campusLat,
      campusLng,
      campusRadiusM,
    } = parsed.data

    const supabase = await createClient()

    // Verify lecturer owns this class
    const { data: cls } = await supabase
      .from('classes')
      .select('id, class_name, is_active')
      .eq('id', classId)
      .eq('lecturer_id', user.id)
      .single()

    if (!cls) {
      return errorResponse('Kelas tidak ditemukan atau Anda bukan pengajarnya', 404)
    }

    if (!cls.is_active) {
      return errorResponse('Kelas tidak aktif', 400)
    }

    // Check if there's already an open session today
    const today = new Date().toISOString().split('T')[0]
    const { data: existingSession } = await supabase
      .from('attendance_sessions')
      .select('id, token, closes_at, is_open')
      .eq('class_id', classId)
      .eq('session_date', today)
      .eq('is_open', true)
      .gt('closes_at', new Date().toISOString())
      .single()

    if (existingSession) {
      return errorResponse(
        'Sesi absensi hari ini sudah aktif. Tutup sesi yang ada terlebih dahulu.',
        409
      )
    }

    // Generate unique token (retry if collision)
    let token: string
    let tokenExists = true
    let attempts = 0

    do {
      token = generateAttendanceToken(6)
      const { data } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('token', token)
        .single()
      tokenExists = !!data
      attempts++
    } while (tokenExists && attempts < 10)

    if (tokenExists) {
      return errorResponse('Gagal generate token unik, coba lagi', 500)
    }

    const now = new Date()
    const expiresAt = addMinutes(now, durationMinutes)

    // Get campus coordinates from settings if not provided
    let lat = campusLat
    let lng = campusLng

    if (!lat || !lng) {
      const { data: settings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['campus_lat', 'campus_lng', 'campus_radius_meters'])

      const settingsMap = Object.fromEntries(
        settings?.map(s => [s.key, s.value]) || []
      )
      lat = parseFloat(settingsMap['campus_lat'] || '-6.2088')
      lng = parseFloat(settingsMap['campus_lng'] || '106.8456')
    }

    const radius = campusRadiusM || 150

    // Build QR payload
    const qrPayload = JSON.stringify({
      token,
      sessionId: '', // Will be updated after insert
      classId,
      expiresAt: expiresAt.toISOString(),
      campusLat: lat,
      campusLng: lng,
      radiusM: radius,
    })

    // Generate QR Code as base64 data URL
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
      color: {
        dark: '#1A3A6B',
        light: '#FFFFFF',
      },
    })

    // Create session
    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .insert({
        class_id: classId,
        meeting_number: meetingNumber,
        topic: topic || null,
        token: token!,
        qr_payload: qrPayload,
        session_date: today,
        opened_at: now.toISOString(),
        closes_at: expiresAt.toISOString(),
        is_open: true,
        campus_lat: lat,
        campus_lng: lng,
        campus_radius_m: radius,
        geolocation_required: geolocationRequired,
      })
      .select()
      .single()

    if (error) throw error

    return successResponse(
      {
        session,
        token: token!,
        qrCodeDataUrl: qrDataUrl,
        expiresAt: expiresAt.toISOString(),
        expiresInMinutes: durationMinutes,
      },
      `Sesi absensi pertemuan ${meetingNumber} dibuka. Token: ${token}`
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}

