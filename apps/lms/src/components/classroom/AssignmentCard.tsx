'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Loader2, FileText, Upload, Download,
  Link2, X, Check, PenSquare, ChevronDown, ChevronUp, UploadCloud, Clock, AlertCircle, File
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

export interface Attachment {
  id: string
  type: 'file' | 'link' | 'text'
  url?: string
  name?: string
  size?: number
  content?: string
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
  
  // Staging area state
  const [stagedAttachments, setStagedAttachments] = useState<Attachment[]>([])
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  
  // Inputs for link/text
  const [linkUrl, setLinkUrl] = useState('')
  const [textAnswer, setTextAnswer] = useState('')
  const [activeUploadType, setActiveUploadType] = useState<'file' | 'link' | 'text' | null>(null)

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
          if (json.success && json.data) {
            setSubData(json.data)
            
            // Parse attachments if it's a JSON string in content
            let parsedAttachments: Attachment[] = []
            if (json.data.content && json.data.content.startsWith('JSON_ATTACHMENTS:')) {
              try {
                parsedAttachments = JSON.parse(json.data.content.replace('JSON_ATTACHMENTS:', ''))
              } catch (e) {}
            } else if (json.data.file_url || json.data.content) {
              // Backward compatibility for old single-file/single-text submissions
              if (json.data.file_url) {
                parsedAttachments.push({
                  id: Date.now().toString() + Math.random().toString(),
                  type: json.data.file_type === 'url' ? 'link' : 'file',
                  url: json.data.file_url,
                  name: json.data.file_name || (json.data.file_type === 'url' ? 'Tautan' : 'File'),
                  size: json.data.file_size
                })
              }
              if (json.data.content) {
                parsedAttachments.push({
                  id: Date.now().toString() + Math.random().toString(),
                  type: 'text',
                  content: json.data.content,
                  name: 'Teks Jawaban'
                })
              }
            }
            // Hydrate the staging area just in case they click "Batal Serah"
            if (stagedAttachments.length === 0) {
              setStagedAttachments(parsedAttachments)
            }
          }
        } catch(err) {
          console.error(err)
        }
        setSubLoading(false)
      }
    }
    fetchSub()
  }, [assign.submission_id, assign.id])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSubmitError(null)
    setIsUploadingFile(true)
    const supabase = createClient()
    
    try {
      const sizeMb = file.size / (1024 * 1024)
      if (sizeMb > assign.max_file_size_mb) throw new Error(`Maksimal ${assign.max_file_size_mb} MB`)
      
      const filePath = `${user.id}/${assign.id}/${Date.now()}_${file.name}`
      const { error: uploadErr } = await supabase.storage.from('submissions').upload(filePath, file, { upsert: true })
      if (uploadErr) throw new Error('Gagal upload file')
      
      const { data: { publicUrl } } = supabase.storage.from('submissions').getPublicUrl(filePath)
      
      setStagedAttachments(prev => [...prev, {
        id: Date.now().toString(),
        type: 'file',
        url: publicUrl,
        name: file.name,
        size: file.size
      }])
      
      setActiveUploadType(null)
    } catch (err: any) {
      setSubmitError(err.message || 'Gagal mengunggah file')
    } finally {
      setIsUploadingFile(false)
      e.target.value = '' // reset input
    }
  }

  const handleAddLink = () => {
    if (!linkUrl.trim()) return
    setStagedAttachments(prev => [...prev, {
      id: Date.now().toString(),
      type: 'link',
      url: linkUrl,
      name: 'Tautan Eksternal'
    }])
    setLinkUrl('')
    setActiveUploadType(null)
  }

  const handleAddText = () => {
    if (!textAnswer.trim()) return
    setStagedAttachments(prev => [...prev, {
      id: Date.now().toString(),
      type: 'text',
      content: textAnswer,
      name: 'Teks Jawaban'
    }])
    setTextAnswer('')
    setActiveUploadType(null)
  }

  const handleRemoveAttachment = (idToRemove: string) => {
    setStagedAttachments(prev => prev.filter(a => a.id !== idToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (stagedAttachments.length === 0) {
      setSubmitError('Tambahkan setidaknya 1 file, tautan, atau teks.')
      return
    }
    
    setSubmitLoading(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    
    try {
      // Send the JSON payload inside the `content` field
      const jsonPayload = 'JSON_ATTACHMENTS:' + JSON.stringify(stagedAttachments)
      
      // Keep fileUrl for the first file just for backward compatibility if needed by other systems
      const firstFile = stagedAttachments.find(a => a.type === 'file' || a.type === 'link')

      const res = await fetch(`/api/assignments/${assign.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: jsonPayload,
          fileUrl: firstFile?.url || null,
          fileName: firstFile?.name || null,
          fileSize: firstFile?.size || null,
          fileType: firstFile?.type === 'link' ? 'url' : null,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menyimpan penyerahan')

      setSubmitSuccess('Tugas berhasil dikumpulkan!')
      setActiveUploadType(null)
      onReload()
    } catch (err: any) {
      setSubmitError(err.message || 'Kesalahan sistem')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleUnsubmit = async () => {
    if (!confirm('Batalkan pengiriman? File dan jawaban Anda tidak akan dihapus dari form, namun status tugas akan kembali menjadi Belum Diserahkan.')) return
    setSubmitLoading(true)
    try {
      const res = await fetch(`/api/assignments/${assign.id}/submit`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal membatalkan')
      
      setSubmitSuccess('Pengiriman dibatalkan. Silakan periksa kembali dan serahkan ulang.')
      setSubData(null) // This will trigger UI to show the staging area again
      // We intentionally do NOT clear stagedAttachments!
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#121B2E] transition-all relative overflow-hidden">
      {/* Stream-like Post Header - Now acts as accordion trigger */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-[#152033] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0">
            <img 
              src={lecturerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(lecturerName || 'Dosen')}&background=random`} 
              alt={lecturerName || 'Dosen'} 
              className="h-full w-full shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
            />
          </div>
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
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-black uppercase text-slate-800 dark:text-white tracking-wider">Tugas Anda</h4>
              {isDone && assign.display_status !== 'graded' && (
                <button onClick={handleUnsubmit} disabled={submitLoading} className="text-[9px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded dark:bg-rose-900/20 dark:text-rose-400 transition-colors">
                  {submitLoading ? 'Membatalkan...' : 'Batal Serah'}
                </button>
              )}
            </div>
            
            {submitError && <div className="mb-3 text-[10px] text-red-600 bg-red-50 p-2 rounded font-bold border border-red-100 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">{submitError}</div>}
            {submitSuccess && <div className="mb-3 text-[10px] text-emerald-600 bg-emerald-50 p-2 rounded font-bold border border-emerald-100 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-400">{submitSuccess}</div>}

            {isDone ? (
              <div className="space-y-3">
                {subLoading ? (
                  <div className="py-2"><Loader2 className="h-4 w-4 animate-spin text-blue-600" /></div>
                ) : (
                  <div className="space-y-2">
                    {/* Render submitted attachments from parsed subData */}
                    {stagedAttachments.length > 0 ? stagedAttachments.map(att => (
                      <div key={att.id} className="p-3 border border-emerald-200 rounded-lg flex items-center justify-between bg-emerald-50/30 dark:bg-[#18233C]/50 dark:border-emerald-900/30">
                        <div className="min-w-0 flex items-center gap-2.5">
                          {att.type === 'file' ? <File className="h-4 w-4 text-emerald-500 shrink-0" /> :
                           att.type === 'link' ? <Link2 className="h-4 w-4 text-emerald-500 shrink-0" /> :
                           <FileText className="h-4 w-4 text-emerald-500 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                              {att.name || 'Lampiran'}
                            </p>
                            {att.type === 'text' && <p className="text-[10px] text-slate-500 truncate">{att.content}</p>}
                            {att.type === 'link' && <a href={att.url} target="_blank" className="text-[9px] text-blue-500 hover:underline truncate block">{att.url}</a>}
                          </div>
                        </div>
                        {att.url && (att.type === 'file' || att.type === 'link') && (
                          <a href={att.url} target="_blank" className="shrink-0 p-1.5 hover:bg-emerald-100 rounded text-emerald-600 dark:hover:bg-emerald-900/50">
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    )) : (
                       <div className="p-3 border border-slate-200 rounded-lg flex items-center gap-2 bg-slate-50 dark:bg-[#18233C] dark:border-slate-700">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Tugas Diserahkan</span>
                       </div>
                    )}
                    
                    {assign.display_status === 'graded' && (
                      <div className="mt-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl dark:bg-emerald-900/10 dark:border-emerald-800/30 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-500 mb-1">Nilai Akhir</p>
                          {subData?.feedback && <p className="text-[10px] font-medium text-slate-600 italic mt-1 dark:text-slate-400">"{subData.feedback}"</p>}
                        </div>
                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{assign.submission_final_score} <span className="text-xs text-emerald-600/50 dark:text-emerald-500/50">/ {assign.max_score}</span></p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Staging Area UI */}
                {stagedAttachments.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {stagedAttachments.map(att => (
                      <div key={att.id} className="p-2.5 border border-slate-200 rounded-lg flex items-center justify-between bg-white dark:bg-[#152033] dark:border-slate-700 shadow-sm">
                        <div className="min-w-0 flex items-center gap-2.5">
                          {att.type === 'file' ? <File className="h-4 w-4 text-blue-500 shrink-0" /> :
                           att.type === 'link' ? <Link2 className="h-4 w-4 text-indigo-500 shrink-0" /> :
                           <FileText className="h-4 w-4 text-emerald-500 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                              {att.name || 'Lampiran'}
                            </p>
                            {att.type === 'file' && <p className="text-[9px] text-slate-500">{formatFileSize(att.size)}</p>}
                            {att.type === 'link' && <p className="text-[9px] text-blue-500 truncate">{att.url}</p>}
                            {att.type === 'text' && <p className="text-[9px] text-slate-500 truncate max-w-[200px]">{att.content}</p>}
                          </div>
                        </div>
                        <button type="button" onClick={() => handleRemoveAttachment(att.id)} className="shrink-0 p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Controls */}
                {!activeUploadType ? (
                  <div className="flex flex-wrap gap-2">
                    {(assign.allow_file_upload !== false) && (
                      <div className="flex-1 relative">
                        <input 
                          type="file" 
                          onChange={handleFileUpload} 
                          disabled={isUploadingFile}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                        />
                        <button type="button" disabled={isUploadingFile} className="w-full py-2 border border-slate-200 rounded-lg text-[10px] font-black flex justify-center items-center gap-1.5 hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
                          {isUploadingFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} 
                          {isUploadingFile ? 'Mengunggah...' : 'Tambah File'}
                        </button>
                      </div>
                    )}
                    <button type="button" onClick={() => setActiveUploadType('link')} className="flex-1 py-2 border border-slate-200 rounded-lg text-[10px] font-black flex justify-center items-center gap-1.5 hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"><Link2 className="h-3.5 w-3.5" /> Tautan</button>
                    <button type="button" onClick={() => setActiveUploadType('text')} className="flex-1 py-2 border border-slate-200 rounded-lg text-[10px] font-black flex justify-center items-center gap-1.5 hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"><PenSquare className="h-3.5 w-3.5" /> Teks</button>
                  </div>
                ) : (
                  <div className="p-3 border border-blue-200 bg-blue-50/50 rounded-lg dark:bg-blue-900/10 dark:border-blue-800/50 relative">
                    <button type="button" onClick={() => { setActiveUploadType(null); setLinkUrl(''); setTextAnswer('') }} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm"><X className="h-3 w-3" /></button>
                    <p className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 mb-2 tracking-wider">
                      {activeUploadType === 'link' ? 'Tambahkan Tautan' : 'Ketik Jawaban'}
                    </p>
                    
                    {activeUploadType === 'link' && (
                      <div className="flex gap-2">
                        <input type="url" placeholder="https://" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="w-full text-[11px] font-medium p-2 border border-blue-200 rounded bg-white outline-none focus:ring-2 focus:ring-blue-100 dark:bg-[#121B2E] dark:border-slate-700 dark:text-white" />
                        <button type="button" onClick={handleAddLink} className="px-3 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700">Tambah</button>
                      </div>
                    )}
                    {activeUploadType === 'text' && (
                      <div className="space-y-2">
                        <textarea placeholder="Mulai mengetik..." rows={3} value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} className="w-full text-[11px] font-medium p-2 border border-blue-200 rounded bg-white outline-none resize-none focus:ring-2 focus:ring-blue-100 dark:bg-[#121B2E] dark:border-slate-700 dark:text-white" />
                        <button type="button" onClick={handleAddText} className="w-full py-2 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700">Simpan Teks</button>
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" disabled={submitLoading || stagedAttachments.length === 0} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-blue-600/20 active:scale-[0.98]">
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
