import { requireSiakadAuth } from '@/lib/api-auth'
// ============================================================
// /api/v1/dosen - Admin lecturer (Dosen) registration API
// Registers Dosen in Supabase Auth & sets role to 'lecturer'
// ============================================================

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
    const body = await request.json()
    const { fullName, nip, nidn, phone, dateOfBirth, gender, address, password } = body

    if (!fullName || !nip) {
      return NextResponse.json({ success: false, error: 'Nama Lengkap dan NIP wajib diisi.' }, { status: 400 })
    }

    // Auto-generate email based on NIP
    const email = `${nip}@stmik.jayakarta.ac.id`

    // Check if email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const emailExists = existingUsers?.users.some(u => u.email?.toLowerCase() === email.toLowerCase())

    if (emailExists) {
      return NextResponse.json({
        success: false,
        error: 'Email sudah terdaftar di sistem.'
      }, { status: 409 })
    }

    // 1. Create user account in Supabase Auth securely
    const defaultPassword = password || nip || nidn || 'DosenJayakarta2026!'
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'lecturer'
      }
    })

    if (authError) {
      console.error('[SIAKAD Create Dosen Auth Error]', authError)
      return NextResponse.json({ success: false, error: `Gagal membuat akun auth: ${authError.message}` }, { status: 500 })
    }

    const authUser = authData.user
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'User tidak berhasil dibuat di Auth.' }, { status: 500 })
    }

    // 2. Upsert into public.profiles as role 'lecturer'
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        name: fullName,
        role: 'lecturer',
        nip: nip || null,
        nidn: nidn || null,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        address: address || null,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('[SIAKAD Create Dosen Profile Error]', profileError)
      return NextResponse.json({
        success: false,
        error: `Akun auth berhasil dibuat, namun gagal menyimpan profil: ${profileError.message}`
      }, { status: 550 })
    }

    return NextResponse.json({
      success: true,
      message: `Dosen ${fullName} berhasil didaftarkan. Email aktif sebagai dosen di LMS.`,
      data: {
        id: authUser.id,
        fullName,
        email,
        nip,
        nidn
      }
    })
  } catch (error: any) {
    console.error('[SIAKAD Create Dosen API Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, fullName, nip, nidn, phone, dateOfBirth, gender, address } = body

    if (!id || !fullName) {
      return NextResponse.json({ success: false, error: 'ID dan Nama Lengkap wajib diisi.' }, { status: 400 })
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name: fullName,
        nip: nip || null,
        nidn: nidn || null,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        address: address || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (profileError) throw profileError

    // Note: We do not update the email here because it is tied to NIP.
    // If NIP changes, we theoretically should update the Auth email too.
    if (nip) {
        const newEmail = `${nip}@stmik.jayakarta.ac.id`
        await supabase.auth.admin.updateUserById(id, { email: newEmail })
    }

    return NextResponse.json({ success: true, message: 'Data dosen berhasil diperbarui.' })
  } catch (error: any) {
    console.error('[SIAKAD Edit Dosen API Error]', error)
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
      return NextResponse.json({ success: false, error: 'ID wajib diisi.' }, { status: 400 })
    }

    // Delete from profiles
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', id)
    if (profileError) throw profileError

    // Delete from Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id)
    if (authError) throw authError

    return NextResponse.json({ success: true, message: 'Dosen berhasil dihapus.' })
  } catch (error: any) {
    console.error('[SIAKAD Delete Dosen API Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
