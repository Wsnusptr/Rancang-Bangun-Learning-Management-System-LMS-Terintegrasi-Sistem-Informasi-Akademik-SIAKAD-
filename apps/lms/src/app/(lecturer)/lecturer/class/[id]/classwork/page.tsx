'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import ClassSidebar from '@/components/classroom/ClassSidebar'
import ClassMobileWidgets from '@/components/classroom/ClassMobileWidgets'
import {
  Loader2, AlertCircle, FileText, CheckCircle2, Calendar, Plus,
  Trash2, ClipboardList, Info, UserCheck, GraduationCap, X, ChevronDown, ChevronUp,
  Video, Settings, UploadCloud, Clock, ExternalLink, MoreVertical, Edit3
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Params {
  params: Promise<{ id: string }>
}

interface Submission {
  id: string
  student_id: string
  submitted_at: string
  score: number | null
  final_score: number | null
  status: 'submitted' | 'graded' | 'returned' | 'revision_requested'
  is_late: boolean
  is_absent?: boolean
  profiles: {
    id: string
    name: string
    nim: string | null
    avatar_url: string | null
  }
}

interface Assignment {
  id: string
  class_id: string
  title: string
  description: string | null
  type: 'homework' | 'quiz' | 'project' | 'midterm' | 'final' | 'practice'
  max_score: number
  passing_score: number
  due_date: string | null
  late_submission: boolean
  late_penalty_pct: number
  allow_file_upload: boolean
  allowed_file_types: string[]
  max_file_size_mb: number
  is_published: boolean
  submissions: Submission[]
  submission_count: number
  graded_count: number
  created_at: string
}

interface ClassDetail {
  id: string
  class_name: string
  class_code: string
  class_section: string | null
  cover_color: string
  cover_image_url?: string | null
  lecturer_avatar?: string | null
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

export default function LecturerClasswork({ params }: Params) {
  const { id } = use(params)
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [expandedAssignments, setExpandedAssignments] = useState<Record<string, boolean>>({})
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [zoomLink, setZoomLink] = useState('')
  const [zoomInput, setZoomInput] = useState('')
  const [isEditingZoom, setIsEditingZoom] = useState(false)
  const [zoomError, setZoomError] = useState<string | null>(null)
  const [realDescription, setRealDescription] = useState('')

  const toggleExpand = (id: string) => {
    setExpandedAssignments(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'homework' | 'quiz' | 'project' | 'midterm' | 'final' | 'practice'>('homework')
  const [maxScore, setMaxScore] = useState(100)
  const [passingScore, setPassingScore] = useState(60)
  const [dueDate, setDueDate] = useState('')
  const [lateSubmission, setLateSubmission] = useState(false)
  const [latePenaltyPct, setLatePenaltyPct] = useState(10)
  const [allowFileUpload, setAllowFileUpload] = useState(true)
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>(['pdf', 'doc', 'docx', 'jpg', 'png', 'zip'])
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(10)

  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const [editAssignId, setEditAssignId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState<'homework' | 'quiz' | 'project' | 'midterm' | 'final' | 'practice'>('homework')
  const [editMaxScore, setEditMaxScore] = useState(100)
  const [editPassingScore, setEditPassingScore] = useState(60)
  const [editDueDate, setEditDueDate] = useState('')
  const [editLateSubmission, setEditLateSubmission] = useState(false)
  const [editLatePenaltyPct, setEditLatePenaltyPct] = useState(10)
  const [editAllowFileUpload, setEditAllowFileUpload] = useState(true)
  const [editAllowedFileTypes, setEditAllowedFileTypes] = useState<string[]>(['pdf', 'doc', 'docx', 'jpg', 'png', 'zip'])
  const [editMaxFileSizeMb, setEditMaxFileSizeMb] = useState(10)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null)
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null)
  const [gradingScore, setGradingScore] = useState('')
  const [gradingFeedback, setGradingFeedback] = useState('')
  const [gradingLoading, setGradingLoading] = useState(false)
  const [gradingError, setGradingError] = useState<string | null>(null)
  const [gradingSuccess, setGradingSuccess] = useState<string | null>(null)

  const upcomingAssignments = useMemo(() => {
    return assignments.filter((a: any) => {
      if (!a.due_date) return true
      return new Date(a.due_date).getTime() > Date.now()
    }).slice(0, 3)
  }, [assignments])

  const loadClassDetail = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('class_details')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
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
      console.error('[LecturerClasswork] Detail load failed:', err)
    }
  }

  const loadAssignments = async () => {
    try {
      const res = await fetch(`/api/classes/${id}/assignments`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setAssignments(json.data)
        // Automatically expand the first one if none are expanded
        if (json.data.length > 0 && Object.keys(expandedAssignments).length === 0) {
          setExpandedAssignments({ [json.data[0].id]: true })
        }
      }
    } catch (err) {
      console.error('[LecturerClasswork] Assignments load failed:', err)
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
    } catch (err) { }
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

  useEffect(() => {
    async function init() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      await Promise.all([loadClassDetail(), loadAssignments(), loadZoomLink()])
      setLoading(false)
    }
    init()
  }, [id])

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    setCreateSuccess(null)

    try {
      const payload = {
        title,
        description: description || null,
        type,
        maxScore: Number(maxScore),
        passingScore: Number(passingScore),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        lateSubmission,
        latePenaltyPct: Number(latePenaltyPct),
        allowFileUpload,
        allowedFileTypes,
        maxFileSizeMb: Number(maxFileSizeMb)
      }

      const res = await fetch(`/api/classes/${id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal membuat tugas baru')
      }

      setCreateSuccess('Tugas baru berhasil dipublikasikan!')
      setTitle('')
      setDescription('')
      setDueDate('')

      setTimeout(() => {
        setShowCreateModal(false)
        setCreateSuccess(null)
        setLatePenaltyPct(10)
        setAllowFileUpload(true)
        setMaxFileSizeMb(10)
        
        loadAssignments()
      }, 1500)
    } catch (err: any) {
      setCreateError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editAssignId) return
    
    setEditLoading(true)
    setEditError(null)

    try {
      const payload = {
        id: editAssignId,
        title: editTitle,
        description: editDescription || null,
        type: editType,
        maxScore: Number(editMaxScore),
        passingScore: Number(editPassingScore),
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
        lateSubmission: editLateSubmission,
        latePenaltyPct: Number(editLatePenaltyPct),
        allowFileUpload: editAllowFileUpload,
        allowedFileTypes: editAllowedFileTypes,
        maxFileSizeMb: Number(editMaxFileSizeMb)
      }

      const res = await fetch(`/api/classes/${id}/assignments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memperbarui tugas')
      }

      setEditAssignId(null)
      loadAssignments()
    } catch (err: any) {
      setEditError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setEditLoading(false)
    }
  }

  const handleOpenGradeModal = async (sub: Submission, assign: Assignment) => {
    setGradingSubmission(sub)
    setActiveAssignment(assign)
    setGradingScore(sub.score !== null ? sub.score.toString() : '')
    setGradingFeedback('')
    setGradingError(null)
    setGradingSuccess(null)

    try {
      const res = await fetch(`/api/submissions/${sub.id}/grade`)
      const json = await res.json()
      if (json.success && json.data) {
        setGradingFeedback(json.data.feedback || '')
      }
    } catch (err) { }
  }

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gradingSubmission) return
    setGradingLoading(true)
    setGradingError(null)
    setGradingSuccess(null)

    try {
      const scoreNum = Number(gradingScore)
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > activeAssignment!.max_score) {
        throw new Error(`Skor harus angka 0 - ${activeAssignment!.max_score}`)
      }

      const res = await fetch(`/api/submissions/${gradingSubmission.id}/grade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: scoreNum,
          feedback: gradingFeedback || null,
          status: 'graded',
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan nilai')
      }

      setGradingSuccess(json.message || 'Nilai berhasil disimpan!')

      setTimeout(() => {
        setGradingSubmission(null)
        setActiveAssignment(null)
        setGradingSuccess(null)
        loadAssignments()
      }, 1500)
    } catch (err: any) {
      setGradingError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setGradingLoading(false)
    }
  }

  const handleDeleteAssignment = async (assignId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignId)

      if (error) throw error

      setAssignments(prev => prev.filter(a => a.id !== assignId))
      setActiveAssignment(null)
    } catch (err) {
      console.error('[LecturerClasswork] Delete failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-[#F8F9FA] dark:bg-[#121B2E]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 select-none bg-[#F8F9FA] dark:bg-[#0D1424] min-h-screen pb-12">

      <ClassHeader
        id={classDetail?.id || ''}
        role="lecturer"
        className={classDetail?.class_name || ''}
        classCode={classDetail?.class_code || ''}
        classSection={classDetail?.class_section || ''}
        coverColor={classDetail?.cover_color || '#1A3A6B'}
        coverImageUrl={classDetail?.cover_image_url}
        lecturerName={classDetail?.lecturer_name || ''}
        lecturerAvatar={classDetail?.lecturer_avatar}
        courseCode={classDetail?.course_code || ''}
        courseName={classDetail?.course_name || ''}
        credits={classDetail?.course_credits || 0}
        semesterName={classDetail?.semester_name || ''}
        roomCode={classDetail?.room_code || ''}
        roomName={classDetail?.room_name || ''}
        dayOfWeek={classDetail?.day_of_week || ''}
        startTime={classDetail?.start_time || ''}
        endTime={classDetail?.end_time || ''}
        enrolledCount={classDetail?.enrolled_count || 0}
      />

      <ClassMobileWidgets 
        classId={id} 
        role="lecturer" 
        classCode={classDetail?.class_code || ''} 
        enrolledCount={classDetail?.enrolled_count || 0} 
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
        
        <ClassSidebar 
          classId={id} 
          role="lecturer" 
          classCode={classDetail?.class_code || ''} 
          enrolledCount={classDetail?.enrolled_count || 0} 
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

        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Daftar Tugas</h2>
            <button
              onClick={() => {
                setShowCreateModal(true)
                setCreateError(null)
                setCreateSuccess(null)
              }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Baru
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#121B2E]">
              <FileText className="h-8 w-8 text-slate-300 mb-2" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-white">Tidak Ada Tugas</h3>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                Belum ada tugas yang dipublikasikan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assign) => {
                const isExpanded = expandedAssignments[assign.id]
                return (
                  <div key={assign.id} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#121B2E]/90 overflow-hidden transition-all duration-200">
                    <button
                      onClick={() => toggleExpand(assign.id)}
                      className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 dark:bg-[#121B2E] dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {/* Profile Avatar */}
                        <div className="relative h-9 w-9 shrink-0">
                          <img 
                            src={classDetail?.lecturer_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(classDetail?.lecturer_name || 'Dosen')}&background=random`} 
                            alt={classDetail?.lecturer_name || 'Dosen'} 
                            className="h-full w-full rounded-full object-cover" 
                          />
                        </div>
                        <div className="flex flex-col items-start gap-0.5 text-left">
                          <h3 className="text-[10px] md:text-[11px] font-extrabold text-slate-800 dark:text-white leading-tight">
                            {userId === classDetail?.lecturer_id ? 'Anda' : classDetail?.lecturer_name} <span className="font-semibold text-slate-500 dark:text-slate-400">memberikan tugas baru:</span> {assign.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-semibold text-slate-500 block uppercase tracking-widest">
                              DOSEN PENGAJAR • {formatDate(assign.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-bold text-slate-800 dark:text-white">{assign.submission_count} Submissions</p>
                          <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">{assign.graded_count} Graded</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#121B2E]">
                        {editAssignId === assign.id ? (
                          <div className="p-5 border-b border-slate-50 dark:border-slate-800/50">
                            <form onSubmit={handleUpdateAssignment} className="space-y-4">
                              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-white mb-3">Edit Tugas</h3>
                              
                              {editError && (
                                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200">
                                  <AlertCircle className="h-4 w-4 shrink-0" />
                                  <span>{editError}</span>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">Judul Tugas</label>
                                  <input
                                    type="text"
                                    required
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-[11px] outline-none focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">Kategori</label>
                                  <select
                                    value={editType}
                                    onChange={(e: any) => setEditType(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-[11px] outline-none focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                                  >
                                    <option value="homework">Tugas Rumah (Homework)</option>
                                    <option value="quiz">Kuis Singkat (Quiz)</option>
                                    <option value="project">Proyek (Project)</option>
                                    <option value="practice">Latihan (Practice)</option>
                                    <option value="midterm">Ujian Tengah Semester (UTS)</option>
                                    <option value="final">Ujian Akhir Semester (UAS)</option>
                                  </select>
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">Deskripsi</label>
                                <textarea
                                  rows={4}
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] outline-none focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white resize-none"
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">Nilai Maks.</label>
                                  <input
                                    type="number"
                                    min={1} max={1000} required
                                    value={editMaxScore}
                                    onChange={(e) => setEditMaxScore(Number(e.target.value))}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-[11px] outline-none focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1.5">Tenggat Waktu</label>
                                  <input
                                    type="datetime-local"
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-[11px] outline-none focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex gap-2.5 justify-end pt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditAssignId(null)}
                                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-gray-400"
                                >
                                  Batal
                                </button>
                                <button
                                  type="submit"
                                  disabled={editLoading || !editTitle.trim()}
                                  className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all disabled:opacity-50"
                                >
                                  {editLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Simpan'}
                                </button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          <>
                            <div className="p-5 border-b border-slate-50 dark:border-slate-800/50 flex items-start justify-between">
                          <div className="space-y-4 max-w-3xl">
                            <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                              {assign.description || 'Tidak ada deskripsi.'}
                            </p>
                            <div className="flex flex-wrap gap-4 pt-1">
                              <span className="text-[9px] font-bold uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-md">Tugas</span>
                              <span className="text-[9px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2.5 py-1 rounded-md">Max: {assign.max_score}</span>
                              {assign.due_date && (
                                <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3" />
                                  Tenggat: {formatDate(assign.due_date)}
                                </span>
                              )}
                              {assign.allow_file_upload && (
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
                                  <UploadCloud className="h-3 w-3 text-slate-400" />
                                  File: {assign.allowed_file_types?.join(', ')?.toUpperCase() || 'Semua'} (Max: {assign.max_file_size_mb}MB)
                                </div>
                              )}
                              <div className={`flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-md ${assign.late_submission ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'}`}>
                                <Clock className="h-3 w-3" />
                                {assign.late_submission ? `Late Diizinkan (Penalti: -${assign.late_penalty_pct}%)` : 'Late Tidak Diizinkan'}
                              </div>
                            </div>
                          </div>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveDropdownId(activeDropdownId === assign.id ? null : assign.id)
                              }}
                              className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {activeDropdownId === assign.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-[40]" 
                                  onClick={(e) => { e.stopPropagation(); setActiveDropdownId(null); }} 
                                />
                                <div className="absolute right-0 top-full mt-1 z-[50] w-36 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 dark:bg-[#18233C] dark:border-slate-800">
                                  <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditAssignId(assign.id)
                                        setEditTitle(assign.title)
                                        setEditDescription(assign.description || '')
                                        setEditType(assign.type as any)
                                        setEditMaxScore(assign.max_score)
                                        setEditPassingScore(assign.passing_score)
                                        setEditDueDate(assign.due_date ? new Date(assign.due_date).toISOString().slice(0, 16) : '')
                                        setEditLateSubmission(assign.late_submission)
                                        setEditLatePenaltyPct(assign.late_penalty_pct)
                                        setEditAllowFileUpload(assign.allow_file_upload)
                                        setEditAllowedFileTypes(assign.allowed_file_types || ['pdf', 'doc', 'docx', 'jpg', 'png', 'zip'])
                                        setEditMaxFileSizeMb(assign.max_file_size_mb)
                                        setActiveDropdownId(null)
                                      }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-[#121B2E] transition-colors"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 text-blue-500" />
                                    Edit Tugas
                                  </button>
                                  <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1"></div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveDropdownId(null)
                                      handleDeleteAssignment(assign.id)
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Hapus Tugas
                                  </button>
                                </div>
                              </>
                            )}
                            </div>
                          </div>
                          
                          <div className="p-5 bg-slate-50/50 dark:bg-slate-900/20">
                            <h4 className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-2 mb-4 uppercase tracking-widest">
                              <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
                            Daftar Submissions
                          </h4>

                          {assign.submissions && assign.submissions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                              <UserCheck className="h-6 w-6 mb-2 opacity-50" />
                              <p className="text-[10px] font-semibold">Belum ada mahasiswa yang mengumpulkan</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121B2E]">
                              <table className="min-w-max w-full">
                                <thead className="bg-slate-50 dark:bg-slate-900/50">
                                  <tr className="border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-widest">Mahasiswa</th>
                                    <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-widest">Tanggal</th>
                                    <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-500 uppercase tracking-widest">Nilai</th>
                                    <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-500 uppercase tracking-widest">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {assign.submissions?.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                      <td className="px-4 py-3">
                                        <p className="font-extrabold text-[11px] text-slate-800 dark:text-white">{sub.profiles.name}</p>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 block">
                                          NIM: {sub.profiles.nim || 'N/A'}
                                        </span>
                                        {sub.is_absent && (
                                          <span className="inline-flex items-center gap-1 mt-1 rounded bg-rose-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                            <AlertCircle className="h-2.5 w-2.5" /> Tidak Absen
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3">
                                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{formatDate(sub.submitted_at)}</p>
                                        {sub.is_late && (
                                          <span className="inline-block mt-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-red-600 dark:bg-red-950/30 dark:text-red-400">Late</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        {sub.score !== null ? (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                                            Graded
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400">
                                            Pending
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right font-black text-slate-800 dark:text-white text-[11px]">
                                        {sub.final_score !== null ? `${sub.final_score}/${assign.max_score}` : <span className="text-slate-400 font-normal">-</span>}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() => handleOpenGradeModal(sub, assign)}
                                          className="rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
                                        >
                                          {sub.score !== null ? 'Edit' : 'Grade'}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </>
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


      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-[#121B2E] border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Buat Tugas Baru
              </h3>
              <p className="text-[10px] text-blue-100 mt-1">
                Tugas akan otomatis terdistribusi ke mahasiswa
              </p>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-5 space-y-4">
              {createError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {createSuccess && (
                <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{createSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-400 mb-2">Judul Tugas</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Tugas 1 - Pemrograman Web"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-400 mb-2">Deskripsi</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instruksi pengerjaan tugas..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-2">Kategori</label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="homework">Homework</option>
                    <option value="quiz">Quiz</option>
                    <option value="project">Project</option>
                    <option value="midterm">UTS</option>
                    <option value="final">UAS</option>
                    <option value="practice">Practice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-2">Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-2">Nilai Max</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    required
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-2">Passing Grade</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="fileUploadCheckbox"
                        checked={allowFileUpload}
                        onChange={(e) => setAllowFileUpload(e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      <label htmlFor="fileUploadCheckbox" className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                        Izinkan pengumpulan file
                      </label>
                    </div>

                    {allowFileUpload && (
                      <div className="ml-7 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-2">Max Size (MB)</label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={maxFileSizeMb}
                            onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-2">Tipe File</label>
                          <input
                            type="text"
                            value={allowedFileTypes.join(', ')}
                            onChange={(e) => setAllowedFileTypes(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            placeholder="pdf, docx, zip"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-50 dark:border-slate-800/50">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="lateCheckbox"
                        checked={lateSubmission}
                        onChange={(e) => setLateSubmission(e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      <label htmlFor="lateCheckbox" className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                        Izinkan late submission
                      </label>
                    </div>

                    {lateSubmission && (
                      <div className="ml-7">
                        <label className="block text-[9px] font-bold uppercase text-slate-400 mb-2">Penalti (%)</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={latePenaltyPct}
                          onChange={(e) => setLatePenaltyPct(Number(e.target.value))}
                          className="w-32 rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing...</> : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {gradingSubmission && (
        <div className="fixed inset-0 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm z-50">
          <div className="w-full max-w-md h-full bg-white shadow-2xl dark:bg-[#121B2E] border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white">
              <h3 className="text-sm font-bold">Input Nilai</h3>
              <p className="text-[10px] text-blue-100 mt-1">{gradingSubmission.profiles.name}</p>
            </div>

            <form onSubmit={handleSubmitGrade} className="p-5 space-y-4">
              {gradingError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{gradingError}</span>
                </div>
              )}

              {gradingSuccess && (
                <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{gradingSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-400 mb-2">
                  Skor (Max: {activeAssignment?.max_score})
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={activeAssignment?.max_score}
                  value={gradingScore}
                  onChange={(e) => setGradingScore(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-400 mb-2">Feedback (Opsional)</label>
                <textarea
                  rows={4}
                  value={gradingFeedback}
                  onChange={(e) => setGradingFeedback(e.target.value)}
                  placeholder="Catatan untuk mahasiswa..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={gradingLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {gradingLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Simpan Nilai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
