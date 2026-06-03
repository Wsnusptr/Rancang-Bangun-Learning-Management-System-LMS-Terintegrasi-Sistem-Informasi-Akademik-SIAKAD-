import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    // Require any authenticated user
    const authResult = await requireAuth()
    if (authResult.response) {
      return authResult.response
    }

    const supabase = await createClient()

    // Ambil data users dengan role 'lecturer' dari tabel profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, nidn, nip')
      .eq('role', 'lecturer')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('[Lecturers API] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Gagal mengambil data dosen' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[Lecturers API] Unexpected Error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

