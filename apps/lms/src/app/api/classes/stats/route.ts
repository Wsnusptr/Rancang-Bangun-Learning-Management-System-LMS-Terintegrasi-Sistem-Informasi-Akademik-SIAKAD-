import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse } from '@/lib/utils'

// GET /api/classes/stats?ids=uuid1,uuid2
export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAuth()
    if (response) return response

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    if (!idsParam) {
      return successResponse({})
    }

    const classIds = idsParam.split(',').map(id => id.trim()).filter(Boolean)
    if (classIds.length === 0) {
      return successResponse({})
    }

    // Gunakan admin client yang sama seperti my-classes (bypass RLS)
    const admin = createAdminClient()

    // Parallel fetch counts
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

    // Build count maps from results (same pattern as my-classes)
    const enrolledCountMap: Record<string, number> = {}
    const assignmentCountMap: Record<string, number> = {}

    classIds.forEach(id => {
      enrolledCountMap[id] = enrollRes.data?.filter(e => e.class_id === id).length || 0
      assignmentCountMap[id] = assignRes.data?.filter(a => a.class_id === id).length || 0
    })

    const stats: Record<string, { enrolled_count: number, assignment_count: number }> = {}
    classIds.forEach(id => {
      stats[id] = {
        enrolled_count: enrolledCountMap[id],
        assignment_count: assignmentCountMap[id]
      }
    })

    return successResponse(stats)
  } catch (err: any) {
    return errorResponse(err.message, 500)
  }
}
