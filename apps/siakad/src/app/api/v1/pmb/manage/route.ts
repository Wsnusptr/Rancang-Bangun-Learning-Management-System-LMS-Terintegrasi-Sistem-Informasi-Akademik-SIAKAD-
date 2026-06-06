import { requireSiakadAuth } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_TABLES = [
  'pmb_programs', 'pmb_schedules', 'pmb_faqs', 'pmb_scholarships',
  'pmb_requirements', 'pmb_testimonials', 'pmb_facilities', 'pmb_contacts', 'pmb_resources'
]

export async function GET(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table')

  if (!table || !ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false })
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { table, data } = body

    if (!table || !ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    }

    const { data: result, error } = await supabase.from(table).insert([data]).select().single()
    if (error) throw error

    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { table, id, data } = body

    if (!table || !ALLOWED_TABLES.includes(table) || !id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select().single()
    if (error) throw error

    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { table, id } = body

    if (!table || !ALLOWED_TABLES.includes(table) || !id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
