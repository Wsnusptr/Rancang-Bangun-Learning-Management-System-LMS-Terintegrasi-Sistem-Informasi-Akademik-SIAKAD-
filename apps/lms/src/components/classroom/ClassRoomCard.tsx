'use client'

import Link from 'next/link'
import ProfileAvatar from '@/components/ui/ProfileAvatar'
import ClassCoverBackground from '@/components/classroom/ClassCoverBackground'
import { ChevronRight } from 'lucide-react'

export function formatClassScheduleSubtitle(opts: {
  semesterName?: string
  dayOfWeek?: string | null
  startTime?: string | null
  endTime?: string | null
  roomName?: string | null
  roomCode?: string | null
}): string {
  const parts: string[] = []
  if (opts.semesterName) parts.push(opts.semesterName)
  
  let schedule = ''
  if (opts.dayOfWeek) {
    schedule = opts.dayOfWeek
    if (opts.startTime && opts.endTime) {
      schedule += ` ${opts.startTime.substring(0, 5)}-${opts.endTime.substring(0, 5)}`
    }
  }
  
  if (schedule) {
    if (opts.roomName || opts.roomCode) {
      schedule += ` (${opts.roomCode || opts.roomName})`
    }
    parts.push(schedule)
  } else if (opts.roomName || opts.roomCode) {
    parts.push(`Ruang: ${opts.roomCode || opts.roomName}`)
  }
  
  return parts.join(' - ')
}

export interface ClassRoomCardProps {
  id: string
  href: string
  className: string
  coverColor: string
  coverImageUrl?: string | null
  courseName?: string
  courseCode?: string
  subtitle?: string
  lecturerName: string
  lecturerAvatar?: string | null
  isBackup?: boolean
  footerMeta?: React.ReactNode
}

export default function ClassRoomCard({
  href,
  className,
  coverColor,
  coverImageUrl,
  courseName,
  courseCode,
  subtitle,
  lecturerName,
  lecturerAvatar,
  isBackup,
  footerMeta,
}: ClassRoomCardProps) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg dark:border-slate-800 dark:bg-[#121B2E]"
    >
      <div className="relative h-[9rem] px-5 pt-5 pb-8">
        <div className="absolute inset-0 overflow-hidden">
          <ClassCoverBackground
            coverColor={coverColor}
            coverImageUrl={coverImageUrl}
            courseName={courseName || className}
            courseCode={courseCode}
            overlayClassName="bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:via-black/50 transition-colors"
          />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-start gap-1.5">
          <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-white drop-shadow-md group-hover:underline decoration-white/30 underline-offset-4 pr-12">
            {className}
            {isBackup && <span className="ml-1.5 inline-block rounded bg-amber-500/90 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-white shadow-sm ring-1 ring-white/20 align-middle -mt-0.5">BACKUP</span>}
          </h3>
          
          <div className="flex flex-col gap-0.5 pb-0 pr-14">
            <p className="line-clamp-1 text-[11px] font-semibold text-white/95 drop-shadow-sm">
              {lecturerName}
            </p>
            {subtitle && (
              <p className="line-clamp-2 text-[10px] text-white/90 drop-shadow-sm font-medium leading-tight">{subtitle}</p>
            )}
            {courseCode && (
              <p className="line-clamp-1 text-[9px] font-bold tracking-widest text-white/75 uppercase drop-shadow-sm pt-0.5">
                {courseCode}
              </p>
            )}
          </div>
        </div>

        <div className="absolute -bottom-1 right-4 z-30 translate-y-1/2">
          <ProfileAvatar
            src={lecturerAvatar}
            name={lecturerName}
            size="lg"
            borderClassName="border-[4px] border-white dark:border-[#121B2E]"
            className="shadow-2xl scale-125 transition-transform group-hover:scale-[1.3]"
          />
        </div>
      </div>

      <div className="flex min-h-[3.5rem] items-center justify-between gap-2 px-5 pb-3 pt-5">
        <div className="min-w-0 flex-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          {footerMeta}
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all dark:bg-slate-800/50">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  )
}
