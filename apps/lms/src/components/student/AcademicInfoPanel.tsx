'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Megaphone, Loader2, Calendar, FileText, Award,
  BookOpen, Users, CheckCircle2, AlertTriangle, X,
  Trash2, Plus, RefreshCw, Clock, Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

type TabType = 'krs' | 'transcript' | 'gpa' | 'announcements'

export default function AcademicInfoPanel() {
  const router = useRouter()
  const [activeSubTab, setActiveSubTab] = useState<TabType>('krs')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  // Data states
  const [activeSemester, setActiveSemester] = useState<any | null>(null)
  const [classesList, setClassesList] = useState<any[]>([])
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([])
  const [transcript, setTranscript] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [selectedSemIdx, setSelectedSemIdx] = useState<number>(0)

  const loadAllData = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)

      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      setUser({ ...authUser, profile })

      // Parallel fetch KRS data, Transcript data, and Announcements
      const [krsRes, transcriptRes, annRes] = await Promise.all([
        fetch('/api/academic/register').then(r => r.json()),
        fetch('/api/academic/transcript').then(r => r.json()),
        supabase
          .from('announcements')
          .select('*')
          .eq('category', 'Mahasiswa Aktif')
          .order('is_highlight', { ascending: false })
          .order('created_at', { ascending: false })
      ])

      // 1. Handle KRS load
      if (krsRes.success) {
        setActiveSemester(krsRes.data.activeSemester)
        setClassesList(krsRes.data.classes || [])
        setEnrolledClasses(krsRes.data.enrolledClasses || [])
      }

      // 2. Handle Transcript load
      if (transcriptRes.success) {
        const transData = transcriptRes.data || []
        setTranscript(transData)
        const semKeys = Array.from(new Set(transData.map((item: any) => item.semesterId || item.semesterName)))
        setSelectedSemIdx(semKeys.length - 1 >= 0 ? semKeys.length - 1 : 0)
      }

      // 3. Handle Announcements
      setAnnouncements(annRes.data || [])

    } catch (err: any) {
      setErrorMsg('Gagal memuat data akademik. Silakan coba lagi.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // KRS actions
  const handleEnroll = async (classId: string) => {
    setActionLoading(classId)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch('/api/academic/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId })
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mendaftar kelas.')
      }

      setSuccessMsg(json.message || 'Pendaftaran kelas berhasil!')
      await loadAllData()
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDrop = async (classId: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan pendaftaran kelas ini? Nilai dan data kehadiran di kelas ini akan terhapus.')) {
      return
    }

    setActionLoading(classId)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch('/api/academic/register', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId })
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal membatalkan kelas.')
      }

      setSuccessMsg('Pendaftaran kelas berhasil dibatalkan.')
      await loadAllData()
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  // GPA Calculator dynamic logic
  const coursesWithGrades = transcript.filter((item) => item.letterGrade !== null && item.gradePoints !== null)
  const totalCreditsTaken = transcript.reduce((sum, item) => sum + item.credits, 0)
  const totalCreditsPassed = transcript.reduce((sum, item) => {
    const isPassed = item.letterGrade && !['D', 'E'].includes(item.letterGrade)
    return isPassed ? sum + item.credits : sum
  }, 0)
  const totalQualityPoints = coursesWithGrades.reduce((sum, item) => sum + (item.credits * (item.gradePoints || 0)), 0)
  const totalCreditsForGPA = coursesWithGrades.reduce((sum, item) => sum + item.credits, 0)
  const cumulativeGPA = totalCreditsForGPA > 0 ? (totalQualityPoints / totalCreditsForGPA).toFixed(2) : '0.00'

  // Semester grouping for IPS
  const semesterMap: Record<string, {
    semesterName: string
    academicYear: string
    creditsTaken: number
    creditsPassed: number
    qualityPoints: number
    gpaCredits: number
    courses: any[]
  }> = {}

  transcript.forEach((course) => {
    const semKey = course.semesterId || course.semesterName
    if (!semesterMap[semKey]) {
      semesterMap[semKey] = {
        semesterName: course.semesterName,
        academicYear: course.academicYear,
        creditsTaken: 0,
        creditsPassed: 0,
        qualityPoints: 0,
        gpaCredits: 0,
        courses: []
      }
    }

    const semGroup = semesterMap[semKey]
    semGroup.creditsTaken += course.credits
    const isPassed = course.letterGrade && !['D', 'E'].includes(course.letterGrade)
    if (isPassed) semGroup.creditsPassed += course.credits
    semGroup.courses.push(course)

    if (course.letterGrade !== null && course.gradePoints !== null) {
      semGroup.qualityPoints += course.credits * course.gradePoints
      semGroup.gpaCredits += course.credits
    }
  })

  const semesterSummaryList = Object.values(semesterMap).map((semGroup) => {
    const ips = semGroup.gpaCredits > 0 ? (semGroup.qualityPoints / semGroup.gpaCredits).toFixed(2) : '0.00'
    return {
      ...semGroup,
      ips
    }
  })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  // Active KRS credits calculation
  const activeEnrolledClasses = classesList.filter(c => enrolledClasses.some(ec => ec.class_id === c.id))
  const activeCreditsCount = activeEnrolledClasses.reduce((sum, item) => sum + (item.courses?.credits || 3), 0)

  // Fallback NIM logic since profile.nim might be missing sometimes
  const studentNim = user?.profile?.nim || user?.user_metadata?.nim || user?.nim || '-'
  const studentName = user?.profile?.name || user?.user_metadata?.name || user?.name || 'Mahasiswa'
  const studyProgram = user?.profile?.study_program || 'S1 Informatika'

  return (
    <>
    <div className="bg-white dark:bg-[#121B2E] p-5 sm:p-7 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-5 print:hidden relative z-10">
      {/* 1. Header Page */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Portal Akademik & KRS Mahasiswa
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Pusat administrasi studi, re-registrasi kartu rencana studi (KRS), transkrip nilai, dan pencapaian akademik Anda.
            </p>
          </div>
          <div className="mt-2.5 sm:mt-0 flex justify-start sm:justify-end w-full sm:w-auto">
            <button
              onClick={loadAllData}
              className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh Data
            </button>
          </div>
        </div>

      {/* 2. Feedback Alert Messages */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-950/20 dark:bg-red-950/10 dark:text-red-400 transition-all animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-black">Gagal: </span>
            {errorMsg}
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-250 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-950/20 dark:bg-emerald-950/10 dark:text-emerald-400 transition-all animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-black">Berhasil: </span>
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* 3. Academic Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-px">
        {[
          { id: 'krs', label: 'Daftar Ulang (KRS)', icon: Calendar },
          { id: 'transcript', label: 'Rekap Nilai', icon: FileText },
          { id: 'gpa', label: 'Catatan Akademik', icon: Award },
          { id: 'announcements', label: 'Pengumuman', icon: Megaphone }
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeSubTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveSubTab(tab.id as TabType); setErrorMsg(null); setSuccessMsg(null) }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-slate-450 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 4. Tab Contents */}

      {/* KRS TAB */}
      {activeSubTab === 'krs' && (
        <div className="space-y-10 animate-fade-in font-sans">
          {/* Active Period Info */}
          <div className="flex flex-row items-end justify-between gap-2 border-b-2 border-slate-900 pb-3 dark:border-white">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-[10px] sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                Daftar Ulang (KRS)
              </h3>
              <p className="text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-0.5 dark:text-gray-400 truncate">
                {activeSemester ? activeSemester.name : 'Belum ada periode aktif'}
              </p>
            </div>
            {activeSemester && (
              <div className="text-right bg-slate-50 p-1.5 sm:p-0 sm:bg-transparent rounded-lg dark:bg-slate-800/30 sm:dark:bg-transparent border border-slate-100 sm:border-none dark:border-slate-800 shrink-0">
                <span className="block text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400">Tahun Akademik</span>
                <span className="block text-[9px] sm:text-xs font-black text-slate-800 dark:text-gray-300 mt-0.5">{activeSemester.academic_year} - {activeSemester.semester_type}</span>
              </div>
            )}
          </div>

          {!activeSemester ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#121B2E]">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-extrabold text-xs text-slate-700 dark:text-white">Registrasi KRS Ditutup</p>
              <p className="text-[10px] text-slate-450 max-w-sm mx-auto mt-1">
                Administrator SIAKAD belum mengaktifkan periode perkuliahan berjalan. Silakan hubungi bagian administrasi akademik.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Classes Catalog Offered */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-[9px] sm:text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                    Daftar Kelas Ditawarkan
                  </h3>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    {classesList.length} Kelas Tersedia
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px] font-bold text-slate-700 dark:text-slate-300 font-sans">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        <th className="pb-3 pr-2">Kode</th>
                        <th className="pb-3 pr-2">Mata Kuliah</th>
                        <th className="pb-3 pr-2 text-center">SKS</th>
                        <th className="pb-3 pr-2 text-center">Kelas</th>
                        <th className="pb-3 pr-2">Dosen Pengampu</th>
                        <th className="pb-3 pr-2">Jadwal Perkuliahan</th>
                        <th className="pb-3 pr-2 text-center">Kuota (Terisi)</th>
                        <th className="pb-3 text-right">Pilihan Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {classesList.map((cls) => {
                        const enrollment = enrolledClasses.find(ec => ec.class_id === cls.id)
                        const isEnrolled = !!enrollment
                        const isApproved = enrollment?.status === 'active'
                        const course = cls.courses || {}
                        const lecturer = cls.profiles || {}
                        const isFull = cls.enrolled_count >= cls.max_students

                        return (
                          <tr key={cls.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 whitespace-nowrap">
                            <td className="py-3.5 pr-2 font-mono font-bold text-slate-500">
                              {course.code || 'MATKUL'}
                            </td>
                            <td className="py-3.5 pr-2 font-extrabold text-slate-850 dark:text-white">
                              {course.name}
                            </td>
                            <td className="py-3.5 pr-2 text-center font-extrabold text-blue-600 dark:text-blue-400">
                              {course.credits || 3}
                            </td>
                            <td className="py-3.5 pr-2 text-center text-slate-500">
                              {cls.class_section || 'A'}
                            </td>
                            <td className="py-3.5 pr-2 text-slate-600 dark:text-slate-450">
                              {lecturer.name}
                            </td>
                            <td className="py-3.5 pr-2 text-slate-500 font-medium">
                              {cls.day_of_week && cls.start_time ? `${cls.day_of_week}, ${cls.start_time.substring(0, 5)} - ${cls.end_time?.substring(0, 5)}` : 'Jadwal belum ditentukan'}
                            </td>
                            <td className="py-3.5 pr-2 text-center">
                              <span className={isFull ? 'text-red-500 font-extrabold' : 'text-slate-700 dark:text-slate-300'}>
                                {cls.enrolled_count} <span className="text-[10px] text-slate-440 font-bold">/ {cls.max_students}</span>
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              {isEnrolled ? (
                                <div className="flex gap-1.5 justify-end items-center">
                                  {isApproved ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 px-2 py-1 text-[9px] font-black uppercase tracking-wider">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Terdaftar
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-1 text-[9px] font-black uppercase tracking-wider">
                                      <Clock className="h-3 w-3" />
                                      Rencana Studi (Pending)
                                    </span>
                                  )}
                                  <button
                                    disabled={actionLoading !== null}
                                    onClick={() => handleDrop(cls.id)}
                                    className="inline-flex items-center justify-center h-6 w-6 rounded bg-red-50 hover:bg-red-100 text-red-650 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                                    title="Batalkan KRS"
                                  >
                                    {actionLoading === cls.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  disabled={actionLoading !== null || isFull}
                                  onClick={() => handleEnroll(cls.id)}
                                  className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                                    isFull
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                  }`}
                                >
                                  {actionLoading === cls.id ? (
                                    <><Loader2 className="h-3 w-3 animate-spin" />...</>
                                  ) : isFull ? (
                                    'Penuh'
                                  ) : (
                                    <><Plus className="h-3 w-3" /> Ambil</>
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {classesList.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                            Tidak ada kelas ditawarkan untuk semester aktif ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rencana Studi Anda */}
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b-2 border-slate-900 dark:border-white pb-3">
                  <div className="flex-1">
                    <h3 className="text-[10px] sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Rencana Studi Anda (KRS)
                    </h3>
                    <p className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 dark:text-gray-400">
                      Sinkronisasi Kelas Akademik
                    </p>
                  </div>
                  {activeEnrolledClasses.length > 0 && (
                    <button 
                      onClick={() => window.print()} 
                      className="border-b border-slate-900 text-slate-900 hover:text-blue-600 hover:border-blue-600 dark:text-white dark:border-white px-1 py-0.5 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                    >
                      <Download className="h-3 w-3" /> Unduh PDF
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        <th className="pb-3 pr-2">Kode</th>
                        <th className="pb-3 pr-2">Mata Kuliah</th>
                        <th className="pb-3 pr-2">Kelas</th>
                        <th className="pb-3 pr-2 text-center">SKS</th>
                        <th className="pb-3 pr-2">Dosen Pengampu</th>
                        <th className="pb-3 pr-2">Jadwal Perkuliahan</th>
                        <th className="pb-3 pr-2 text-center">Status</th>
                        <th className="pb-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeEnrolledClasses.map((cls) => {
                        const course = cls.courses || {}
                        const lecturer = cls.profiles || {}
                        const enrollment = enrolledClasses.find(ec => ec.class_id === cls.id)
                        const isApproved = enrollment?.status === 'active'

                        return (
                          <tr key={cls.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 whitespace-nowrap">
                            <td className="py-3 pr-2 font-mono font-bold text-slate-500">
                              {course.code}
                            </td>
                            <td className="py-3 pr-2 font-extrabold text-slate-850 dark:text-white">
                              {course.name}
                            </td>
                            <td className="py-3 pr-2 text-slate-500">
                              {cls.class_section || 'A'}
                            </td>
                            <td className="py-3 pr-2 text-center font-extrabold text-blue-600 dark:text-blue-400">
                              {course.credits || 3}
                            </td>
                            <td className="py-3 pr-2 text-slate-600 dark:text-slate-450">
                              {lecturer.name}
                            </td>
                            <td className="py-3 pr-2 text-slate-500">
                              {cls.day_of_week}, {cls.start_time?.substring(0, 5)} - {cls.end_time?.substring(0, 5)}
                            </td>
                            <td className="py-3 pr-2 text-center">
                              {isApproved ? (
                                <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                  Disetujui
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleDrop(cls.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[9px] font-black uppercase tracking-wider dark:bg-rose-950/20 dark:text-rose-400 cursor-pointer"
                              >
                                Batalkan
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                      {activeEnrolledClasses.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                            Belum ada kelas yang dipilih.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">Beban Studi Semester Berjalan:</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    {activeCreditsCount} <span className="text-[10px] text-slate-400 font-bold">/ 24 SKS</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REKAP NILAI TAB */}
      {activeSubTab === 'transcript' && (() => {
        // Group unique semesters chronologically
        const uniqueSemesters = Array.from(
          new Map(
            transcript.map((item) => [
              item.semesterId || item.semesterName,
              { id: item.semesterId, name: item.semesterName, key: item.semesterId || item.semesterName }
            ])
          ).values()
        )

        const currentSem = uniqueSemesters[selectedSemIdx]
        const filteredTranscript = currentSem
          ? transcript.filter(item => (item.semesterId || item.semesterName) === currentSem.key)
          : []

        return (
          <div className="space-y-6 animate-fade-in font-sans">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b-2 border-slate-900 pb-3 dark:border-white">
              <div className="flex-1">
                <h3 className="text-[10px] sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Transkrip Nilai
                </h3>
                <p className="text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-0.5 dark:text-gray-400">
                  Daftar nilai perkuliahan yang telah diambil
                </p>
              </div>

              {/* Unique Semesters Switcher Dropdown */}
              {uniqueSemesters.length > 0 && (
                <div className="mt-2 sm:mt-0 bg-slate-50 p-2 sm:p-0 sm:bg-transparent rounded-lg dark:bg-slate-800/30 sm:dark:bg-transparent border border-slate-100 sm:border-none dark:border-slate-800 flex items-center justify-between sm:block w-full sm:w-auto">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 sm:hidden">Pilih Semester:</span>
                  <select
                    value={selectedSemIdx}
                    onChange={(e) => setSelectedSemIdx(parseInt(e.target.value))}
                    className="w-auto bg-white sm:bg-transparent border border-slate-200 dark:border-slate-700 rounded py-1 pl-2 pr-6 text-[9px] sm:text-[10px] font-bold text-slate-900 dark:text-white outline-none cursor-pointer hover:border-slate-300 dark:bg-[#18233C] transition-colors focus:ring-0"
                  >
                    {uniqueSemesters.map((sem, idx) => (
                      <option key={sem.key} value={idx}>
                        {sem.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] font-bold text-slate-700 dark:text-slate-300">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    <th className="pb-3 pr-2">Semester</th>
                    <th className="pb-3 pr-2">Kode</th>
                    <th className="pb-3 pr-2">Mata Kuliah</th>
                    <th className="pb-3 pr-2 text-center">SKS</th>
                    <th className="pb-3 pr-2">Dosen Pengampu</th>
                    <th className="pb-3 pr-2 text-center">Hadir</th>
                    <th className="pb-3 pr-2 text-center">Tugas</th>
                    <th className="pb-3 pr-2 text-center">Kuis</th>
                    <th className="pb-3 pr-2 text-center">UTS</th>
                    <th className="pb-3 pr-2 text-center">UAS</th>
                    <th className="pb-3 pr-2 text-center">Nilai Akhir</th>
                    <th className="pb-3 pr-2 text-center">Grade</th>
                    <th className="pb-3 text-center">Bobot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTranscript.map((item) => {
                    const hasGrade = item.letterGrade !== null
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 whitespace-nowrap">
                        <td className="py-3.5 pr-2 font-bold text-[9px] text-slate-450 uppercase whitespace-nowrap">
                          {item.semesterName}
                        </td>
                        <td className="py-3.5 pr-2 font-mono font-bold text-slate-500 whitespace-nowrap">
                          {item.courseCode}
                        </td>
                        <td className="py-3.5 pr-2 font-extrabold text-slate-850 dark:text-white whitespace-nowrap">
                          {item.courseName}
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Kelas {item.classSection} - Code: {item.classCode}</span>
                        </td>
                        <td className="py-3.5 pr-2 text-center font-extrabold">
                          {item.credits}
                        </td>
                        <td className="py-3.5 pr-2 text-slate-600 dark:text-slate-450 whitespace-nowrap">
                          {item.lecturerName}
                        </td>
                        <td className="py-3.5 pr-2 text-center text-slate-500">
                          {item.scores.attendance.toFixed(1)}%
                        </td>
                        <td className="py-3.5 pr-2 text-center text-slate-500">
                          {item.scores.assignment.toFixed(1)}
                        </td>
                        <td className="py-3.5 pr-2 text-center text-slate-500">
                          {item.scores.quiz.toFixed(1)}
                        </td>
                        <td className="py-3.5 pr-2 text-center text-slate-500">
                          {item.scores.midterm.toFixed(1)}
                        </td>
                        <td className="py-3.5 pr-2 text-center text-slate-500">
                          {item.scores.final.toFixed(1)}
                        </td>
                        <td className="py-3.5 pr-2 text-center text-slate-800 dark:text-white font-extrabold">
                          {hasGrade ? item.finalScore.toFixed(2) : '-'}
                        </td>
                        <td className="py-3.5 pr-2 text-center">
                          {hasGrade ? (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                              ['A', 'A-', 'B+', 'B'].includes(item.letterGrade)
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-450 font-black'
                                : ['B-', 'C+', 'C'].includes(item.letterGrade)
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 font-black'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 font-black'
                            }`}>
                              {item.letterGrade}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Tunda</span>
                          )}
                        </td>
                        <td className="py-3.5 text-center font-extrabold text-blue-600 dark:text-blue-400">
                          {hasGrade ? item.gradePoints?.toFixed(2) : '-'}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredTranscript.length === 0 && (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-400 font-bold">
                        Belum ada transkrip nilai terdaftar untuk semester terpilih. Selesaikan KRS dan tunggu penginputan nilai dosen.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* CATATAN AKADEMIK TAB */}
      {activeSubTab === 'gpa' && (
        <div className="space-y-6 animate-fade-in font-sans">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-[10px] sm:text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Catatan Akademik
              </h3>
              <p className="text-[8px] sm:text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">
                Evaluasi hasil studi dan pencapaian akademik Anda
              </p>
            </div>
          </div>

          {/* Minimalist Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 bg-white dark:bg-[#121B2E] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
             <div className="flex items-center gap-3 p-4">
                <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                   <Award className="h-4 w-4" />
                </div>
                <div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Indeks Prestasi</p>
                   <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{cumulativeGPA} <span className="text-[9px] text-slate-400 font-bold">/ 4.00</span></p>
                </div>
             </div>
             
             <div className="flex items-center gap-3 p-4">
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                   <BookOpen className="h-4 w-4" />
                </div>
                <div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SKS Ditempuh</p>
                   <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{totalCreditsTaken} <span className="text-[9px] text-slate-400 font-bold">SKS</span></p>
                </div>
             </div>
             
             <div className="flex items-center gap-3 p-4">
                <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                   <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SKS Lulus</p>
                   <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{totalCreditsPassed} <span className="text-[9px] text-slate-400 font-bold">SKS</span></p>
                </div>
             </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Riwayat Prestasi per Semester</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121B2E]">
              <table className="w-full text-left text-[10px] text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] text-slate-500 uppercase tracking-widest font-bold whitespace-nowrap">
                    <th className="px-4 py-2.5">Semester</th>
                    <th className="px-4 py-2.5 text-center">Beban SKS</th>
                    <th className="px-4 py-2.5 text-center">SKS Lulus</th>
                    <th className="px-4 py-2.5 text-center">IPS</th>
                    <th className="px-4 py-2.5 text-right">Status Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {semesterSummaryList.map((sem, idx) => {
                    const ipsVal = parseFloat(sem.ips)
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors whitespace-nowrap">
                        <td className="px-4 py-3">
                          <span className="block font-bold text-slate-800 dark:text-white uppercase">{sem.semesterName}</span>
                          <span className="text-[9px] text-slate-400">Tahun Akademik {sem.academicYear}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">
                          {sem.creditsTaken}
                        </td>
                        <td className="px-4 py-3 text-center text-emerald-600 font-bold">
                          {sem.creditsPassed}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-blue-600 dark:text-blue-400 text-[12px]">
                          {sem.ips}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            ipsVal >= 3.0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                            ipsVal >= 2.0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                            'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                          }`}>
                            {ipsVal >= 3.0 ? 'Sangat Baik' : ipsVal >= 2.0 ? 'Baik' : 'Bimbingan'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {semesterSummaryList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-[10px]">
                        Belum ada riwayat akademik terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENTS TAB */}
      {activeSubTab === 'announcements' && (
        <div className="space-y-4 animate-fade-in">
          {announcements.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#121B2E]">
              <Megaphone className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-[11px] text-slate-500">Belum ada pengumuman akademik.</p>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {announcements.map((ann) => (
                <div key={ann.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#121B2E] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                        {ann.date_info || 'Akademik'}
                      </span>
                      {ann.is_highlight && (
                        <span className="text-[8px] bg-amber-500/20 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Penting</span>
                      )}
                    </div>
                    <h3 className="text-[11.5px] font-extrabold text-slate-800 dark:text-white leading-tight">{ann.title}</h3>
                    <p className="mt-1.5 text-[10px] text-slate-550 dark:text-slate-400 leading-relaxed line-clamp-4">{ann.description}</p>
                    {ann.media_url && (
                      <div className="mt-3 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                        <img src={ann.media_url} alt={ann.title} className="w-full max-h-60 object-contain" />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-50 dark:border-slate-800/40 text-[9px] text-slate-400">
                    Diterbitkan: {new Date(ann.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

    {/* Printable Academic Letter (Hidden on Screen, Visible on Print) */}
    <div className="hidden print:block text-black bg-white p-10 fixed top-0 left-0 w-full min-h-screen z-[9999] font-serif">
       <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase tracking-widest">Kartu Rencana Studi (KRS)</h1>
          <p className="text-sm font-semibold mt-1">SIAKAD Universitas - Tahun Akademik {activeSemester?.academic_year || '-'} / {activeSemester?.semester_type || '-'}</p>
       </div>
       
       <div className="grid grid-cols-[150px_10px_1fr] text-sm font-bold mt-4 mb-8">
             <div>Nama Mahasiswa</div><div>:</div><div className="uppercase">{studentName}</div>
             <div>NIM</div><div>:</div><div>{studentNim}</div>
             <div>Program Studi</div><div>:</div><div>{studyProgram}</div>
       </div>

       <table className="w-full border-collapse border border-black text-[11px] mb-8">
          <thead>
             <tr className="bg-gray-100 uppercase">
                <th className="border border-black px-3 py-2 w-10 text-center">No</th>
                <th className="border border-black px-3 py-2 w-24">Kode</th>
                <th className="border border-black px-3 py-2">Mata Kuliah</th>
                <th className="border border-black px-3 py-2 w-16 text-center">Kelas</th>
                <th className="border border-black px-3 py-2 w-16 text-center">SKS</th>
                <th className="border border-black px-3 py-2">Dosen Pengampu</th>
             </tr>
          </thead>
          <tbody>
             {activeEnrolledClasses.map((cls, idx) => (
                <tr key={cls.id}>
                   <td className="border border-black px-3 py-1.5 text-center">{idx + 1}</td>
                   <td className="border border-black px-3 py-1.5 font-mono">{cls.courses?.code}</td>
                   <td className="border border-black px-3 py-1.5 font-bold">{cls.courses?.name}</td>
                   <td className="border border-black px-3 py-1.5 text-center">{cls.class_section || '-'}</td>
                   <td className="border border-black px-3 py-1.5 text-center font-bold">{cls.courses?.credits}</td>
                   <td className="border border-black px-3 py-1.5">{cls.profiles?.name}</td>
                </tr>
             ))}
             {activeEnrolledClasses.length === 0 && (
                <tr>
                   <td colSpan={6} className="border border-black px-3 py-4 text-center italic text-gray-500">
                     Belum ada mata kuliah yang didaftarkan.
                   </td>
                </tr>
             )}
             <tr className="bg-gray-50">
                <td colSpan={4} className="border border-black px-3 py-2 text-right font-bold uppercase tracking-wider">Total Beban SKS</td>
                <td className="border border-black px-3 py-2 text-center font-bold text-sm">{activeCreditsCount}</td>
                <td className="border border-black px-3 py-2"></td>
             </tr>
          </tbody>
       </table>
       
       <div className="flex justify-between mt-12 text-sm text-center">
          <div className="w-64">
             <p className="mb-20">Mahasiswa,</p>
             <p className="font-bold underline uppercase">{studentName}</p>
             <p className="mt-1">NIM: {studentNim}</p>
          </div>
          <div className="text-center w-64">
             <p className="mb-20">Jakarta, {formatDate(new Date().toISOString())}<br/>Pembimbing Akademik,</p>
             <p className="font-bold underline">(_________________________)</p>
             <p className="mt-1">NIDN: -</p>
          </div>
       </div>
    </div>
    </>
  )
}
