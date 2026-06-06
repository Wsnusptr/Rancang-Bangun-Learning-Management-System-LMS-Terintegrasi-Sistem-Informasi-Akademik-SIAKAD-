import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    let data = { absen: 10, tugas: 20, kuis: 10, uts: 30, uas: 30 }
    
    const { data: settingData, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'master_weights')
      .single()

    if (!error && settingData) {
      if (typeof settingData.value === 'string') {
        data = JSON.parse(settingData.value)
      } else {
        data = settingData.value
      }
    }
    
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate
    const total = Number(body.absen) + Number(body.tugas) + Number(body.kuis) + Number(body.uts) + Number(body.uas)
    if (total !== 100) {
      return NextResponse.json({ success: false, error: 'Total bobot harus 100%' }, { status: 400 })
    }

    const { error } = await supabase
      .from('system_settings')
      .upsert({ 
        key: 'master_weights', 
        value: body,
        description: 'Master weights configuration for academic grading',
        is_public: true
      }, { onConflict: 'key' })

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Bobot berhasil disimpan', data: body })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
