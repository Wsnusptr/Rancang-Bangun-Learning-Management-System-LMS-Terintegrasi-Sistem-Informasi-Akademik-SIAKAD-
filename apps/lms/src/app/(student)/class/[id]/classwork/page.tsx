'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import { 
  Loader2, FileText, CheckCircle2, Clock,
  Video, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import AssignmentCard, { Assignment } from '@/components/classroom/AssignmentCard'

interface Params {
  params: Promise<{ id: string }>
}

export default function StudentClasswork({ params }: Params) {
  const { id } = use(params)
  const [classDetail, setClassDetail] = useState<any>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [zoomLink, setZoomLink] = useState('')
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([])
  const [showUpcoming, setShowUpcoming] = useState(false)

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const [{ data: clsDetail }, assignRes] = await Promise.all([
        supabase.from('class_details').select('*').eq('id', id).single(),
        fetch(`/api/classes/${id}/assignments`).then(res => res.json())
      ])

      if (clsDetail) {
        // Fetch real-time enrolled count from stats API
        try {
          const statsRes = await fetch(`/api/classes/stats?ids=${id}`, { cache: 'no-store' })
          const statsJson = await statsRes.json()
          if (statsJson.success && statsJson.data[id]) {
            clsDetail.enrolled_count = statsJson.data[id].enrolled_count
          }
        } catch (err) {
          console.error('Failed to fetch stats', err)
        }
        setClassDetail(clsDetail)
        const desc = clsDetail.description || ''
        if (desc.includes('||ZOOM||')) {
          setZoomLink(desc.split('||ZOOM||')[1]?.trim() || '')
        } else if (desc.startsWith('http')) {
          setZoomLink(desc)
        }
      }

      if (assignRes.success && Array.isArray(assignRes.data)) {
        setAssignments(assignRes.data)
        const upcoming = assignRes.data.filter((a: any) => {
          if (a.display_status === 'submitted' || a.display_status === 'graded') return false
          if (!a.due_date) return true
          return new Date(a.due_date).getTime() > Date.now()
        }).slice(0, 3)
        setUpcomingAssignments(upcoming)
      }
    } catch (err) {
      console.error('[Classwork] Load failed:', err)
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadData()
      setLoading(false)
    }
    init()
  }, [id])

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  if (!classDetail) return null

  return (
    <div className="space-y-6 select-none bg-[#F8F9FA] dark:bg-[#0D1424] min-h-screen pb-20 font-sans">
      <ClassHeader
        id={classDetail.id}
        role="student"
        className={classDetail.class_name}
        classCode={classDetail.class_code}
        classSection={classDetail.class_section}
        coverColor={classDetail.cover_color}
        coverImageUrl={classDetail.cover_image_url}
        lecturerName={classDetail.lecturer_name}
        lecturerAvatar={classDetail.lecturer_avatar}
        backupLecturerName={classDetail.backup_lecturer_name}
        backupLecturerAvatar={classDetail.backup_lecturer_avatar}
        courseCode={classDetail.course_code}
        courseName={classDetail.course_name}
        credits={classDetail.course_credits}
        semesterName={classDetail.semester_name}
        roomCode={classDetail.room_code}
        roomName={classDetail.room_name}
        dayOfWeek={classDetail.day_of_week}
        startTime={classDetail.start_time}
        endTime={classDetail.end_time}
        enrolledCount={classDetail.enrolled_count}
      />

      {/* Upcoming mini-panel - mobile only collapsible */}
      {upcomingAssignments.length > 0 && (
        <div className="lg:hidden mx-0 rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20 overflow-hidden">
          <button
            onClick={() => setShowUpcoming(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer"
          >
            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {upcomingAssignments.length} Tugas Mendatang
            </span>
            {showUpcoming ? <ChevronUp className="h-3.5 w-3.5 text-amber-600" /> : <ChevronDown className="h-3.5 w-3.5 text-amber-600" />}
          </button>
          {showUpcoming && (
            <div className="px-4 pb-3 space-y-2 border-t border-amber-200 dark:border-amber-900/30 pt-2">
              {upcomingAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 py-1">
                  <p className="text-[10px] font-bold text-slate-800 dark:text-white truncate flex-1">{a.title}</p>
                  <span className="text-[9px] text-rose-500 font-bold shrink-0">
                    {a.due_date ? formatDate(a.due_date) : 'No deadline'}
                  </span>
                </div>
              ))}
              <Link href="/todo" className="text-[9px] font-black text-blue-600 uppercase tracking-widest block text-right pt-1">
                Lihat semua →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4 max-w-7xl mx-auto px-1 md:px-3">
        
        {/* Sidebar - HIDDEN on mobile, show on lg */}
        <div className="hidden lg:block space-y-5 lg:col-span-1">
          {/* Zoom Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
            <div className="flex items-center gap-2 mb-3">
              <Video className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700 dark:text-white">Zoom / Meet Online</span>
            </div>
            {zoomLink ? (
              <a href={zoomLink} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 rounded-full border border-blue-600 hover:bg-blue-50/50 py-2 text-[11px] font-black text-blue-600 transition-all cursor-pointer">
                Gabung Pertemuan
              </a>
            ) : (
              <div className="text-center py-2">
                <Clock className="h-4 w-4 text-slate-300 mx-auto mb-1 animate-pulse" />
                <p className="text-[9px] text-slate-400 leading-normal">Menunggu dosen membuat link pertemuan.</p>
              </div>
            )}
          </div>

          {/* Upcoming Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
            <h3 className="text-xs font-black text-slate-800 dark:text-white leading-none">Tugas Mendatang</h3>
            <div className="mt-3.5 space-y-3">
              {upcomingAssignments.length === 0 ? (
                <p className="text-[10px] text-slate-500 dark:text-gray-400 font-semibold leading-relaxed">
                  Semua tugas sudah diselesaikan!
                </p>
              ) : (
                <div className="space-y-2.5">
                  {upcomingAssignments.map((a) => (
                    <div key={a.id} className="min-w-0 text-[10px] font-bold text-slate-650 dark:text-gray-350 bg-slate-50 dark:bg-[#152033] p-2 rounded">
                      <p className="text-slate-800 dark:text-white truncate font-extrabold">{a.title}</p>
                      <span className="text-[9px] text-rose-500 font-bold block mt-0.5">
                        Batas: {a.due_date ? formatDate(a.due_date) : 'Tidak ada waktu'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {upcomingAssignments.length > 0 && (
                <div className="border-t border-slate-100 pt-2.5 text-right dark:border-slate-800/80">
                  <Link href="/todo" className="text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest">
                    Lihat semua
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Assignments Feed */}
        <div className="lg:col-span-3 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h2 className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              Daftar Tugas
            </h2>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {assignments.length} Tugas
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-[#121B2E]">
               <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 dark:bg-slate-800/50">
                  <CheckCircle2 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
               </div>
               <h3 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wide">Tidak Ada Tugas</h3>
               <p className="text-[10px] text-slate-500 mt-1 max-w-[220px]">Dosen belum mempublikasikan tugas baru.</p>
            </div>
          ) : (
            assignments.map((assign) => (
              <AssignmentCard 
                key={assign.id} 
                assign={assign} 
                user={user} 
                onReload={loadData}
                lecturerName={classDetail.lecturer_name}
                lecturerAvatar={classDetail.lecturer_avatar}
              />
            ))
          )}
        </div>
      </div>

      {/* Floating Zoom Button - mobile only, shown when zoom link exists */}
      {zoomLink && (
        <a
          href={zoomLink}
          target="_blank"
          rel="noopener noreferrer"
          className="lg:hidden fixed bottom-6 right-4 z-50 flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-[10px] font-black text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95"
        >
          <Video className="h-3.5 w-3.5" />
          Gabung Zoom
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}
