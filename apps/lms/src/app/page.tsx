// ============================================================
// Root Page '/' redirector
// Server-side check for authentication and routing
// ============================================================

import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getHomePathForRole } from '@/lib/role-routes'

export default async function RootPage() {
  const user = await getAuthUser()

  if (!user) {
    redirect('/login')
  }
  redirect(getHomePathForRole(user.role, !!user.nim))
}
