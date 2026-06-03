'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProfileAvatar from '@/components/ui/ProfileAvatar'
import {
  User, Mail, Phone, Loader2, Edit3, Save, X, Camera, AlertCircle, CheckCircle2,
} from 'lucide-react'

export default function LecturerProfilePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nip, setNip] = useState('')
  const [nidn, setNidn] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setName(p?.name || '')
      setEmail(user.email || '')
      setPhone(p?.phone || '')
      setNip(p?.nip || '')
      setNidn(p?.nidn || '')
      setDateOfBirth(p?.date_of_birth || '')
      setGender(p?.gender || '')
      setAddress(p?.address || '')
      setAvatarUrl(p?.avatar_url || user.user_metadata?.picture || user.user_metadata?.avatar_url || null)
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ 
          name, 
          phone, 
          nidn: nidn || null,
          date_of_birth: dateOfBirth || null, 
          gender: gender || null, 
          address, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id)
      if (dbErr) setError(dbErr.message)
      else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2500)
      }
    }
    setSaving(false)
    setEditing(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran foto maksimal 2 MB.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Format: JPG, PNG, WEBP, atau GIF.')
      return
    }

    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi tidak valid')

      const ext = file.name.split('.').pop()
      const filePath = `${user.id}/avatar_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, cacheControl: '3600' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
      if (dbError) throw dbError

      setAvatarUrl(publicUrl)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-slate-800 dark:text-white">Profil Dosen</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">Foto profil tampil di kartu kelas mahasiswa</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            <Edit3 className="h-3 w-3" /> Ubah
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={() => setEditing(false)} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] dark:border-slate-700">
              <X className="h-3 w-3" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-[10px] text-white"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Simpan
            </button>
          </div>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Berhasil disimpan.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-[#121B2E]">
        <div className="flex items-center gap-4 border-b border-slate-100 p-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group shrink-0"
            title="Ubah foto profil"
          >
            <ProfileAvatar src={avatarUrl} name={name} size="lg" borderClassName="border-2 border-slate-100 dark:border-slate-700" />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Camera className="h-4 w-4 text-white" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-800 dark:text-white truncate">{name}</p>
            <p className="text-[10px] text-slate-500 truncate">{email}</p>
            <p className="text-[9px] text-slate-400 mt-1">Klik foto untuk upload - max 2 MB</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-[9px] font-medium text-slate-400 uppercase flex items-center gap-1">
              <User className="h-3 w-3" /> Nama
            </label>
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-900"
              />
            ) : (
              <p className="text-[11px] font-medium text-slate-800 dark:text-white mt-0.5">{name}</p>
            )}
          </div>
          <div>
            <label className="text-[9px] font-medium text-slate-400 uppercase flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </label>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{email}</p>
          </div>
          <div>
            <label className="text-[9px] font-medium text-slate-400 uppercase flex items-center gap-1">
              <Phone className="h-3 w-3" /> Telepon
            </label>
            {editing ? (
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-900"
              />
            ) : (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{phone || '-'}</p>
            )}
          </div>
          {nip && (
            <div>
              <label className="text-[9px] font-medium text-slate-400 uppercase flex items-center gap-1">NIP</label>
              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">{nip}</p>
            </div>
          )}
          <div>
            <label className="text-[9px] font-medium text-slate-400 uppercase flex items-center gap-1">NIDN</label>
            {editing ? (
              <input value={nidn} onChange={(e) => setNidn(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-900" placeholder="Nomor Induk Dosen Nasional" />
            ) : (
              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">{nidn || '-'}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-medium text-slate-400 uppercase flex items-center gap-1">Tanggal Lahir</label>
              {editing ? (
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-900" />
              ) : (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{dateOfBirth || '-'}</p>
              )}
            </div>
            <div>
              <label className="text-[9px] font-medium text-slate-400 uppercase flex items-center gap-1">Jenis Kelamin</label>
              {editing ? (
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-900">
                  <option value="">Pilih</option>
                  <option value="L">Laki-Laki</option>
                  <option value="P">Perempuan</option>
                </select>
              ) : (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{gender === 'L' ? 'Laki-Laki' : gender === 'P' ? 'Perempuan' : '-'}</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-[9px] font-medium text-slate-400 uppercase flex items-center gap-1">Alamat Lengkap</label>
            {editing ? (
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-900 resize-none" placeholder="Alamat lengkap rumah..." />
            ) : (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{address || '-'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
