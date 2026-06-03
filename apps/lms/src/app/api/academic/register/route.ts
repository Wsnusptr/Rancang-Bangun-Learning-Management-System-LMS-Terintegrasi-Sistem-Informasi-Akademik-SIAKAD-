// ============================================================
// /api/academic/register - Student KRS/Daftar Ulang API
// ============================================================

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireRole('student')
    if (response) return response

    const admin = createAdminClient()

    // 1. Get active academic semester
    const { data: activeSemester, error: semErr } = await admin
      .from('academic_semesters')
      .select('id, code, name, academic_year, semester_type')
      .eq('is_active', true)
      .maybeSingle()

    if (semErr) throw semErr

    if (!activeSemester) {
      return successResponse({ activeSemester: null, classes: [], enrolledClasses: [] }, 'Tidak ada semester perkuliahan yang aktif.')
    }

    // 2. Fetch all classes scheduled for the active semester
    // Join with courses and profiles for lecturer name
    const { data: classes, error: classesErr } = await admin
      .from('classes')
      .select(`
        id, class_name, class_code, class_section, day_of_week, start_time, end_time, max_students, is_active,
        courses (id, code, name, credits),
        profiles!classes_lecturer_id_fkey (id, name, avatar_url)
      `)
      .eq('semester_id', activeSemester.id)
      .eq('is_active', true)

    if (classesErr) throw classesErr

    // 3. Fetch count of active students for each class
    const { data: enrollCounts, error: countErr } = await admin
      .from('enrollments')
      .select('class_id')
      .eq('status', 'active')

    const countMap: Record<string, number> = {}
    if (enrollCounts) {
      enrollCounts.forEach((e: any) => {
        countMap[e.class_id] = (countMap[e.class_id] || 0) + 1
      })
    }

    const classesWithCounts = (classes || []).map((c: any) => ({
      ...c,
      enrolled_count: countMap[c.id] || 0
    }))

    // 4. Fetch classes the student is already enrolled in
    const { data: studentEnrollments, error: studentErr } = await admin
      .from('enrollments')
      .select('class_id, status')
      .eq('student_id', user.id)

    const enrolledClasses = (studentEnrollments || [])

    return successResponse({
      activeSemester,
      classes: classesWithCounts,
      enrolledClasses
    }, 'Data KRS berhasil dimuat.')
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireRole('student')
    if (response) return response

    if (!user.nim) {
      return errorResponse('Calon mahasiswa belum dapat daftar ulang. Selesaikan administrasi PMB terlebih dahulu.', 403)
    }

    const body = await request.json()
    const { classId } = body

    if (!classId) {
      return errorResponse('ID Kelas wajib diisi.', 400)
    }

    const admin = createAdminClient()

    // 1. Fetch class details & verify it belongs to the active semester
    const { data: cls, error: classErr } = await admin
      .from('classes')
      .select(`
        id, class_name, max_students, is_active, semester_id,
        academic_semesters (is_active)
      `)
      .eq('id', classId)
      .single()

    if (classErr || !cls) {
      return errorResponse('Kelas tidak ditemukan.', 404)
    }

    if (!cls.is_active || !(cls.academic_semesters as any)?.is_active) {
      return errorResponse('Kelas tidak aktif atau tidak berada di periode perkuliahan berjalan.', 400)
    }

    // 2. Check for existing enrollment
    const { data: existing } = await admin
      .from('enrollments')
      .select('id, status')
      .eq('student_id', user.id)
      .eq('class_id', cls.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active') {
        return errorResponse('Anda sudah terdaftar di kelas ini.', 409)
      }
      if (existing.status === 'dropped') {
        return errorResponse('Pendaftaran kelas ini sedang menunggu persetujuan admin.', 409)
      }
    }

    // 3. Verify capacity limit (count both active and pending registrations)
    const { count } = await admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', cls.id)
      .in('status', ['active', 'dropped'])

    if (count != null && count >= cls.max_students) {
      return errorResponse(`Kelas sudah penuh (${cls.max_students}/${cls.max_students} mahasiswa).`, 400)
    }

    // 4. Enroll student as pending ('dropped') - awaiting SIAKAD admin approval
    const { error: enrollErr } = await admin
      .from('enrollments')
      .insert({
        student_id: user.id,
        class_id: cls.id,
        status: 'dropped'
      })

    if (enrollErr) throw enrollErr

    return successResponse(null, `Kelas '${cls.class_name}' berhasil ditambahkan ke rencana studi KRS. Menunggu persetujuan admin.`, undefined, 201)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, response } = await requireRole('student')
    if (response) return response

    const body = await request.json()
    const { classId } = body

    if (!classId) {
      return errorResponse('ID Kelas wajib diisi.', 400)
    }

    const admin = createAdminClient()

    // 1. Delete from grade_summaries first
    await admin
      .from('grade_summaries')
      .delete()
      .eq('student_id', user.id)
      .eq('class_id', classId)

    // 2. Delete enrollment record
    const { error: deleteErr } = await admin
      .from('enrollments')
      .delete()
      .eq('student_id', user.id)
      .eq('class_id', classId)

    if (deleteErr) throw deleteErr

    return successResponse(null, 'Pendaftaran kelas berhasil dibatalkan.')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
