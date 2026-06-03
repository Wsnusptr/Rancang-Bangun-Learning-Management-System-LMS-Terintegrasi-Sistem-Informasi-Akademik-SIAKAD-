// ============================================================
// GET /api/academic/courses
// Fetch all active courses for dropdown
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, serverErrorResponse } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, code, name, credits')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    return successResponse(courses, 'Courses loaded successfully')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
