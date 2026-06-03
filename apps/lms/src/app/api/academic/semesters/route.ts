// ============================================================
// GET /api/academic/semesters
// Fetch academic semesters
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, serverErrorResponse } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: semesters, error } = await supabase
      .from('academic_semesters')
      .select('id, code, name, academic_year, semester_type, is_active')
      .order('code', { ascending: false })

    if (error) throw error

    return successResponse(semesters, 'Semesters loaded successfully')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
