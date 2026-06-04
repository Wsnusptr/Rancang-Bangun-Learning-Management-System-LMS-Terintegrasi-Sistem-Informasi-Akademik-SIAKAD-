'use client'

import { useEffect, useState, useRef } from 'react'
import TopbarGreeting from './TopbarGreeting'
import { ThemeToggle } from '../ThemeToggle'
import NotificationBell from './NotificationBell'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MobileSubHeader() {
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [isVisible, setIsVisible] = useState(true)
  const isVisibleRef = useRef(true)
  const pathname = usePathname()

  useEffect(() => {
    isVisibleRef.current = isVisible
  }, [isVisible])

  useEffect(() => {
    const initAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setUserName(user.user_metadata?.name || user.user_metadata?.full_name || 'Pengguna')
      }
    }
    initAuth()
  }, [])

  useEffect(() => {
    // Only run on mobile
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return

    // Auto-show on route change
    setIsVisible(true)

    const mainEl = document.querySelector('main')
    if (!mainEl) return

    let lastScrollY = mainEl.scrollTop
    let idleTimeout: NodeJS.Timeout
    let touchStartY = 0

    const startIdleTimer = () => {
      clearTimeout(idleTimeout)
      idleTimeout = setTimeout(() => {
        if (isVisibleRef.current) {
          setIsVisible(false)
        }
      }, 2500) // Changed from 5000 to 2500
    }

    const handleScroll = () => {
      const currentScrollY = mainEl.scrollTop
      const maxScroll = mainEl.scrollHeight - mainEl.clientHeight

      // 1. Force show if at the very top
      if (currentScrollY <= 10) {
        if (!isVisibleRef.current) setIsVisible(true)
        startIdleTimer()
        lastScrollY = currentScrollY
        return
      }

      // 2. Ignore iOS/Android overscroll (rubber-banding) 
      if (currentScrollY < 0 || currentScrollY > maxScroll) {
        return
      }

      // 3. Check scroll delta
      const delta = currentScrollY - lastScrollY
      
      if (delta > 5) {
        // Scrolling down -> hide
        if (isVisibleRef.current) setIsVisible(false)
        lastScrollY = currentScrollY
      } else if (delta < -5) {
        // Scrolling up -> show
        if (!isVisibleRef.current) setIsVisible(true)
        startIdleTimer()
        lastScrollY = currentScrollY
      }
    }

    startIdleTimer()

    mainEl.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      mainEl.removeEventListener('scroll', handleScroll)
      clearTimeout(idleTimeout)
    }
  }, [pathname])

  if (!userName) return null
  if (pathname.includes('/class/')) return null

  return (
    <>
      {/* Spacer to prevent layout shift glitch (Content starts here, pushing actual content down just enough) */}
      <div className="md:hidden h-[45px] shrink-0 w-full" />

      {/* Animated absolute header */}
      <div 
        className={`md:hidden absolute w-full top-0 left-0 transition-transform duration-300 ease-in-out z-30 bg-slate-50 dark:bg-[#080B11] shadow-sm dark:shadow-white/5 ${
          isVisible 
            ? 'translate-y-0 pt-3 px-5 pb-2' 
            : '-translate-y-full pt-3 px-5 pb-2 pointer-events-none'
        }`}
      >
        <div className="flex flex-col select-none">
        <div className="flex items-center justify-between mb-2">
          <TopbarGreeting name={userName} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {userId && <NotificationBell userId={userId} />}
          </div>
        </div>
        {/* Partial divider line */}
        <div className="h-px bg-gradient-to-r from-slate-200 via-slate-200 to-transparent dark:from-slate-800 dark:via-slate-800 w-3/4 opacity-70"></div>
      </div>
    </div>
    </>
  )
}
