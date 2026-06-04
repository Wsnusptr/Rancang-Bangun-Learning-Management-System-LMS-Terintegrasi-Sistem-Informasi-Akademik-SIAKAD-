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
    const { userId, email, fullName, phone, dateOfBirth, address, intendedProgram } = body

    if (!userId && !email) {
      return NextResponse.json({ success: false, error: 'ID atau Email PMB wajib disertakan.' }, { status: 400 })
    }

    let updated = false

    // 1. Update in profiles (if userId is available)
    if (userId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: fullName,
          phone: phone || null,
          date_of_birth: dateOfBirth || null,
          address: address || null,
          intended_program: intendedProgram || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .eq('role', 'pmb') // ensure safety

      if (profileError) {
        console.error('[SIAKAD Edit PMB Profiles Error]', profileError)
      } else {
        updated = true
      }
    }

    // 2. Update in mahasiswa_baru (if email is available)
    if (email) {
      const { error: mbError } = await supabase
        .from('mahasiswa_baru')
        .update({
          full_name: fullName,
          phone: phone || null,
          date_of_birth: dateOfBirth || null,
          address: address || null,
          intended_program: intendedProgram || null,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)

      if (mbError) {
        console.error('[SIAKAD Edit PMB MB Error]', mbError)
      } else {
        updated = true
      }
    }

    if (!updated) {
       return NextResponse.json({ success: false, error: 'Gagal memperbarui data PMB. Data tidak ditemukan.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Data Calon Mahasiswa (PMB) berhasil diperbarui.' })
  } catch (error: any) {
    console.error('[SIAKAD Edit PMB API Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const email = searchParams.get('email')

    if (!userId && !email) {
      return NextResponse.json({ success: false, error: 'ID atau Email PMB wajib disertakan.' }, { status: 400 })
    }

    let deleted = false

    // 1. Delete from Auth and Profiles (if userId is available)
    if (userId) {
      // Deleting from auth automatically cascades to public.profiles in most setups, 
      // but we do it manually to be safe.
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId).eq('role', 'pmb')
      
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)
      
      if (!profileError && !authError) {
        deleted = true
      } else {
        console.error('[SIAKAD Delete PMB Auth Error]', authError || profileError)
      }
    }

    // 2. Delete from mahasiswa_baru (if email is available)
    if (email) {
      const { error: mbError } = await supabase.from('mahasiswa_baru').delete().eq('email', email)
      if (!mbError) {
        deleted = true
      } else {
        console.error('[SIAKAD Delete PMB MB Error]', mbError)
      }
    }

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Gagal menghapus PMB.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Calon Mahasiswa (PMB) berhasil dihapus permanen.' })
  } catch (error: any) {
    console.error('[SIAKAD Delete PMB API Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
