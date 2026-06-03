'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen, Plus, Users, GraduationCap,
  Loader2, AlertCircle, BookMarked,
  MapPin, CheckCircle2, Award, ClipboardList, BarChart3,
} from 'lucide-react'
import ClassRoomCard, { formatClassScheduleSubtitle } from '@/components/classroom/ClassRoomCard'
import TopbarGreeting from '@/components/layout/TopbarGreeting'
import { ThemeToggle } from '@/components/ThemeToggle'
import NotificationBell from '@/components/layout/NotificationBell'
import { createClient } from '@/lib/supabase/client'

interface LecturerClass {
  id: string
  class_name: string
  class_code: string
  class_section: string
  cover_color: string
  cover_image_url?: string | null
  day_of_week?: string | null
  start_time?: string | null
  end_time?: string | null
  lecturer_name?: string
  lecturer_avatar?: string | null
  course_code: string
  course_name: string
  course_credits: number
  semester_name: string
  academic_year: string
  enrolled_count: number
  assignment_count: number
  is_backup?: boolean
  main_lecturer_name?: string
  room_code: string | null
  room_name: string | null
}

interface Course {
  id: string
  code: string
  name: string
  credits: number
}

interface Semester {
  id: string
  name: string
  academic_year: string
}

interface Room {
  id: string
  code: string
  name: string
}

