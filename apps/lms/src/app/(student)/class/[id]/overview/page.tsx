'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import ClassSidebar from '@/components/classroom/ClassSidebar'
import ClassMobileWidgets from '@/components/classroom/ClassMobileWidgets'
import {
  Loader2, AlertCircle, FileText, Send,
  MessageSquare, Calendar, Pin, Download, Video, Clock,
  ChevronRight, HelpCircle, CheckCircle2, ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AssignmentCard, { Assignment } from '@/components/classroom/AssignmentCard'

interface Params {
  params: Promise<{ id: string }>
}

interface Post {
  id: string
  type: 'announcement' | 'material' | 'assignment' | 'discussion'
  title: string | null
  content: string
  is_pinned: boolean
  published_at: string
  created_at: string
  profiles: {
    id: string
    name: string
    avatar_url: string | null
    role: string
  }
  post_attachments?: any[]
  post_comments?: any[]
}


interface FeedItem {
  id: string
  itemType: 'post' | 'assignment'
  date: Date
  data: Post | Assignment
}

export default function StudentClassOverview({ params }: Params) {
  const { id } = use(params)
  const router = useRouter()
  const [classDetail, setClassDetail] = useState<any>(null)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [zoomLink, setZoomLink] = useState('')
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false)
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // - CRITICAL FIX: Single query for all details (eliminate duplicate)
      const { data: detailData } = await supabase
        .from('class_details')
        .select('*')
        .eq('id', id)
        .single()

      if (detailData) {
        try {
          const statsRes = await fetch(`/api/classes/stats?ids=${id}`, { cache: 'no-store' })
          const statsJson = await statsRes.json()
          if (statsJson.success && statsJson.data[id]) {
            detailData.enrolled_count = statsJson.data[id].enrolled_count
          }
        } catch (err) {
          console.error('Failed to fetch stats', err)
        }
        setClassDetail({ ...detailData })

        // Extract zoom link from description (already in class_details)
        const desc = detailData.description || ''
        if (desc.includes('||ZOOM||')) {
          setZoomLink(desc.split('||ZOOM||')[1]?.trim() || '')
        } else if (desc.startsWith('http')) {
          setZoomLink(desc)
        }
      }

      // Load Posts & Assignments concurrently with error handling
      const [postsRes, assignmentsRes] = await Promise.all([
        fetch(`/api/classes/${id}/posts`)
          .then(res => {
            if (!res.ok) throw new Error(`Posts API failed: ${res.status}`)
            return res.json()
          })
          .catch(err => ({ success: false, data: [] })),
        fetch(`/api/classes/${id}/assignments`)
          .then(res => {
            if (!res.ok) throw new Error(`Assignments API failed: ${res.status}`)
            return res.json()
          })
          .catch(err => ({ success: false, data: [] }))
      ])

      const items: FeedItem[] = []

      if (postsRes.success && Array.isArray(postsRes.data)) {
        postsRes.data.forEach((p: Post) => {
          items.push({
            id: `post_${p.id}`,
            itemType: 'post',
            date: new Date(p.published_at || p.created_at),
            data: p
          })
        })
      }

      if (assignmentsRes.success && Array.isArray(assignmentsRes.data)) {
        assignmentsRes.data.forEach((a: Assignment) => {
          items.push({
            id: `task_${a.id}`,
            itemType: 'assignment',
            date: new Date(a.created_at || new Date().toISOString()), // Fallback date if missing
            data: a
          })
        })
        
        const upcoming = assignmentsRes.data.filter((a: any) => {
          if (a.display_status === 'submitted' || a.display_status === 'graded') return false
          if (!a.due_date) return true
          return new Date(a.due_date).getTime() > Date.now()
        }).slice(0, 3)
        setUpcomingAssignments(upcoming)
      }

      // Sort chronological descending
      items.sort((a, b) => b.date.getTime() - a.date.getTime())
      setFeedItems(items)

    } catch (err) {
      console.error('[Overview] Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-[#F8F9FA] dark:bg-[#121B2E]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!classDetail) return null

  return (
    <div className="space-y-6 select-none bg-[#F8F9FA] dark:bg-[#0D1424] min-h-screen pb-12 font-sans">
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

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4 max-w-7xl mx-auto px-1 md:px-3">
        <ClassSidebar 
          classId={id} 
          role="student" 
          classCode={classDetail.class_code} 
          enrolledCount={classDetail.enrolled_count} 
          zoomLink={zoomLink} 
          upcomingAssignments={upcomingAssignments} 
        />

        {/* Right Content - Unified Feed */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Ringkasan Aktivitas Kelas</h2>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
              {feedItems.length} Item
            </span>
          </div>

          {feedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-[#121B2E]">
              <MessageSquare className="h-8 w-8 text-slate-300 mb-3" />
              <h3 className="text-xs font-black text-slate-800 dark:text-white">Belum Ada Aktivitas</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {feedItems.map((item) => {
                const isExpanded = expandedItems[item.id]

                if (item.itemType === 'assignment') {
                  const assignment = item.data as Assignment
                  return (
                    <AssignmentCard 
                      key={item.id} 
                      assign={assignment} 
                      user={user} 
                      onReload={loadData}
                      lecturerName={classDetail.lecturer_name}
                      lecturerAvatar={classDetail.lecturer_avatar}
                    />
                  )
                }

                // Render Post
                const post = item.data as Post
                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-[#121B2E]">
                    <div
                      onClick={() => toggleExpand(item.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#152033] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0">
                          <img 
                            src={post.profiles?.avatar_url || classDetail.lecturer_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.name || classDetail.lecturer_name || 'Dosen')}&background=random`} 
                            alt={post.profiles?.name || classDetail.lecturer_name || 'Dosen'} 
                            className="h-full w-full rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700" 
                          />
                        </div>
                        <div>
                          <h3 className="text-[10px] md:text-[11px] font-extrabold text-slate-800 dark:text-white leading-tight">
                            {post.profiles?.name || 'Dosen'} <span className="font-semibold text-slate-500 dark:text-slate-400">memposting {post.title ? 'materi baru:' : 'pengumuman baru'}</span> {post.title || ''}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-semibold text-slate-500">{formatDate(post.published_at || post.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-transparent">
                        <div className="text-[11px] text-slate-650 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium">
                          {post.content}
                        </div>

                        {/* Attachments (Google Classroom card preview layout) */}
                        {post.post_attachments && post.post_attachments.length > 0 && (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {post.post_attachments.map((file) => (
                              <a
                                key={file.id}
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 hover:bg-slate-50 transition-all dark:bg-[#151F32]/50 dark:border-slate-800 text-left group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="h-8 w-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                    <FileText className="h-4.5 w-4.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-extrabold text-slate-700 dark:text-gray-300 truncate max-w-[150px]">
                                      {file.file_name}
                                    </p>
                                    <span className="text-[8px] text-slate-450 uppercase block font-semibold">
                                      {(file.file_size / (1024 * 1024)).toFixed(2)} MB - {file.file_type.split('/').pop()?.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <Download className="h-3.5 w-3.5 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
