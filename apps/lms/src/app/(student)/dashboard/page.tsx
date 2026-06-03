'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BookOpen, Plus, Users,
  Loader2, AlertCircle, HelpCircle, CheckCircle2,
} from 'lucide-react'
import PmbInteractivePortal from '@/components/student/PmbInteractivePortal'
import AnnouncementFooter from '@/components/layout/AnnouncementFooter'
import ClassRoomCard, { formatClassScheduleSubtitle } from '@/components/classroom/ClassRoomCard'
import TopbarGreeting from '@/components/layout/TopbarGreeting'
import TypewriterText from '@/components/ui/TypewriterText'
import PmbFaqSection from '@/components/student/PmbFaqSection'
import { ThemeToggle } from '@/components/ThemeToggle'
import NotificationBell from '@/components/layout/NotificationBell'

interface StudentClass {
  id: string
  class_name: string
  class_code: string
  class_section: string
  cover_color: string
  cover_image_url?: string | null
  day_of_week?: string | null
  start_time?: string | null
  end_time?: string | null
  lecturer_avatar?: string | null
  lecturer_name: string
  course_code: string
  course_name: string
  course_credits: number
  semester_name: string
  academic_year: string
  enrolled_count: number
  assignment_count?: number
  attendance_percentage: number | null
  weighted_total: number | null
  letter_grade: string | null
  room_code: string | null
  room_name: string | null
}

