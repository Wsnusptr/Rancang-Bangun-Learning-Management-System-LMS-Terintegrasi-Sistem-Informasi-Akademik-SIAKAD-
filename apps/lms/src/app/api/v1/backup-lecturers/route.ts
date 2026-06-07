import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'

/**
 * POST /api/v1/backup-lecturers
 * Creates a new temporary backup lecturer account with expiration.
 * Only main lecturers (or admins) can create backup accounts.
 *
 * Body:
 *   classId      - UUID of the class to assign backup to
 *   name         - Full name of the backup lecturer
 *   email        - Email for the new account
 *   password     - Password for the new account (min 8 chars)
 *   durationHours - Number of hours the account stays active (2, 3, or 4)
 */
export async function POST(request: NextRequest) {
  try {
    // Only main lecturers or admins can create backup accounts
    const authCheck = await requireRole('lecturer', 'admin')
    if (authCheck.response) return authCheck.response
    const requester = authCheck.user!

    const body = await request.json()
    const { classId, name, email, password, durationHours } = body

    // --- Input validation ---
    if (!classId || !name || !email || !password || !durationHours) {
      return NextResponse.json(
        { success: false, error: 'Semua field wajib diisi: classId, name, email, password, durationHours' },
        { status: 400 }
      )
    }

    const durationNum = Number(durationHours)
    if (![2, 3, 4].includes(durationNum)) {
      return NextResponse.json(
        { success: false, error: 'Durasi harus antara 2, 3, atau 4 jam' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password minimal 8 karakter' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // --- Verify class ownership (requester must be the main lecturer of this class) ---
    const { data: classData, error: classError } = await admin
      .from('classes')
      .select('id, lecturer_id')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ success: false, error: 'Kelas tidak ditemukan' }, { status: 404 })
    }

    if (requester.role !== 'admin' && classData.lecturer_id !== requester.id) {
      return NextResponse.json(
        { success: false, error: 'Anda bukan dosen utama kelas ini' },
        { status: 403 }
      )
    }

    // --- Check if email already in use ---
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const emailTaken = existingUsers?.users?.some(u => u.email === email)
    if (emailTaken) {
      return NextResponse.json(
        { success: false, error: `Email ${email} sudah terdaftar di sistem` },
        { status: 409 }
      )
    }

    // --- Calculate expiry ---
    const expiresAt = new Date(Date.now() + durationNum * 60 * 60 * 1000).toISOString()

    // --- Create auth user with service role ---
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email so they can login immediately
      user_metadata: {
        full_name: name,
        is_backup_lecturer: true,
        expires_at: expiresAt,
        created_by_lecturer_id: requester.id,
        assigned_class_id: classId,
      },
    })

    if (createError || !newUser.user) {
      return NextResponse.json(
        { success: false, error: createError?.message || 'Gagal membuat akun' },
        { status: 500 }
      )
    }

    const newUserId = newUser.user.id

    // --- Insert into profiles table with role 'lecturer' ---
    const { error: profileError } = await admin.from('profiles').insert({
      id: newUserId,
      name: name,
      role: 'lecturer',
      email: email,
      is_active: true,
      is_backup_lecturer: true,
      backup_expires_at: expiresAt,
      created_by: requester.id,
    })

    if (profileError) {
      // Rollback: delete the auth user if profile insert fails
      await admin.auth.admin.deleteUser(newUserId)
      
      // If error is about column not found, try without the backup-specific fields
      if (profileError.code === '42703' || profileError.message?.includes('column')) {
        // Retry with minimal fields
        const { error: profileError2 } = await admin.from('profiles').insert({
          id: newUserId,
          name: name,
          role: 'lecturer',
          is_active: true,
        })

        if (profileError2) {
          await admin.auth.admin.deleteUser(newUserId)
          return NextResponse.json(
            { success: false, error: `Gagal membuat profil: ${profileError2.message}` },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { success: false, error: `Gagal membuat profil: ${profileError.message}` },
          { status: 500 }
        )
      }
    }

    // --- Assign as backup_lecturer_id in the class ---
    const { error: updateError } = await admin
      .from('classes')
      .update({ backup_lecturer_id: newUserId })
      .eq('id', classId)

    if (updateError) {
      // Don't fail entirely - account created but assignment failed
      console.error('[backup-lecturers] Failed to assign backup to class:', updateError)
      return NextResponse.json({
        success: true,
        warning: 'Akun dibuat tapi gagal ditugaskan ke kelas. Hubungi admin.',
        data: { userId: newUserId, email, name, expiresAt },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Akun dosen backup ${name} berhasil dibuat. Aktif selama ${durationNum} jam hingga ${new Date(expiresAt).toLocaleString('id-ID')}.`,
      data: {
        userId: newUserId,
        email,
        name,
        expiresAt,
        classId,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * GET /api/v1/backup-lecturers?classId=...
 * Returns active backup lecturer info for a class.
 */
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireRole('lecturer', 'admin')
    if (authCheck.response) return authCheck.response
    const requester = authCheck.user!

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    const admin = createAdminClient()

    let query = admin
      .from('class_details')
      .select('id, class_name, course_name, class_code, backup_lecturer_id, backup_lecturer_name, backup_lecturer_avatar')
      .eq('is_active', true)

    if (classId) {
      query = query.eq('id', classId)
    } else {
      // Return all classes where requester is the main lecturer
      query = query.eq('lecturer_id', requester.id)
    }

    const { data, error } = await query

    if (error) throw error

    // Enrich with expiry info from auth user metadata
    const enriched = await Promise.all(
      (data || []).map(async (cls) => {
        if (!cls.backup_lecturer_id) return { ...cls, backupExpiresAt: null, isExpired: false }

        // Check if backup account is expired
        const { data: authUser } = await admin.auth.admin.getUserById(cls.backup_lecturer_id)
        const meta = authUser?.user?.user_metadata
        const expiresAt = meta?.expires_at || null
        const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false

        return { ...cls, backupExpiresAt: expiresAt, isExpired }
      })
    )

    return NextResponse.json({ success: true, data: enriched })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/backup-lecturers
 * Revoke backup lecturer access for a class.
 * Body: { classId, backupUserId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const authCheck = await requireRole('lecturer', 'admin')
    if (authCheck.response) return authCheck.response
    const requester = authCheck.user!

    const body = await request.json()
    const { classId, backupUserId } = body

    if (!classId) {
      return NextResponse.json({ success: false, error: 'classId is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify ownership
    const { data: classData } = await admin
      .from('classes')
      .select('lecturer_id, backup_lecturer_id')
      .eq('id', classId)
      .single()

    if (!classData || (requester.role !== 'admin' && classData.lecturer_id !== requester.id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Remove backup from class
    await admin.from('classes').update({ backup_lecturer_id: null }).eq('id', classId)

    // If backupUserId provided and it's a backup account, delete it entirely
    if (backupUserId) {
      const { data: authUser } = await admin.auth.admin.getUserById(backupUserId)
      if (authUser?.user?.user_metadata?.is_backup_lecturer) {
        await admin.auth.admin.deleteUser(backupUserId)
      }
    }

    return NextResponse.json({ success: true, message: 'Akses dosen backup dicabut' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
