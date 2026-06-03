'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Loader2, FileText, Upload, Download,
  Link2, X, Check, PenSquare, ChevronDown, ChevronUp, UploadCloud, Clock, AlertCircle
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export interface Assignment {
  id: string
  class_id: string
  title: string
  description: string | null
  type: string
  max_score: number
  passing_score: number
  due_date: string | null
  late_submission: boolean
  late_penalty_pct: number
  allow_file_upload: boolean
  allowed_file_types: string[]
  max_file_size_mb: number
  display_status: string
  submission_id: string | null
  submitted_at: string | null
  submission_score: number | null
  submission_final_score: number | null
  submission_status: string | null
  is_late: boolean | null
  is_absent?: boolean
  created_at?: string
  profiles?: { name: string, role: string, avatar_url?: string }
}

export default function AssignmentCard({ 
  assign, 
  user, 
  onReload, 
  lecturerName,
  lecturerAvatar
}: { 
  assign: Assignment, 
  user: any, 
  onReload: () => void,
  lecturerName: string,
  lecturerAvatar?: string | null
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [activeUploadType, setActiveUploadType] = useState<'file' | 'link' | 'text' | null>(null)
  const [textAnswer, setTextAnswer] = useState('')

  const [subData, setSubData] = useState<any>(null)
  const [subLoading, setSubLoading] = useState(false)

  const isDone = assign.display_status === 'submitted' || assign.display_status === 'graded'

  useEffect(() => {
    async function fetchSub() {
      if (assign.submission_id) {
        setSubLoading(true)
        try {
          const res = await fetch(`/api/assignments/${assign.id}/submit`)
          const json = await res.json()
          if (json.success && json.data) setSubData(json.data)
        } catch(err) {
          console.error(err)
        }
        setSubLoading(false)
      }
    }
    fetchSub()
  }, [assign.submission_id, assign.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    const supabase = createClient()
    try {
      let fileUrl = linkUrl || ''
      let fileName = linkUrl ? 'Tautan Eksternal' : ''
      let fileSize = 0
      let fileType = linkUrl ? 'url' : ''

      if (textAnswer) {
        fileUrl = ''
        fileName = 'Teks Jawaban'
        fileType = 'text'
      }

      if (file) {
        const sizeMb = file.size / (1024 * 1024)
        if (sizeMb > assign.max_file_size_mb) throw new Error(`Maksimal ${assign.max_file_size_mb} MB`)
        
        const filePath = `${user.id}/${assign.id}/${Date.now()}_${file.name}`
        const { error: uploadErr } = await supabase.storage.from('submissions').upload(filePath, file, { upsert: true })
        if (uploadErr) throw new Error('Gagal upload file')
        
        const { data: { publicUrl } } = supabase.storage.from('submissions').getPublicUrl(filePath)
        fileUrl = publicUrl
        fileName = file.name
        fileSize = file.size
        fileType = file.type
      }

      const res = await fetch(`/api/assignments/${assign.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textAnswer || null,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          fileSize: fileSize || null,
          fileType: fileType || null,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menyimpan penyerahan')

      setSubmitSuccess('Tugas berhasil dikumpulkan!')
      setFile(null)
      setLinkUrl('')
      setTextAnswer('')
      setActiveUploadType(null)
      onReload()
    } catch (err: any) {
      setSubmitError(err.message || 'Kesalahan sistem')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleUnsubmit = async () => {
    if (!confirm('Batalkan pengiriman?')) return
    setSubmitLoading(true)
    try {
      const res = await fetch(`/api/assignments/${assign.id}/submit`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal')
      
      setSubmitSuccess('Pengiriman dibatalkan.')
      setSubData(null)
      onReload()
    } catch (err: any) {
      setSubmitError(err.message || 'Error')
    } finally {
      setSubmitLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'graded': return <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded dark:bg-emerald-900/20 uppercase tracking-wide">Dinilai</span>
      case 'submitted': return <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded dark:bg-blue-900/20 uppercase tracking-wide">Diserahkan</span>
      case 'missing': return <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-1 rounded dark:bg-red-900/20 uppercase tracking-wide">Terlambat</span>
      default: return <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded dark:bg-amber-900/20 uppercase tracking-wide">Ditugaskan</span>
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#121B2E] transition-all relative overflow-hidden">
      {/* Stream-like Post Header - Now acts as accordion trigger */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#152033] transition-colors"
      >
        <div className="flex items-center gap-3">
          {lecturerAvatar ? (
            <img src={lecturerAvatar} alt={lecturerName} className="h-10 w-10 shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-[10px] md:text-[11px] font-extrabold text-slate-850 dark:text-white leading-tight">
              {lecturerName} <span className="font-semibold text-slate-500 dark:text-slate-400">memposting tugas baru:</span> {assign.title}
            </h4>
            <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500 mt-1 block uppercase tracking-widest">
              DOSEN PENGAJAR • {formatDate(assign.created_at || new Date().toISOString())}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {assign.is_absent && (
            <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded dark:bg-rose-950/30 dark:border-rose-900/50 uppercase tracking-wide flex items-center gap-1">
              <AlertCircle className="h-2.5 w-2.5" /> Tidak Absen
            </span>
          )}
          {getStatusBadge(assign.display_status)}
          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-transparent">
          <div className="flex flex-wrap gap-3 mb-3 text-[10px] font-bold text-slate-500">
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">{assign.max_score} Poin</span>
            {assign.due_date && <span>Tenggat: {formatDate(assign.due_date)}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {assign.allow_file_upload && (
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded">
                <UploadCloud className="h-3 w-3 text-slate-400" />
                File: {assign.allowed_file_types?.join(', ')?.toUpperCase() || 'SEMUA'} (Max: {assign.max_file_size_mb || 10}MB)
              </div>
            )}
            <div className={`flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded ${assign.late_submission ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'}`}>
              <Clock className="h-3 w-3" />
              {assign.late_submission ? `Late Diizinkan (Penalti: -${assign.late_penalty_pct}%)` : 'Late Tidak Diizinkan'}
            </div>
          </div>
          <p className="text-[11px] text-slate-650 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
            {assign.description || 'Tidak ada instruksi khusus.'}
          </p>

          {/* Integrated Submission Area */}
          <div className="mt-4">
            <h4 className="text-[11px] font-black uppercase text-slate-800 dark:text-white mb-3">Tugas Anda</h4>
            
            {submitError && <div className="mb-3 text-[10px] text-red-600 bg-red-50 p-2 rounded font-bold">{submitError}</div>}
            {submitSuccess && <div className="mb-3 text-[10px] text-emerald-600 bg-emerald-50 p-2 rounded font-bold">{submitSuccess}</div>}

            {isDone ? (
              <div className="space-y-3">
                {subLoading ? (
                  <div className="py-2"><Loader2 className="h-4 w-4 animate-spin text-blue-600" /></div>
                ) : subData ? (
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between bg-slate-50 dark:bg-[#18233C] dark:border-slate-700">
                        <div className="min-w-0 flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                            {subData.file_name || 'Sudah Diserahkan'}
                          </span>
                        </div>
                        {subData.file_url && (
                          <a href={subData.file_url} target="_blank" className="shrink-0 p-1.5 hover:bg-slate-200 rounded text-slate-500 dark:hover:bg-slate-700 dark:text-slate-400">
                            <Download className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    
                    {assign.display_status === 'graded' ? (
                      <div className="shrink-0 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg dark:bg-emerald-900/10 dark:border-emerald-800/30 text-center sm:w-32">
                        <p className="text-[9px] font-black uppercase text-emerald-600 mb-0.5">Nilai</p>
                        <p className="text-sm font-black text-emerald-700 dark:text-emerald-500">{assign.submission_final_score} <span className="text-[10px] text-emerald-600/50">/ {assign.max_score}</span></p>
                      </div>
                    ) : (
                      <button onClick={handleUnsubmit} disabled={submitLoading} className="w-full sm:w-auto shrink-0 py-2.5 px-4 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
                        {submitLoading ? 'Batal...' : 'Batal Serah'}
                      </button>
                    )}
                  </div>
                ) : null}
                {assign.display_status === 'graded' && subData?.feedback && (
                   <p className="text-[10px] font-medium text-emerald-600 italic bg-emerald-50/50 p-2 rounded dark:bg-emerald-900/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30">Dosen: "{subData.feedback}"</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {!activeUploadType ? (
                  <div className="flex flex-wrap gap-2">
                    {(assign.allow_file_upload !== false) && (
                      <button type="button" onClick={() => setActiveUploadType('file')} className="flex-1 py-2 border border-slate-200 rounded-lg text-[10px] font-black flex justify-center items-center gap-1.5 hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"><Upload className="h-3.5 w-3.5" /> File</button>
                    )}
                    <button type="button" onClick={() => setActiveUploadType('link')} className="flex-1 py-2 border border-slate-200 rounded-lg text-[10px] font-black flex justify-center items-center gap-1.5 hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"><Link2 className="h-3.5 w-3.5" /> Tautan</button>
                    <button type="button" onClick={() => setActiveUploadType('text')} className="flex-1 py-2 border border-slate-200 rounded-lg text-[10px] font-black flex justify-center items-center gap-1.5 hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"><PenSquare className="h-3.5 w-3.5" /> Teks</button>
                  </div>
                ) : (
                  <div className="p-3 border border-blue-200 bg-blue-50/50 rounded-lg dark:bg-blue-900/10 dark:border-blue-800/50 relative">
                    <button type="button" onClick={() => { setActiveUploadType(null); setFile(null); setLinkUrl(''); setTextAnswer('') }} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm"><X className="h-3 w-3" /></button>
                    <p className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 mb-2 tracking-wider">
                      {activeUploadType === 'file' ? 'Pilih File' : activeUploadType === 'link' ? 'Masukkan Link' : 'Ketik Jawaban'}
                    </p>
                    
                    {activeUploadType === 'file' && <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-[11px] file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />}
                    {activeUploadType === 'link' && <input type="url" placeholder="https://" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="w-full text-[11px] font-medium p-2 border border-blue-200 rounded bg-white outline-none focus:ring-2 focus:ring-blue-100 dark:bg-[#121B2E] dark:border-slate-700 dark:text-white" />}
                    {activeUploadType === 'text' && <textarea placeholder="Mulai mengetik..." rows={3} value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} className="w-full text-[11px] font-medium p-2 border border-blue-200 rounded bg-white outline-none resize-none focus:ring-2 focus:ring-blue-100 dark:bg-[#121B2E] dark:border-slate-700 dark:text-white" />}
                  </div>
                )}

                <button type="submit" disabled={submitLoading || (!file && !linkUrl && !textAnswer)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-blue-600/20 active:scale-[0.98]">
                  {submitLoading ? 'Menyerahkan...' : 'Serahkan Tugas'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
