'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { LogOut, ChevronLeft, ChevronRight, BookOpen, GraduationCap, Megaphone, ClipboardList, X } from 'lucide-react'

interface NavLink {
  href: string
  label: string
  iconName: string
}

const iconMap: Record<string, React.ElementType> = {
  BookOpen,
  GraduationCap,
  Megaphone,
  ClipboardList,
}

interface SidebarClientProps {
  role: 'student' | 'lecturer' | 'admin' | 'staff'
  name: string
  avatarUrl?: string | null
  isGuest?: boolean
  links: NavLink[]
  displayRole: string
  profileHref: string
}

export default function SidebarClient({
  role, name, avatarUrl, isGuest, links, displayRole, profileHref
}: SidebarClientProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handleToggle = () => setMobileOpen(prev => !prev)
    window.addEventListener('toggleMobileSidebar', handleToggle)
    return () => window.removeEventListener('toggleMobileSidebar', handleToggle)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const closeMobileSidebar = () => setMobileOpen(false)

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-[150] bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[200] md:relative md:z-50 flex flex-col transition-all duration-300 shrink-0 h-screen top-0 border-r border-slate-200 bg-white dark:bg-[#080B11] dark:border-white/5 shadow-2xl md:shadow-sm ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-72 md:w-64'}`}
      >
        {/* Mobile Close Button */}
        <button 
          onClick={closeMobileSidebar}
          className="absolute top-4 right-4 z-50 md:hidden flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Particle/Abstract background effect */}
        <div className="absolute inset-0 opacity-100 pointer-events-none mt-[64px] overflow-hidden dark:hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse"></div>
          <div className="absolute top-40 -left-10 w-40 h-40 bg-indigo-300 rounded-full mix-blend-screen filter blur-3xl opacity-40"></div>
          <div className="absolute -bottom-20 right-20 w-40 h-40 bg-cyan-200 rounded-full mix-blend-screen filter blur-3xl opacity-50"></div>
          <div className="absolute top-1/2 left-1/4 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
        </div>

        <div className={`relative z-10 flex h-[64px] items-center gap-3 px-5 border-b border-slate-200 bg-white dark:bg-[#080B11] dark:border-white/5 shrink-0 shadow-sm transition-colors ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="relative w-[56px] h-[56px] shrink-0 flex items-center justify-center pointer-events-none">
            <Image
              src="/logo.png"
              alt="STMIK Jayakarta"
              fill
              sizes="56px"
              className="object-contain drop-shadow-xl scale-[1.7]"
              priority
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col justify-center">
              <span className="text-sm font-black tracking-tight text-blue-950 dark:text-white leading-none block">J-LEARN</span>
              <span className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest mt-1 block">STMIK Jayakarta</span>
            </div>
          )}
        </div>

        <nav className="relative z-10 flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {!collapsed && (
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-blue-200/60 px-2 mb-3 transition-colors">
              {isGuest ? 'Pendaftaran' : role === 'student' ? 'Perkuliahan' : 'Pengajaran'}
            </p>
          )}
          {links.map((link) => {
            const Icon = iconMap[link.iconName]
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileSidebar}
                title={collapsed ? link.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 md:py-2.5 text-sm md:text-xs font-semibold transition-all ${isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-white/20 dark:text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                {Icon && <Icon className={`h-4.5 w-4.5 md:h-4 md:w-4 shrink-0 transition-colors ${isActive ? 'text-blue-700 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`} />}
                {!collapsed && <span>{link.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="relative z-10 border-t border-slate-200 bg-slate-50 dark:border-white/10 p-3 md:p-3 space-y-2 dark:bg-[#080B11] transition-colors">
          <Link
            href={profileHref}
            onClick={closeMobileSidebar}
            className={`flex items-center gap-3 rounded-lg bg-white dark:bg-blue-900/50 p-2.5 hover:bg-slate-100 dark:hover:bg-blue-800 transition-colors border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none ${collapsed ? 'justify-center' : ''}`}
          >
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-blue-800 border border-slate-300 dark:border-white/20 shadow-inner">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-black text-slate-600 dark:text-white">
                  {name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate leading-none">{name}</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-blue-200 uppercase tracking-widest mt-1 truncate">{displayRole}</p>
              </div>
            )}
          </Link>

          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-white/10 dark:hover:text-red-400 transition-colors cursor-pointer ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-[72px] h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:border-blue-500 cursor-pointer z-50 transition-all shadow-sm"
          title="Toggle Sidebar"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>
    </>
  )
}




