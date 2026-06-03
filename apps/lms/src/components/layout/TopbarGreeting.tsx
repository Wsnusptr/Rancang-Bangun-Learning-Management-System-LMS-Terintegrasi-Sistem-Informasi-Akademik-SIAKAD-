'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'

export default function TopbarGreeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState('Selamat Datang')
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    const hours = new Date().getHours()
    if (hours < 11) setGreeting('Selamat Pagi')
    else if (hours < 15) setGreeting('Selamat Siang')
    else if (hours < 19) setGreeting('Selamat Sore')
    else setGreeting('Selamat Malam')

    setCurrentDate(
      new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    )
  }, [])

  return (
    <div className="flex flex-col">
      <h2 className="text-xs font-bold text-slate-700 dark:text-white leading-none">
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
