'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import { 
  Loader2, AlertCircle, FileText, Send, User, 
  MessageSquare, Calendar, Pin, Download, Sparkles, Video, Clock, ChevronRight, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

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
  post_attachments: {
    id: string
    file_name: string
    file_url: string
    file_type: string
    file_size: number
  }[]
  post_comments: {
    id: string
    content: string
    created_at: string
    profiles: {
      id: string
      name: string
      avatar_url: string | null
    }
  }[]
}

interface ClassDetail {
  id: string
  class_name: string
  class_code: string
  class_section: string | null
  cover_color: string
  cover_image_url?: string | null
  lecturer_avatar?: string | null
  backup_lecturer_name?: string | null
  backup_lecturer_avatar?: string | null
  course_code: string
  course_name: string
  course_credits: number
  semester_name: string
  room_code: string | null
  room_name: string | null
  day_of_week: string | null
  start_time: string | null
  end_time: string | null
  enrolled_count: number
  lecturer_name: string
}

export default function StudentClassStream({ params }: Params) {
  const { id } = use(params)
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  // Meet / Zoom Links Persistent State
  const [zoomLink, setZoomLink] = useState<string>('')
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false)
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([])

  // Comment Form States
  const [commentContents, setCommentContents] = useState<Record<string, string>>({})
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({})

  // Accordion State
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const loadClassDetail = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('class_details')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      // Fetch real-time enrolled count from stats API
      try {
        const statsRes = await fetch(`/api/classes/stats?ids=${id}`, { cache: 'no-store' })
        const statsJson = await statsRes.json()
        if (statsJson.success && statsJson.data[id]) {
          data.enrolled_count = statsJson.data[id].enrolled_count
        }
      } catch (err) {
        console.error('Failed to fetch stats', err)
      }

      setClassDetail(data)
    } catch (err) {
      console.error('[Stream] Class detail load failed:', err)
    }
  }

  const loadZoomLink = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('description')
        .eq('id', id)
        .single()
      if (data && data.description) {
        if (data.description.includes('||ZOOM||')) {
          const parts = data.description.split('||ZOOM||')
          setZoomLink(parts[1]?.trim() || '')
        } else if (data.description.startsWith('http')) {
          setZoomLink(data.description)
        }
      }
    } catch (err) {}
  }

  const loadUpcomingAssignments = async () => {
    try {
      const res = await fetch(`/api/classes/${id}/assignments`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        const upcoming = json.data.filter((a: any) => {
          if (a.display_status === 'submitted' || a.display_status === 'graded') return false
          if (!a.due_date) return true
          return new Date(a.due_date).getTime() > Date.now()
        }).slice(0, 3)
        setUpcomingAssignments(upcoming)
      }
    } catch (err) {}
  }

  const loadPosts = async () => {
    try {
      const res = await fetch(`/api/classes/${id}/posts`)
      const json = await res.json()
      if (json.success) {
        setPosts(json.data || [])
      }
    } catch (err) {
      console.error('[Stream] Posts load failed:', err)
    }
  }

  const loadUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([loadClassDetail(), loadPosts(), loadUser(), loadZoomLink(), loadUpcomingAssignments()])
      setLoading(false)
    }
    init()
  }, [id])

  const handlePostComment = async (postId: string) => {
    const content = commentContents[postId]?.trim()
    if (!content) return

    setCommentLoading(prev => ({ ...prev, [postId]: true }))

    const supabase = createClient()
    try {
      const { data: newComment, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: user?.id,
          content,
        })
        .select(`
          id, content, created_at,
          profiles!post_comments_author_id_fkey (id, name, avatar_url)
        `)
        .single()

      if (error) throw error

      setPosts(prev => 
        prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              post_comments: [...(p.post_comments || []), newComment as any]
            }
          }
          return p
        })
      )

      setCommentContents(prev => ({ ...prev, [postId]: '' }))
    } catch (err) {
      console.error('[Stream] Post comment failed:', err)
    } finally {
      setCommentLoading(prev => ({ ...prev, [postId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-[#F8F9FA] dark:bg-[#121B2E]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!classDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-[#F8F9FA] dark:bg-[#121B2E]">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-black text-slate-800 dark:text-white">Kelas Tidak Ditemukan</h3>
      </div>
    )
  }

  return (
    <div className="space-y-6 select-none bg-[#F8F9FA] dark:bg-[#0D1424] min-h-screen pb-12 font-sans">
      
      {/* Classroom header widget */}
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

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4 max-w-7xl mx-auto px-1 md:px-3">
        {/* Left Side: Meet Card & Upcoming Card (styled exactly like Google Classroom) */}
        <div className="space-y-5 lg:col-span-1">
          
          {/* Real Google Meet/Zoom card (Hidden on Mobile) */}
          <div className="hidden lg:block rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-white flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-600" />
                Zoom / Meet Online
              </span>
            </div>
            
            <div className="mt-3.5">
              {zoomLink ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Status: Kelas Aktif</p>
                  <a
                    href={zoomLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-1.5 flex items-center justify-center gap-1.5 rounded-full border border-blue-600 hover:bg-blue-50/50 py-2 text-[11px] font-black text-blue-600 transition-all cursor-pointer"
                  >
                    Gabung Pertemuan
                  </a>
                </div>
              ) : (
                <div className="text-center py-2.5 space-y-1.5">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-extrabold dark:text-gray-400">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0 animate-pulse" />
                    Belum Ada Jadwal
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Menunggu dosen pengampu membuat link pertemuan Zoom online.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Upcoming Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
            <h3 className="text-xs font-black text-slate-800 dark:text-white leading-none">Mendatang</h3>
            <div className="mt-3.5 space-y-3">
              {upcomingAssignments.length === 0 ? (
                <p className="text-[10px] text-slate-500 dark:text-gray-400 font-semibold leading-relaxed">
                  Hore, tidak ada tugas yang perlu segera diselesaikan!
                </p>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-2">
                    Ada tugas untukmu:
                  </p>
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
                  <Link
                    href="/todo"
                    className="text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest"
                  >
                    Lihat semua
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Stream Posts List */}
        <div className="lg:col-span-3 space-y-5">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-[#121B2E]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 dark:bg-slate-800 mb-3">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-black text-slate-800 dark:text-white">Aliran Masih Kosong</h3>
              <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 max-w-xs leading-normal">
                Belum ada pengumuman atau materi kelas yang diposting oleh dosen pengampu saat ini.
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const isExpanded = expandedItems[post.id]

              return (
              <div
                key={post.id}
                className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#121B2E] transition-all relative overflow-hidden"
              >
                {post.is_pinned && (
                  <div className="absolute top-0 right-0 flex items-center gap-1 bg-amber-50 px-3.5 py-1 text-[8px] font-black text-amber-700 rounded-bl-lg dark:bg-amber-950/20 dark:text-amber-400 z-10">
                    <Pin className="h-2.5 w-2.5 rotate-45" />
                    PINNED
                  </div>
                )}

                {/* Accordion Trigger Header */}
                <div 
                  onClick={() => toggleExpand(post.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#152033] transition-colors relative z-0"
                >
                  <div className="flex items-center gap-3">
                    {post.profiles?.avatar_url || classDetail.lecturer_avatar ? (
                      <img src={post.profiles?.avatar_url || classDetail.lecturer_avatar || ''} alt={post.profiles?.name || 'Avatar'} className="h-10 w-10 shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-650 uppercase dark:bg-blue-900/30 dark:text-blue-400">
                        {post.profiles?.name?.substring(0, 2) || 'DS'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 pr-4">
                      <h4 className="text-[10px] md:text-[11px] font-extrabold text-slate-850 dark:text-white leading-tight">
                        {post.profiles?.name || classDetail.lecturer_name} <span className="font-semibold text-slate-500 dark:text-slate-400">memposting {post.type === 'assignment' ? 'tugas baru:' : post.type === 'material' ? 'materi baru:' : 'pengumuman baru'}</span> {post.title || ''}
                      </h4>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500 mt-1 block uppercase tracking-widest">
                        {post.profiles?.role === 'lecturer' ? (post.profiles?.name === classDetail?.backup_lecturer_name ? 'DOSEN BACKUP' : 'DOSEN PENGAJAR') : 'MAHASISWA'} • {formatDate(post.published_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-transparent">
                    {/* Content */}
                    <div className="space-y-2">
                      <p className="text-[10px] md:text-[11px] text-slate-650 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                        {post.content}
                      </p>
                    </div>

                    {/* Attachments */}
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

                    {/* Comments List */}
                    <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-800/80 space-y-4">
                      {post.post_comments && post.post_comments.length > 0 && (
                        <div className="space-y-3 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                          {post.post_comments.map((comment) => (
                            <div key={comment.id} className="flex gap-2.5 bg-white p-2.5 rounded-lg dark:bg-[#18233C]/20 border border-slate-100 dark:border-slate-850">
                              <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[8px] font-black text-slate-500 uppercase dark:bg-slate-800 dark:text-gray-400">
                                {comment.profiles?.name?.substring(0, 2) || 'MH'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[10px] font-black text-slate-800 dark:text-white leading-none">
                                    {comment.profiles?.name}
                                  </span>
                                  <span className="text-[7.5px] font-semibold text-slate-400 leading-none">
                                    {formatDate(comment.created_at)}
                                  </span>
                                </div>
                                <p className="mt-1 text-[10px] text-slate-600 dark:text-gray-350 leading-relaxed font-medium">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment Input */}
                      <div className="flex gap-2.5">
                        <input
                          type="text"
                          placeholder="Tambahkan komentar kelas..."
                          value={commentContents[post.id] || ''}
                          onChange={(e) => setCommentContents(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePostComment(post.id)
                          }}
                          className="block flex-1 rounded-full border border-slate-200 bg-white py-1.5 px-4 text-[10px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-slate-50 dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
                        />
                        <button
                          onClick={() => handlePostComment(post.id)}
                          disabled={commentLoading[post.id] || !commentContents[post.id]?.trim()}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                        >
                          {commentLoading[post.id] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
            })
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button (FAB) for Zoom */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsZoomModalOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
        >
          <Video className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Zoom Modal */}
      {isZoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm lg:hidden select-none">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#121B2E]">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-[13px] font-black text-slate-800 dark:text-white leading-none">Zoom / Meet Online</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Akses pertemuan virtual kelas ini</p>
              </div>
            </div>
            
            <div className="mt-4">
              {zoomLink ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                    <span className="text-[10px] font-black uppercase text-green-600 dark:text-green-400">Status: Kelas Tersedia</span>
                  </div>
                  <a
                    href={zoomLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-[11px] font-black text-white hover:bg-blue-700 transition-colors"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Buka Link Zoom
                  </a>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <Clock className="mx-auto h-6 w-6 text-slate-400 animate-pulse mb-2" />
                  <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Belum Ada Link</h4>
                  <p className="mt-1 text-[9px] text-slate-500">Dosen belum menyertakan link pertemuan virtual.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsZoomModalOpen(false)}
              className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
