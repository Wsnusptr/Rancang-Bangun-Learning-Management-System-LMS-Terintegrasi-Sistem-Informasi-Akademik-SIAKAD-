'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import ClassSidebar from '@/components/classroom/ClassSidebar'
import ClassMobileWidgets from '@/components/classroom/ClassMobileWidgets'
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



      <ClassMobileWidgets 
        classId={id} 
        role="student" 
        classCode={classDetail.class_code} 
        enrolledCount={classDetail.enrolled_count} 
        zoomLink={zoomLink} 
        upcomingAssignments={upcomingAssignments} 
      />

      {/* Grid Layout */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4 max-w-7xl mx-auto px-1 md:px-3">
        
        <ClassSidebar 
          classId={id} 
          role="student" 
          classCode={classDetail.class_code} 
          enrolledCount={classDetail.enrolled_count} 
          zoomLink={zoomLink} 
          upcomingAssignments={upcomingAssignments} 
        />

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
    </div>
  )
}
