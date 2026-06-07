import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    const admin = createAdminClient()
    let query = admin.from('class_events').select('*').eq('class_id', id)

    // Optional filtering by year and month
    if (year && month) {
      const paddedMonth = month.padStart(2, '0')
      const startDate = `${year}-${paddedMonth}-01`
      const nextMonth = Number(month) === 12 ? 1 : Number(month) + 1
      const nextYear = Number(month) === 12 ? Number(year) + 1 : Number(year)
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
      
      query = query.gte('event_date', startDate).lt('event_date', endDate)
    }

    const { data, error } = await query.order('event_date', { ascending: true })

    if (error) {
      // If table does not exist, just return empty to prevent breaking UI
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, data: [] })
      }
      throw error
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user from session
    const { user, response: authErr } = await requireAuth()
    if (authErr) return authErr

    const { id } = await params
    const body = await request.json()

    const admin = createAdminClient()
    
    // First check if table exists
    const checkTable = await admin.from('class_events').select('id').limit(1)
    
    if (checkTable.error && checkTable.error.code === '42P01') {
      return NextResponse.json(
        { success: false, error: 'Database table for events is not setup yet.' }, 
        { status: 500 }
      )
    }

    const { data, error } = await admin.from('class_events').insert({
      class_id: id,
      created_by: user.id, // Use actual authenticated user ID - no more hardcoded UUID!
      title: body.title,
      description: body.description || null,
      event_date: body.event_date,
      event_time: body.event_time || null,
      event_type: body.event_type || 'reminder'
    }).select().single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
