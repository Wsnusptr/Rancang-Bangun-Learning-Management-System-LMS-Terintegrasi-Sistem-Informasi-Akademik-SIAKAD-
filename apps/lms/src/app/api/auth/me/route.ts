// ============================================================
// GET /api/auth/me - Get current user profile
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { successResponse, serverErrorResponse } from '@/lib/utils'

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id, name, role, nim, nip, nidn, phone, date_of_birth, gender,
        address, avatar_url, is_active, last_seen_at, created_at,
        study_programs (
          id, code, name, degree_level,
          faculties (id, code, name)
        )
      `)
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return successResponse(null, 'Profil tidak ditemukan', undefined, 404)
    }

    // Update last_seen_at
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id)

    return successResponse(profile)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

