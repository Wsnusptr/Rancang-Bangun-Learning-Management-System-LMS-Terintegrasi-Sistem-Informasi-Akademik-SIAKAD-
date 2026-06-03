// ============================================================
// POST /api/classes/join - Join a class via class code
// ============================================================

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils'
import { z } from 'zod'

const joinSchema = z.object({
  classCode: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().length(6, 'Kode kelas harus 6 karakter')),
})

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireRole('student')
    if (response) return response

    if (!user.nim) {
      return errorResponse(
        'Calon mahasiswa belum dapat bergabung ke kelas. Selesaikan verifikasi PMB terlebih dahulu.',
        403
      )
    }

    const body = await request.json()
    const parsed = joinSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 422)
    }

    const { classCode } = parsed.data

    let admin
    try {
      admin = createAdminClient()
    } catch {
      return errorResponse(
        'Server belum dikonfigurasi (SUPABASE_SERVICE_ROLE_KEY). Hubungi admin.',
        503
      )
    }

    // Lookup by join code - bypass RLS (student belum enroll belum boleh SELECT classes)
    const { data: cls, error: classError } = await admin
      .from('classes')
      .select(`
        id, class_name, class_code, max_students, is_active,
        courses (code, name, credits),
        profiles!classes_lecturer_id_fkey (name)
      `)
      .eq('class_code', classCode)
      .maybeSingle()

    if (classError || !cls) {
      return errorResponse('Kode kelas tidak ditemukan. Pastikan 6 karakter kode gabung (bukan kode mata kuliah).', 404)
    }

    if (!cls.is_active) {
      return errorResponse('Kelas ini sudah tidak aktif', 400)
    }

    const { data: existing } = await admin
      .from('enrollments')
      .select('id, status')
      .eq('student_id', user.id)
      .eq('class_id', cls.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active') {
        return errorResponse('Anda sudah terdaftar di kelas ini', 409)
      }
      if (existing.status === 'dropped') {
        const { error } = await admin
          .from('enrollments')
          .update({ status: 'active', dropped_at: null })
          .eq('id', existing.id)
        if (error) throw error
        return successResponse({ class: cls }, 'Berhasil bergabung kembali ke kelas')
      }
    }

    const { count } = await admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', cls.id)
      .eq('status', 'active')

    if (count != null && count >= cls.max_students) {
      return errorResponse(
        `Kelas sudah penuh (${cls.max_students}/${cls.max_students} mahasiswa)`,
        400
      )
    }

    // Service role: trigger on_enrollment_created inserts grade_summaries (RLS blocks student context)
    const { error: enrollError } = await admin.from('enrollments').insert({
      student_id: user.id,
      class_id: cls.id,
      status: 'active',
    })

    if (enrollError) {
      if (enrollError.code === '23505') {
        return errorResponse('Anda sudah terdaftar di kelas ini', 409)
      }
      throw enrollError
    }

    return successResponse(
      { class: cls },
      `Berhasil bergabung ke kelas ${cls.class_name}`,
      undefined,
      201
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}
