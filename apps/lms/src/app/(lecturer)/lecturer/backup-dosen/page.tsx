'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, CheckCircle2, AlertCircle, Loader2, Clock, PlusCircle,
  Shield, KeyRound, Mail, User, Eye, EyeOff, Timer, Trash2, RefreshCw
} from 'lucide-react'

interface BackupEntry {
  id: string
  class_name: string
  course_name: string
  class_code: string
  backup_lecturer_id: string | null
  backup_lecturer_name: string | null
  backupExpiresAt: string | null
  isExpired: boolean
}

export default function BackupDosenPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [backupList, setBackupList] = useState<BackupEntry[]>([])
  
  // Form States
  const [selectedClass, setSelectedClass] = useState('')
  const [backupName, setBackupName] = useState('')
  const [backupEmail, setBackupEmail] = useState('')
  const [backupPassword, setBackupPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [durationHours, setDurationHours] = useState<2 | 3 | 4>(2)
  
  // Result States
  const [saving, setSaving] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [createdCredentials, setCreatedCredentials] = useState<{email: string, password: string, expiresAt: string} | null>(null)

  const fetchData = async (userId: string) => {
    const supabase = createClient()
    
    // Get lecturer's own classes
    const { data: clsData } = await supabase
      .from('class_details')
      .select('id, class_name, course_name, class_code')
      .eq('lecturer_id', userId)
      .eq('is_active', true)
      
    if (!clsData?.length) {
      setClasses([])
      setBackupList([])
      return
    }

    setClasses(clsData)

    // Get backup info from the new API endpoint
    try {
      const res = await fetch('/api/v1/backup-lecturers')
      const json = await res.json()
      if (json.success) {
        setBackupList(json.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch backup list', err)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await fetchData(user.id)
      } catch (err) {
        console.error('Failed to init backup page', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass) {
      setError('Harap pilih kelas.')
      return
    }
    if (!backupName.trim() || !backupEmail.trim() || !backupPassword.trim()) {
      setError('Semua field wajib diisi.')
      return
    }
    if (backupPassword.length < 8) {
      setError('Password minimal 8 karakter.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    setCreatedCredentials(null)

    try {
      const res = await fetch('/api/v1/backup-lecturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          name: backupName,
          email: backupEmail,
          password: backupPassword,
          durationHours,
        })
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal membuat akun dosen backup')

      // Show success with credentials to copy
      setCreatedCredentials({ 
        email: backupEmail, 
        password: backupPassword,
        expiresAt: json.data.expiresAt 
      })
      setSuccess(json.message)

      // Reset form
      setSelectedClass('')
      setBackupName('')
      setBackupEmail('')
      setBackupPassword('')
      setDurationHours(2)

      // Refresh list
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await fetchData(user.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async (classId: string, backupUserId: string) => {
    if (!confirm('Cabut akses dosen backup ini? Akun mereka akan dihapus dari sistem.')) return
    setRevoking(classId)
    setError(null)

    try {
      const res = await fetch('/api/v1/backup-lecturers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, backupUserId })
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal mencabut akses')

      setSuccess('Akses dosen backup berhasil dicabut.')
      setTimeout(() => setSuccess(null), 3000)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await fetchData(user.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRevoking(null)
    }
  }

  const formatExpiry = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('id-ID', { 
      dateStyle: 'medium', 
      timeStyle: 'short'
    })
  }

  const getRemainingTime = (isoString: string) => {
    const now = new Date()
    const expires = new Date(isoString)
    const diffMs = expires.getTime() - now.getTime()
    if (diffMs <= 0) return null
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    if (diffHours > 0) return `${diffHours}j ${diffMins}m lagi`
    return `${diffMins} menit lagi`
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const activeBackups = backupList.filter(b => b.backup_lecturer_id && !b.isExpired)
  const expiredBackups = backupList.filter(b => b.backup_lecturer_id && b.isExpired)

  return (
    <div className="pb-12 space-y-6 animate-fade-in max-w-4xl mx-auto mt-4">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-2">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Manajemen Akses</p>
        <h1 className="text-[11px] sm:text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
          Manajemen Dosen Backup
        </h1>
        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Buat akun sementara untuk dosen pengganti. Akun akan otomatis kedaluwarsa setelah durasi yang ditentukan.
          Dosen backup hanya dapat mengajar, upload materi &amp; tugas, buat absensi — namun <strong>tidak dapat mengubah nilai akhir</strong>.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[11px] text-red-700 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {success && !createdCredentials && (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-[11px] text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          {success}
        </div>
      )}

      {/* Credentials Display (shown once after successful creation) */}
      {createdCredentials && (
        <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-700 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-300">Akun Berhasil Dibuat!</h3>
          </div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
            Simpan kredensial ini sekarang — password tidak bisa dilihat lagi setelah halaman ditutup.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 mt-2">
            <div className="bg-white dark:bg-[#0f1625] rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
              <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Email Login</p>
              <p className="text-xs font-mono font-bold text-slate-800 dark:text-white break-all">{createdCredentials.email}</p>
            </div>
            <div className="bg-white dark:bg-[#0f1625] rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
              <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Password</p>
              <p className="text-xs font-mono font-bold text-slate-800 dark:text-white">{createdCredentials.password}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <Timer className="h-3.5 w-3.5 shrink-0" />
            Akun kedaluwarsa pada: {formatExpiry(createdCredentials.expiresAt)}
          </div>
          <button onClick={() => setCreatedCredentials(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
            Tutup
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form - Create Backup Account */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-[#121B2E]">
          <h2 className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
            Buat Akun Dosen Pengganti
          </h2>

          <form onSubmit={handleCreate} className="space-y-3">
            {/* Pilih Kelas */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Pilih Kelas</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white"
                required
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.class_code} - {c.course_name} ({c.class_name})</option>
                ))}
              </select>
            </div>

            {/* Nama Dosen Pengganti */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Nama Dosen Pengganti</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-3.5 w-3.5" />
                </span>
                <input 
                  type="text"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  placeholder="Contoh: Dr. Ahmad Fauzi, M.Kom"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs font-medium focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white placeholder-slate-400"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Email (untuk Login)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <input 
                  type="email"
                  value={backupEmail}
                  onChange={(e) => setBackupEmail(e.target.value)}
                  placeholder="backup.dosen@jayakarta.ac.id"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs font-medium focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white placeholder-slate-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Password (min. 8 karakter)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <KeyRound className="h-3.5 w-3.5" />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  placeholder="Min. 8 karakter"
                  required
                  minLength={8}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-10 py-2 text-xs font-medium focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white placeholder-slate-400"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Durasi Sesi */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Durasi Mengajar</label>
              <div className="grid grid-cols-3 gap-2">
                {([2, 3, 4] as const).map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDurationHours(h)}
                    className={`flex flex-col items-center gap-0.5 py-2.5 rounded-lg border-2 text-[10px] font-black transition-all ${
                      durationHours === h 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {h} Jam
                  </button>
                ))}
              </div>
              <p className="text-[9px] font-medium text-slate-400 mt-1.5">
                Akun akan otomatis kedaluwarsa setelah {durationHours} jam.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={saving} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {saving ? 'Membuat Akun...' : 'Buat Akun Dosen Backup'}
            </button>
          </form>
        </div>

        {/* Info Area */}
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800/30 dark:bg-amber-950/10">
            <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-3">Panduan Dosen Backup</h3>
            <ul className="text-[10px] text-amber-700 dark:text-amber-400 space-y-2">
              <li className="flex items-start gap-1.5">
                <span className="shrink-0 font-black">1.</span>
                Masukkan nama, email, dan password untuk akun dosen pengganti. Email boleh email pribadi.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="shrink-0 font-black">2.</span>
                Tentukan durasi sesi: <strong>2 jam</strong> (min), <strong>3 jam</strong>, atau <strong>4 jam</strong> (maks).
              </li>
              <li className="flex items-start gap-1.5">
                <span className="shrink-0 font-black">3.</span>
                Bagikan email &amp; password yang muncul kepada dosen pengganti. Akun langsung aktif.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="shrink-0 font-black">4.</span>
                Setelah waktu habis, login otomatis diblokir. Aksi Cabut akan menghapus akun sepenuhnya.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="shrink-0 font-black">⚠</span>
                Dosen backup <strong>tidak dapat mengubah nilai akhir</strong> mahasiswa.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Active Backup List */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-[#121B2E]">
        <h2 className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
          Daftar Dosen Backup
          {activeBackups.length > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] font-black">
              {activeBackups.length} Aktif
            </span>
          )}
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-bold text-slate-600 dark:text-slate-300">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-widest text-left">
                <th className="pb-3 pr-4">Kelas</th>
                <th className="pb-3 pr-4">Dosen Pengganti</th>
                <th className="pb-3 pr-4">Kedaluwarsa</th>
                <th className="pb-3 pr-4 text-center">Status</th>
                <th className="pb-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {backupList.filter(b => b.backup_lecturer_id).length > 0 ? (
                backupList
                  .filter(b => b.backup_lecturer_id)
                  .map((item, i) => {
                    const remaining = item.backupExpiresAt ? getRemainingTime(item.backupExpiresAt) : null
                    return (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-bold">{item.course_name}</p>
                          <p className="text-[9px] text-slate-400">{item.class_code} - {item.class_name}</p>
                        </td>
                        <td className="py-3 pr-4 font-medium">{item.backup_lecturer_name || '—'}</td>
                        <td className="py-3 pr-4 text-[10px]">
                          {item.backupExpiresAt ? (
                            <div>
                              <p>{formatExpiry(item.backupExpiresAt)}</p>
                              {remaining && <p className="text-emerald-600 dark:text-emerald-400 font-black">{remaining}</p>}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {item.isExpired ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-600 dark:bg-red-900/30">
                              Kedaluwarsa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Aktif
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <button 
                            onClick={() => handleRevoke(item.id, item.backup_lecturer_id!)} 
                            disabled={revoking === item.id}
                            className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 font-bold transition-colors mx-auto disabled:opacity-50"
                          >
                            {revoking === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Cabut
                          </button>
                        </td>
                      </tr>
                    )
                  })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Belum ada dosen backup yang ditugaskan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
