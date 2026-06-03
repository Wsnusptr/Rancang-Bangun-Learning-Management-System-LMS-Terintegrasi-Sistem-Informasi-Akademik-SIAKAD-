// ============================================================
// GET   /api/notifications        - List user notifications
// PATCH /api/notifications/[id]   - Mark as read
// DELETE /api/notifications/[id]  - Delete notification
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { successResponse, serverErrorResponse } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error, count } = await query
    if (error) throw error

    // Count unread
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return successResponse(data, undefined, { total: count, unread: unreadCount })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

// Mark all as read
export async function PATCH(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) throw error

    return successResponse(null, 'Semua notifikasi telah ditandai dibaca')
  } catch (error) {
    return serverErrorResponse(error)
  }
}

