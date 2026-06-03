import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole, requireAuth } from '@/lib/auth'

export async function PUT(request: Request) {
  try {
    await requireRole('lecturer', 'admin')
    const { user, response } = await requireAuth()
    if (response) return response

    

    const body = await request.json()
    const { classId, backupLecturerId } = body

    if (!classId) {
      return NextResponse.json({ success: false, error: 'Class ID diperlukan' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Verifikasi kepemilikan kelas (Hanya dosen utama atau admin yang boleh mengubah ini)
    const { data: classData, error: classError } = await admin
      .from('classes')
      .select('lecturer_id')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ success: false, error: 'Kelas tidak ditemukan' }, { status: 404 })
    }

    const isAdmin = user.role === 'admin'
    if (classData.lecturer_id !== user.id && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Hanya dosen utama atau admin yang dapat mengubah dosen pembackup' },
        { status: 403 }
      )
    }

    // 2. Update backup_lecturer_id
    const { error: updateError } = await admin
      .from('classes')
      .update({ backup_lecturer_id: backupLecturerId || null })
      .eq('id', classId)

    if (updateError) {
      console.error('[Class Backup API] Update Error:', updateError)
      return NextResponse.json({ success: false, error: 'Gagal memperbarui dosen pembackup' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Dosen pembackup berhasil diperbarui' })
  } catch (err: any) {
    console.error('[Class Backup API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
