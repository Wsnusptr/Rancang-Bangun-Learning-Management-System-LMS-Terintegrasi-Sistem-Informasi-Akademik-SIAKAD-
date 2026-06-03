// ============================================================
// GET  /api/classes         - List classes (role-aware)
// POST /api/classes         - Create a new class (lecturer)
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/utils'
import { z } from 'zod'
import { resolveClassCoverUrl } from '@shared/class-cover'

// GET: List classes filtered by role
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (response) return response

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semester_id')
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('class_details')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by semester if provided
    if (semesterId) {
      query = query.eq('id', semesterId) // will be applied via class join
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    // Role-based filtering
    if (user.role === 'student') {
      // Students: only enrolled classes
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('student_id', user.id)
        .eq('status', 'active')

      const classIds = enrollments?.map(e => e.class_id) || []
      if (classIds.length === 0) {
        return successResponse([], 'Anda belum terdaftar di kelas manapun')
      }
      query = query.in('id', classIds)
    } else if (user.role === 'lecturer') {
      const { data: myClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('lecturer_id', user.id)
      const classIds = myClasses?.map((c) => c.id) || []
      if (classIds.length === 0) {
        return successResponse([], 'Belum ada kelas yang diampu')
      }
      query = query.in('id', classIds)
    }
    // Admin/staff: see all classes

    const { data, error } = await query

    if (error) throw error

    // Backfill missing banners in background (non-blocking)
    if (data && data.length > 0) {
      const missingCovers = data.filter(c => !c.cover_image_url)
      if (missingCovers.length > 0) {
        // Run updates in background
        Promise.all(missingCovers.map(async (cls) => {
          try {
            const url = resolveClassCoverUrl(cls.course_name || cls.class_name, cls.course_code || '')
            await supabase.from('classes').update({ cover_image_url: url }).eq('id', cls.id)
          } catch (e) {
            console.error('[Backfill Error]', e)
          }
        })).catch(console.error)
      }
    }

    return successResponse(data, undefined, { total: data?.length || 0 })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

// Validation schema
const createClassSchema = z.object({
  courseId: z.string().optional(),
  semesterId: z.string().uuid('semester_id tidak valid'),
  roomId: z.string().uuid().optional(),
  className: z.string().min(3).max(150),
  classSection: z.string().max(10).optional(),
  coverColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(1000).optional(),
  dayOfWeek: z.enum(['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxStudents: z.number().int().min(1).max(200).optional(),
  minAttendancePct: z.number().min(0).max(100).optional(),
  // Grade weights (must sum to 100)
  weightAttendance: z.number().min(0).max(100).optional(),
  weightAssignments: z.number().min(0).max(100).optional(),
  weightQuiz: z.number().min(0).max(100).optional(),
  weightMidterm: z.number().min(0).max(100).optional(),
  weightFinal: z.number().min(0).max(100).optional(),
})

// POST: Create class
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireRole('lecturer', 'admin')
    if (response) return response

    const body = await request.json()
    const parsed = createClassSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        422
      )
    }

    const data = parsed.data

    // Validate weight sum = 100 if all weights provided
    const weights = [
      data.weightAttendance ?? 10,
      data.weightAssignments ?? 20,
      data.weightQuiz ?? 10,
      data.weightMidterm ?? 30,
      data.weightFinal ?? 30,
    ]
    const weightSum = weights.reduce((a, b) => a + b, 0)
    if (Math.abs(weightSum - 100) > 0.01) {
      return errorResponse(
        `Total bobot nilai harus 100. Saat ini: ${weightSum}`,
        422
      )
    }

    const supabase = await createClient()

    let finalCourseId = data.courseId
    // If courseId is not provided or not a valid uuid, we create a private course
    if (!finalCourseId || !finalCourseId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: newCourse, error: courseErr } = await supabase
        .from('courses')
        .insert({
          code: 'PRV-' + Math.floor(Math.random() * 100000),
          name: data.className || 'Kelas Privat',
          credits: 0,
          is_active: true
        })
        .select('id')
        .single()
      
      if (courseErr || !newCourse) {
        return errorResponse('Gagal membuat mata kuliah privat untuk kelas ini', 500)
      }
      finalCourseId = newCourse.id
    }

    // Auto-generate cover color if not provided
    const autoCoverUrl = resolveClassCoverUrl(data.className, '')

    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        course_id: finalCourseId,
        semester_id: data.semesterId,
        room_id: data.roomId || null,
        lecturer_id: user.id,
        class_name: data.className,
        class_section: data.classSection || null,
        cover_color: data.coverColor || '#1A3A6B',
        cover_image_url: autoCoverUrl,
        description: data.description || null,
        day_of_week: data.dayOfWeek || null,
        start_time: data.startTime || null,
        end_time: data.endTime || null,
        max_students: data.maxStudents || 40,
        min_attendance_pct: data.minAttendancePct ?? 75,
        weight_attendance: data.weightAttendance ?? 10,
        weight_assignments: data.weightAssignments ?? 20,
        weight_quiz: data.weightQuiz ?? 10,
        weight_midterm: data.weightMidterm ?? 30,
        weight_final: data.weightFinal ?? 30,
      })
      .select(`
        *,
        courses (id, code, name, credits),
        academic_semesters (id, name, academic_year, semester_type),
        profiles!classes_lecturer_id_fkey (id, name, nip)
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        return errorResponse('Kode kelas sudah digunakan, silakan coba lagi', 409)
      }
      throw error
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'CREATE_CLASS',
      entity_type: 'class',
      entity_id: newClass.id,
      new_value: { class_name: data.className, course_id: data.courseId },
    })

    return successResponse(newClass, 'Kelas berhasil dibuat', undefined, 201)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

