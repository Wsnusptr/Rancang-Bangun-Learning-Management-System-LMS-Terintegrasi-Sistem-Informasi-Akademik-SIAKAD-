import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
  try {
    const authCheck = await requireRole('lecturer', 'admin')
    if (authCheck.response) return authCheck.response

    // Fetch all lecturers
    const { data: lecturers, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'lecturer')
      .eq('is_active', true)
      .order('full_name')

    if (error) throw error

    return NextResponse.json({ success: true, data: lecturers })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await requireRole('lecturer')
    if (authCheck.response) return authCheck.response
    
    const user = authCheck.user!
    const body = await request.json()
    const { classId, backupLecturerId } = body

    if (!classId) {
      return NextResponse.json({ success: false, error: 'classId is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: cls, error: clsError } = await supabaseAdmin
      .from('classes')
      .select('lecturer_id')
      .eq('id', classId)
      .single()

    if (clsError || cls?.lecturer_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized to modify this class' }, { status: 403 })
    }

    // Assign backup
    const { error: updateError } = await supabaseAdmin
      .from('classes')
      .update({ backup_lecturer_id: backupLecturerId || null })
      .eq('id', classId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, message: backupLecturerId ? 'Dosen pengganti ditugaskan' : 'Dosen pengganti dihapus' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
