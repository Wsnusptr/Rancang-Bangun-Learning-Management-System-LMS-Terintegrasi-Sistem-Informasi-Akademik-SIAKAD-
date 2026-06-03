'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import { 
  Loader2, AlertCircle, CheckCircle2, Navigation, 
  MapPin, ShieldAlert, KeyRound, Clock, Sparkles
} from 'lucide-react'
import { calculateDistance, CAMPUS_COORDINATES } from '@/lib/geolocation'

interface Params {
  params: Promise<{ id: string }>
}

export default function StudentAttendance({ params }: Params) {
  const { id } = use(params)
  const [classDetail, setClassDetail] = useState<any>(null)
  const [activeSession, setActiveSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Geolocation states
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'checking' | 'granted' | 'denied' | 'out_of_bounds'>('idle')
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [distance, setDistance] = useState<number | null>(null)

  // Form check-in states
  const [token, setToken] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [attendedSuccess, setAttendedSuccess] = useState(false)

  useEffect(() => {
    async function init() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      try {
        const [{ data: clsDetail }, { data: sessions }] = await Promise.all([
           supabase.from('class_details').select('*').eq('id', id).single(),
           supabase.from('attendance_sessions').select('id, meeting_number, topic, is_open, closes_at, geolocation_required')
              .eq('class_id', id).eq('is_open', true).gt('closes_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1)
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
        }
        if (sessions && sessions.length > 0) {
          setActiveSession(sessions[0])
          if (authUser) {
            const { data: record } = await supabase.from('attendance_records').select('id').eq('session_id', sessions[0].id).eq('student_id', authUser.id).single()
            if (record) setAttendedSuccess(true)
          }
        }
      } catch (err) {
        console.error('[Attendance] Load failed:', err)
      }
      setLoading(false)
    }
    init()
  }, [id])

  const verifyLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('denied')
      setSubmitError('Browser tidak mendukung GPS')
      return
    }

    setGpsStatus('checking')
    setSubmitError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserCoords({ lat: latitude, lng: longitude })
        const dist = Math.round(calculateDistance(latitude, longitude, CAMPUS_COORDINATES.lat, CAMPUS_COORDINATES.lng))
        setDistance(dist)
        if (dist <= CAMPUS_COORDINATES.radiusMeters) setGpsStatus('granted')
        else setGpsStatus('out_of_bounds')
      },
      (error) => {
        setGpsStatus('denied')
        setSubmitError(error.code === error.PERMISSION_DENIED ? 'Izin lokasi ditolak.' : 'Gagal mendeteksi lokasi.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSession || (activeSession.geolocation_required && !userCoords)) return
    setSubmitLoading(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.toUpperCase().trim(), lat: userCoords?.lat || null, lng: userCoords?.lng || null }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal merekam kehadiran')
      
      setSubmitSuccess('Absensi tercatat!')
      setAttendedSuccess(true)
    } catch (err: any) {
      setSubmitError(err.message || 'Kesalahan sistem')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
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

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 max-w-7xl mx-auto px-1 md:px-3">
        {/* Left Side: GPS Status */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#121B2E]">
            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <Navigation className="h-4 w-4 text-blue-600" />
              Verifikasi GPS
            </h3>

            {activeSession && !activeSession.geolocation_required ? (
               <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-[10px] font-black uppercase">Nonaktif</p>
                  <p className="text-[9px] mt-1 font-medium">Dosen menonaktifkan GPS. Anda bisa langsung absen.</p>
               </div>
            ) : (
               <div className="space-y-3">
                  {gpsStatus === 'checking' && (
                     <div className="text-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto mb-2" />
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Mengecek Lokasi...</p>
                     </div>
                  )}
                  {gpsStatus === 'idle' && (
                     <div className="text-center">
                        <p className="text-[10px] text-slate-500 dark:text-gray-400 mb-3 font-medium">Sistem memerlukan lokasi untuk absensi.</p>
                        <button onClick={verifyLocation} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[10px] font-black rounded-lg text-slate-700 dark:bg-slate-800 dark:text-gray-300 flex items-center justify-center gap-1.5"><MapPin className="h-3 w-3" /> Deteksi GPS</button>
                     </div>
                  )}
                  {gpsStatus === 'denied' && (
                     <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800">
                        <ShieldAlert className="h-5 w-5 mx-auto mb-1 text-red-600" />
                        <p className="text-[9px] font-medium mb-3">{submitError}</p>
                        <button onClick={verifyLocation} className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-[10px] font-black rounded-md text-white">Coba Lagi</button>
                     </div>
                  )}
                  {gpsStatus === 'out_of_bounds' && (
                     <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800">
                        <ShieldAlert className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                        <p className="text-[9px] font-black uppercase mb-1">Luar Radius</p>
                        <p className="text-[9px] font-medium mb-3">Jarak: {distance} meter dari kampus (Maks {CAMPUS_COORDINATES.radiusMeters}m).</p>
                        <button onClick={verifyLocation} className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-[10px] font-black rounded-md text-white">Cek Ulang</button>
                     </div>
                  )}
                  {gpsStatus === 'granted' && (
                     <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800">
                        <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                        <p className="text-[9px] font-black uppercase mb-1">Lokasi Sesuai</p>
                        <p className="text-[9px] font-medium mb-3">Jarak: {distance} meter dari kampus.</p>
                        <button onClick={verifyLocation} className="text-[9px] font-bold text-slate-500 hover:text-slate-700 underline">Refresh Lokasi</button>
                     </div>
                  )}
               </div>
            )}
          </div>
        </div>

        {/* Right Side: Check-in Form */}
        <div className="lg:col-span-2 space-y-4">
          {attendedSuccess ? (
             <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 py-16 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
               <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                 <CheckCircle2 className="h-6 w-6" />
               </div>
               <h3 className="text-xs font-black text-emerald-800 dark:text-emerald-400">Absensi Berhasil</h3>
               <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1 max-w-[250px]">Kehadiran Anda pada sesi ini telah tersimpan.</p>
             </div>
          ) : !activeSession ? (
             <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-[#121B2E]">
               <Clock className="h-8 w-8 text-slate-300 mb-3" />
               <h3 className="text-xs font-black text-slate-800 dark:text-white">Tidak Ada Sesi Aktif</h3>
               <p className="text-[10px] text-slate-500 mt-1 max-w-[250px]">Belum ada sesi absensi yang dibuka oleh dosen untuk saat ini.</p>
             </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#121B2E]">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-5 dark:border-slate-800/50">
                 <div>
                    <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400">Pertemuan {activeSession.meeting_number}</span>
                    <h3 className="mt-2 text-sm font-black text-slate-800 dark:text-white">{activeSession.topic || 'Absensi Kuliah'}</h3>
                 </div>
                 <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Batas Waktu</span>
                    <span className="text-xs font-black text-amber-600 flex items-center gap-1 justify-end"><Clock className="h-3 w-3" /> {new Date(activeSession.closes_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                 </div>
              </div>

              {submitError && <div className="mb-4 text-[10px] font-bold text-red-600 bg-red-50 p-2.5 rounded">{submitError}</div>}

              <form onSubmit={handleCheckIn} className="space-y-5 text-center">
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Token Absen (6 Karakter)</label>
                    <input
                       type="text"
                       required
                       maxLength={6}
                       disabled={activeSession.geolocation_required && gpsStatus !== 'granted'}
                       value={token}
                       onChange={(e) => setToken(e.target.value)}
                       placeholder="XXXXXX"
                       className="block w-48 mx-auto mt-2 text-center text-xl tracking-widest font-black uppercase rounded-lg border border-slate-200 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all dark:bg-[#18233C] dark:border-slate-700 dark:text-white disabled:opacity-50"
                    />
                 </div>
                 <button
                    type="submit"
                    disabled={submitLoading || (activeSession.geolocation_required && gpsStatus !== 'granted') || token.length < 6}
                    className="w-48 mx-auto py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase transition-colors disabled:opacity-50"
                 >
                    {submitLoading ? 'Memproses...' : 'Hadir'}
                 </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
