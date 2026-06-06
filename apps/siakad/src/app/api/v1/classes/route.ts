// ============================================================
// /api/v1/classes - Admin classes management API
// Inserts new class records directly in the LMS database
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveClassCoverUrl } from '@shared/class-cover'
import { requireSiakadAuth } from '@/lib/api-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const {
      courseId,
      semesterId,
      lecturerId,
      backupLecturerId,
      roomId,
      className,
      classSection,
      dayOfWeek,
      startTime,
      endTime,
      maxStudents
    } = body

    if (!courseId || !semesterId || !lecturerId || !className) {
      return NextResponse.json({ success: false, error: 'Mata Kuliah, Semester, Dosen, dan Nama Kelas wajib diisi.' }, { status: 400 })
    }

    const { data: lecturerProfile, error: lecturerErr } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', lecturerId)
      .single()

    if (lecturerErr || !lecturerProfile) {
      return NextResponse.json({ success: false, error: 'Dosen pengampu tidak ditemukan di database.' }, { status: 400 })
    }
    if (lecturerProfile.role !== 'lecturer' && lecturerProfile.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Profil yang dipilih bukan role dosen.' }, { status: 400 })
    }

    const { data: courseRow } = await supabase
      .from('courses')
      .select('name, code')
      .eq('id', courseId)
      .single()

    const autoCoverUrl = resolveClassCoverUrl(courseRow?.name || className, courseRow?.code || '')

    const { data, error } = await supabase
      .from('classes')
      .insert({
        course_id: courseId,
        semester_id: semesterId,
        lecturer_id: lecturerId,
        backup_lecturer_id: backupLecturerId || null,
        room_id: roomId || null,
        class_name: className,
        class_section: classSection || null,
        cover_image_url: autoCoverUrl,
        day_of_week: dayOfWeek || null,
        start_time: startTime || null,
        end_time: endTime || null,
        max_students: maxStudents ? parseInt(maxStudents) : 40,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Kelas ${className} berhasil dibuat untuk dosen ${lecturerProfile.name}. Dosen dapat melihat kelas ini setelah login di LMS (port 3000).`,
      data: { ...data, lecturer_id: lecturerId, lecturer_name: lecturerProfile.name },
    })
  } catch (error: any) {
    console.error('[SIAKAD Create Class API Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authError = requireSiakadAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const {
      id,
      courseId,
      semesterId,
      lecturerId,
      backupLecturerId,
      roomId,
      className,
      classSection,
      dayOfWeek,
      startTime,
      endTime,
      maxStudents
    } = body

    if (!id || !courseId || !semesterId || !lecturerId || !className) {
      return NextResponse.json({ success: false, error: 'ID, Mata Kuliah, Semester, Dosen, dan Nama Kelas wajib diisi.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('classes')
      .update({
        course_id: courseId,
        semester_id: semesterId,
        lecturer_id: lecturerId,
        backup_lecturer_id: backupLecturerId || null,
        room_id: roomId || null,
        class_name: className,
        class_section: classSection || null,
        day_of_week: dayOfWeek || null,
        start_time: startTime || null,
        end_time: endTime || null,
        max_students: maxStudents ? parseInt(maxStudents) : 40,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Kelas berhasil diperbarui.' })
  } catch (error: any) {
    console.error('[SIAKAD Edit Class API Error]', error)
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
      return NextResponse.json({ success: false, error: 'ID kelas wajib diisi.' }, { status: 400 })
    }

    // Manually delete related notifications that reference this class to bypass missing ON DELETE CASCADE
    await supabase.from('notifications').delete().eq('related_class_id', id)

    // Delete enrollments and assignments to be safe (if they don't have CASCADE)
    await supabase.from('enrollments').delete().eq('class_id', id)
    await supabase.from('assignments').delete().eq('class_id', id)
    await supabase.from('class_materials').delete().eq('class_id', id)
    await supabase.from('attendance_sessions').delete().eq('class_id', id)

    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true, message: 'Kelas berhasil dihapus.' })
  } catch (error: any) {
    console.error('[SIAKAD Delete Class API Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
