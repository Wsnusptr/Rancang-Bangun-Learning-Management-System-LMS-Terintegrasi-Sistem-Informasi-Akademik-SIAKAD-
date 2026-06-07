'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, MapPin, Users, BookOpen, Clock, FileText, CheckSquare, Award, Sparkles, Settings, ChevronUp, ChevronDown, Info, X, AlertTriangle, Loader2 } from 'lucide-react'
import ProfileAvatar from '@/components/ui/ProfileAvatar'
import ClassCoverBackground from '@/components/classroom/ClassCoverBackground'
import type { ReactNode } from 'react'

interface ClassHeaderProps {
  id: string
  role: 'student' | 'lecturer' | 'admin'
  className: string
  classCode: string
  classSection: string | null
  coverColor: string
  coverImageUrl?: string | null
  lecturerName: string
  lecturerAvatar?: string | null
  backupLecturerName?: string | null
  backupLecturerAvatar?: string | null
  courseCode: string
  courseName: string
  credits: number
  semesterName: string
  roomCode: string | null
  roomName: string | null
  dayOfWeek: string | null
  startTime: string | null
  endTime: string | null
  enrolledCount: number
  bannerAction?: ReactNode
}

export default function ClassHeader({
  id,
  role,
  className,
  classCode,
  classSection,
  coverColor,
  coverImageUrl,
  lecturerName,
  lecturerAvatar,
  backupLecturerName,
  backupLecturerAvatar,
  courseCode,
  courseName,
  credits,
  semesterName,
  roomCode,
  roomName,
  dayOfWeek,
  startTime,
  endTime,
  enrolledCount,
  bannerAction,
}: ClassHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isScheduleOpen, setIsScheduleOpen] = useState(true)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  const handleLeaveClass = async () => {
    setIsLeaving(true)
    try {
      const res = await fetch(`/api/classes/${id}/leave`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        throw new Error('Gagal keluar dari kelas')
      }
      
      // Redirect to dashboard after leaving
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('Error leaving class:', error)
      alert('Terjadi kesalahan saat mencoba keluar dari kelas.')
      setIsLeaving(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsScheduleOpen(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  const studentTabs = [
    { href: `/class/${id}`, label: 'Aliran (Stream)', icon: BookOpen },
    { href: `/class/${id}/overview`, label: 'Overview', icon: Sparkles },
    { href: `/class/${id}/classwork`, label: 'Tugas (Classwork)', icon: FileText },
    { href: `/class/${id}/attend`, label: 'Absensi (Attend)', icon: CheckSquare },
    { href: `/class/${id}/grades`, label: 'Daftar Nilai', icon: Award },
    { href: `/class/${id}/mahasiswa`, label: 'Mahasiswa', icon: Users },
  ]

  const lecturerTabs = [
    { href: `/lecturer/class/${id}`, label: 'Stream', icon: BookOpen },
    { href: `/lecturer/class/${id}/overview`, label: 'Overview', icon: Sparkles },
    { href: `/lecturer/class/${id}/mahasiswa`, label: 'Mahasiswa', icon: Users },
    { href: `/lecturer/class/${id}/classwork`, label: 'Tugas', icon: FileText },
    { href: `/lecturer/class/${id}/attendance`, label: 'Absensi', icon: CheckSquare },
    { href: `/lecturer/class/${id}/gradebook`, label: 'Nilai', icon: Award },
    { href: `/lecturer/class/${id}/settings`, label: 'Pengaturan', icon: Settings },
  ]

  const tabs = role === 'student' ? studentTabs : lecturerTabs

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#121B2E] select-none">
      <div className="relative overflow-hidden px-6 pb-6 pt-5 text-white md:px-8 md:pt-6">
        <ClassCoverBackground
          coverColor={coverColor}
          coverImageUrl={coverImageUrl}
          courseName={courseName}
          courseCode={courseCode}
          overlayClassName="bg-gradient-to-t from-black/85 via-black/45 to-transparent"
        />

        {bannerAction && (
          <div className="relative z-30 mb-3 flex justify-end">{bannerAction}</div>
        )}

        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5 pr-0 md:pr-4">
            <div>
              <h1 className="text-lg font-black leading-tight drop-shadow-md md:text-xl">{className}</h1>
            </div>

            <div className="space-y-2">
              {/* Row 1: Dosen */}
              <span className="inline-flex items-center gap-1.5 text-[10px] text-white/95 font-semibold drop-shadow-sm">
                Dosen: {lecturerName}{backupLecturerName ? ` & ${backupLecturerName}` : ''}
              </span>
              
              {/* Row 2: Semester + Room chips */}
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-medium backdrop-blur-sm">
                  <Calendar className="h-3 w-3 opacity-80" />
                  {semesterName}
                </span>
                {roomCode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-medium backdrop-blur-sm">
                    <MapPin className="h-3 w-3 opacity-80" />
                    {roomCode}{roomName ? ` - ${roomName}` : ''}
                  </span>
                )}
              </div>

              {/* Row 3: Class codes & credits */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="rounded bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm">
                  {courseCode}
                </span>
                <span
                  className="rounded bg-white/95 px-2 py-0.5 text-[9px] font-bold tracking-widest text-slate-900 font-mono shadow-sm"
                  title="Kode gabung kelas"
                >
                  {classCode}
                </span>
                <span className="rounded bg-amber-400 px-2 py-0.5 text-[9px] font-bold text-slate-900 shadow-sm">
                  {credits} SKS
                </span>
              </div>
            </div>
          </div>

          <div className="relative shrink-0 md:w-56 mt-6 md:mt-0 w-full flex flex-col items-center">
            {/* Toggle button that stays visible even when closed */}
            <button 
              onClick={() => setIsScheduleOpen(!isScheduleOpen)}
              className="md:hidden absolute -top-10 right-0 z-50 bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20 text-white shadow-sm flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
            >
              {isScheduleOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <div className={`w-full max-w-[260px] md:max-w-full origin-top md:!max-h-none md:!opacity-100 md:!overflow-visible mx-auto ${isScheduleOpen ? 'max-h-[300px] opacity-100 transition-all duration-500 ease-in-out overflow-hidden' : 'max-h-0 opacity-0 transition-all duration-500 ease-in-out overflow-hidden'}`}>
              <div className="relative pt-4 pb-1 px-1">
                {/* Avatar (positioned absolutely to overlap the box) */}
                <div className="absolute top-2 left-1/2 z-40 -translate-x-1/2 flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <ProfileAvatar
                      src={lecturerAvatar}
                      name={lecturerName}
                      size="lg"
                      borderClassName="border-[3px] border-white shadow-xl dark:border-[#121B2E]"
                      className={`scale-110 md:scale-125 transition-transform ${backupLecturerName ? 'z-10' : ''}`}
                    />
                    {backupLecturerName && (
                      <div className="absolute -right-8 md:-right-10 z-0">
                        <ProfileAvatar
                          src={backupLecturerAvatar}
                          name={backupLecturerName}
                          size="md"
                          borderClassName="border-[3px] border-white shadow-xl dark:border-[#121B2E]"
                          className="scale-90 md:scale-100 transition-transform opacity-95 hover:opacity-100"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* The Box */}
                <div className="mt-10 space-y-2 rounded-xl border border-white/20 bg-white/10 p-4 text-[10px] backdrop-blur-md md:mt-12 shadow-inner">
                  <div className="flex justify-between gap-2">
                    <span className="text-white/80 font-medium">Jadwal Kuliah</span>
                    <span className="font-bold">{dayOfWeek || 'TBA'}</span>
                  </div>
                  {startTime && endTime && (
                    <div className="flex justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-white/75">
                        <Clock className="h-3 w-3" /> Waktu
                      </span>
                      <span className="font-medium">
                        {startTime.substring(0, 5)} - {endTime.substring(0, 5)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2 border-t border-white/10 pt-2">
                    <span className="inline-flex items-center gap-1 text-white/75">
                      <Users className="h-3 w-3" /> Terdaftar
                    </span>
                    <span className="font-medium text-amber-300">{enrolledCount || 0} Mahasiswa</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/80 p-1.5 dark:border-slate-800 dark:bg-[#151F32]/50 items-center justify-between">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-sm dark:bg-[#1C2842] dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                } ${tab.label === 'Pengaturan' ? 'ml-auto' : ''}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            )
          })}
        </div>

        {role === 'student' && (
          <button
            onClick={() => setShowLeaveModal(true)}
            title="Info Kelas / Keluar"
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-500 dark:hover:bg-[#1C2842] transition-colors ml-2 mr-1"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* MODAL KELUAR KELAS (STUDENT ONLY) */}
      {showLeaveModal && role === 'student' && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121B2E] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 flex items-start gap-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full shrink-0 mt-1">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">
                  Keluar dari Kelas?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Apakah Anda yakin ingin keluar dari kelas <strong>{courseName}</strong>? Anda tidak akan bisa lagi mengakses materi, tugas, dan nilai dari kelas ini.
                </p>
              </div>
              <button 
                onClick={() => setShowLeaveModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-[#080B11]/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                disabled={isLeaving}
              >
                Batal
              </button>
              <button
                onClick={handleLeaveClass}
                disabled={isLeaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
              >
                {isLeaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Ya, Keluar Kelas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
