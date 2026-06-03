// ============================================================
// GET    /api/classes/[id] - Get class detail
// PATCH  /api/classes/[id] - Update class (lecturer/admin)
// DELETE /api/classes/[id] - Delete class (admin only)
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireClassLecturer, requireRole } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/utils'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, response } = await requireAuth()
    if (response) return response

    const supabase = await createClient()

    const { data: cls, error } = await supabase
      .from('class_details')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !cls) return notFoundResponse('Kelas')

    // Check access: must be lecturer, enrolled student, or admin
    if (user.role === 'student') {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('class_id', id)
        .eq('student_id', user.id)
        .single()

      if (!enrollment || enrollment.status !== 'active') {
        return errorResponse('Anda tidak memiliki akses ke kelas ini', 403)
      }
    }

    // Get enrolled students count + list (for lecturer/admin)
    let students = null
    if (user.role === 'lecturer' || user.role === 'admin' || user.role === 'staff') {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          id, status, joined_at,
          profiles!enrollments_student_id_fkey (id, name, nim, avatar_url)
        `)
        .eq('class_id', id)
        .eq('status', 'active')
        .order('joined_at')

      students = enrollments
    }

    return successResponse({ ...cls, students })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

const updateClassSchema = z.object({
  className: z.string().min(3).max(150).optional(),
  classSection: z.string().max(10).optional().nullable(),
  roomId: z.string().uuid().optional().nullable(),
  coverColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  dayOfWeek: z.enum(['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']).optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  maxStudents: z.number().int().min(1).max(200).optional(),
  minAttendancePct: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  weightAttendance: z.number().min(0).max(100).optional(),
  weightAssignments: z.number().min(0).max(100).optional(),
  weightQuiz: z.number().min(0).max(100).optional(),
  weightMidterm: z.number().min(0).max(100).optional(),
  weightFinal: z.number().min(0).max(100).optional(),
})

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { response } = await requireClassLecturer(id)
    if (response) return response

    const body = await request.json()
    const parsed = updateClassSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e: any) => e.message).join(', '),
        422
      )
    }

    const data = parsed.data
    const supabase = await createClient()

    const updatePayload: Record<string, unknown> = {}
    if (data.className !== undefined) updatePayload.class_name = data.className
    if (data.classSection !== undefined) updatePayload.class_section = data.classSection
    if (data.roomId !== undefined) updatePayload.room_id = data.roomId
    if (data.coverColor !== undefined) updatePayload.cover_color = data.coverColor
    if (data.coverImageUrl !== undefined) updatePayload.cover_image_url = data.coverImageUrl
    if (data.description !== undefined) updatePayload.description = data.description
    if (data.dayOfWeek !== undefined) updatePayload.day_of_week = data.dayOfWeek
    if (data.startTime !== undefined) updatePayload.start_time = data.startTime
    if (data.endTime !== undefined) updatePayload.end_time = data.endTime
    if (data.maxStudents !== undefined) updatePayload.max_students = data.maxStudents
    if (data.minAttendancePct !== undefined) updatePayload.min_attendance_pct = data.minAttendancePct
    if (data.isActive !== undefined) updatePayload.is_active = data.isActive
    if (data.weightAttendance !== undefined) updatePayload.weight_attendance = data.weightAttendance
    if (data.weightAssignments !== undefined) updatePayload.weight_assignments = data.weightAssignments
    if (data.weightQuiz !== undefined) updatePayload.weight_quiz = data.weightQuiz
    if (data.weightMidterm !== undefined) updatePayload.weight_midterm = data.weightMidterm
    if (data.weightFinal !== undefined) updatePayload.weight_final = data.weightFinal

    const { data: updated, error } = await supabase
      .from('classes')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return successResponse(updated, 'Kelas berhasil diperbarui')
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { response } = await requireRole('admin')
    if (response) return response

    const supabase = await createClient()

    // Soft delete: set is_active = false instead of hard delete
    const { error } = await supabase
      .from('classes')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    return successResponse(null, 'Kelas berhasil dinonaktifkan')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
