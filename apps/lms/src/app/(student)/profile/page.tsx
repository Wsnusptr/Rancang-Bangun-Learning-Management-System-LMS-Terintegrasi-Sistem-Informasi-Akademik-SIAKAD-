'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  User, Mail, Phone, MapPin, Calendar, Loader2,
  CheckCircle2, AlertCircle, Edit3, Save, X, GraduationCap,
  Shield, Camera
} from 'lucide-react'

interface ProfileData {
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: string
  address: string
  intended_program: string
  avatar_url: string | null
  // student-only
  nim?: string | null
  role?: string
}

const PROGRAMS = [
  { value: 'S1-TI', label: 'S1 Teknik Informatika' },
  { value: 'S1-SI', label: 'S1 Sistem Informasi' },
]

// Removed Field component to prevent focus loss issues

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [form, setForm] = useState<ProfileData | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Try loading from profiles table
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*, study_programs(code, name)')
        .eq('id', user.id)
        .single()

      const guest = !profileRow || !profileRow.nim
      setIsGuest(guest)

      if (guest) {
        const meta = user.user_metadata || {}
        const base: ProfileData = {
          full_name: profileRow?.name || meta.full_name || meta.name || '',
          email: user.email || '',
          phone: profileRow?.phone || '',
          date_of_birth: profileRow?.date_of_birth || '',
          gender: profileRow?.gender || '',
          address: profileRow?.address || '',
          intended_program: profileRow?.intended_program || '',
          avatar_url: profileRow?.avatar_url || meta.avatar_url || meta.picture || null,
          nim: null,
          role: 'Calon Mahasiswa',
        }
        setProfile(base)
        setForm(base)
      } else {
        const sp = (profileRow as { study_programs?: { code?: string; name?: string } | null }).study_programs
        const base: ProfileData = {
          full_name: profileRow.name || '',
          email: user.email || '',
          phone: profileRow.phone || '',
          date_of_birth: profileRow.date_of_birth || '',
          gender: profileRow.gender || '',
          address: profileRow.address || '',
          intended_program: sp?.code || profileRow.intended_program || '',
          avatar_url: profileRow.avatar_url || null,
          nim: profileRow.nim,
          role: profileRow.role,
        }
        setProfile(base)
        setForm(base)
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi tidak valid')

      if (isGuest) {
        // Upsert into profiles with guest data
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name: form.full_name,
            phone: form.phone,
            date_of_birth: form.date_of_birth || null,
            gender: form.gender || null,
            address: form.address,
            intended_program: form.intended_program,
            avatar_url: form.avatar_url,
            role: 'student',
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })

        if (upsertError) throw upsertError

        // Sinkron ke mahasiswa_baru (SIAKAD) jika service role tersedia
        fetch('/api/v1/pmb/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: form.full_name,
            phone: form.phone,
            date_of_birth: form.date_of_birth || null,
            gender: form.gender || null,
            address: form.address,
            intended_program: form.intended_program,
          }),
        }).catch(() => { /* non-blocking */ })
      } else {
        // Update existing student profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            name: form.full_name,
            phone: form.phone,
            date_of_birth: form.date_of_birth || null,
            gender: form.gender || null,
            address: form.address,
            avatar_url: form.avatar_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)

        if (updateError) throw updateError
      }

      setProfile(form)
      setSuccess(true)
      setEditing(false)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm(profile)
    setEditing(false)
    setError(null)
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran gambar maksimal adalah 2MB.')
      return
    }

    // Check MIME type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Format gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi tidak valid')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengunggah gambar')
      }

      const publicUrl = data.url

      // Update state immediately
      setForm(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Gagal mengunggah foto profil')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile || !form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-400">Gagal memuat profil.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-sm font-semibold text-slate-800 dark:text-white">Profil</h1>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
          {isGuest ? 'Data pendaftaran PMB' : 'Data mahasiswa aktif'}
        </p>
      </div>

      {/* Status / Alerts */}
      {success && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Data berhasil disimpan.</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 dark:border-red-900/30 dark:bg-red-950/20">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#121B2E] overflow-hidden shadow-sm">
        {/* Avatar + Name Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
          
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar Picture with Camera Upload Overlay */}
            <div className="relative group shrink-0 h-16 w-16 overflow-hidden rounded-full border-2 border-slate-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-sm cursor-pointer" onClick={triggerFileInput}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover group-hover:opacity-75 transition-all duration-300" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary text-lg font-black text-white dark:bg-blue-700 group-hover:opacity-75 transition-all duration-300">
                  {profile.full_name?.substring(0, 2).toUpperCase() || '?'}
                </div>
              )}

              {/* Hidden Input File */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                accept="image/*" 
                className="hidden" 
              />

              {/* Hover Camera Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Camera className="h-4.5 w-4.5 text-white" />
                )}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800 dark:text-white truncate">{profile.full_name || '-'}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{profile.email}</p>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                isGuest
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}>
                <Shield className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{isGuest ? 'Calon Mahasiswa' : `Mahasiswa - NIM ${profile.nim}`}</span>
              </span>
            </div>
          </div>

          {/* Edit Toggle */}
          <div className="flex items-center justify-end sm:w-auto w-full pt-2 sm:pt-0 border-t border-slate-100 sm:border-0 dark:border-slate-800">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center justify-center w-full sm:w-auto gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Ubah Profil
              </button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCancel}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-gray-400"
                >
                  <X className="h-3.5 w-3.5" />
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Simpan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Fields Grid */}
        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
          <div className="space-y-1.5 transition-all duration-300">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Nama Lengkap
            </label>
            {editing ? (
              <input type="text" value={form.full_name} onChange={(e) => setForm(prev => prev ? { ...prev, full_name: e.target.value } : null)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-primary focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white" />
            ) : (
              <div className="min-h-[36px] flex items-center"><p className={`text-xs ${profile.full_name ? 'text-slate-750 dark:text-gray-200 font-semibold' : 'text-slate-400 italic'}`}>{profile.full_name || '- belum diisi'}</p></div>
            )}
          </div>

          <div className="space-y-1.5 transition-all duration-300">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              Email
            </label>
            <div className="min-h-[36px] flex items-center"><p className="text-xs text-slate-750 dark:text-gray-200 font-semibold">{profile.email || '- belum diisi'}</p></div>
          </div>

          <div className="space-y-1.5 transition-all duration-300">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              Nomor WhatsApp / HP
            </label>
            {editing ? (
              <input type="tel" value={form.phone} onChange={(e) => setForm(prev => prev ? { ...prev, phone: e.target.value } : null)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-primary focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white" />
            ) : (
              <div className="min-h-[36px] flex items-center"><p className={`text-xs ${profile.phone ? 'text-slate-750 dark:text-gray-200 font-semibold' : 'text-slate-400 italic'}`}>{profile.phone || '- belum diisi'}</p></div>
            )}
          </div>

          <div className="space-y-1.5 transition-all duration-300">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Tanggal Lahir
            </label>
            {editing ? (
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm(prev => prev ? { ...prev, date_of_birth: e.target.value } : null)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-primary focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white" />
            ) : (
              <div className="min-h-[36px] flex items-center"><p className={`text-xs ${profile.date_of_birth ? 'text-slate-750 dark:text-gray-200 font-semibold' : 'text-slate-400 italic'}`}>{profile.date_of_birth || '- belum diisi'}</p></div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              Jenis Kelamin
            </label>
            {editing ? (
              <select value={form.gender} onChange={(e) => setForm(prev => prev ? { ...prev, gender: e.target.value } : null)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-primary focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white">
                <option value="">- Pilih Jenis Kelamin -</option>
                <option value="L">Laki-Laki</option>
                <option value="P">Perempuan</option>
              </select>
            ) : (
              <div className="min-h-[36px] flex items-center"><p className={`text-xs ${profile.gender ? 'text-slate-750 dark:text-gray-200 font-semibold' : 'text-slate-400 italic'}`}>{profile.gender === 'L' ? 'Laki-Laki' : profile.gender === 'P' ? 'Perempuan' : '- belum diisi'}</p></div>
            )}
          </div>

          {!isGuest && (
            <>
              <div className="space-y-1.5 transition-all duration-300">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                  NIM
                </label>
                <div className="min-h-[36px] flex items-center"><p className="text-xs text-slate-750 dark:text-gray-200 font-semibold">{profile.nim || '- belum diisi'}</p></div>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                  Program Studi
                </label>
                <div className="min-h-[36px] flex items-center">
                  <p className="text-xs font-semibold text-slate-750 dark:text-gray-200">
                    {PROGRAMS.find(p => p.value === form.intended_program)?.label || form.intended_program || '-'}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Program Studi - only for guests */}
          {isGuest && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                Program Studi yang Diminati
              </label>
              {editing ? (
                <select
                  value={form.intended_program}
                  onChange={(e) => setForm(prev => prev ? { ...prev, intended_program: e.target.value } : prev)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-primary focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                >
                  <option value="">- Pilih Program Studi -</option>
                  {PROGRAMS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              ) : (
                <div className="min-h-[36px] flex items-center">
                  <p className={`text-xs ${form.intended_program ? 'text-slate-750 dark:text-gray-200 font-semibold' : 'text-slate-400 italic'}`}>
                    {PROGRAMS.find(p => p.value === form.intended_program)?.label || '- belum dipilih'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Alamat - full width */}
          <div className={`space-y-1.5 ${isGuest ? 'sm:col-span-2' : ''}`}>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Alamat Domisili
            </label>
            {editing ? (
              <textarea
                rows={3}
                value={form.address}
                onChange={(e) => setForm(prev => prev ? { ...prev, address: e.target.value } : prev)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-primary focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white resize-none"
              />
            ) : (
              <div className="min-h-[36px] flex items-center">
                <p className={`text-xs leading-relaxed ${profile.address ? 'text-slate-750 dark:text-gray-200 font-semibold' : 'text-slate-400 italic'}`}>
                  {profile.address || '- belum diisi'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guest notice */}
      {isGuest && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0f1520] shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Informasi Akun</p>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed">
            Data yang Anda isi di sini akan digunakan dalam proses verifikasi Penerimaan Mahasiswa Baru (PMB).
            Setelah verifikasi dokumen selesai di loket PMB kampus, akun Anda akan diaktifkan penuh dengan Nomor Induk Mahasiswa (NIM).
          </p>
        </div>
      )}
    </div>
  )
}
