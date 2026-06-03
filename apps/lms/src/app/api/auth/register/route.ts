// ============================================================
// POST /api/auth/register
// Create Supabase Auth user + extended profile
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum(['student', 'lecturer']).default('student'),
  nim: z.string().optional(),
  nip: z.string().optional(),
  studyProgramId: z.string().uuid().optional(),
  enrollmentYear: z.number().int().optional(),
  phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e: any) => e.message).join(', '),
        422
      )
    }

    const { name, email, password, role, nim, nip, studyProgramId, enrollmentYear, phone } =
      parsed.data

    // Validate: student must have NIM
    if (role === 'student' && !nim) {
      return errorResponse('NIM wajib diisi untuk mahasiswa', 422)
    }

    const supabase = await createClient()

    // Create auth user with metadata (used by trigger to create profile)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return errorResponse('Email sudah terdaftar', 409)
      }
      return errorResponse(authError.message, 400)
    }

    if (!authData.user) {
      return errorResponse('Gagal membuat akun', 500)
    }

    // Update profile with additional data (trigger creates basic profile)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nim: role === 'student' ? nim : null,
        nip: role === 'lecturer' ? nip : null,
        study_program_id: studyProgramId || null,
        enrollment_year: enrollmentYear || null,
        phone: phone || null,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('[Register] Profile update error:', profileError)
    }

    return successResponse(
      {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role,
        },
      },
      'Akun berhasil dibuat. Silakan cek email untuk verifikasi.',
      undefined,
      201
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}

