'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import { 
  Loader2, AlertCircle, FileText, CheckCircle2, 
  Clock, Plus, Calendar, Megaphone, CheckSquare, 
  Users, MapPin, Sparkles, LogIn, Power, ArrowRight 
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Image from 'next/image'

interface Params {
  params: Promise<{ id: string }>
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

interface AttendanceSession {
  id: string
  meeting_number: number
  topic: string | null
  token: string
  qr_payload: string
  closes_at: string
  is_open: boolean
}

interface AttendanceRecord {
  id: string
  checked_at: string
  distance_meters: number | null
  check_in_method: string
  profiles: {
    id: string
    name: string
    nim: string | null
  }
}

interface EnrolledStudent {
  profiles: {
    id: string
    name: string
    nim: string | null
  }
}

export default function LecturerClassAttendance({ params }: Params) {
  const { id } = use(params)
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null)
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([])
  const [loading, setLoading] = useState(true)

  // Open Session Form states
  const [meetingNumber, setMeetingNumber] = useState(1)
  const [topic, setTopic] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(15)
  const [geolocationRequired, setGeolocationRequired] = useState(true)
  const [openLoading, setOpenLoading] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  // Manual check-in states
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

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
      console.error('[LecturerAttendance] Detail load failed:', err)
    }
  }

  const loadStudents = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          profiles!enrollments_student_id_fkey (id, name, nim)
        `)
        .eq('class_id', id)
        .eq('status', 'active')

      if (error) throw error
      setEnrolledStudents((data as any[]) || [])
    } catch (err) {
      console.error('[LecturerAttendance] Students load failed:', err)
    }
  }

  const checkActiveSession = async () => {
    const supabase = createClient()
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: sessions, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('class_id', id)
        .eq('is_open', true)
        .gt('closes_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error
      if (sessions && sessions.length > 0) {
        setActiveSession(sessions[0])
        // Re-generate QR for the existing session
        const QRCode = require('qrcode')
        const qrUrl = await QRCode.toDataURL(sessions[0].qr_payload, {
          color: { dark: '#1A3A6B', light: '#FFFFFF' },
          width: 400
        })
        setQrCodeUrl(qrUrl)
        loadRecords(sessions[0].id)
      } else {
        setActiveSession(null)
        setQrCodeUrl(null)
        setRecords([])
        
        // Auto-increment meeting number based on count
        const { count } = await supabase
          .from('attendance_sessions')
          .select('id', { count: 'exact' })
          .eq('class_id', id)
        
        setMeetingNumber((count || 0) + 1)
      }
    } catch (err) {
      console.error('[LecturerAttendance] Active session check failed:', err)
    }
  }

  const loadRecords = async (sessionId: string) => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id, checked_at, distance_meters, check_in_method,
          profiles!attendance_records_student_id_fkey (id, name, nim)
        `)
        .eq('session_id', sessionId)
        .order('checked_at', { ascending: false })

      if (error) throw error
      setRecords((data as any[]) || [])
    } catch (err) {
      console.error('[LecturerAttendance] Records load failed:', err)
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([loadClassDetail(), checkActiveSession(), loadStudents()])
      setLoading(false)
    }
    init()
  }, [id])

  // Setup Real-time listener for checked-in records
  useEffect(() => {
    if (!activeSession) return

    const supabase = createClient()
    const channel = supabase
      .channel(`lecturer-attendance-${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${activeSession.id}`,
        },
        () => {
          loadRecords(activeSession.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeSession])

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setOpenLoading(true)
    setOpenError(null)

    try {
      const res = await fetch('/api/attendance/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: id,
          meetingNumber: Number(meetingNumber),
          topic: topic || null,
          durationMinutes: Number(durationMinutes),
          geolocationRequired,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal membuka sesi absen')
      }

      setActiveSession(json.data.session)
      setQrCodeUrl(json.data.qrCodeDataUrl)
      setRecords([])
      setTopic('')
    } catch (err: any) {
      setOpenError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setOpenLoading(false)
    }
  }

  const handleCloseSession = async () => {
    if (!activeSession) return
    if (!confirm('Apakah Anda yakin ingin menutup sesi absensi ini sekarang?')) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ is_open: false, closed_at: new Date().toISOString() })
        .eq('id', activeSession.id)

      if (error) throw error
      
      setActiveSession(null)
      setQrCodeUrl(null)
      setRecords([])
      checkActiveSession()
    } catch (err) {
      console.error('[LecturerAttendance] Close failed:', err)
    }
  }

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSession || !selectedStudentId) return
    setManualLoading(true)

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('attendance_records')
        .insert({
          session_id: activeSession.id,
          student_id: selectedStudentId,
          check_in_method: 'manual',
          status: 'present',
        })

      if (error) {
        if (error.code === '23505') alert('Mahasiswa bersangkutan sudah terdaftar hadir')
        else throw error
      }

      setSelectedStudentId('')
      loadRecords(activeSession.id)
    } catch (err) {
      console.error('[Manual Checkin Error]', err)
    } finally {
      setManualLoading(false)
    }
  }

  // Filter students who haven't checked in yet for manual selector
  const checkedInStudentIds = records.map(r => r.profiles.id)
  const remainingStudents = enrolledStudents.filter(s => !checkedInStudentIds.includes(s.profiles.id))

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

      <div className="grid gap-6 sm:gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Left Side: Create / Open Form or QR Code Presentation */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Sesi Tertutup / Form Pembukaan */}
          {!activeSession ? (
            <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-sm dark:bg-[#121B2E] dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5 mb-4">
                <Plus className="h-4.5 w-4.5 text-primary dark:text-blue-400" />
                Buka Sesi Kehadiran Baru
              </h3>

              {openError && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-xs font-semibold text-red-800 dark:bg-red-950/30 border border-red-200/50">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600" />
                  <span>{openError}</span>
                </div>
              )}

              <form onSubmit={handleOpenSession} className="space-y-4 text-slate-850 dark:text-gray-250">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Pertemuan Ke-</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={20}
                      value={meetingNumber}
                      onChange={(e) => setMeetingNumber(Number(e.target.value))}
                      className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Durasi Sesi</label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                    >
                      <option value={10}>10 Menit</option>
                      <option value={15}>15 Menit</option>
                      <option value={20}>20 Menit</option>
                      <option value={30}>30 Menit</option>
                      <option value={45}>45 Menit</option>
                      <option value={60}>60 Menit</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Topik / Pembahasan Hari Ini</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pengenalan state management"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="block w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs outline-none focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2.5 pt-1.5">
                  <input
                    type="checkbox"
                    id="geoCheck"
                    checked={geolocationRequired}
                    onChange={(e) => setGeolocationRequired(e.target.checked)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary border-slate-300"
                  />
                  <label htmlFor="geoCheck" className="text-xs font-bold text-slate-700 dark:text-gray-300">
                    Wajibkan Validasi Koordinat GPS
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={openLoading}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer dark:bg-blue-600"
                >
                  {openLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Membuka Sesi...
                    </>
                  ) : (
                    'Buka Sesi Absen'
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Sesi Aktif: Tampilkan QR & Token */
            <div className="rounded-2xl border border-slate-150 bg-white p-6 shadow-xl dark:bg-[#121B2E] dark:border-slate-800 text-center space-y-6 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-primary dark:bg-blue-600" />
              
              <div className="space-y-1.5">
                <span className="rounded bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-primary dark:bg-blue-950/20 dark:text-blue-400">
                  PERTEMUAN KE-{activeSession.meeting_number} (AKTIF)
                </span>
                <h4 className="text-xs font-black text-slate-800 dark:text-white mt-2 leading-tight">
                  Topik: {activeSession.topic || 'Pembahasan Materi Kuliah'}
                </h4>
              </div>

              {/* Branded base64 QR Code */}
              {qrCodeUrl && (
                <div className="relative mx-auto h-52 w-52 rounded-xl bg-slate-50 border border-slate-100 p-2.5 dark:bg-white flex items-center justify-center shadow-lg">
                  <img src={qrCodeUrl} alt="Branded J-Learn Attendance QR" className="h-full w-full object-contain" />
                </div>
              )}

              {/* Large Alphanumeric Token display */}
              <div className="space-y-1 bg-slate-50 py-3 rounded-xl dark:bg-[#18233C]/60 select-all border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">PIN / KODE ABSENSI</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white tracking-widest uppercase block mt-0.5">{activeSession.token}</span>
              </div>

              <div className="text-xs font-bold text-slate-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>Expires: {new Date(activeSession.closes_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <button
                type="button"
                onClick={handleCloseSession}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 active:scale-95 cursor-pointer dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400"
              >
                <Power className="h-4 w-4 shrink-0" />
                Tutup Sesi Absensi
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Checked in Live Table list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
              Kehadiran Mahasiswa Live ({records.length} Hadir)
            </h2>

            {/* Manual Checkin form */}
            {activeSession && remainingStudents.length > 0 && (
              <form onSubmit={handleManualCheckIn} className="flex items-center gap-2">
                <select
                  value={selectedStudentId}
                  required
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="block rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-[10px] font-bold outline-none dark:border-slate-800 dark:bg-[#121B2E] dark:text-white"
                >
                  <option value="">-- Pilih Mahasiswa Absen --</option>
                  {remainingStudents.map(s => (
                    <option key={s.profiles.id} value={s.profiles.id}>{s.profiles.name} ({s.profiles.nim})</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={manualLoading || !selectedStudentId}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-[10px] font-black text-white transition-colors cursor-pointer"
                >
                  Hadirkan
                </button>
              </form>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#121B2E] overflow-hidden">
            {records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-650">
                <CheckSquare className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-xs font-bold">Live Kehadiran Kosong</p>
                {activeSession && <p className="text-[10px] text-slate-400 mt-1">Sesi absensi aktif. Mahasiswa yang melakukan check-in akan otomatis tampil di sini secara real-time.</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-max w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Mahasiswa</th>
                      <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Waktu Check-in</th>
                      <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Metode</th>
                      <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Audit Lokasi (GPS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors animate-fade-in">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-[11px] text-slate-850 dark:text-white font-extrabold">{rec.profiles.name}</p>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 block">NIM: {rec.profiles.nim || 'TBA'}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(rec.checked_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                            rec.check_in_method === 'manual' 
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' 
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                          }`}>
                            {rec.check_in_method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black whitespace-nowrap">
                          {rec.distance_meters !== null ? (
                            <span className="flex items-center justify-end gap-1 text-[11px] text-slate-800 dark:text-white">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {rec.distance_meters} m dari Kampus
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">N/A (Bypassed)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
