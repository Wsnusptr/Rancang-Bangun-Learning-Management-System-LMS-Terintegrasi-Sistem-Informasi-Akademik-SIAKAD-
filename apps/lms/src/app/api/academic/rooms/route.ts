// ============================================================
// GET /api/academic/rooms
// Fetch room locations
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, serverErrorResponse } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('id, code, name, capacity, room_type')
      .eq('is_active', true)
      .order('code', { ascending: true })

    if (error) throw error

    return successResponse(rooms, 'Rooms loaded successfully')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
