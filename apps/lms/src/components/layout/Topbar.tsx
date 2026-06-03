'use client'

import NotificationBell from './NotificationBell'
import TopbarGreeting from './TopbarGreeting'
import { ThemeToggle } from '../ThemeToggle'
import MobileHeaderControls from './MobileHeaderControls'

interface TopbarProps {
  userId: string
  name: string
  role: string
  isGuest?: boolean
}

export default function Topbar({ userId, name, role, isGuest }: TopbarProps) {
  const displayRole = isGuest
    ? 'Calon Mahasiswa'
    : role === 'student'
      ? 'Mahasiswa'
      : role === 'lecturer'
        ? 'Dosen Pengajar'
        : 'Administrator'

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 dark:border-white/5 dark:bg-[#080B11] transition-colors select-none shrink-0 z-40">
      
      {/* Left: Greeting (Desktop) & Title (Mobile) */}
      <div className="flex items-center gap-3">
        <MobileHeaderControls role={role} isGuest={isGuest} />
        <div className="hidden md:block">
            <TopbarGreeting name={name} />
        </div>
      </div>

      {/* Right: Role Badge & Notifications */}
      <div className="flex items-center gap-2 md:gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-[9px] md:px-3 md:text-[10px] font-bold text-slate-500 dark:bg-[#111A2B] dark:text-gray-400">
          {displayRole}
        </span>

        {/* Theme Toggle & Notifications (Hidden on mobile, moved to dashboard body) */}
        <div className="hidden md:flex items-center gap-1 md:gap-3">
          <ThemeToggle />
          <NotificationBell userId={userId} />
        </div>

        {/* Hamburger Menu (Mobile Only) */}
        <button 
          onClick={() => {
              if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('toggleMobileSidebar'))
              }
          }}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
      </div>
    </header>
  )
}
