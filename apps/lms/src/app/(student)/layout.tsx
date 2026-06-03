// ============================================================
// Student Layout Shell
// Secure layout with Sidebar, Topbar, and Scroll Container
// ============================================================

import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Suspense } from 'react'

import MobileSubHeader from '@/components/layout/MobileSubHeader'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()

  if (!user) {
    redirect('/login')
  }

  // Double check role
  if (user.role !== 'student') {
    redirect('/lecturer/dashboard')
  }

  const isGuest = !user.nim

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#080B11] transition-colors">
      <Sidebar role={user.role} name={user.name} avatarUrl={user.avatarUrl} isGuest={isGuest} />
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-[#080B11] transition-colors">
        <Topbar userId={user.id} name={user.name} role={user.role} isGuest={isGuest} />
        <MobileSubHeader />
        <main className="flex-1 overflow-y-auto p-5 sm:p-6 focus:outline-none relative">
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-[#080B11] transition-colors">
               <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-800 dark:border-t-blue-500"></div>
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  )
}



