// ============================================================
// POST /api/classes/[id]/posts - Create post (lecturer)
// GET  /api/classes/[id]/posts - List stream posts
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireClassEnrollment, requireClassLecturer } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/utils'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { response } = await requireClassEnrollment(id)
    if (response) return response

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('posts')
      .select(`
        id, type, title, content, is_pinned, is_draft, published_at, created_at, updated_at,
        profiles!posts_author_id_fkey (id, name, avatar_url, role),
        post_attachments (id, file_name, file_url, file_type, file_size),
        post_comments (
          id, content, created_at,
          profiles!post_comments_author_id_fkey (id, name, avatar_url)
        )
      `, { count: 'exact' })
      .eq('class_id', id)
      .eq('is_draft', false)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error, count } = await query

    if (error) throw error

    return successResponse(data, undefined, {
      total: count || 0,
      limit,
      offset,
      hasMore: (offset + limit) < (count || 0),
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

const createPostSchema = z.object({
  type: z.enum(['announcement', 'material', 'assignment', 'discussion']),
  title: z.string().min(1).max(200).optional().nullable(),
  content: z.string().min(1, 'Konten tidak boleh kosong'),
  isPinned: z.boolean().optional().default(false),
  isDraft: z.boolean().optional().default(false),
  publishedAt: z.string().datetime().optional(),
  attachments: z.array(z.object({
    file_name: z.string(),
    file_url: z.string().url(),
    file_type: z.string(),
    file_size: z.number(),
  })).optional().default([]),
})

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, response } = await requireClassLecturer(id)
    if (response) return response

    const body = await request.json()
    const parsed = createPostSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((e: { message: string }) => e.message).join(', '),
        422
      )
    }

    const data = parsed.data
    const supabase = await createClient()

    // Create post record
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        class_id: id,
        author_id: user.id,
        type: data.type,
        title: data.title || null,
        content: data.content,
        is_pinned: data.isPinned,
        is_draft: data.isDraft,
        published_at: data.publishedAt || new Date().toISOString(),
      })
      .select(`
        *,
        profiles!posts_author_id_fkey (id, name, avatar_url, role)
      `)
      .single()

    if (postError) throw postError

    // Handle attachments if any
    if (data.attachments && data.attachments.length > 0) {
      const { error: attachError } = await supabase
        .from('post_attachments')
        .insert(
          data.attachments.map(att => ({
            post_id: post.id,
            ...att
          }))
        )
      
      if (attachError) {
        console.error('[API Post] Attachment insert error:', attachError)
      }
    }

    if (!data.isDraft) {
      const [enrollmentsRes, classInfoRes] = await Promise.all([
        supabase
          .from('enrollments')
          .select('student_id')
          .eq('class_id', id)
          .eq('status', 'active'),
        supabase
          .from('classes')
          .select('class_name')
          .eq('id', id)
          .single()
      ])

      const enrollments = enrollmentsRes.data
      const classInfo = classInfoRes.data

      if (enrollments && enrollments.length > 0) {
        const adminClient = createAdminClient()
        await adminClient.from('notifications').insert(
          enrollments.map(e => ({
            user_id: e.student_id,
            type: data.type === 'assignment' ? 'new_assignment' as const : 'new_announcement' as const,
            title: `${data.type === 'announcement' ? 'Pengumuman' : data.type === 'material' ? 'Materi' : 'Post'} baru: ${data.title || data.content.substring(0, 50)}`,
            message: `Di kelas ${classInfo?.class_name || ''}`,
            related_class_id: id,
            related_post_id: post.id,
            action_url: `/class/${id}`,
          }))
        )
      }
    }

    return successResponse(post, 'Post berhasil dibuat', undefined, 201)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
