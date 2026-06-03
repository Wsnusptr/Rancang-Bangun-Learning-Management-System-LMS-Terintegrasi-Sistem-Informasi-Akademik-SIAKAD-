'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Loader2, ImageIcon } from 'lucide-react'

interface ClassCoverEditorProps {
  classId: string
  coverImageUrl?: string | null
  onUpdated: (url: string) => void
}

export default function ClassCoverEditor({
  classId,
  coverImageUrl,
  onUpdated,
}: ClassCoverEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Maksimal 5 MB.')
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
      const ext = file.name.split('.').pop() || 'webp'
      const path = `${classId}/banner_${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('class-covers')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('class-covers').getPublicUrl(path)

      const res = await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl: publicUrl }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menyimpan banner')

      onUpdated(publicUrl)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/30 bg-black/30 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/45 disabled:opacity-60"
        title="Ubah banner kelas"
      >
        {uploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : coverImageUrl ? (
          <Camera className="h-3 w-3" />
        ) : (
          <ImageIcon className="h-3 w-3" />
        )}
        {uploading ? 'Mengunggah-' : 'Ubah banner'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && (
        <p className="absolute left-0 top-full mt-1 whitespace-nowrap rounded bg-red-600/90 px-2 py-0.5 text-[9px] text-white">
          {error}
        </p>
      )}
    </div>
  )
}
