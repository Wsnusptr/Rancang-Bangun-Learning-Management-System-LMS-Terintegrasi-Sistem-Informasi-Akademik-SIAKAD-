import { requireSiakadAuth } from '@/lib/api-auth'
// ============================================================
// /api/v1/verify-pmb - Verify prospective student & assign NIM
// Synchronizes LMS profiles with SIAKAD students
// Performs AUTOMATED class enrollment in active classes
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
    const { userId, email, fullName, nim, intendedProgram, phone, address } = body

    if (!nim) {
      return NextResponse.json({ success: false, error: 'NIM is required' }, { status: 400 })
    }

    let programId: string | null = null
    let programLabel = 'Teknik Informatika'

    if (intendedProgram === 'S1-TI' || intendedProgram === 'TI') {
      programLabel = 'S1 Teknik Informatika'
    } else if (intendedProgram === 'S1-SI' || intendedProgram === 'SI') {
      programLabel = 'S1 Sistem Informasi'
    }

    // 1. Resolve study program UUID from study_programs
    const { data: programRow } = await supabase
      .from('study_programs')
      .select('id, name')
      .eq('code', intendedProgram || 'S1-TI')
      .single()

    if (programRow) {
      programId = programRow.id
      programLabel = programRow.name
    } else {
      // Fallback: try S1-TI program if programRow is empty
      const { data: fallbackRow } = await supabase
        .from('study_programs')
        .select('id, name')
        .eq('code', 'S1-TI')
        .single()
      if (fallbackRow) {
        programId = fallbackRow.id
        programLabel = fallbackRow.name
      }
    }

    // 2. Ensure User exists in Auth and Profile is updated/created
    let finalUserId = userId

    if (!finalUserId) {
      // If no userId provided (manual PMB without login), try to find them by email in Auth
      if (email) {
        const { data: searchUsers } = await supabase.auth.admin.listUsers()
        const existingAuth = searchUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (existingAuth) finalUserId = existingAuth.id
      }
    }

    const newEmail = `${nim}@stmik.jayakarta.ac.id`

    if (finalUserId) {
      // User exists in auth, update their email and password
      const { error: authError } = await supabase.auth.admin.updateUserById(finalUserId, {
        email: newEmail,
        password: nim,
        email_confirm: true
      })
      if (authError) {
        console.error('[SIAKAD Verify PMB] Failed to update auth email:', authError)
      }
    } else {
      // User does not exist in auth (manual PMB only), CREATE auth user
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email: newEmail,
        password: nim,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'student' }
      })
      if (createError) {
        console.error('[SIAKAD Verify PMB] Failed to create auth user:', createError)
      } else if (authData.user) {
        finalUserId = authData.user.id
      }
    }

    // Upsert the profile to guarantee the student has an LMS profile
    if (finalUserId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: finalUserId,
          nim: nim,
          name: fullName,
          phone: phone || null,
          address: address || null,
          email: newEmail,
          study_program_id: programId,
          role: 'student',
          enrollment_year: new Date().getFullYear(),
          is_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (profileError) {
        console.error('[SIAKAD Verify PMB] Failed to upsert LMS profile:', profileError)
      }
    }

    // --- AUTOMATION: Automatically enroll student in active classes of their study program ---
    if (programId && finalUserId) {
        try {
          // 1. Dapatkan semester yang sedang aktif saat ini
          const { data: activeSemester } = await supabase
            .from('academic_semesters')
            .select('id')
            .eq('is_active', true)
            .maybeSingle()

          if (activeSemester) {
            const { data: activeClasses, error: classFetchError } = await supabase
              .from('classes')
              .select('id, course_id, courses!inner(study_program_id)')
              .eq('courses.study_program_id', programId)
              .eq('semester_id', activeSemester.id)
              .eq('is_active', true)

            if (classFetchError) throw classFetchError

          if (activeClasses && activeClasses.length > 0) {
            const enrollmentInserts = activeClasses.map(cls => ({
              student_id: finalUserId,
              class_id: cls.id,
              status: 'active'
            }))

            // Bulk upsert into enrollments (ignoring duplicates)
            const { error: enrollError } = await supabase
              .from('enrollments')
              .upsert(enrollmentInserts, { onConflict: 'student_id,class_id' })

            if (enrollError) {
              console.error('[SIAKAD Verify PMB] Failed to auto-enroll student in classes:', enrollError)
            } else {
              console.log(`[SIAKAD Verify PMB] Auto-enrolled student ${fullName} in ${activeClasses.length} active classes.`)
            }
          }
          } // <-- Added closing brace for activeSemester
        } catch (enrollErr) {
          console.error('[SIAKAD Verify PMB] Automated enrollment failed:', enrollErr)
        }
      }
    // No extra brace

    // 3. Upsert into SIAKAD students reference table
    const { error: studentError } = await supabase
      .from('students')
      .upsert({
        nim: nim,
        name: fullName || '',
        study_program: programLabel,
        academic_year: new Date().getFullYear().toString(),
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'nim' })

    if (studentError) {
      console.error('[SIAKAD Verify PMB] Failed to upsert student:', studentError)
    }

    // 4. Update the mahasiswa_baru record in SIAKAD (by email or user details)
    if (email) {
      const { error: mbError } = await supabase
        .from('mahasiswa_baru')
        .update({
          email: newEmail,
          status: 'enrolled',
          assigned_nim: nim,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)

      if (mbError) {
        console.error('[SIAKAD Verify PMB] Failed to update mahasiswa_baru status:', mbError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memverifikasi calon mahasiswa ${fullName}. NIM ${nim} telah diterbitkan. Mahasiswa otomatis didaftarkan di kelas aktif program studi.`,
      data: {
        nim,
        fullName,
        studyProgram: programLabel
      }
    })
  } catch (error: any) {
    console.error('[SIAKAD Verify PMB Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
