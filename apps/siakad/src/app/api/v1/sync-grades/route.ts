// ============================================================
// POST /api/v1/sync-grades - Receive grade data from J-Learn LMS
// This is the SIAKAD side - validates API key, stores records
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { requireSiakadAuth } from '@/lib/api-auth'

// Use service role for SIAKAD (no user auth needed here)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const recordSchema = z.object({
  nim: z.string().min(1),
  student_name: z.string().min(1),
  final_score: z.number().min(0).max(100),
  attendance_percentage: z.number().min(0).max(100),
})

const syncPayloadSchema = z.object({
  batch_id: z.string(),
  batch_index: z.number().int().min(1),
  total_batches: z.number().int().min(1),
  course_code: z.string().min(1),
  course_name: z.string().min(1),
  credits: z.number().int().optional().default(3),
  semester: z.string().min(1),
  academic_year: z.string().min(1),
  lms_class_id: z.string().optional(),
  sent_at: z.string().datetime().optional(),
  records: z.array(recordSchema).min(1).max(200),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Validate API Key
    const authError = requireSiakadAuth(request)
    if (authError) return authError

    // 2. Parse and validate payload
    const body = await request.json()
    const parsed = syncPayloadSchema.safeParse(body)

    if (!parsed.success) {
      const errors = parsed.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ')
      return Response.json(
        { status: 'error', message: `Payload validation failed: ${errors}` },
        { status: 422 }
      )
    }

    const {
      batch_id,
      batch_index,
      total_batches,
      course_code,
      course_name,
      credits,
      semester,
      academic_year,
      lms_class_id,
      records,
    } = parsed.data

    // 3. Create sync receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('sync_receipts')
      .insert({
        batch_id,
        batch_index,
        total_batches,
        course_code,
        course_name,
        semester,
        academic_year,
        lms_class_id: lms_class_id || null,
        records_received: records.length,
        status: 'received',
      })
      .select('id')
      .single()

    if (receiptError) {
      console.error('[SIAKAD] Receipt creation failed:', receiptError)
    }

    // 4. Upsert academic records (bulk)
    const upsertData = records.map(r => ({
      nim: r.nim,
      student_name: r.student_name,
      course_code,
      course_name,
      credits,
      semester,
      academic_year,
      final_score: Math.round(r.final_score * 100) / 100,
      attendance_percentage: Math.round(r.attendance_percentage * 100) / 100,
      lms_class_id: lms_class_id || null,
      batch_id,
      sync_source: 'J-Learn LMS',
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('academic_records')
      .upsert(upsertData, {
        onConflict: 'nim,course_code,semester,academic_year',
        ignoreDuplicates: false,
      })
      .select('id, nim, final_score, letter_grade')

    if (insertError) {
      // Update receipt as error
      if (receipt) {
        await supabase
          .from('sync_receipts')
          .update({ status: 'error', error_detail: insertError.message, processed_at: new Date().toISOString() })
          .eq('id', receipt.id)
      }

      return Response.json(
        {
          status: 'error',
          batch_id,
          message: `Database error: ${insertError.message}`,
        },
        { status: 500 }
      )
    }

    // 5. Also upsert into students table for reference
    const studentUpserts = records.map(r => ({
      nim: r.nim,
      name: r.student_name,
    }))

    await supabase
      .from('students')
      .upsert(studentUpserts, { onConflict: 'nim', ignoreDuplicates: true })

    // 6. Update receipt as processed
    const processingTimeMs = Date.now() - startTime

    if (receipt) {
      await supabase
        .from('sync_receipts')
        .update({
          status: 'processed',
          records_inserted: inserted?.length || 0,
          records_updated: records.length - (inserted?.length || 0),
          processed_at: new Date().toISOString(),
        })
        .eq('id', receipt.id)
    }

    return Response.json({
      status: 'success',
      batch_id,
      batch_index,
      total_batches,
      synced_count: inserted?.length || records.length,
      processing_time_ms: processingTimeMs,
      timestamp: new Date().toISOString(),
      records_summary: inserted?.map(r => ({
        nim: r.nim,
        score: r.final_score,
        grade: r.letter_grade,
      })),
    })
  } catch (error) {
    console.error('[SIAKAD Sync Error]', error)
    return Response.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
