import type { UserRole } from '@/lib/auth'

/** Halaman utama setelah login sesuai role */
export function getHomePathForRole(role: string, hasNim?: boolean | null): string {
  if (role === 'lecturer' || role === 'admin' || role === 'staff') {
    return '/lecturer/dashboard'
  }
  return '/dashboard'
}

export function isLecturerRole(role: string): boolean {
  return role === 'lecturer' || role === 'admin' || role === 'staff'
}
