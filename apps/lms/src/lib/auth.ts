// ============================================================
// Auth helpers - server-side session & role checking
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { unauthorizedResponse, forbiddenResponse } from '@/lib/utils'

export type UserRole = 'student' | 'lecturer' | 'admin' | 'staff' | 'backup_lecturer'

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
  // Check for Backup Lecturer token first
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const backupToken = cookieStore.get('backup_session_token')?.value
    if (backupToken) {
      const fs = await import('fs/promises')
      const path = await import('path')
      const content = await fs.readFile(path.join(process.cwd(), '..', '..', 'backup_sessions.json'), 'utf-8')
      const sessions = JSON.parse(content)
      const session = sessions.find((s: any) => s.id === backupToken)
      if (session && new Date(session.expiredAt) > new Date()) {
        return {
          id: 'backup-' + session.id, // Prefix to indicate mock
          email: session.email,
          role: 'backup_lecturer',
          name: session.backupName,
          nim: null,
          avatarUrl: null
        }
      }
    }
  } catch (e) {
    // ignore
  }

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
 * Check if user is lecturer of a specific class
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

  // Backup Lecturer can only access their specific class
  if (user.role === 'backup_lecturer') {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const backupToken = cookieStore.get('backup_session_token')?.value
      if (backupToken) {
        const fs = await import('fs/promises')
        const path = await import('path')
        const content = await fs.readFile(path.join(process.cwd(), '..', '..', 'backup_sessions.json'), 'utf-8')
        const sessions = JSON.parse(content)
        const session = sessions.find((s: any) => s.id === backupToken)
        if (session && session.classId === classId) {
          return { user, response: null }
        }
      }
    } catch (e) {}
    return { user: null, response: forbiddenResponse('Akses ditolak: Akun Backup Anda tidak diotorisasi untuk kelas ini.') }
  }

  // Skip class check if no classId (used in integration/sync route)
  if (!classId) return { user, response: null }

  // Check if lecturer owns this class
  if (user.role === 'lecturer') {
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('lecturer_id', user.id)
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
