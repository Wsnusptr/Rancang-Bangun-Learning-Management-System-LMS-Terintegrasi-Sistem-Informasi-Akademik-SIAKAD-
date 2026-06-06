import { requireSiakadAuth } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, name, nim, phone, address, gender, dateOfBirth, study_program_id } = body

    if (!id || !name || !nim) {
      return NextResponse.json({ success: false, error: 'ID, Nama, dan NIM wajib diisi.' }, { status: 400 })
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name,
        nim,
        phone: phone || null,
        address: address || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        study_program_id: study_program_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (profileError) throw profileError

    // Note: We don't change Auth email here, since NIM is fixed. If NIM changes, we should ideally update email too.
    
    return NextResponse.json({ success: true, message: 'Data mahasiswa berhasil diperbarui.' })
  } catch (error: any) {
    console.error('[SIAKAD Edit Student API Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID mahasiswa wajib diisi.' }, { status: 400 })
    }

    // Clean up related records manually to bypass foreign key constraints
    await supabase.from('notifications').delete().eq('recipient_id', id)
    await supabase.from('enrollments').delete().eq('student_id', id)
    await supabase.from('submissions').delete().eq('student_id', id)
    await supabase.from('attendance_records').delete().eq('student_id', id)
    await supabase.from('student_grades').delete().eq('student_id', id)
    await supabase.from('academic_records').delete().eq('student_id', id)

    // Delete from mahasiswa_baru if the ID belongs to a PMB applicant (hasn't synced yet)
    await supabase.from('mahasiswa_baru').delete().eq('id', id)
    
    // Also try to find if this profile is linked to a mahasiswa_baru via assigned_nim
    const { data: profileData } = await supabase.from('profiles').select('nim').eq('id', id).single()
    if (profileData?.nim) {
      await supabase.from('mahasiswa_baru').delete().eq('assigned_nim', profileData.nim)
    }

    // Delete from profiles
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', id)
    if (profileError) throw profileError

    // Delete from Auth (ignore if already deleted/not found)
    const { error: authError } = await supabase.auth.admin.deleteUser(id)
    if (authError && authError.message !== 'User not found') {
      throw authError
    }

    return NextResponse.json({ success: true, message: 'Mahasiswa berhasil dihapus.' })
  } catch (error: any) {
    console.error('[SIAKAD Delete Student API Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
