import { requireSiakadAuth } from '@/lib/api-auth'
// ============================================================
// /api/v1/announcements - Admin announcements management
// Handles: POST (create), PUT (update), DELETE (delete)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST: Create announcement
export async function POST(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { category, title, description, date_info, media_url, link_url, is_highlight } = body

    if (!category || !title || !description) {
      return NextResponse.json({ success: false, error: 'Category, Title, and Description are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        category,
        title,
        description,
        date_info: date_info || null,
        media_url: media_url || null,
        link_url: link_url || null,
        is_highlight: !!is_highlight
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[SIAKAD Create Announcement Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT: Update announcement
export async function PUT(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, category, title, description, date_info, media_url, link_url, is_highlight } = body

    if (!id || !category || !title || !description) {
      return NextResponse.json({ success: false, error: 'ID, Category, Title, and Description are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('announcements')
      .update({
        category,
        title,
        description,
        date_info: date_info || null,
        media_url: media_url || null,
        link_url: link_url || null,
        is_highlight: !!is_highlight,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[SIAKAD Update Announcement Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE: Delete announcement
export async function DELETE(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Announcement deleted successfully' })
  } catch (error: any) {
    console.error('[SIAKAD Delete Announcement Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
