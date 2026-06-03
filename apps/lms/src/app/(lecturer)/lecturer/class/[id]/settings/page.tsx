'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import { Loader2, Settings2, Save, AlertCircle, CheckCircle2, Percent, Calculator, Users } from 'lucide-react'

interface Params {
  params: Promise<{ id: string }>
}

export default function LecturerSettingsPage({ params }: Params) {
  const { id } = use(params)
  const [classDetail, setClassDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Weights State
  const [weightAttendance, setWeightAttendance] = useState(0)
  const [weightAssignments, setWeightAssignments] = useState(0)
  const [weightQuiz, setWeightQuiz] = useState(0)
  const [weightMidterm, setWeightMidterm] = useState(0)
  const [weightFinal, setWeightFinal] = useState(0)

  // Status State
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Backup Lecturer State
  const [lecturers, setLecturers] = useState<any[]>([])
  const [backupLecturerId, setBackupLecturerId] = useState<string>('')
  const [savingBackup, setSavingBackup] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const supabase = createClient()
      
      // Parallel requests to load class details, backup info, and all lecturers
      const [detailsRes, backupRes, lecturersRes] = await Promise.all([
        supabase.from('class_details').select('*').eq('id', id).single(),
        supabase.from('classes').select('backup_lecturer_id').eq('id', id).single(),
        fetch('/api/academic/lecturers').then(res => res.json())
      ])
      
      if (detailsRes.data) {
        // Fetch live stats for accurate enrolled_count
        try {
          const statsRes = await fetch(`/api/classes/stats?ids=${id}`, { cache: 'no-store' })
          const statsJson = await statsRes.json()
          if (statsJson.success && statsJson.data[id]) {
            detailsRes.data.enrolled_count = statsJson.data[id].enrolled_count
          }
        } catch (err) {
          console.error('Failed to fetch stats', err)
        }
        setClassDetail(detailsRes.data)
        setWeightAttendance(detailsRes.data.weight_attendance || 0)
        setWeightAssignments(detailsRes.data.weight_assignments || 0)
        setWeightQuiz(detailsRes.data.weight_quiz || 0)
        setWeightMidterm(detailsRes.data.weight_midterm || 0)
        setWeightFinal(detailsRes.data.weight_final || 0)
      }
      if (detailsRes.error) throw detailsRes.error

      if (backupRes.data) {
        setBackupLecturerId(backupRes.data.backup_lecturer_id || '')
      }

      if (lecturersRes.success) {
        setLecturers(lecturersRes.data || [])
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const totalWeight = weightAttendance + weightAssignments + weightQuiz + weightMidterm + weightFinal

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (totalWeight !== 100) {
       setError(`Total bobot saat ini ${totalWeight}%. Harus tepat 100%.`)
       setSuccess(null)
       return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.from('classes').update({
         weight_attendance: weightAttendance,
         weight_assignments: weightAssignments,
         weight_quiz: weightQuiz,
         weight_midterm: weightMidterm,
         weight_final: weightFinal
      }).eq('id', id)

      if (error) throw error
      
      setSuccess('Pengaturan bobot nilai berhasil diperbarui!')
      
      // Auto dismiss success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
       setError(err.message || 'Gagal menyimpan pengaturan')
    } finally {
       setSaving(false)
    }
  }

  const handleSaveBackupLecturer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBackup(true)
    setBackupError(null)
    setBackupSuccess(null)

    try {
      const res = await fetch('/api/lecturer/class/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: id,
          backupLecturerId: backupLecturerId || null
        })
      })
      const result = await res.json()
      
      if (!res.ok) throw new Error(result.error || 'Gagal memperbarui dosen pembackup')
      
      setBackupSuccess('Dosen pembackup berhasil diperbarui!')
      setTimeout(() => setBackupSuccess(null), 3000)
    } catch (err: any) {
      setBackupError(err.message || 'Gagal memperbarui dosen pembackup')
    } finally {
      setSavingBackup(false)
    }
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
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

      <div className="max-w-3xl mx-auto px-2 sm:px-4 md:px-6">
         <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 sm:mb-6">
            <h2 className="text-[11px] sm:text-[13px] font-black uppercase text-slate-800 dark:text-white tracking-widest flex items-center gap-2">
               <Settings2 className="h-4 w-4 text-blue-600" /> Pengaturan Kelas
            </h2>
         </div>

         <div className="bg-white border border-slate-200 rounded-xl shadow-sm dark:bg-[#121B2E] dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50">
               <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-500 dark:bg-amber-900/20">
                     <Percent className="h-5 w-5" />
                  </div>
                  <div>
                     <h3 className="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-wide">Distribusi Bobot Nilai Akhir</h3>
                     <p className="text-[11px] font-medium text-slate-500 mt-1">Konfigurasi bobot komponen penilaian untuk mahasiswa. Total kumulatif harus mencapai tepat 100%.</p>
                  </div>
               </div>
            </div>

                <div className="p-3 sm:p-6 bg-slate-50/50 dark:bg-[#0D1424]/30">
               {error && (
                  <div className="mb-5 flex items-start gap-2.5 bg-red-50 text-red-700 p-3.5 rounded-lg border border-red-200/50 text-[11px] font-bold dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
                     <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </div>
               )}
               {success && (
                  <div className="mb-5 flex items-start gap-2.5 bg-emerald-50 text-emerald-700 p-3.5 rounded-lg border border-emerald-200/50 text-[11px] font-bold dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400">
                     <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
                  </div>
               )}

               <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                     <div>
                        <label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500 block mb-1.5 sm:mb-2">Kehadiran (Absensi)</label>
                        <div className="relative">
                           <input type="number" min="0" max="100" value={weightAttendance} onChange={(e) => setWeightAttendance(Number(e.target.value))} className="w-full text-xs sm:text-sm font-black text-slate-800 border border-slate-200 rounded-lg p-2 sm:p-3 pr-8 sm:pr-10 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all dark:bg-[#18233C] dark:border-slate-700 dark:text-white" />
                           <span className="absolute right-2.5 top-2 sm:top-3 text-slate-400 font-bold text-xs">%</span>
                        </div>
                     </div>
                     <div>
                        <label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500 block mb-1.5 sm:mb-2">Tugas Harian</label>
                        <div className="relative">
                           <input type="number" min="0" max="100" value={weightAssignments} onChange={(e) => setWeightAssignments(Number(e.target.value))} className="w-full text-xs sm:text-sm font-black text-slate-800 border border-slate-200 rounded-lg p-2 sm:p-3 pr-8 sm:pr-10 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all dark:bg-[#18233C] dark:border-slate-700 dark:text-white" />
                           <span className="absolute right-2.5 top-2 sm:top-3 text-slate-400 font-bold text-xs">%</span>
                        </div>
                     </div>
                     <div>
                        <label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500 block mb-1.5 sm:mb-2">Kuis (Quiz)</label>
                        <div className="relative">
                           <input type="number" min="0" max="100" value={weightQuiz} onChange={(e) => setWeightQuiz(Number(e.target.value))} className="w-full text-xs sm:text-sm font-black text-slate-800 border border-slate-200 rounded-lg p-2 sm:p-3 pr-8 sm:pr-10 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all dark:bg-[#18233C] dark:border-slate-700 dark:text-white" />
                           <span className="absolute right-2.5 top-2 sm:top-3 text-slate-400 font-bold text-xs">%</span>
                        </div>
                     </div>
                     <div>
                        <label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500 block mb-1.5 sm:mb-2">Ujian Tengah Semester</label>
                        <div className="relative">
                           <input type="number" min="0" max="100" value={weightMidterm} onChange={(e) => setWeightMidterm(Number(e.target.value))} className="w-full text-xs sm:text-sm font-black text-slate-800 border border-slate-200 rounded-lg p-2 sm:p-3 pr-8 sm:pr-10 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all dark:bg-[#18233C] dark:border-slate-700 dark:text-white" />
                           <span className="absolute right-2.5 top-2 sm:top-3 text-slate-400 font-bold text-xs">%</span>
                        </div>
                     </div>
                     <div>
                        <label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500 block mb-1.5 sm:mb-2">Ujian Akhir Semester</label>
                        <div className="relative">
                           <input type="number" min="0" max="100" value={weightFinal} onChange={(e) => setWeightFinal(Number(e.target.value))} className="w-full text-xs sm:text-sm font-black text-slate-800 border border-slate-200 rounded-lg p-2 sm:p-3 pr-8 sm:pr-10 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all dark:bg-[#18233C] dark:border-slate-700 dark:text-white" />
                           <span className="absolute right-2.5 top-2 sm:top-3 text-slate-400 font-bold text-xs">%</span>
                        </div>
                     </div>
                  </div>

                  <div className={`p-3 sm:p-4 rounded-xl border flex items-center justify-between transition-colors ${totalWeight === 100 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30'}`}>
                     <div className="flex items-center gap-2 sm:gap-3">
                        <Calculator className={`h-4 w-4 sm:h-5 sm:w-5 ${totalWeight === 100 ? 'text-emerald-500' : 'text-red-500'}`} />
                        <div>
                           <p className={`text-[9px] sm:text-[10px] font-black uppercase ${totalWeight === 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>Kalkulasi Total</p>
                           <p className={`text-[9px] font-medium mt-0.5 ${totalWeight === 100 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                              {totalWeight === 100 ? 'Bobot valid. Simpan pengaturan.' : `Total ${totalWeight}%. Harus tepat 100%.`}
                           </p>
                        </div>
                     </div>
                     <div className={`text-base sm:text-2xl font-black ${totalWeight === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {totalWeight}%
                     </div>
                  </div>

                    <div className="border-t border-slate-200 dark:border-slate-700/50 pt-5 flex justify-end">
                       <button type="submit" disabled={saving || totalWeight !== 100} className="flex items-center justify-center w-auto gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm shadow-blue-600/20 active:scale-[0.98]">
                          {saving ? <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" /> : <Save className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                          {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                       </button>
                    </div>
               </form>
             </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm dark:bg-[#121B2E] dark:border-slate-800 mt-6">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex items-start gap-3">
                   <div className="p-2 bg-blue-50 rounded-lg text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                      <Users className="h-5 w-5" />
                   </div>
                   <div>
                      <h3 className="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-wide">Manajemen Dosen Pembackup</h3>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">Pilih dosen asisten atau pendamping yang dapat membantu mengelola materi, tugas, dan nilai kelas.</p>
                   </div>
                </div>
             </div>

             <div className="p-6 bg-slate-50/50 dark:bg-[#0D1424]/30">
                {backupError && (
                   <div className="mb-5 flex items-start gap-2.5 bg-red-50 text-red-700 p-3.5 rounded-lg border border-red-200/50 text-[11px] font-bold dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {backupError}
                   </div>
                )}
                {backupSuccess && (
                   <div className="mb-5 flex items-start gap-2.5 bg-emerald-50 text-emerald-700 p-3.5 rounded-lg border border-emerald-200/50 text-[11px] font-bold dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" /> {backupSuccess}
                   </div>
                )}

                <form onSubmit={handleSaveBackupLecturer} className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Pilih Dosen Pembackup / Asisten</label>
                      <select 
                        value={backupLecturerId} 
                        onChange={(e) => setBackupLecturerId(e.target.value)} 
                        className="w-full text-sm font-medium text-slate-800 border border-slate-200 rounded-lg p-3 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all dark:bg-[#18233C] dark:border-slate-700 dark:text-white"
                      >
                         <option value="">-- Tidak ada dosen pembackup --</option>
                         {lecturers.filter(l => l.id !== classDetail.lecturer_id).map(lecturer => (
                            <option key={lecturer.id} value={lecturer.id}>
                               {lecturer.name} {lecturer.nidn ? `(NIDN: ${lecturer.nidn})` : ''}
                            </option>
                         ))}
                      </select>
                   </div>

                     <div className="border-t border-slate-200 dark:border-slate-700/50 pt-5 flex justify-end">
                        <button type="submit" disabled={savingBackup} className="flex items-center justify-center w-auto gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm shadow-blue-600/20 active:scale-[0.98]">
                           {savingBackup ? <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" /> : <Save className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                           {savingBackup ? 'Menyimpan...' : 'Simpan Dosen Pembackup'}
                        </button>
                     </div>
                </form>
             </div>
          </div>
       </div>
    </div>
  )
}
