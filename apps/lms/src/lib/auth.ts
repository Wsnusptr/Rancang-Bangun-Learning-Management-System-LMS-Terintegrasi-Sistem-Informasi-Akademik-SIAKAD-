// ============================================================
// Auth helpers - server-side session & role checking
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { unauthorizedResponse, forbiddenResponse } from '@/lib/utils'

// backup_lecturer is now a real lecturer with access via backup_lecturer_id column in classes table
export type UserRole = 'student' | 'lecturer' | 'admin' | 'staff'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  name: string
  nim?: string | null
  avatarUrl?: string | null
}

/**
 * Get authenticated user from session.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<AuthUser | null> {

  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role, nim, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      id: user.id,
      email: user.email!,
      role: 'student',
      name: user.user_metadata?.full_name || user.email!.split('@')[0],
      nim: null,
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    }
  }

  return {
    id: user.id,
    email: user.email!,
    role: profile.role as UserRole,
    name: profile.name,
    nim: profile.nim,
    avatarUrl: profile.avatar_url,
  }
}

/**
 * Require authentication - returns user or error response.
 */
export async function requireAuth(): Promise<
  { user: AuthUser; response: null } | { user: null; response: ReturnType<typeof unauthorizedResponse> }
> {
  const user = await getAuthUser()
  if (!user) {
    return { user: null, response: unauthorizedResponse('Anda belum login') }
  }
  return { user, response: null }
}

/**
 * Require specific role(s).
 */
export async function requireRole(
  ...roles: UserRole[]
): Promise<
  | { user: AuthUser; response: null }
  | { user: null; response: ReturnType<typeof unauthorizedResponse | typeof forbiddenResponse> }
> {
  const user = await getAuthUser()
  if (!user) {
    return { user: null, response: unauthorizedResponse('Anda belum login') }
  }
  if (!roles.includes(user.role)) {
    return {
      user: null,
      response: forbiddenResponse(
        `Akses ditolak. Role yang dibutuhkan: ${roles.join(' atau ')}`
      ),
    }
  }
  return { user, response: null }
}

/**
 * Check if user is lecturer of a specific class (including backup_lecturer_id)
 */
export async function requireClassLecturer(classId: string): Promise<
  | { user: AuthUser; response: null }
  | { user: null; response: ReturnType<typeof unauthorizedResponse | typeof forbiddenResponse> }
> {
  const supabase = await createClient()
  const authResult = await requireAuth()
  if (authResult.response) return authResult

  const { user } = authResult

  // Admin can access all classes
  if (user.role === 'admin') return { user, response: null }

  // Skip class check if no classId
  if (!classId) return { user, response: null }

  // Check if lecturer is main lecturer OR backup_lecturer_id for this class
  if (user.role === 'lecturer') {
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .or(`lecturer_id.eq.${user.id},backup_lecturer_id.eq.${user.id}`)
      .single()

    if (!cls) {
      return {
        user: null,
        response: forbiddenResponse('Anda bukan pengajar kelas ini'),
      }
    }
    return { user, response: null }
  }

  return { user: null, response: forbiddenResponse('Akses ditolak') }
}

/**
 * Check if student is enrolled in a class
 */
export async function requireClassEnrollment(classId: string): Promise<
  | { user: AuthUser; response: null }
  | { user: null; response: ReturnType<typeof unauthorizedResponse | typeof forbiddenResponse> }
> {
  const supabase = await createClient()
  const authResult = await requireAuth()
  if (authResult.response) return authResult

  const { user } = authResult

  // Lecturers and admins can always access
  if (user.role === 'lecturer' || user.role === 'admin' || user.role === 'staff') {
    return { user, response: null }
  }

  // Calon mahasiswa (belum punya NIM) tidak boleh akses kelas
  if (!user.nim) {
    return {
      user: null,
      response: forbiddenResponse('Akun calon mahasiswa belum dapat mengakses kelas. Selesaikan verifikasi PMB terlebih dahulu.'),
    }
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', user.id)
    .eq('status', 'active')
    .single()

  if (!enrollment) {
    return {
      user: null,
      response: forbiddenResponse('Anda tidak terdaftar di kelas ini'),
    }
  }

  return { user, response: null }
}
