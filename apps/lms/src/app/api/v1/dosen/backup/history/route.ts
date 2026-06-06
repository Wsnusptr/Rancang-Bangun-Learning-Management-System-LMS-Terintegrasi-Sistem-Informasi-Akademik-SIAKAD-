import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const authCheck = await requireRole('lecturer', 'admin')
    if (authCheck.response) return authCheck.response

    const user = authCheck.user!

    // Get all classes where this user is the main lecturer AND has a backup assigned
    const { data, error } = await supabaseAdmin
      .from('classes')
      .select(`
        id,
        backup_lecturer_id,
        backup_lecturer:profiles!classes_backup_lecturer_id_fkey(id, full_name, email),
        class_details:id (class_name, course_name, class_code)
      `)
      .eq('lecturer_id', user.id)
      .not('backup_lecturer_id', 'is', null)

    if (error) throw error

    const mapped = (data || []).map((cls: any) => ({
      classId: cls.id,
      className: cls.class_details ? `${cls.class_details.course_name} - ${cls.class_details.class_name}` : cls.id,
      backupLecturerId: cls.backup_lecturer_id,
      backupName: cls.backup_lecturer?.full_name || 'Unknown',
      backupEmail: cls.backup_lecturer?.email || ''
    }))

    return NextResponse.json({ success: true, data: mapped })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