export default function StudentDashboard() {
  const [isGuest, setIsGuest] = useState<boolean | null>(null)
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [classCode, setClassCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        setUserName(user.user_metadata?.name || user.user_metadata?.full_name || 'Calon Mahasiswa')
        setUserId(user.id)

        // - CRITICAL FIX: Parallelize profile + classes fetch
        const [profileRes, classesRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('nim')
            .eq('id', user.id)
            .single(),
          supabase
            .from('student_class_overview')
            .select('*')
            .eq('student_id', user.id)
            .eq('enrollment_status', 'active')
        ])

        const profile = profileRes.data
        const guest = !profile || !profile.nim
        setIsGuest(guest)

        if (!guest && classesRes.data) {
          const classIds = classesRes.data.map(c => c.id).join(',')
          if (classIds) {
            try {
              const statsRes = await fetch(`/api/classes/stats?ids=${classIds}`, { cache: 'no-store' })
              const statsJson = await statsRes.json()
              if (statsJson.success) {
                const statsMap = statsJson.data
                const merged = classesRes.data.map(c => ({
                  ...c,
                  enrolled_count: statsMap[c.id]?.enrolled_count || 0,
                  assignment_count: statsMap[c.id]?.assignment_count || 0
                }))
                setClasses(merged)
                return
              }
            } catch (err) {
              console.error('Failed to fetch class stats', err)
            }
          }
          setClasses(classesRes.data)
        }
      } catch (err) {
        console.error('[Dashboard] Load failed:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoinLoading(true)
    setJoinError(null)
    setJoinSuccess(null)
    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode: classCode.toUpperCase().trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal bergabung dengan kelas')
      const joinedName = json.data?.class?.class_name || json.message || 'Kelas'
      setJoinSuccess(`Berhasil bergabung: ${joinedName}`)
      setClassCode('')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('student_class_overview')
          .select('*')
          .eq('student_id', user.id)
          .eq('enrollment_status', 'active')
        if (data) setClasses(data)
      }
      setTimeout(() => { setShowModal(false); setJoinSuccess(null) }, 1500)
    } catch (err: any) {
      setJoinError(err.message)
    } finally {
      setJoinLoading(false)
    }
  }

  if (loading || isGuest === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (isGuest) {
    return (
      <div className="pb-8 space-y-4 md:space-y-6 mt-0 md:mt-2">
        {/* Guest Banner (Desktop Box, Mobile Ticker) */}
        <div className="md:flex md:items-start md:gap-2.5 md:rounded-lg md:border md:border-amber-200 md:bg-amber-50 md:p-3 dark:md:border-amber-900/30 dark:md:bg-amber-950/20 overflow-hidden relative w-full h-8 md:h-auto border-y md:border-x border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20 flex items-center">
          <AlertCircle className="hidden md:block h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="hidden md:block">
            <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">Status: Calon Mahasiswa</p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              Lengkapi profil dan dokumen PMB. Setelah verifikasi di kampus, akun akan diaktifkan dengan NIM.
            </p>
          </div>
          {/* Mobile Ticker */}
          <div className="md:hidden flex items-center gap-2 px-2 w-full">
            <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-widest shrink-0">Status: </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono tracking-tight truncate">
              <TypewriterText 
                texts={[
                  "Lengkapi profil dan dokumen PMB.",
                  "Setelah verifikasi di kampus, akun aktif dengan NIM."
                ]} 
                typeSpeed={50} 
                deleteSpeed={25}
                delay={3000} 
              />
            </span>
          </div>
        </div>

        {/* Core PMB Information (Interactive Portal) */}
        <div className="space-y-2 md:space-y-4 pt-2 md:pt-0">
          <div className="hidden md:block">
            <h1 className="text-[11px] md:text-sm font-semibold text-slate-800 dark:text-white">Informasi PMB</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Jelajahi program studi, jadwal, biaya, dan panduan lengkap pendaftaran
            </p>
          </div>
          <PmbInteractivePortal />
        </div>

        <PmbFaqSection />

        <AnnouncementFooter />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[11px] md:text-sm font-semibold text-slate-800 dark:text-white">Kelas</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Daftar kelas perkuliahan Anda</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setJoinError(null); setJoinSuccess(null) }}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Gabung Kelas
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#121B2E]">
          <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
          <h3 className="text-[11px] font-medium text-slate-700 dark:text-white">Belum ada kelas aktif</h3>
          <p className="mt-1 max-w-xs text-[10px] text-slate-400 leading-relaxed">
            Masukkan kode kelas dari dosen untuk bergabung.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            <Plus className="h-3 w-3" />
            Gabung Kelas
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <ClassRoomCard
              key={cls.id}
              id={cls.id}
              href={`/class/${cls.id}`}
              className={cls.class_name}
              coverColor={cls.cover_color}
              coverImageUrl={cls.cover_image_url}
              courseName={cls.course_name}
              courseCode={cls.course_code}
              subtitle={formatClassScheduleSubtitle({
                semesterName: cls.semester_name,
                dayOfWeek: cls.day_of_week,
                startTime: cls.start_time,
                endTime: cls.end_time,
                roomCode: cls.room_code,
                roomName: cls.room_name,
              })}
              lecturerName={cls.lecturer_name}
              lecturerAvatar={cls.lecturer_avatar}
              footerMeta={
                <span className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[9px] font-black tracking-widest text-slate-900 dark:text-white truncate w-full">
                  <span>{cls.enrolled_count || 0} Mahasiswa</span>
                  <span>•</span>
                  <span>{cls.assignment_count || 0} Tugas</span>
                  {cls.room_code && (
                    <>
                      <span>•</span>
                      <span className="truncate">{cls.room_code}</span>
                    </>
                  )}
                </span>
              }
            />
          ))}
        </div>
      )}

      {/* Join Class Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#121B2E] border border-slate-100 dark:border-slate-800">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Gabung Kelas</h3>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Masukkan kode gabung 6 huruf/angka (bukan kode mata kuliah). Lihat di header kelas dosen.
              </p>
            </div>
            <div className="p-5">
              {joinError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-100">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
                  {joinError}
                </div>
              )}
              {joinSuccess && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-100">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
                  {joinSuccess}
                </div>
              )}
              <form onSubmit={handleJoinClass} className="space-y-4">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="K8T2PM"
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-3 text-center text-xl font-black tracking-widest text-slate-800 uppercase outline-none transition-all focus:border-primary focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                />
                <p className="flex items-start gap-1.5 text-[10px] text-slate-400">
                  <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Kode kelas diperoleh dari dosen pengajar mata kuliah bersangkutan.
                </p>
                <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-gray-400">
                    Batal
                  </button>
                  <button type="submit" disabled={joinLoading || classCode.length < 6}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-dark active:scale-95 disabled:opacity-50 dark:bg-blue-600">
                    {joinLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memproses...</> : 'Gabung'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
