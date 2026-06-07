'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications, Notification } from '@/hooks/useNotifications'
import { Bell, BookOpen, GraduationCap, CheckCircle2, AlertCircle, Info, Sparkles, Megaphone } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter()
  const { notifications, unreadCount, markAllAsRead } = useNotifications(userId)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_assignment':
        return <BookOpen className="h-4 w-4 text-blue-500" />
      case 'grade_updated':
        return <GraduationCap className="h-4 w-4 text-emerald-500" />
      case 'new_announcement':
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-amber-500" />
      case 'sync_complete':
      case 'sync_success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'sync_failed':
        return <AlertCircle className="h-4 w-4 text-rose-500" />
      default:
        return <Info className="h-4 w-4 text-slate-500" />
    }
  }

  const handleToggle = () => {
    setOpen(!open)
    if (!open && unreadCount > 0) {
      markAllAsRead()
    }
  }

  const handleNotificationClick = (notif: Notification) => {
    if (notif.action_url) {
      router.push(notif.action_url)
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors focus:outline-none dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 max-w-[calc(100vw-1rem)] origin-top-right rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:bg-[#151F32] dark:ring-white/5 z-[9999] select-none">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-primary dark:text-blue-400" />
              Notifikasi Anda
            </h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-primary dark:bg-blue-950/50 dark:text-blue-300">
                {unreadCount} Baru
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Sparkles className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs text-slate-500 dark:text-gray-400">Tidak ada notifikasi baru</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all cursor-pointer ${
                    !notif.is_read ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-white leading-snug">
                      {notif.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-gray-400 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="mt-1.5 text-[9px] text-slate-400 dark:text-gray-500">
                      {formatDateTime(notif.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