export default function LecturerDashboard() {
  const [classes, setClasses] = useState<LecturerClass[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string>('')

  // Catalogs
  const [courses, setCourses] = useState<Course[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [rooms, setRooms] = useState<Room[]>([])

  // Form State
  const [courseId, setCourseId] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [classSection, setClassSection] = useState('A')
  const [className, setClassName] = useState('')
  const [coverColor, setCoverColor] = useState('#1A3A6B')
  const [dayOfWeek, setDayOfWeek] = useState('Senin')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('10:30')
  const [maxStudents, setMaxStudents] = useState(40)

  // Bobot nilai (must sum to 100)
  const [wAttendance, setWAttendance] = useState(10)
  const [wAssignments, setWAssignments] = useState(20)
  const [wQuiz, setWQuiz] = useState(10)
  const [wMidterm, setWMidterm] = useState(30)
  const [wFinal, setWFinal] = useState(30)

  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const loadClasses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lecturer/my-classes', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat daftar kelas')
      }
      setClasses(json.data || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      console.error('[LecturerDashboard] Load error:', msg)
    } finally {
      setLoading(false)
    }
  }

  const loadCatalogs = async () => {
    try {
      // Courses
      const resCourses = await fetch('/api/academic/courses')
      const jsonCourses = await resCourses.json()
      if (jsonCourses.success) {
        setCourses(jsonCourses.data || [])
        if (jsonCourses.data?.length > 0) setCourseId(jsonCourses.data[0].id)
      }

      // Semesters
      const resSemesters = await fetch('/api/academic/semesters')
      const jsonSemesters = await resSemesters.json()
      if (jsonSemesters.success) {
        setSemesters(jsonSemesters.data || [])
        // Select active semester first if available
        const active = jsonSemesters.data?.find((s: any) => s.is_active) || jsonSemesters.data?.[0]
        if (active) setSemesterId(active.id)
      }

      // Rooms
      const resRooms = await fetch('/api/academic/rooms')
      const jsonRooms = await resRooms.json()
      if (jsonRooms.success) {
        setRooms(jsonRooms.data || [])
        if (jsonRooms.data?.length > 0) setRoomId(jsonRooms.data[0].id)
      }
    } catch (err) {
      console.error('[LecturerDashboard] Load catalogs error:', err)
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setUserName(user.user_metadata?.name || user.user_metadata?.full_name || 'Dosen')
      }
    }
    initAuth()
    loadClasses()
    loadCatalogs()
  }, [])

  // Auto set class name when course & section are chosen (removed for private classes)

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    setCreateSuccess(null)

    // Validate weights sum up to 100
    const totalWeight = Number(wAttendance) + Number(wAssignments) + Number(wQuiz) + Number(wMidterm) + Number(wFinal)
    if (totalWeight !== 100) {
      setCreateError(`Total bobot nilai harus tepat 100% (saat ini ${totalWeight}%)`)
      setCreateLoading(false)
      return
    }

    try {
      const payload = {
        semesterId,
        roomId: roomId || null,
        className,
        coverColor,
        dayOfWeek,
        startTime: startTime + ':00',
        endTime: endTime + ':00',
        maxStudents: Number(maxStudents),
        weightAttendance: Number(wAttendance),
        weightAssignments: Number(wAssignments),
        weightQuiz: Number(wQuiz),
        weightMidterm: Number(wMidterm),
        weightFinal: Number(wFinal),
      }

      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal membuat kelas baru')
      }

      setCreateSuccess(`Kelas ${json.data.class_name} berhasil dibuat dengan kode join: ${json.data.class_code}`)

      setTimeout(() => {
        setShowModal(false)
        setCreateSuccess(null)
        loadClasses()
      }, 2000)
    } catch (err: any) {
      setCreateError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setCreateLoading(false)
    }
  }

  // Stats calculation
  const totalStudents = classes.reduce((sum, c) => sum + c.enrolled_count, 0)
  const totalSks = classes.reduce((sum, c) => sum + c.course_credits, 0)

  return (
    <div className="space-y-4 select-none">

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[11px] md:text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-blue-600" />
            Kelas Saya
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola kelas, tugas, absensi, dan sinkronisasi nilai ke SIAKAD
          </p>
        </div>
        <button
          onClick={() => {
            setShowModal(true)
            setCreateError(null)
            setCreateSuccess(null)
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Buat Kelas
        </button>
      </div>

      <div className="grid gap-2 sm:gap-3 grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-2 sm:p-3 dark:border-slate-800 dark:bg-[#121B2E] flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3 text-center sm:text-left">
          <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
          <div>
            <span className="text-[8px] sm:text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Kelas Aktif</span>
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">{classes.length}</span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2 sm:p-3 dark:border-slate-800 dark:bg-[#121B2E] flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3 text-center sm:text-left">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
          <div>
            <span className="text-[8px] sm:text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Mahasiswa</span>
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">{totalStudents}</span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2 sm:p-3 dark:border-slate-800 dark:bg-[#121B2E] flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3 text-center sm:text-left">
          <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
          <div>
            <span className="text-[8px] sm:text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Beban SKS</span>
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">{totalSks}</span>
          </div>
        </div>
      </div>

      {/* Grid Class List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-blue-500" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#121B2E]">
          <BookOpen className="h-8 w-8 text-slate-300 mb-2" />
          <h3 className="text-[11px] font-medium text-slate-700 dark:text-white">Belum ada kelas</h3>
          <p className="mt-1 text-[10px] text-slate-500 max-w-xs">Buat kelas baru untuk mulai mengajar.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-[10px] font-medium dark:border-slate-700"
          >
            <Plus className="h-3 w-3" />
            Buat Kelas
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <ClassRoomCard
              key={cls.id}
              id={cls.id}
              href={`/lecturer/class/${cls.id}`}
              className={cls.class_name}
              coverColor={cls.cover_color}
              coverImageUrl={cls.cover_image_url}
              courseName={cls.course_name}
              courseCode={cls.course_code}
              isBackup={cls.is_backup}
              subtitle={formatClassScheduleSubtitle({
                semesterName: cls.semester_name,
                dayOfWeek: cls.day_of_week,
                startTime: cls.start_time,
                endTime: cls.end_time,
                roomCode: cls.room_code,
                roomName: cls.room_name,
              })}
              lecturerName={cls.is_backup ? `${cls.main_lecturer_name} (Dosen Utama)` : (cls.lecturer_name || 'Dosen')}
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

      {/* Create Class Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#121B2E] border border-slate-100 dark:border-slate-800 my-8">
            <div className="brand-gradient p-6 text-white relative">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/5 blur-xl pointer-events-none" />
              <h3 className="text-base font-black flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-gold" />
                Buat Ruang Kelas Baru
              </h3>
              <p className="mt-1 text-[10px] text-gray-300 uppercase tracking-wider font-bold">
                Isi form di bawah ini untuk membuka kelas perkuliahan baru
              </p>
            </div>

            <form onSubmit={handleCreateClass} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {createError && (
                <div className="flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-xs font-semibold text-red-800 dark:bg-red-950/30 dark:text-red-300 border border-red-200/50">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600" />
                  <span>{createError}</span>
                </div>
              )}

              {createSuccess && (
                <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200/50">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                  <span>{createSuccess}</span>
                </div>
              )}

              {/* Nama Kelas Privat */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                  Nama Kelas Privat
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Pemrograman Web (Privat)"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="block w-full mt-2 rounded-xl border border-slate-250 bg-slate-100 py-2.5 px-3 text-xs text-slate-700 font-bold dark:border-slate-700 dark:bg-[#151F32] dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Semester active */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Semester & Tahun Akademik
                  </label>
                  <select
                    value={semesterId}
                    required
                    onChange={(e) => setSemesterId(e.target.value)}
                    className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs text-slate-900 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    {semesters.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Rooms selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Ruangan Kuliah
                  </label>
                  <select
                    value={roomId}
                    required
                    onChange={(e) => setRoomId(e.target.value)}
                    className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs text-slate-900 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.code} - {r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {/* Schedule Day */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Hari Kuliah
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-2 text-xs text-slate-900 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                  </select>
                </div>

                {/* Start time */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 py-2 px-2 text-xs text-slate-900 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>

                {/* End time */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 py-2 px-2 text-xs text-slate-900 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>

                {/* Max capacity */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    Kapasitas
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    required
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(Number(e.target.value))}
                    className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 py-2 px-2 text-xs text-slate-900 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>
              </div>

              {/* Cover Color Selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                  Warna Tema Kelas
                </label>
                <div className="flex gap-3 mt-2 select-none">
                  {['#1A3A6B', '#8B1A1A', '#0F766E', '#4D7C0F', '#6D28D9', '#B45309'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCoverColor(c)}
                      className={`h-8 w-8 rounded-lg cursor-pointer transition-all ${coverColor === c ? 'ring-4 ring-offset-2 ring-primary scale-110 dark:ring-blue-500' : ''
                        }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Grading Component Weights (Sum = 100) */}
              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <BarChart3 className="h-4.5 w-4.5 text-primary dark:text-blue-400" />
                  Konfigurasi Pembobotan Nilai (%)
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 font-semibold uppercase tracking-wide">
                  Tentukan persentase bobot penilaian. Total penjumlahan kelima bobot ini harus tepat 100%.
                </p>

                <div className="grid grid-cols-5 gap-3.5 mt-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Absen</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={wAttendance}
                      onChange={(e) => setWAttendance(Number(e.target.value))}
                      className="block w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2 text-center text-xs font-bold text-slate-800 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Tugas</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={wAssignments}
                      onChange={(e) => setWAssignments(Number(e.target.value))}
                      className="block w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2 text-center text-xs font-bold text-slate-800 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Kuis</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={wQuiz}
                      onChange={(e) => setWQuiz(Number(e.target.value))}
                      className="block w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2 text-center text-xs font-bold text-slate-800 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">UTS</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={wMidterm}
                      onChange={(e) => setWMidterm(Number(e.target.value))}
                      className="block w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2 text-center text-xs font-bold text-slate-800 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">UAS</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={wFinal}
                      onChange={(e) => setWFinal(Number(e.target.value))}
                      className="block w-full mt-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2 text-center text-xs font-bold text-slate-800 outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer dark:border-slate-700 dark:text-gray-400 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Membuat kelas...
                    </>
                  ) : (
                    'Buat Kelas'
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
