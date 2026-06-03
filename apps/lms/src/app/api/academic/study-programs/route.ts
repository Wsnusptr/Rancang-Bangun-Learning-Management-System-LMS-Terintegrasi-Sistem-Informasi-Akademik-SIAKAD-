// ============================================================
// GET /api/academic/study-programs
// Fetch list of active study programs (public for registration)
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, serverErrorResponse } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Query study programs, bypass standard auth policy since it's used for register dropdown
    const { data: programs, error } = await supabase
      .from('study_programs')
      .select('id, code, name, degree_level')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    return successResponse(programs, 'Study programs loaded successfully')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
