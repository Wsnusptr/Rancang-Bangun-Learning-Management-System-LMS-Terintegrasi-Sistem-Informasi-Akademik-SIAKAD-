import { requireSiakadAuth } from '@/lib/api-auth'
// ============================================================
// /api/v1/enrollments - Admin KRS/Enrollment Approval API
// Supports: action === 'approve' OR action === 'delete' OR action === 'approve_all'
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, enrollmentId } = body

    if (!action) {
      return NextResponse.json({ success: false, error: 'Aksi (action) wajib ditentukan.' }, { status: 400 })
    }

    // 1. ACTION: APPROVE SINGLE ENROLLMENT
    if (action === 'approve') {
      if (!enrollmentId) {
        return NextResponse.json({ success: false, error: 'ID Pendaftaran (enrollmentId) wajib diisi.' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('enrollments')
        .update({ status: 'active', dropped_at: null })
        .eq('id', enrollmentId)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Pendaftaran kelas berhasil disetujui.',
        data
      })
    }

    // 2. ACTION: APPROVE ALL PENDING ENROLLMENTS IN THE ACTIVE SEMESTER
    if (action === 'approve_all') {
      // Get the active academic semester
      const { data: activeSem, error: semErr } = await supabase
        .from('academic_semesters')
        .select('id, name')
        .eq('is_active', true)
        .maybeSingle()

      if (semErr) throw semErr

      if (!activeSem) {
        return NextResponse.json({ success: false, error: 'Tidak ada periode perkuliahan aktif untuk disetujui.' }, { status: 400 })
      }

      // Fetch all classes in the active semester
      const { data: activeClasses, error: classErr } = await supabase
        .from('classes')
        .select('id')
        .eq('semester_id', activeSem.id)

      if (classErr) throw classErr

      const classIds = (activeClasses || []).map(c => c.id)

      if (classIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: `Tidak ada kelas terdaftar pada periode '${activeSem.name}' untuk disetujui.`,
          count: 0
        })
      }

      // Bulk update all pending ('dropped' with dropped_at null) enrollments to 'active'
      const { data: updatedData, error: updateErr, count } = await supabase
        .from('enrollments')
        .update({ status: 'active', dropped_at: null })
        .in('class_id', classIds)
        .eq('status', 'dropped')
        .select('id')

      if (updateErr) throw updateErr

      const approvedCount = updatedData?.length || 0

      return NextResponse.json({
        success: true,
        message: `Berhasil menyetujui ${approvedCount} rencana studi mahasiswa untuk periode perkuliahan '${activeSem.name}'.`,
        count: approvedCount
      })
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid.' }, { status: 400 })
  } catch (error: any) {
    console.error('[SIAKAD Enrollments API Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const enrollmentId = searchParams.get('id')

    if (!enrollmentId) {
      return NextResponse.json({ success: false, error: 'ID Pendaftaran (id) wajib disertakan pada query.' }, { status: 400 })
    }

    // First fetch the enrollment to get class_id and student_id for cleanups
    const { data: enrollment, error: fetchErr } = await supabase
      .from('enrollments')
      .select('student_id, class_id')
      .eq('id', enrollmentId)
      .single()

    if (fetchErr || !enrollment) {
      return NextResponse.json({ success: false, error: 'Pendaftaran tidak ditemukan.' }, { status: 404 })
    }

    // 1. Delete from grade_summaries first
    await supabase
      .from('grade_summaries')
      .delete()
      .eq('student_id', enrollment.student_id)
      .eq('class_id', enrollment.class_id)

    // 2. Delete enrollment record
    const { error: deleteErr } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId)

    if (deleteErr) throw deleteErr

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran kelas berhasil dihapus/dibatalkan.'
    })
  } catch (error: any) {
    console.error('[SIAKAD Enrollments API Delete Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
