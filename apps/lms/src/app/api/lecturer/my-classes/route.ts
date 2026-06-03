import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, serverErrorResponse, errorResponse } from '@/lib/utils'
import { resolveClassCoverUrl } from '@shared/class-cover'

/** GET - kelas milik dosen yang sedang login (hindari RLS recursion di client) */
export async function GET() {
  try {
    const { user, response } = await requireRole('lecturer', 'admin', 'staff')
    if (response) return response

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('classes')
      .select(`
        id,
        class_name,
        class_code,
        class_section,
        cover_color,
        cover_image_url,
        day_of_week,
        start_time,
        end_time,
        lecturer_id,
        backup_lecturer_id,
        profiles!classes_lecturer_id_fkey ( name, avatar_url ),
        backup_profile:profiles!classes_backup_lecturer_id_fkey ( name, avatar_url ),
        courses ( code, name, credits ),
        academic_semesters ( name, academic_year ),
        rooms ( code, name )
      `)
      .or(`lecturer_id.eq.${user.id},backup_lecturer_id.eq.${user.id}`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    // - CRITICAL FIX: Use SQL COUNT instead of JS loops
    const classIds = (data || []).map((c) => c.id)
    let enrollmentCounts: Record<string, number> = {}
    let assignmentCounts: Record<string, number> = {}

    if (classIds.length > 0) {
      // Parallelize both count queries
      const [enrollRes, assignRes] = await Promise.all([
        admin
          .from('enrollments')
          .select('class_id', { count: 'exact', head: false })
          .in('class_id', classIds)
          .eq('status', 'active'),
        admin
          .from('assignments')
          .select('class_id', { count: 'exact', head: false })
          .in('class_id', classIds)
      ])

      // Build count maps from results
      if (enrollRes.data) {
        enrollmentCounts = classIds.reduce((acc, id) => {
          acc[id] = enrollRes.data?.filter(e => e.class_id === id).length || 0
          return acc
        }, {} as Record<string, number>)
      }

      if (assignRes.data) {
        assignmentCounts = classIds.reduce((acc, id) => {
          acc[id] = assignRes.data?.filter(a => a.class_id === id).length || 0
          return acc
        }, {} as Record<string, number>)
      }
    }

    const mapped = (data || []).map((c: any) => ({
      id: c.id,
      class_name: c.class_name,
      class_code: c.class_code,
      class_section: c.class_section || '',
      cover_color: c.cover_color || '#1A3A6B',
      cover_image_url: c.cover_image_url || null,
      day_of_week: c.day_of_week || null,
      start_time: c.start_time || null,
      end_time: c.end_time || null,
      lecturer_name: c.profiles?.name || '',
      lecturer_avatar: c.profiles?.avatar_url || null,
      course_code: c.courses?.code || '',
      course_name: c.courses?.name || '',
      course_credits: c.courses?.credits || 0,
      semester_name: c.academic_semesters?.name || '',
      academic_year: c.academic_semesters?.academic_year || '',
      enrolled_count: enrollmentCounts[c.id] || 0,
      assignment_count: assignmentCounts[c.id] || 0,
      room_code: c.rooms?.code || null,
      room_name: c.rooms?.name || null,
      is_backup: c.backup_lecturer_id === user.id,
      main_lecturer_name: c.profiles?.name || '',
      backup_lecturer_name: c.backup_profile?.name || null,
      backup_lecturer_avatar: c.backup_profile?.avatar_url || null,
    }))

    // Backfill banner otomatis untuk kelas lama (sekali load)
    await Promise.all(
      mapped
        .filter((c) => !c.cover_image_url && c.course_name)
        .map(async (c) => {
          const url = resolveClassCoverUrl(c.course_name, c.course_code)
          await admin.from('classes').update({ cover_image_url: url }).eq('id', c.id)
          c.cover_image_url = url
        })
    )

    return successResponse(mapped)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memuat kelas'
    if (message.includes('SERVICE_ROLE')) {
      return errorResponse(message, 503)
    }
    return serverErrorResponse(err)
  }
}
