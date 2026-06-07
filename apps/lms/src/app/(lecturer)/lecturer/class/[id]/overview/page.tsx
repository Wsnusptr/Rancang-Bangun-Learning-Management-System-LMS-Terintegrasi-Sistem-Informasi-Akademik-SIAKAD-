'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import { 
  Loader2, AlertCircle, FileText, Send, 
  MessageSquare, Calendar, Pin, Download, Video, Clock, 
  ChevronRight, HelpCircle, CheckCircle2, ChevronDown, ChevronUp, ArrowRight, Link as LinkIcon, Plus, Trash2, Sparkles, ExternalLink
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ClassSidebar from '@/components/classroom/ClassSidebar'
import ClassMobileWidgets from '@/components/classroom/ClassMobileWidgets'

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

interface Assignment {
  id: string
  title: string
  description: string | null
  type: string
  due_date: string | null
  created_at: string
  max_score: number
  submissions_count?: number
}

interface FeedItem {
  id: string
  itemType: 'post' | 'assignment'
  date: Date
  data: Post | Assignment
}

export default function LecturerClassOverview({ params }: Params) {
  const { id } = use(params)
  const router = useRouter()
  const [classDetail, setClassDetail] = useState<any>(null)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  
  // Zoom and Assignments State
  const [zoomLink, setZoomLink] = useState('')
  const [realDescription, setRealDescription] = useState('')
  const [isEditingZoom, setIsEditingZoom] = useState(false)
  const [zoomInput, setZoomInput] = useState('')
  const [zoomError, setZoomError] = useState<string | null>(null)
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      
      // 1. Load Class Detail
      let { data: detailData, error } = await supabase
        .from('class_details')
        .select('*')
        .eq('id', id)
        .single()
        
      if (error) {
         // Fallback if class_details view fails for some reason
         const { data: cls, error: clsErr } = await supabase
              .from('classes')
              .select(`
                id, class_name, class_code, class_section, cover_color, cover_image_url, day_of_week, start_time, end_time, description,
                courses ( code, name, credits ),
                academic_semesters ( name ),
                rooms ( code, name ),
                profiles!classes_lecturer_id_fkey ( name, avatar_url )
              `)
              .eq('id', id)
              .single()
              
          if (!clsErr && cls) {
              const { count } = await supabase
                  .from('enrollments')
                  .select('*', { count: 'exact', head: true })
                  .eq('class_id', id)
                  .eq('status', 'active')
                  
              detailData = {
                  id: cls.id,
                  class_name: cls.class_name,
                  class_code: cls.class_code,
                  class_section: cls.class_section,
                  cover_color: cls.cover_color,
                  cover_image_url: (cls as any).cover_image_url,
                  course_code: (cls as any).courses?.code,
                  course_name: (cls as any).courses?.name,
                  course_credits: (cls as any).courses?.credits,
                  semester_name: (cls as any).academic_semesters?.name,
                  room_code: (cls as any).rooms?.code,
                  room_name: (cls as any).rooms?.name,
                  day_of_week: cls.day_of_week,
                  start_time: cls.start_time,
                  end_time: cls.end_time,
                  enrolled_count: count ?? 0,
                  lecturer_name: (cls as any).profiles?.name,
                  lecturer_avatar: (cls as any).profiles?.avatar_url,
              }
          }
      }
      
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
      }

      // 2. Load Zoom Link explicitly from classes
      const { data: classData } = await supabase
        .from('classes')
        .select('description')
        .eq('id', id)
        .single()
        
      if (classData && classData.description) {
          if (classData.description.includes('||ZOOM||')) {
              const parts = classData.description.split('||ZOOM||')
              setZoomLink(parts[1]?.trim() || '')
              setRealDescription(parts[0]?.trim() || '')
          } else if (classData.description.startsWith('http')) {
              setZoomLink(classData.description)
              setRealDescription('')
          } else {
              setRealDescription(classData.description)
              setZoomLink('')
          }
      }

      // 3. Load Posts & Assignments concurrently
      const [postsRes, assignmentsRes] = await Promise.all([
        fetch(`/api/classes/${id}/posts`).then(res => res.json()),
        fetch(`/api/classes/${id}/assignments`).then(res => res.json())
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
            date: new Date(a.created_at || new Date().toISOString()),
            data: a
          })
        })
        const upcoming = assignmentsRes.data.filter((a: any) => {
          if (!a.due_date) return true
          return new Date(a.due_date).getTime() > Date.now()
        }).slice(0, 3)
        setUpcomingAssignments(upcoming)
      }

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

  const handleSaveZoomLink = async () => {
      setZoomError(null)
      if (zoomInput && !zoomInput.startsWith('http')) {
          setZoomError('Link Zoom/Meet harus diawali dengan http:// atau https://')
          return
      }
      const supabase = createClient()
      const combinedDesc = `${realDescription}||ZOOM||${zoomInput}`
      try {
          const { error } = await supabase
              .from('classes')
              .update({ description: combinedDesc })
              .eq('id', id)
          if (error) throw error
          setZoomLink(zoomInput)
          setIsEditingZoom(false)
      } catch (err) {
          setZoomError('Gagal menyimpan link pertemuan')
      }
  }

  const handleDeleteZoomLink = async () => {
      if (!confirm('Apakah Anda yakin ingin menghapus link Zoom/Meet kelas ini?')) return
      const supabase = createClient()
      try {
          const { error } = await supabase
              .from('classes')
              .update({ description: realDescription })
              .eq('id', id)
          if (error) throw error
          setZoomLink('')
          setZoomInput('')
      } catch (err) {
          console.error(err)
      }
  }

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
        role="lecturer"
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
        role="lecturer" 
        classCode={classDetail.class_code} 
        enrolledCount={classDetail.enrolled_count} 
        zoomLink={zoomLink} 
        upcomingAssignments={upcomingAssignments} 
        zoomProps={{
          isEditingZoom,
          setIsEditingZoom,
          zoomInput,
          setZoomInput,
          handleSaveZoomLink,
          handleDeleteZoomLink,
          zoomError
        }}
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4 max-w-7xl mx-auto px-1 md:px-3">
        {/* Left Sidebar */}
        <ClassSidebar 
          classId={id} 
          role="lecturer" 
          classCode={classDetail.class_code} 
          enrolledCount={classDetail.enrolled_count} 
          zoomLink={zoomLink} 
          upcomingAssignments={upcomingAssignments}
          zoomProps={{
            isEditingZoom,
            setIsEditingZoom,
            zoomInput,
            setZoomInput,
            handleSaveZoomLink,
            handleDeleteZoomLink,
            zoomError
          }}
        />


        {/* Right Content - Unified Feed */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Aliran Aktivitas Kelas
            </h2>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md uppercase tracking-wider">
              {feedItems.length} Aktivitas
            </span>
          </div>

          {feedItems.length === 0 ? (
             <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-[#121B2E]">
               <MessageSquare className="h-8 w-8 text-slate-300 mb-3" />
               <h3 className="text-xs font-black text-slate-800 dark:text-white">Belum Ada Aktivitas</h3>
               <p className="text-[10px] text-slate-500 mt-2 max-w-[200px]">Buat materi atau tugas baru di tab Aliran atau Tugas Kelas.</p>
             </div>
          ) : (
            <div className="space-y-3">
              {feedItems.map((item) => {
                const isExpanded = expandedItems[item.id]
                
                if (item.itemType === 'assignment') {
                  const assignment = item.data as Assignment
                  return (
                  <div key={item.id} className="rounded-2xl border border-slate-150 bg-white overflow-hidden shadow-sm dark:border-slate-800/80 dark:bg-[#121B2E]/90 hover:border-primary/20 transition-colors">
                      {/* Accordion Header */}
                      <div 
                        onClick={() => toggleExpand(item.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#152033] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 shrink-0">
                            <img 
                              src={classDetail?.lecturer_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(classDetail?.lecturer_name || 'Dosen')}&background=random`} 
                              alt={classDetail?.lecturer_name || 'Dosen'} 
                              className="h-full w-full rounded-full object-cover" 
                            />
                          </div>
                          <div>
                            <h3 className="text-[10px] md:text-[11px] font-extrabold text-slate-800 dark:text-white leading-tight">
                              {userId === classDetail?.lecturer_id ? 'Anda' : classDetail?.lecturer_name} <span className="font-semibold text-slate-500 dark:text-slate-400">memberikan tugas baru:</span> {assignment.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-semibold text-slate-500">{formatDate(assignment.created_at || new Date().toISOString())}</span>
                              <span className="text-[8px] font-bold uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">Tugas</span>
                              {assignment.due_date && (
                                <span className="text-[8px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5" />
                                  Tenggat: {formatDate(assignment.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                           {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-transparent">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-3">
                              <h4 className="text-[11px] font-black text-slate-800 dark:text-white">Deskripsi Tugas</h4>
                              <div className="text-[11px] text-slate-650 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium">
                                {assignment.description || 'Tidak ada deskripsi.'}
                              </div>
                            </div>
                            <div className="md:col-span-1 border-l border-slate-200 dark:border-slate-800 pl-6 flex flex-col justify-center">
                              <h4 className="text-[11px] font-black text-slate-800 dark:text-white mb-2">Penilaian Tugas</h4>
                              <p className="text-[10px] text-slate-500 mb-4">
                                Buka halaman detail tugas untuk melihat serahan mahasiswa dan memberikan nilai atau umpan balik.
                              </p>
                              <Link 
                                href={`/lecturer/class/${id}/classwork`} 
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black py-2.5 rounded-lg transition-colors"
                              >
                                Buka Penilaian <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
                        <div className="relative h-9 w-9 shrink-0">
                          <img 
                            src={post.profiles?.avatar_url || classDetail?.lecturer_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.name || classDetail?.lecturer_name || 'Dosen')}&background=random`} 
                            alt={post.profiles?.name || classDetail?.lecturer_name || 'Dosen'} 
                            className="h-full w-full rounded-full object-cover" 
                          />
                        </div>
                        <div>
                          <h3 className="text-[10px] md:text-[11px] font-extrabold text-slate-800 dark:text-white leading-tight">
                            {userId === post.profiles?.id ? 'Anda' : (post.profiles?.name || classDetail?.lecturer_name)} <span className="font-semibold text-slate-500 dark:text-slate-400">memposting {post.title ? 'materi baru:' : 'pengumuman baru'}</span> {post.title || ''}
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
