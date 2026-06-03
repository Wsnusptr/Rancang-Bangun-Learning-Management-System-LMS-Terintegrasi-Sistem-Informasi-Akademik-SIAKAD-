'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, Clock, CheckCircle2, AlertCircle, Copy, Loader2, Calendar, ShieldAlert, PlusCircle
} from 'lucide-react'

export default function BackupDosenPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Form States
  const [selectedClass, setSelectedClass] = useState('')
  const [duration, setDuration] = useState('4') // in hours
  const [backupName, setBackupName] = useState('')
  
  // Result States
  const [generating, setGenerating] = useState(false)
  const [generatedAccount, setGeneratedAccount] = useState<{email: string, password: string, expiredAt: string} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch lecturer classes
        const { data } = await supabase
          .from('class_details')
          .select('id, class_name, course_name, class_code')
          .eq('lecturer_id', user.id)
          .eq('is_active', true)
        
        if (data) setClasses(data)
        
        // Fetch history
        const res = await fetch('/api/v1/dosen/backup/history')
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setHistory(json.data)
          }
        }
      } catch (err) {
        console.error('Failed to init backup page', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !backupName || !duration) {
      setError('Harap lengkapi semua field.')
      return
    }

    setGenerating(true)
    setError(null)
    setGeneratedAccount(null)

    try {
      const cls = classes.find(c => c.id === selectedClass)
      const res = await fetch('/api/v1/dosen/backup/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          className: `${cls?.course_name} - ${cls?.class_name}`,
          backupName,
          durationHours: parseInt(duration)
        })
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal generate akun backup')

      setGeneratedAccount(json.data)
      setBackupName('')
      
      // Refresh history
      const hRes = await fetch('/api/v1/dosen/backup/history')
      if (hRes.ok) {
        const hJson = await hRes.json()
        if (hJson.success) setHistory(hJson.data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Disalin ke clipboard!')
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
          Delegasikan kelas Anda kepada dosen pengganti untuk hari tertentu. Akun yang di-generate memiliki akses terbatas (hanya absensi, tambah materi/tugas) dan akan otomatis kedaluwarsa sesuai durasi yang diatur.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form Generation */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-[#121B2E]">
          <h2 className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
            Generate Akun Backup Baru
          </h2>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[11px] text-red-700 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
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
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Nama Dosen Pengganti</label>
              <input 
                type="text" 
                placeholder="e.g. Budi Santoso, M.Kom" 
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Durasi Akses Aktif</label>
              <select 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white"
              >
                <option value="2">2 Jam</option>
                <option value="4">4 Jam</option>
                <option value="6">6 Jam</option>
                <option value="12">12 Jam</option>
                <option value="24">24 Jam (1 Hari)</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={generating || !selectedClass} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Generate Akun
            </button>
          </form>
        </div>

        {/* Result Area */}
        <div className="space-y-4">
          {generatedAccount ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-950/10 animate-scale-in">
              <h2 className="text-sm font-black text-emerald-800 dark:text-emerald-400 mb-2 flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-900/50 pb-3">
                <CheckCircle2 className="h-5 w-5" />
                Akun Berhasil Dibuat
              </h2>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-500 mb-4 font-medium">
                Berikan kredensial berikut kepada dosen pengganti. Akun ini hanya dapat login ke LMS dan hak aksesnya dibatasi secara otomatis.
              </p>
              
              <div className="space-y-3 bg-white dark:bg-[#0D1424] border border-emerald-100 dark:border-emerald-900/50 rounded-lg p-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Email / Username Login</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <code className="text-xs font-mono font-bold text-slate-800 dark:text-white">{generatedAccount.email}</code>
                    <button onClick={() => copyToClipboard(generatedAccount.email)} className="text-slate-400 hover:text-blue-500"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Password Sementara</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <code className="text-xs font-mono font-bold text-slate-800 dark:text-white">{generatedAccount.password}</code>
                    <button onClick={() => copyToClipboard(generatedAccount.password)} className="text-slate-400 hover:text-blue-500"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Kedaluwarsa Pada</span>
                  <div className="flex items-center gap-2 mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(generatedAccount.expiredAt).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-[#121B2E]/50 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
              <ShieldAlert className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Keamanan Akses Prioritas</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                Kredensial dosen pengganti hanya akan muncul di sini sesaat setelah dibuat dan tidak akan ditampilkan lagi demi keamanan.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History Area */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-[#121B2E]">
        <h2 className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
          Riwayat Pembuatan Akun Backup
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-bold text-slate-600 dark:text-slate-300">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-widest text-left">
                <th className="pb-3 pr-4">Nama Pengganti</th>
                <th className="pb-3 pr-4">Kelas</th>
                <th className="pb-3 pr-4">Email Backup</th>
                <th className="pb-3 pr-4 text-center">Kedaluwarsa</th>
                <th className="pb-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.length > 0 ? history.map((item: any, i: number) => {
                const isExpired = new Date(item.expiredAt) < new Date()
                return (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 pr-4">{item.backupName}</td>
                    <td className="py-3 pr-4">{item.className}</td>
                    <td className="py-3 pr-4 font-mono text-[10px]">{item.email}</td>
                    <td className="py-3 pr-4 text-center text-[10px] font-medium">{new Date(item.expiredAt).toLocaleString('id-ID')}</td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${isExpired ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'}`}>
                        {isExpired ? 'Expired' : 'Aktif'}
                      </span>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">Belum ada riwayat pembuatan akun backup.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
