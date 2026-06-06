'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, CheckCircle2, AlertCircle, Loader2, Calendar, PlusCircle
} from 'lucide-react'

export default function BackupDosenPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [lecturers, setLecturers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Form States
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedBackup, setSelectedBackup] = useState('')
  
  // Result States
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])

  const fetchLecturers = async () => {
    const res = await fetch('/api/v1/dosen/backup/assign')
    if (res.ok) {
      const json = await res.json()
      if (json.success) setLecturers(json.data)
    }
  }

  const fetchClassesAndBackups = async (user: any) => {
    const supabase = createClient()
    
    // Fetch lecturer classes details
    const { data: clsData } = await supabase
      .from('class_details')
      .select('id, class_name, course_name, class_code')
      .eq('lecturer_id', user.id)
      .eq('is_active', true)
      
    if (!clsData) return

    // Fetch classes backup_lecturer_id
    const { data: bkpData } = await supabase
      .from('classes')
      .select('id, backup_lecturer_id')
      .in('id', clsData.map(c => c.id))

    const merged = clsData.map(c => {
      const bkp = bkpData?.find(b => b.id === c.id)
      return { ...c, backup_lecturer_id: bkp?.backup_lecturer_id }
    })
    
    setClasses(merged)

    // Build history table
    const hist = merged.filter(c => c.backup_lecturer_id).map(c => ({
      className: `${c.course_name} - ${c.class_name}`,
      backupLecturerId: c.backup_lecturer_id,
      classId: c.id
    }))
    setHistory(hist)
  }

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await Promise.all([
          fetchLecturers(),
          fetchClassesAndBackups(user)
        ])
      } catch (err) {
        console.error('Failed to init backup page', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass) {
      setError('Harap pilih kelas.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/v1/dosen/backup/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          backupLecturerId: selectedBackup || null
        })
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal mengatur dosen pengganti')

      setSuccess(json.message)
      setSelectedClass('')
      setSelectedBackup('')
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await fetchClassesAndBackups(user)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const getLecturerName = (id: string) => {
    return lecturers.find(l => l.id === id)?.full_name || 'Tidak diketahui'
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="pb-12 space-y-6 animate-fade-in max-w-4xl mx-auto mt-4">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-2">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Manajemen Akses</p>
        <h1 className="text-[11px] sm:text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
          Manajemen Dosen Backup
        </h1>
        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Delegasikan kelas Anda kepada dosen rekanan. Dosen yang dipilih akan langsung mendapatkan akses ke kelas Anda di dashboard mereka.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form Assignment */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-[#121B2E]">
          <h2 className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
            Tugaskan Dosen Pengganti
          </h2>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[11px] text-red-700 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-[11px] text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              {success}
            </div>
          )}

          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Pilih Kelas</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.class_code} - {c.course_name} ({c.class_name})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Pilih Rekan Dosen</label>
              <select 
                value={selectedBackup} 
                onChange={(e) => setSelectedBackup(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white"
              >
                <option value="">-- Hapus / Kosongkan --</option>
                {lecturers.map(l => (
                  <option key={l.id} value={l.id}>{l.full_name}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={saving || !selectedClass} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Terapkan Penugasan
            </button>
          </form>
        </div>

        {/* Info Area */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-[#121B2E]/50 flex flex-col justify-center h-full min-h-[200px]">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Informasi Penting</h3>
            <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-2 list-disc pl-4">
              <li>Dosen yang ditugaskan dapat mengelola kelas Anda (seperti absen dan menilai tugas).</li>
              <li>Pastikan telah berkoordinasi dengan pihak prodi jika melakukan penugasan secara manual.</li>
              <li>Pilih opsi "Kosongkan" untuk mencabut akses dosen pengganti.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* History Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-[#121B2E]">
        <h2 className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
          Daftar Dosen Pengganti Aktif
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-bold text-slate-600 dark:text-slate-300">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-widest text-left">
                <th className="pb-3 pr-4">Nama Kelas</th>
                <th className="pb-3 pr-4">Nama Dosen Pengganti</th>
                <th className="pb-3 pr-4 text-center">Status Akses</th>
                <th className="pb-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.length > 0 ? history.map((item: any, i: number) => {
                return (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 pr-4">{item.className}</td>
                    <td className="py-3 pr-4 font-medium">{getLecturerName(item.backupLecturerId)}</td>
                    <td className="py-3 pr-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30">
                        Aktif
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <button 
                        onClick={() => {
                          setSelectedClass(item.classId)
                          setSelectedBackup('')
                        }} 
                        className="text-[10px] text-red-500 hover:underline font-bold"
                      >
                        Cabut
                      </button>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">Belum ada penugasan dosen pengganti yang aktif.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
