import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { errorResponse, successResponse, serverErrorResponse } from '@/lib/utils'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const classId = resolvedParams.id
    if (!classId) {
      return errorResponse('Class ID is required', 400)
    }

    const supabase = await createClient()
    const session = await requireAuth()

    if (!session || !session.user || !session.user.id) {
      return errorResponse('Unauthorized', 401)
    }

    // Delete enrollment
    const { error: deleteError } = await supabase
      .from('enrollments')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', session.user.id)

    if (deleteError) {
      return errorResponse(deleteError.message, 500)
    }

    return successResponse({ message: 'Berhasil keluar dari kelas' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Role tidak sesuai') {
      return errorResponse(error.message, 401)
    }
    return serverErrorResponse(error)
  }
}
