// ============================================================
// POST /api/integration/sync - Sync grades to SIAKAD (lecturer)
//      Supports batching, error handling, retry, audit log
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireClassLecturer } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  chunkArray,
} from '@/lib/utils'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const BATCH_SIZE = 50
const SYNC_TIMEOUT_MS = 15000 // 15 seconds per batch

const syncSchema = z.object({
  classId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    const { user, response } = await requireClassLecturer('') // Will be checked per-class below
    if (response) return response

    const body = await request.json()
    const parsed = syncSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 422)
    }

    const { classId } = parsed.data

    // Verify lecturer owns this class
    const classCheck = await requireClassLecturer(classId)
    if (classCheck.response) return classCheck.response

    const supabase = await createClient()

    // Get class + course info
    const { data: cls, error: classError } = await supabase
      .from('classes')
      .select(`
        id, class_name,
        courses (code, name, credits),
        academic_semesters (semester_type, academic_year)
      `)
      .eq('id', classId)
      .single()

    if (classError || !cls) {
      return errorResponse('Kelas tidak ditemukan', 404)
    }

    // Get all grade summaries for this class
    const { data: grades, error: gradesError } = await supabase
      .from('grade_summaries')
      .select(`
        student_id, weighted_total, attendance_percentage, sync_status,
        assignment_score, quiz_score, midterm_score, final_exam_score,
        profiles!grade_summaries_student_id_fkey (nim, name)
      `)
      .eq('class_id', classId)

    if (gradesError) throw gradesError

    if (!grades || grades.length === 0) {
      return errorResponse(
        'Tidak ada data nilai yang siap disinkronisasi. Pastikan semua mahasiswa sudah memiliki nilai.',
        400
      )
    }

    // Check SIAKAD URL and API Key from settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['siakad_api_url', 'siakad_api_key'])

    const settingsMap = Object.fromEntries(settings?.map(s => [s.key, s.value]) || [])
    const siakadUrl = settingsMap['siakad_api_url']
    const siakadApiKey = settingsMap['siakad_api_key']

    if (!siakadUrl || !siakadApiKey) {
      return errorResponse(
        'Konfigurasi SIAKAD belum diatur. Hubungi administrator untuk mengatur URL dan API Key SIAKAD.',
        503
      )
    }

    const batchId = uuidv4()
    const course = cls.courses as any
    const semester = cls.academic_semesters as any

    // Fetch Master Weights from SIAKAD
    const fs = await import('fs/promises')
    const path = await import('path')
    let masterWeights = { absen: 10, tugas: 20, kuis: 10, uts: 30, uas: 30 }
    try {
      const wContent = await fs.readFile(path.join(process.cwd(), '..', '..', 'master_weights.json'), 'utf-8')
      masterWeights = JSON.parse(wContent)
    } catch(e) {}

    // Build records array using absolute Master Weights Calculation
    const records = grades.map(g => {
      const profile = g.profiles as any
      
      const absenScore = (g.attendance_percentage || 0) * 100
      const tugasScore = Number(g.assignment_score || 0)
      const kuisScore = Number(g.quiz_score || 0)
      const utsScore = Number(g.midterm_score || 0)
      const uasScore = Number(g.final_exam_score || 0)

      const masterCalculatedScore = (
        (absenScore * masterWeights.absen / 100) +
        (tugasScore * masterWeights.tugas / 100) +
        (kuisScore * masterWeights.kuis / 100) +
        (utsScore * masterWeights.uts / 100) +
        (uasScore * masterWeights.uas / 100)
      )

      return {
        nim: profile.nim,
        student_name: profile.name,
        final_score: masterCalculatedScore,
        attendance_percentage: g.attendance_percentage,
      }
    })

    // Split into batches
    const batches = chunkArray(records, BATCH_SIZE)
    const totalBatches = batches.length

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('siakad_sync_logs')
      .insert({
        initiated_by: user.id,
        class_id: classId,
        batch_id: batchId,
        total_records: records.length,
        status: 'in_progress',
        payload_snapshot: {
          course_code: course.code,
          course_name: course.name,
          semester: semester.semester_type,
          academic_year: semester.academic_year,
          record_count: records.length,
        },
      })
      .select('id')
      .single()

    if (logError) throw logError

    // Process each batch
    const batchResults: Array<{
      batchIndex: number
      status: 'success' | 'failed'
      syncedCount: number
      error?: string
    }> = []

    let totalSynced = 0
    let totalFailed = 0

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const payload = {
        batch_id: batchId,
        batch_index: i + 1,
        total_batches: totalBatches,
        course_code: course.code,
        course_name: course.name,
        credits: course.credits,
        semester: semester.semester_type,
        academic_year: semester.academic_year,
        lms_class_id: classId,
        sent_at: new Date().toISOString(),
        records: batch,
      }

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS)

        const res = await fetch(`${siakadUrl}/api/v1/sync-grades`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': siakadApiKey,
            'x-source': 'J-Learn LMS',
            'x-version': '1.0.0',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ message: res.statusText }))
          throw new Error(errBody.message || `HTTP ${res.status}`)
        }

        const result = await res.json()

        batchResults.push({
          batchIndex: i + 1,
          status: 'success',
          syncedCount: batch.length,
        })
        totalSynced += batch.length

        // Mark these student grades as synced
        const studentIds = batch
          .map(r => grades.find(g => (g.profiles as any)?.nim === r.nim)?.student_id)
          .filter(Boolean) as string[]

        await supabase
          .from('grade_summaries')
          .update({
            sync_status: 'synced',
            sync_error: null,
            synced_at: new Date().toISOString(),
          })
          .eq('class_id', classId)
          .in('student_id', studentIds)

        console.log(`[Sync] Batch ${i + 1}/${totalBatches} success:`, result)
      } catch (err) {
        const errorMsg = err instanceof Error
          ? err.message === 'This operation was aborted'
            ? `Timeout: SIAKAD tidak merespons dalam ${SYNC_TIMEOUT_MS / 1000} detik`
            : err.message
          : 'Unknown error'

        batchResults.push({
          batchIndex: i + 1,
          status: 'failed',
          syncedCount: 0,
          error: errorMsg,
        })
        totalFailed += batch.length

        // Mark as failed
        const studentIds = batch
          .map(r => grades.find(g => (g.profiles as any)?.nim === r.nim)?.student_id)
          .filter(Boolean) as string[]

        await supabase
          .from('grade_summaries')
          .update({
            sync_status: 'failed',
            sync_error: errorMsg,
          })
          .eq('class_id', classId)
          .in('student_id', studentIds)

        console.error(`[Sync] Batch ${i + 1}/${totalBatches} failed:`, errorMsg)
      }
    }

    // Determine overall status
    const overallStatus =
      totalFailed === 0
        ? 'completed'
        : totalSynced === 0
          ? 'failed'
          : 'partial'

    // Update sync log
    await supabase
      .from('siakad_sync_logs')
      .update({
        synced_records: totalSynced,
        failed_records: totalFailed,
        status: overallStatus,
        error_message:
          overallStatus !== 'completed'
            ? `${totalFailed} data gagal disinkronisasi`
            : null,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      })
      .eq('id', syncLog.id)

    // Notify lecturer
    const notifTitle =
      overallStatus === 'completed'
        ? `Sinkronisasi Berhasil - ${cls.class_name}`
        : overallStatus === 'partial'
          ? `Sinkronisasi Sebagian - ${cls.class_name}`
          : `Sinkronisasi Gagal - ${cls.class_name}`

    const notifMsg =
      overallStatus === 'completed'
        ? `${totalSynced} data nilai berhasil dikirim ke SIAKAD`
        : `${totalSynced} berhasil, ${totalFailed} gagal`

    const adminClient = createAdminClient()
    await adminClient.from('notifications').insert({
      user_id: user.id,
      type: overallStatus === 'completed' ? 'sync_success' : 'sync_failed',
      title: notifTitle,
      message: notifMsg,
      related_class_id: classId,
      action_url: `/lecturer/class/${classId}/gradebook`,
    })

    return successResponse(
      {
        batchId,
        totalRecords: records.length,
        totalSynced,
        totalFailed,
        overallStatus,
        batches: batchResults,
        syncLogId: syncLog.id,
      },
      notifMsg
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}

