import { requireSiakadAuth } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }

    const MAX_SIZE = 50 * 1024 * 1024 // 50 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'File size exceeds 50 MB limit' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `announcements/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('pmb_resources')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('announcements')
      .getPublicUrl(filePath)

    return NextResponse.json({ success: true, url: publicUrlData.publicUrl })
  } catch (error: any) {
    console.error('[SIAKAD File Upload Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
