import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    const { data: setting, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'master_weights')
      .single()

    let data = { absen: 10, tugas: 20, kuis: 10, uts: 30, uas: 30 }
    if (!error && setting) {
      data = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value
    }
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ key: 'master_weights', value: body })

    if (error) throw error
    return NextResponse.json({ success: true, data: body })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
