'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import ClassCalendar from '@/components/classroom/ClassCalendar'
import ClassCoverEditor from '@/components/classroom/ClassCoverEditor'
import { 
  Loader2, AlertCircle, FileText, Send, User, 
  MessageSquare, Calendar, Pin, Download, Sparkles, 
  Plus, Upload, Megaphone, Trash2, CheckCircle2, Video, Clock, X, Settings, Edit3, MoreVertical, ChevronUp, ChevronDown
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

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
  lecturer_id: string
}

export default function LecturerClassStream({ params }: Params) {
  const { id } = use(params)
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  // Real Meet/Zoom Online link states
  const [zoomLink, setZoomLink] = useState('')
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false)
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)
  const [realDescription, setRealDescription] = useState('')
  const [isEditingZoom, setIsEditingZoom] = useState(false)
  const [zoomInput, setZoomInput] = useState('')
  const [zoomError, setZoomError] = useState<string | null>(null)

  // Create Post States (Inline Announcement Box style like Google Classroom)
  const [showPostForm, setShowPostForm] = useState(false)
  const [postType, setPostType] = useState<'announcement' | 'material' | 'discussion'>('announcement')
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')
  const [postFile, setPostFile] = useState<File | null>(null)
  const [postLoading, setPostLoading] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [postSuccess, setPostSuccess] = useState<string | null>(null)

  // Comment Form States
  const [commentContents, setCommentContents] = useState<Record<string, string>>({})
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({})
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  // Edit Post State
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const [editPostTitle, setEditPostTitle] = useState('')
  const [editPostContent, setEditPostContent] = useState('')
  const [editPostType, setEditPostType] = useState<'announcement' | 'material' | 'discussion'>('announcement')
  const [editPostLoading, setEditPostLoading] = useState(false)
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)

  const toggleExpand = (postId: string) => {
    setExpandedItems(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

  const loadClassDetail = async () => {
    const supabase = createClient()
    try {
      let { data, error } = await supabase
        .from('class_details')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        const { data: cls, error: clsErr } = await supabase
          .from('classes')
          .select(`
            id, class_name, class_code, class_section, cover_color, cover_image_url, day_of_week, start_time, end_time, description, lecturer_id,
            courses ( code, name, credits ),
            academic_semesters ( name ),
            rooms ( code, name ),
            profiles!classes_lecturer_id_fkey ( name, avatar_url )
          `)
          .eq('id', id)
          .single()
        if (clsErr) throw clsErr
        const { count } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', id)
          .eq('status', 'active')
        data = {
          id: cls!.id,
          class_name: cls!.class_name,
          class_code: cls!.class_code,
          class_section: cls!.class_section,
          cover_color: cls!.cover_color,
          cover_image_url: (cls as any).cover_image_url,
          course_code: (cls as any).courses?.code,
          course_name: (cls as any).courses?.name,
          course_credits: (cls as any).courses?.credits,
          semester_name: (cls as any).academic_semesters?.name,
          room_code: (cls as any).rooms?.code,
          room_name: (cls as any).rooms?.name,
          day_of_week: cls!.day_of_week,
          start_time: cls!.start_time,
          end_time: cls!.end_time,
          enrolled_count: count ?? 0,
          lecturer_name: (cls as any).profiles?.name,
          lecturer_avatar: (cls as any).profiles?.avatar_url,
          lecturer_id: cls!.lecturer_id
        } as ClassDetail
      }
      // Fetch live stats for accurate enrolled_count
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
      console.error('[LecturerStream] Detail load failed:', err)
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
          setRealDescription(parts[0]?.trim() || '')
        } else if (data.description.startsWith('http')) {
          setZoomLink(data.description)
          setRealDescription('')
        } else {
          setRealDescription(data.description)
          setZoomLink('')
        }
      }
    } catch (err) {}
  }

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

  const loadPosts = async () => {
    try {
      const res = await fetch(`/api/classes/${id}/posts`)
      const json = await res.json()
      if (json.success) {
        setPosts(json.data || [])
      }
    } catch (err) {
      console.error('[LecturerStream] Posts load failed:', err)
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
      await Promise.all([loadClassDetail(), loadPosts(), loadUser(), loadZoomLink()])
      setLoading(false)
    }
    init()
  }, [id])

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    setPostLoading(true)
    setPostError(null)
    setPostSuccess(null)

    const supabase = createClient()

    try {
      let fileUrl = ''
      let fileName = ''
      let fileSize = 0
      let fileType = ''

      if (postFile) {
        const filePath = `${id}/${Date.now()}_${postFile.name}`
        const { error: uploadErr } = await supabase.storage
          .from('materials')
          .upload(filePath, postFile, { upsert: true })

        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabase.storage
          .from('materials')
          .getPublicUrl(filePath)

        fileUrl = publicUrl
        fileName = postFile.name
        fileSize = postFile.size
        fileType = postFile.type
      }

      const res = await fetch(`/api/classes/${id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: postType,
          title: postTitle || null,
          content: postContent,
          attachments: postFile ? [{
            file_name: fileName,
            file_url: fileUrl,
            file_type: fileType,
            file_size: fileSize,
          }] : []
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan postingan baru')
      }

      setPostSuccess('Postingan baru berhasil dipublikasikan!')
      setPostTitle('')
      setPostContent('')
      setPostFile(null)
      setShowPostForm(false)
      
      await loadPosts()
    } catch (err: any) {
      setPostError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setPostLoading(false)
    }
  }

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
      console.error('[LecturerStream] Post comment failed:', err)
    } finally {
      setCommentLoading(prev => ({ ...prev, [postId]: false }))
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus postingan ini?')) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error
      
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch (err) {
      console.error('[LecturerStream] Delete failed:', err)
    }
  }

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPostId) return
    setEditPostLoading(true)
    const supabase = createClient()
    try {
        const { error } = await supabase
            .from('posts')
            .update({
                title: editPostTitle || null,
                content: editPostContent,
                type: editPostType,
            })
            .eq('id', editPostId)

        if (error) throw error

        setPosts(prev => prev.map(p => {
            if (p.id === editPostId) {
                return { ...p, title: editPostTitle || null, content: editPostContent, type: editPostType as any }
            }
            return p
        }))
        setEditPostId(null)
    } catch (err) {
        console.error('[LecturerStream] Update failed:', err)
        alert('Gagal mengedit postingan.')
    } finally {
        setEditPostLoading(false)
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
        role="lecturer"
        className={classDetail.class_name}
        classCode={classDetail.class_code}
        classSection={classDetail.class_section}
        coverColor={classDetail.cover_color}
        coverImageUrl={classDetail.cover_image_url}
        lecturerName={classDetail.lecturer_name}
        lecturerAvatar={classDetail.lecturer_avatar}
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
        bannerAction={
          <ClassCoverEditor
            classId={classDetail.id}
            coverImageUrl={classDetail.cover_image_url}
            onUpdated={(url) =>
              setClassDetail((prev) => (prev ? { ...prev, cover_image_url: url } : prev))
            }
          />
        }
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4 max-w-7xl mx-auto px-1 md:px-3">
        {/* Left Side: Meet Card & Quick Stats */}
        <div className="space-y-5 lg:col-span-1">
          
          {/* Calendar Desktop */}
          <div className="hidden lg:block">
            <ClassCalendar classId={id} role="lecturer" />
          </div>

          {/* Interactive Zoom/Meet Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-white flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-600" />
                Zoom / Meet Online
              </span>
              {!isEditingZoom && (
                <button
                  onClick={() => {
                    setZoomInput(zoomLink)
                    setIsEditingZoom(true)
                  }}
                  className="text-slate-400 hover:text-slate-650 p-1"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {zoomError && (
              <p className="mt-2 text-[8px] font-bold text-red-650">{zoomError}</p>
            )}
            
            <div className="mt-3.5">
              {isEditingZoom ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={zoomInput}
                    onChange={(e) => setZoomInput(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-[10px] outline-none focus:border-blue-600 focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsEditingZoom(false)}
                      className="rounded px-2.5 py-1 text-[9px] font-bold text-slate-400 border border-slate-200 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSaveZoomLink}
                      className="rounded bg-blue-600 px-3 py-1 text-[9px] font-bold text-white hover:bg-blue-700"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ) : zoomLink ? (
                <div className="space-y-2">
                  <a
                    href={zoomLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 rounded-full border border-blue-600 hover:bg-blue-50/50 py-2 text-[11px] font-black text-blue-600 transition-all cursor-pointer"
                  >
                    Gabung Pertemuan
                  </a>
                  <button
                    onClick={handleDeleteZoomLink}
                    className="w-full text-center text-[9px] text-red-600 hover:text-red-700 font-bold tracking-wide transition-colors uppercase pt-1"
                  >
                    Hapus Link
                  </button>
                </div>
              ) : (
                <div className="text-center py-2.5">
                  <button
                    onClick={() => setIsEditingZoom(true)}
                    className="w-full flex items-center justify-center gap-1 border border-dashed border-slate-200 rounded-lg py-2.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Buat Link Pertemuan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
            <h3 className="text-xs font-black text-slate-800 dark:text-white leading-none">Status Kelas</h3>
            <ul className="mt-3.5 space-y-2 text-[10px] font-semibold text-slate-500 dark:text-gray-400">
              <li className="flex justify-between">
                <span>Kode Gabung</span>
                <span className="text-slate-850 dark:text-white font-black">{classDetail.class_code}</span>
              </li>
              <li className="flex justify-between">
                <span>Mahasiswa Aktif</span>
                <span className="text-slate-850 dark:text-white font-black">{classDetail.enrolled_count} orang</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Side: Stream Content list */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* Announcement Creator (Top expand bar style like Google Classroom) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
            {!showPostForm ? (
              <button
                onClick={() => {
                  setShowPostForm(true)
                  setPostError(null)
                  setPostSuccess(null)
                }}
                className="w-full flex items-center gap-3.5 text-left cursor-pointer p-1"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-650 uppercase">
                  {classDetail.lecturer_name.substring(0, 2)}
                </div>
                <span className="text-[11px] text-slate-400 font-bold flex-1">
                  Umumkan sesuatu ke kelas Anda...
                </span>
                <Plus className="h-4.5 w-4.5 text-slate-400 shrink-0" />
              </button>
            ) : (
              <div className="animate-fade-in space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-white">Bagikan dengan kelas</h3>
                  <button onClick={() => setShowPostForm(false)} className="text-slate-450 hover:text-slate-600 p-0.5">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {postError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[10px] font-semibold text-red-800 dark:bg-red-950/20 border border-red-150">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-650" />
                    <span>{postError}</span>
                  </div>
                )}

                {postSuccess && (
                  <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/20 border border-emerald-150">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-650" />
                    <span>{postSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreatePost} className="space-y-4 text-slate-850 dark:text-gray-250">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Kategori Post</label>
                      <select
                        value={postType}
                        onChange={(e: any) => setPostType(e.target.value)}
                        className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
                      >
                        <option value="announcement">Pengumuman Kelas</option>
                        <option value="material">Materi Perkuliahan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Judul Post (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Contoh: Pengantar Algoritma"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:bg-white dark:border-slate-850 dark:bg-[#18233C] dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Isi Konten</label>
                    <textarea
                      rows={4}
                      required
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Bagikan link belajar, instruksi tugas, atau informasi perkuliahan hari ini..."
                      className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
                    />
                  </div>

                  {/* Attachment input */}
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Lampiran File (Opsional)</label>
                    <div className="relative mt-2 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition-all text-center dark:border-slate-800 dark:bg-[#18233C]/20 select-none">
                      <input
                        type="file"
                        onChange={(e) => setPostFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="h-5 w-5 text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-650">
                        {postFile ? postFile.name : 'Pilih file PDF, ZIP, atau DOCX'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowPostForm(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-gray-400"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={postLoading || !postContent.trim()}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/10 hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {postLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Posting'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Feed Posts */}
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
            posts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-[#121B2E] transition-all relative"
              >
                {post.is_pinned && (
                  <div className="absolute top-0 right-0 flex items-center gap-1 bg-amber-50 px-3.5 py-1 text-[8px] font-black text-amber-700 rounded-bl-lg dark:bg-amber-950/20 dark:text-amber-400">
                    <Pin className="h-2.5 w-2.5 rotate-45" />
                    PINNED
                  </div>
                )}

                {/* Accordion Header */}
                <div 
                  onClick={() => setExpandedItems(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
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
                    <div className="flex flex-col items-start gap-0.5 text-left min-w-0 pr-4">
                      <h3 className="text-[10px] md:text-[11px] font-extrabold text-slate-800 dark:text-white leading-tight">
                        {user?.id === post.profiles?.id ? 'Anda' : (post.profiles?.name || classDetail?.lecturer_name)} <span className="font-semibold text-slate-500 dark:text-slate-400">memposting {post.type === 'assignment' ? 'tugas baru:' : post.type === 'material' ? 'materi baru:' : 'pengumuman baru'}</span> {post.title || ''}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-semibold text-slate-500 block uppercase tracking-widest">
                          {post.profiles?.role === 'lecturer' ? (post.profiles?.name === classDetail?.backup_lecturer_name ? 'DOSEN BACKUP' : 'DOSEN PENGAJAR') : 'MAHASISWA'} • {formatDate(post.published_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {expandedItems[post.id] ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Accordion Content */}
              {expandedItems[post.id] && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-transparent relative">
                  {(user?.id === classDetail.lecturer_id || user?.id === post.profiles?.id) && (
                    <div className="absolute top-4 right-4 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveDropdownId(activeDropdownId === post.id ? null : post.id)
                        }}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {activeDropdownId === post.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-[40]" 
                            onClick={(e) => { e.stopPropagation(); setActiveDropdownId(null); }} 
                          />
                          <div className="absolute right-0 top-full mt-1 z-[50] w-36 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 dark:bg-[#18233C] dark:border-slate-800">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditPostId(post.id)
                                setEditPostTitle(post.title || '')
                                setEditPostContent(post.content)
                                setEditPostType(post.type as any)
                                setActiveDropdownId(null)
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-[#121B2E] transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-blue-500" />
                              Edit Postingan
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveDropdownId(null)
                                handleDeletePost(post.id)
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Hapus Postingan
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {editPostId === post.id ? (
                    <div className="px-4 pb-4 pt-4">
                      <form onSubmit={handleUpdatePost} className="space-y-4 pr-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Kategori Post</label>
                        <select
                          value={editPostType}
                          onChange={(e: any) => setEditPostType(e.target.value)}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-gray-200"
                        >
                          <option value="announcement">Pengumuman</option>
                          <option value="material">Materi</option>
                          <option value="discussion">Diskusi</option>
                        </select>
                      </div>
                      {editPostType === 'material' && (
                        <div>
                          <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Judul Materi</label>
                          <input
                            type="text"
                            value={editPostTitle}
                            onChange={(e) => setEditPostTitle(e.target.value)}
                            placeholder="Cth: Bab 1 Pendahuluan"
                            required
                            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-gray-200"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Isi Postingan</label>
                      <textarea
                        rows={4}
                        value={editPostContent}
                        onChange={(e) => setEditPostContent(e.target.value)}
                        placeholder="Tulis instruksi atau keterangan..."
                        required
                        className="mt-1 block w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-[11px] leading-relaxed text-slate-800 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-gray-200"
                      />
                    </div>
                    <div className="flex gap-2.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditPostId(null)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-gray-400"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={editPostLoading || !editPostContent.trim()}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/10 hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        {editPostLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Simpan'}
                      </button>
                    </div>
                  </form>
                    </div>
                  ) : (
                    <div className="mt-4 px-4 space-y-2 pr-8">
                  {post.title && (
                    <h3 className="text-xs font-black text-slate-800 dark:text-white leading-tight">
                      {post.title}
                    </h3>
                  )}
                  <p className="text-[11px] text-slate-650 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {post.content}
                  </p>
                </div>
              )}

                  {/* Attachments */}
                  {post.post_attachments && post.post_attachments.length > 0 && (
                    <div className="mt-4 px-4 grid gap-3 sm:grid-cols-2">
                    {post.post_attachments.map((file) => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2.5 hover:bg-slate-100 transition-all dark:bg-[#151F32]/50 dark:border-slate-800 text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <FileText className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-extrabold text-slate-700 dark:text-gray-300 truncate max-w-[150px]">
                              {file.file_name}
                            </p>
                            <span className="text-[8px] text-slate-455 block font-semibold uppercase">
                              {(file.file_size / (1024 * 1024)).toFixed(2)} MB • {file.file_type.split('/').pop()?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <Download className="h-3.5 w-3.5 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
                      </a>
                    ))}
                  </div>
                )}

                  {/* Comments List */}
                  <div className="mt-5 px-4 pb-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                  {post.post_comments && post.post_comments.length > 0 && (
                    <div className="space-y-3 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                      {post.post_comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2.5 bg-slate-50/40 p-2.5 rounded-lg dark:bg-[#18233C]/20 border border-slate-100/50 dark:border-slate-850">
                          <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[8px] font-black text-slate-500 uppercase dark:bg-slate-800 dark:text-gray-400">
                            {comment.profiles?.name?.substring(0, 2) || 'DS'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[10px] font-black text-slate-850 dark:text-white leading-none font-extrabold">
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
                      className="block flex-1 rounded-full border border-slate-200 bg-slate-50 py-1.5 px-4 text-[10px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
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
          ))
          )}
        </div>
      </div>

      {/* Mobile Floating Action Buttons */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <button
          onClick={() => setIsCalendarModalOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition-transform"
        >
          <Calendar className="h-5 w-5" />
        </button>
        <button
          onClick={() => setIsZoomModalOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
        >
          <Video className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Calendar Modal */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm lg:hidden select-none">
          <div className="w-full max-w-sm rounded-2xl bg-transparent relative">
            <button
              onClick={() => setIsCalendarModalOpen(false)}
              className="absolute -top-10 right-0 bg-white/20 p-2 rounded-full text-white backdrop-blur"
            >
              <X className="h-4 w-4" />
            </button>
            <ClassCalendar classId={id} role="lecturer" />
          </div>
        </div>
      )}

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
                  <p className="mt-1 text-[9px] text-slate-500">Silakan buat link pertemuan di tampilan desktop.</p>
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
