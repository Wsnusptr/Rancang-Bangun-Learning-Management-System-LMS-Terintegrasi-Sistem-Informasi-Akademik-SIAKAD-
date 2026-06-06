'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'

export default function TopbarGreeting({ name }: { name: string }) {
  const getGreeting = () => {
    let hours = new Date().getHours()
    if (typeof window === 'undefined') {
      // Server-side (Vercel is UTC), fallback to WIB (UTC+7)
      hours = (new Date().getUTCHours() + 7) % 24
    }
    if (hours < 11) return 'Selamat Pagi'
    if (hours < 15) return 'Selamat Siang'
    if (hours < 19) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  const [greeting, setGreeting] = useState(getGreeting)
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    setGreeting(getGreeting())
    setCurrentDate(
      new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    )
    
    // Update setiap menit agar waktu tetap akurat
    const interval = setInterval(() => {
      setGreeting(getGreeting())
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col">
      <h2 suppressHydrationWarning className="text-xs font-bold text-slate-700 dark:text-white leading-none">
        {greeting}, <span className="text-primary dark:text-blue-400">{name}</span>
      </h2>
      <span className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-gray-500 tracking-wide min-h-[14px]">
        {currentDate && (
          <>
            <Calendar className="h-3 w-3" />
            {currentDate}
          </>
        )}
      </span>
    </div>
  )
}
