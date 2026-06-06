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
    const { filename } = await request.json()

    if (!filename) {
      return NextResponse.json({ success: false, error: 'No filename provided' }, { status: 400 })
    }

    const fileExt = filename.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `announcements/${fileName}`

    // Create a signed upload URL valid for 10 minutes
    const { data: signedData, error: signedError } = await supabase.storage
      .from('pmb_resources')
      .createSignedUploadUrl(filePath)

    if (signedError) throw signedError

    // Pre-calculate public URL for the client to save
    const { data: publicUrlData } = supabase.storage
      .from('pmb_resources')
      .getPublicUrl(filePath)

    return NextResponse.json({ 
      success: true, 
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      path: signedData.path,
      url: publicUrlData.publicUrl 
    })
  } catch (error: any) {
    console.error('[SIAKAD File Upload Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
