'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import { 
  Loader2, AlertCircle, CheckCircle2, Info, BarChart3, 
  Database, RefreshCw, Clock, ArrowUpRight, HelpCircle, 
  Sparkles, Award, PlayCircle, Layers, XCircle, Users, Settings, X, Save
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Params {
  params: Promise<{ id: string }>
}

interface StudentGradeSummary {
  attendance_score: number
  assignment_score: number
  quiz_score: number
  midterm_score: number
  final_exam_score: number
  weighted_total: number | null
  letter_grade: string | null
  attendance_percentage: number
  total_sessions: number
  attended_sessions: number
  sync_status: 'pending' | 'synced' | 'failed'
  sync_error: string | null
  synced_at: string | null
}

interface StudentEnrollment {
  id: string
  status: string
  joined_at: string
  counts?: { assignment_count: number; quiz_count: number }
  profiles: {
    id: string
    name: string
    nim: string | null
    study_programs: {
      code: string
      name: string
    } | null
  }
  grade_summaries: StudentGradeSummary | null
}

interface ClassWeights {
  weight_attendance: number
  weight_assignments: number
  weight_quiz: number
  weight_midterm: number
  weight_final: number
  min_attendance_pct: number
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

export default function LecturerGradebook({ params }: Params) {
  const { id } = use(params)
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null)
  const [students, setStudents] = useState<StudentEnrollment[]>([])
  const [weights, setWeights] = useState<ClassWeights | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Loading action indicators
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [recalcLoading, setRecalcLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Class Weights Setting states
  const [showWeightsModal, setShowWeightsModal] = useState(false)
  const [wAttendance, setWAttendance] = useState(10)
  const [wAssignments, setWAssignments] = useState(20)
  const [wQuiz, setWQuiz] = useState(10)
  const [wMidterm, setWMidterm] = useState(30)
  const [wFinal, setWFinal] = useState(30)
  const [minAttendance, setMinAttendance] = useState(75)
  const [weightsSaveLoading, setWeightsSaveLoading] = useState(false)

  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [savingBulk, setSavingBulk] = useState(false)

  // Sync weights when loaded from API
  useEffect(() => {
    if (weights) {
      setWAttendance(Number(weights.weight_attendance || 0))
      setWAssignments(Number(weights.weight_assignments || 0))
      setWQuiz(Number(weights.weight_quiz || 0))
      setWMidterm(Number(weights.weight_midterm || 0))
      setWFinal(Number(weights.weight_final || 0))
      setMinAttendance(Number(weights.min_attendance_pct || 0))
    }
  }, [weights])

  const toggleStudent = (studentId: string, summary: any) => {
    const newSet = new Set(selectedStudents)
    const newEdits = { ...editValues }
    if (newSet.has(studentId)) {
      newSet.delete(studentId)
      delete newEdits[studentId]
    } else {
      newSet.add(studentId)
      newEdits[studentId] = {
        attended_sessions: summary?.attended_sessions || 0,
        midterm_score: summary ? Number(summary.midterm_score).toFixed(0) : '0',
        final_exam_score: summary ? Number(summary.final_exam_score).toFixed(0) : '0'
      }
    }
    setSelectedStudents(newSet)
    setEditValues(newEdits)
  }

  const toggleAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
      setEditValues({})
    } else {
      const newSet = new Set<string>()
      const newEdits: Record<string, any> = {}
      students.forEach(s => {
        newSet.add(s.profiles.id)
        newEdits[s.profiles.id] = {
          attended_sessions: s.grade_summaries?.attended_sessions || 0,
          midterm_score: s.grade_summaries ? Number(s.grade_summaries.midterm_score).toFixed(0) : '0',
          final_exam_score: s.grade_summaries ? Number(s.grade_summaries.final_exam_score).toFixed(0) : '0'
        }
      })
      setSelectedStudents(newSet)
      setEditValues(newEdits)
    }
  }

  const handleEditChange = (id: string, field: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }))
  }

  const handleBulkSave = async () => {
    if (selectedStudents.size === 0 || savingBulk) return
    setSavingBulk(true)
    try {
      const updates = Array.from(selectedStudents).map(id => ({
        studentId: id,
        ...editValues[id]
      }))
      const res = await fetch(`/api/classes/${id}/gradebook/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })
      if (!res.ok) throw new Error('Gagal menyimpan perubahan')
      
      setSelectedStudents(new Set())
      setEditValues({})
      await loadGradebook()
    } catch(err) {
      console.error(err)
      setActionError('Gagal menyimpan perubahan.')
    } finally {
      setSavingBulk(false)
    }
  }

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault()
    const total = wAttendance + wAssignments + wQuiz + wMidterm + wFinal
    if (total !== 100) {
      setActionError('Total bobot penilaian harus sama dengan 100%!')
      return
    }

    setWeightsSaveLoading(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      const res = await fetch(`/api/classes/${id}/gradebook`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_attendance: wAttendance,
          weight_assignments: wAssignments,
          weight_quiz: wQuiz,
          weight_midterm: wMidterm,
          weight_final: wFinal,
          min_attendance_pct: minAttendance,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan bobot penilaian')
      }

      setActionSuccess('Bobot penilaian berhasil diperbarui dan seluruh nilai mahasiswa telah dihitung ulang!')
      setShowWeightsModal(false)
      await loadGradebook()
    } catch (err: any) {
      setActionError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setWeightsSaveLoading(false)
    }
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
      console.error('[Gradebook] Class detail load failed:', err)
    }
  }

  const loadGradebook = async () => {
    try {
      const res = await fetch(`/api/classes/${id}/gradebook`)
      const json = await res.json()
      if (json.success && json.data) {
        setStudents(json.data.students || [])
        setWeights(json.data.classWeights || null)
      }
    } catch (err) {
      console.error('[Gradebook] Data load failed:', err)
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([
        loadClassDetail(), 
        loadGradebook()
      ])
      setLoading(false)
    }
    init()
  }, [id])

  const handleRecalculate = async () => {
    setRecalcLoading(true)
    setActionError(null)
    setActionSuccess(null)

    try {
      const res = await fetch(`/api/classes/${id}/gradebook`, { method: 'POST' })
      const json = await res.json()
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memperbarui nilai')
      }

      setActionSuccess(json.message || 'Rekap nilai berhasil dihitung ulang!')
      await loadGradebook()
    } catch (err: any) {
      setActionError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setRecalcLoading(false)
    }
  }

  const handleSyncSiakad = async () => {
    setSyncLoading(true)
    setSyncResult(null)
    setActionError(null)
    setActionSuccess(null)

    try {
      const res = await fetch('/api/integration/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: id }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mensinkronisasikan nilai ke SIAKAD')
      }

      setSyncResult(json.data)
      setActionSuccess(json.message || 'Sinkronisasi SIAKAD sukses terkirim!')
      await loadGradebook()
    } catch (err: any) {
      setActionError(err.message || 'Terjadi kesalahan integrasi web service')
    } finally {
      setSyncLoading(false)
    }
  }

  const getSyncBadge = (status: string, errorMsg: string | null) => {
    switch (status) {
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 uppercase tracking-wider dark:bg-emerald-950/20 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            SIAKAD
          </span>
        )
      case 'failed':
        return (
          <span 
            title={errorMsg || 'Gagal Sync'} 
            className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[9px] font-black text-rose-700 uppercase tracking-wider dark:bg-rose-950/20 dark:text-rose-400 cursor-help"
          >
            <XCircle className="h-3 w-3 shrink-0" />
            FAILED
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500 uppercase tracking-wider dark:bg-slate-800 dark:text-gray-400">
            <Clock className="h-3 w-3 shrink-0" />
            PENDING
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-blue-500" />
      </div>
    )
  }

  if (!classDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-black text-slate-800 dark:text-white">Kelas Tidak Ditemukan</h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Kelas yang Anda cari tidak ada atau Anda tidak memiliki akses.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 select-none">
      
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

      <div className="max-w-7xl mx-auto px-1 md:px-3 space-y-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Control Actions Row panel */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 items-start sm:items-center justify-between bg-white border border-slate-150 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl dark:bg-[#121B2E] dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 sm:h-9 sm:w-9 items-center justify-center rounded-md sm:rounded-xl bg-slate-50 text-slate-400 dark:bg-slate-800 shrink-0">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
          </div>
          <div>
            <h3 className="text-[9px] sm:text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wide">Akumulasi Nilai</h3>
            <p className="text-[7px] sm:text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Otomatis Sync SIAKAD</p>
          </div>
        </div>

        <div className="flex gap-1.5 sm:gap-3 w-full sm:w-auto mt-1 sm:mt-0">
          {selectedStudents.size > 0 && (
            <button
              onClick={handleBulkSave}
              disabled={savingBulk}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-md sm:rounded-xl bg-blue-600 hover:bg-blue-700 px-2 py-1.5 sm:px-4 sm:py-2 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50"
            >
              {savingBulk ? <Loader2 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 animate-spin" /> : <Save className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />}
              Simpan ({selectedStudents.size})
            </button>
          )}
          {/* Recalculate button */}
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalcLoading || syncLoading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-md sm:rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-2 py-1.5 sm:px-4 sm:py-2 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-650 transition-colors disabled:opacity-40 cursor-pointer dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            {recalcLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            )}
            Hitung Ulang
          </button>

          {/* Sync SIAKAD integration button */}
          <button
            type="button"
            onClick={handleSyncSiakad}
            disabled={syncLoading || recalcLoading || students.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#8B1A1A] hover:bg-[#6E1515] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white shadow-sm shadow-red-900/10 transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            {syncLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5 text-gold shrink-0 animate-pulse" />
            )}
            Sync SIAKAD
          </button>
        </div>
      </div>

      {/* Messages */}
      {actionError && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-800 dark:bg-red-950/20 border border-red-200/50">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/20 border border-emerald-200/50">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Gradebook Master Grid Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#121B2E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-max w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-2.5 w-10 text-center">
                  <input 
                    type="checkbox" 
                    onChange={toggleAll}
                    checked={students.length > 0 && selectedStudents.size === students.length}
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Mahasiswa</th>
                <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Absen ({weights?.weight_attendance}%)</th>
                <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Tugas ({weights?.weight_assignments}%)</th>
                <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Kuis ({weights?.weight_quiz}%)</th>
                <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">UTS ({weights?.weight_midterm}%)</th>
                <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">UAS ({weights?.weight_final}%)</th>
                <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Total</th>
                <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Indeks</th>
                <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <span>Integrasi</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (weights) {
                          setWAttendance(Number(weights.weight_attendance || 0))
                          setWAssignments(Number(weights.weight_assignments || 0))
                          setWQuiz(Number(weights.weight_quiz || 0))
                          setWMidterm(Number(weights.weight_midterm || 0))
                          setWFinal(Number(weights.weight_final || 0))
                          setMinAttendance(Number(weights.min_attendance_pct || 0))
                        }
                        setShowWeightsModal(true)
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-750 dark:hover:text-white transition-all cursor-pointer inline-flex items-center"
                      title="Pengaturan Bobot Penilaian Kelas"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400 dark:text-slate-600">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold">Belum Ada Mahasiswa Terdaftar di Kelas Ini</p>
                  </td>
                </tr>
              ) : (
                students.map((stud) => {
                  const summary = stud.grade_summaries
                  const isSelected = selectedStudents.has(stud.profiles.id)
                  
                  return (
                    <tr key={stud.id} className={`transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleStudent(stud.profiles.id, summary)}
                          className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-[11px] text-slate-850 dark:text-white font-extrabold">{stud.profiles.name}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 block">
                          NIM: {stud.profiles.nim || 'TBA'} - {stud.profiles.study_programs?.name || 'TBA'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isSelected ? (
                          <input 
                            type="number"
                            value={editValues[stud.profiles.id]?.attended_sessions || ''}
                            onChange={(e) => handleEditChange(stud.profiles.id, 'attended_sessions', e.target.value)}
                            className="w-12 text-center bg-white dark:bg-slate-900 border border-slate-300 rounded outline-none font-bold p-1"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-800 dark:text-white font-bold">{summary?.attended_sessions || 0}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        {stud.counts?.assignment_count || 0}
                      </td>
                      <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        {stud.counts?.quiz_count || 0}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isSelected ? (
                          <input 
                            type="number"
                            value={editValues[stud.profiles.id]?.midterm_score || ''}
                            onChange={(e) => handleEditChange(stud.profiles.id, 'midterm_score', e.target.value)}
                            className="w-12 text-center bg-white dark:bg-slate-900 border border-slate-300 rounded outline-none font-bold p-1"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-800 dark:text-white font-bold">{summary ? Number(summary.midterm_score).toFixed(0) : '0'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isSelected ? (
                          <input 
                            type="number"
                            value={editValues[stud.profiles.id]?.final_exam_score || ''}
                            onChange={(e) => handleEditChange(stud.profiles.id, 'final_exam_score', e.target.value)}
                            className="w-12 text-center bg-white dark:bg-slate-900 border border-slate-300 rounded outline-none font-bold p-1"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-800 dark:text-white font-bold">{summary ? Number(summary.final_exam_score).toFixed(0) : '0'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-800 dark:text-white whitespace-nowrap">
                        {summary?.weighted_total !== null ? summary?.weighted_total?.toFixed(0) : '0'}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                          {summary?.letter_grade || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {summary ? getSyncBadge(summary.sync_status, summary.sync_error) : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      </div>
      {/* Dynamic Glassmorphic Weights Configuration Modal */}
      {showWeightsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-150 bg-white/95 p-6 shadow-2xl animate-in zoom-in-95 dark:border-slate-800 dark:bg-[#121B2E]/95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-850">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary dark:text-blue-400" />
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Bobot Penilaian Kelas</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWeightsModal(false)}
                className="rounded-lg p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-650 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveWeights} className="mt-5 space-y-4">
              <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed font-bold">
                Atur bobot persentase kontribusi nilai untuk setiap komponen perkuliahan. Jumlah seluruh persentase bobot harus tepat <span className="text-primary dark:text-blue-400 font-extrabold">100%</span>.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Kehadiran */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Presensi Kehadiran (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={wAttendance}
                    onChange={(e) => setWAttendance(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
                  />
                </div>

                {/* Tugas */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Tugas Harian (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={wAssignments}
                    onChange={(e) => setWAssignments(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
                  />
                </div>

                {/* Kuis */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Kuis Kelas (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={wQuiz}
                    onChange={(e) => setWQuiz(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
                  />
                </div>

                {/* UTS */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Ujian Tengah (UTS) (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={wMidterm}
                    onChange={(e) => setWMidterm(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
                  />
                </div>

                {/* UAS */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Ujian Akhir (UAS) (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={wFinal}
                    onChange={(e) => setWFinal(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
                  />
                </div>

                {/* Min Kehadiran */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Minimal Kehadiran (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={minAttendance}
                    onChange={(e) => setMinAttendance(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
                  />
                </div>
              </div>

              {/* Accumulator Visual Widget */}
              <div className={`mt-4 rounded-xl p-3.5 flex items-center justify-between border ${
                wAttendance + wAssignments + wQuiz + wMidterm + wFinal === 100
                  ? 'bg-emerald-50 border-emerald-250 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                  : 'bg-rose-50 border-rose-250 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400'
              }`}>
                <div className="text-[10px] font-bold uppercase tracking-wider">
                  {wAttendance + wAssignments + wQuiz + wMidterm + wFinal === 100 ? (
                    <span className="flex items-center gap-1.5 font-black">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Komposisi Sempurna
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 font-black">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      Bobot Belum Sesuai
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[9px] block uppercase opacity-85">Total Akumulasi</span>
                  <span className="text-lg font-black">{wAttendance + wAssignments + wQuiz + wMidterm + wFinal}% / 100%</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-850 mt-4">
                <button
                  type="button"
                  onClick={() => setShowWeightsModal(false)}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-650 transition-colors cursor-pointer dark:border-slate-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={weightsSaveLoading || wAttendance + wAssignments + wQuiz + wMidterm + wFinal !== 100}
                  className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary-dark px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-40 cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {weightsSaveLoading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4.5 w-4.5" />
                      Simpan Bobot
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
