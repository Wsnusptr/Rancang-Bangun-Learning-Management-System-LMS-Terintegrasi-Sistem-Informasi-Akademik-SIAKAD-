import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAuth()
    if (authCheck.response) return authCheck.response
    const authUser = authCheck.user

    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json({ error: 'File dan userId diperlukan' }, { status: 400 })
    }

    if (authUser.id !== userId && authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    // Initialize Supabase with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if 'avatars' bucket exists, if not, create it
    const { data: buckets } = await supabase.storage.listBuckets()
    const hasAvatars = buckets?.some(b => b.name === 'avatars')
    if (!hasAvatars) {
      await supabase.storage.createBucket('avatars', { public: true })
    }

    const ext = file.name.split('.').pop()
    const filePath = `${userId}/avatar_${Date.now()}.${ext}`

    // Upload file using service role
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, cacheControl: '3600' })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      return NextResponse.json({ error: 'Gagal mengunggah gambar' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Update profile
    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error: any) {
    console.error('Avatar upload exception:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}
