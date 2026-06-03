import { requireSiakadAuth } from '@/lib/api-auth'
// ============================================================
// /api/v1/semesters - Admin academic period management API
// Supports: action === 'create' OR action === 'activate'
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
    const { action, semesterId, code, name, academicYear, semesterType, startDate, endDate, isActive } = body

    // 1. ACTION: CREATE NEW SEMESTER
    if (action === 'create') {
      if (!code || !name || !academicYear || !semesterType || !startDate || !endDate) {
        return NextResponse.json({ success: false, error: 'Semua kolom form wajib diisi.' }, { status: 400 })
      }

      // Check if code is already registered
      const { data: existingCode } = await supabase
        .from('academic_semesters')
        .select('id')
        .eq('code', code)
        .maybeSingle()

      if (existingCode) {
        return NextResponse.json({ success: false, error: `Kode Semester '${code}' sudah digunakan oleh periode lain.` }, { status: 400 })
      }

      // If this new semester is set to active, reset all other semesters' is_active flag first
      if (isActive) {
        const { error: resetError } = await supabase
          .from('academic_semesters')
          .update({ is_active: false })
          .not('id', 'is', null)

        if (resetError) throw resetError

        // [NEW] Clean slate: deactivate all classes from previous semesters
        const { error: classResetError } = await supabase
          .from('classes')
          .update({ is_active: false })
          .not('id', 'is', null)
          
        if (classResetError) throw classResetError
      }

      // Insert new academic semester
      const { data, error: insertError } = await supabase
        .from('academic_semesters')
        .insert({
          code,
          name,
          academic_year: academicYear,
          semester_type: semesterType,
          start_date: startDate,
          end_date: endDate,
          is_active: !!isActive
        })
        .select()
        .single()

      if (insertError) throw insertError

      return NextResponse.json({
        success: true,
        message: `Periode akademik '${name}' berhasil ditambahkan${isActive ? ' dan diaktifkan' : ''}.`,
        data
      })
    } 
    
    // 2. ACTION: ACTIVATE EXISTING SEMESTER
    else {
      if (!semesterId) {
        return NextResponse.json({ success: false, error: 'ID Semester wajib diisi.' }, { status: 400 })
      }

      // Reset all other semesters
      const { error: resetError } = await supabase
        .from('academic_semesters')
        .update({ is_active: false })
        .not('id', 'is', null)

      if (resetError) throw resetError

      // [NEW] Clean slate: deactivate all classes not belonging to the activated semester
      const { error: classResetError } = await supabase
        .from('classes')
        .update({ is_active: false })
        .not('semester_id', 'eq', semesterId)

      if (classResetError) throw classResetError

      // Activate the requested semester
      const { data, error: updateError } = await supabase
        .from('academic_semesters')
        .update({ is_active: true })
        .eq('id', semesterId)
        .select()
        .single()

      if (updateError) throw updateError

      return NextResponse.json({
        success: true,
        message: `Periode perkuliahan '${data.name}' berhasil diaktifkan.`,
        data,
      })
    }
  } catch (error: any) {
    console.error('[SIAKAD Semesters API Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
