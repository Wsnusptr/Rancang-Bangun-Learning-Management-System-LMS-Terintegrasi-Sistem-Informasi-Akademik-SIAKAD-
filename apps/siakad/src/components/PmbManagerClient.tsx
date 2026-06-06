'use client'

import { useState, useEffect } from 'react'
import { 
    BookOpen, Calendar, HelpCircle, DollarSign, FileCheck, 
    MessageSquare, Building, Phone, Download, Save, Loader2, Trash2, Edit 
} from 'lucide-react'

const TABS = [
    { id: 'programs', label: 'Program Studi', icon: BookOpen },
    { id: 'schedules', label: 'Jadwal Penting', icon: Calendar },
    { id: 'faqs', label: 'FAQ', icon: HelpCircle },
    { id: 'scholarships', label: 'Biaya & Beasiswa', icon: DollarSign },
    { id: 'requirements', label: 'Syarat & Ketentuan', icon: FileCheck },
    { id: 'testimonials', label: 'Testimoni', icon: MessageSquare },
    { id: 'facilities', label: 'Fasilitas Kampus', icon: Building },
    { id: 'contacts', label: 'Kontak & Bantuan', icon: Phone },
    { id: 'resources', label: 'Media Unduhan', icon: Download },
]

export default function PmbManagerClient({ apiKey }: { apiKey?: string }) {
    const [activeTab, setActiveTab] = useState(TABS[0].id)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [dataList, setDataList] = useState<any[]>([])
    const [formData, setFormData] = useState<any>({})
    const [editingId, setEditingId] = useState<string | null>(null)
    const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null)

    const tableName = `pmb_${activeTab}`
    const authHeaders = { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}) }

    useEffect(() => {
        fetchData()
        setFormData({})
        setEditingId(null)
        setMessage(null)
    }, [activeTab])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/v1/pmb/manage?table=${tableName}`, {
                headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}) }
            })
            const result = await res.json()
            if (result.success) {
                setDataList(result.data || [])
            } else {
                setDataList([])
            }
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }))
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)

        try {
            const method = editingId ? 'PUT' : 'POST'
            const payload = {
                table: tableName,
                data: formData,
                id: editingId
            }

            const res = await fetch('/api/v1/pmb/manage', {
                method,
                headers: authHeaders,
                body: JSON.stringify(payload)
            })

            const result = await res.json()

            if (!res.ok || !result.success) {
                throw new Error(result.error || 'Failed to save data')
            }

            setMessage({ type: 'success', text: 'Data berhasil disimpan!' })
            setFormData({})
            setEditingId(null)
            fetchData()
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (item: any) => {
        setFormData(item)
        setEditingId(item.id)
        setMessage(null)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return

        try {
            const res = await fetch('/api/v1/pmb/manage', {
                method: 'DELETE',
                headers: authHeaders,
                body: JSON.stringify({ table: tableName, id })
            })
            const result = await res.json()
            if (!res.ok || !result.success) throw new Error(result.error)
            
            fetchData()
        } catch (error: any) {
            alert('Gagal menghapus: ' + error.message)
        }
    }

    const renderFormFields = () => {
        switch (activeTab) {
            case 'programs':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Kode Program</label>
                            <input value={formData.program_code || ''} onChange={e => handleInputChange('program_code', e.target.value)} type="text" placeholder="e.g. S1-TI" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama Program Studi</label>
                            <input value={formData.program_name || ''} onChange={e => handleInputChange('program_name', e.target.value)} type="text" placeholder="e.g. Teknik Informatika" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Jenjang</label>
                            <input value={formData.degree_level || ''} onChange={e => handleInputChange('degree_level', e.target.value)} type="text" placeholder="e.g. S1" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Akreditasi</label>
                            <input value={formData.accreditation_status || ''} onChange={e => handleInputChange('accreditation_status', e.target.value)} type="text" placeholder="e.g. Unggul, A, B" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Prospek Karir</label>
                            <textarea value={formData.career_prospects || ''} onChange={e => handleInputChange('career_prospects', e.target.value)} rows={3} placeholder="Software Engineer, Data Scientist..." className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Deskripsi</label>
                            <textarea value={formData.program_description || ''} onChange={e => handleInputChange('program_description', e.target.value)} rows={3} placeholder="Deskripsi program studi..." className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none text-slate-900 dark:text-white" />
                        </div>
                    </div>
                )
            case 'schedules':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama Kegiatan</label>
                            <input value={formData.event_title || ''} onChange={e => handleInputChange('event_title', e.target.value)} type="text" placeholder="e.g. Pendaftaran Gelombang 1" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Tipe Kegiatan</label>
                            <input value={formData.event_type || ''} onChange={e => handleInputChange('event_type', e.target.value)} type="text" placeholder="e.g. pendaftaran, ujian, pengumuman" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Tanggal Pelaksanaan</label>
                            <input value={formData.event_date || ''} onChange={e => handleInputChange('event_date', e.target.value)} type="date" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                    </div>
                )
            case 'faqs':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Pertanyaan</label>
                            <input value={formData.question || ''} onChange={e => handleInputChange('question', e.target.value)} type="text" placeholder="e.g. Kapan pendaftaran ditutup?" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Jawaban</label>
                            <textarea value={formData.answer || ''} onChange={e => handleInputChange('answer', e.target.value)} rows={3} placeholder="Pendaftaran akan ditutup pada..." className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Kategori</label>
                            <input value={formData.category || ''} onChange={e => handleInputChange('category', e.target.value)} type="text" placeholder="e.g. pendaftaran, biaya" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                    </div>
                )
            case 'scholarships':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama Beasiswa</label>
                            <input value={formData.scholarship_name || ''} onChange={e => handleInputChange('scholarship_name', e.target.value)} type="text" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Potongan/Nominal</label>
                            <input value={formData.amount || ''} onChange={e => handleInputChange('amount', e.target.value)} type="text" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                        </div>
                    </div>
                )
            case 'requirements':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Judul Syarat</label>
                            <input value={formData.title || ''} onChange={e => handleInputChange('title', e.target.value)} type="text" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Keterangan</label>
                            <textarea value={formData.description || ''} onChange={e => handleInputChange('description', e.target.value)} rows={3} className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none text-slate-900 dark:text-white" />
                        </div>
                    </div>
                )
            case 'testimonials':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama Alumni</label>
                            <input value={formData.alumni_name || ''} onChange={e => handleInputChange('alumni_name', e.target.value)} type="text" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Profesi</label>
                            <input value={formData.alumni_position || ''} onChange={e => handleInputChange('alumni_position', e.target.value)} type="text" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Testimoni</label>
                            <textarea value={formData.testimonial_text || ''} onChange={e => handleInputChange('testimonial_text', e.target.value)} rows={3} className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none text-slate-900 dark:text-white" required />
                        </div>
                    </div>
                )
            case 'facilities':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama Fasilitas</label>
                            <input value={formData.facility_name || ''} onChange={e => handleInputChange('facility_name', e.target.value)} type="text" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Deskripsi</label>
                            <input value={formData.facility_description || ''} onChange={e => handleInputChange('facility_description', e.target.value)} type="text" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                    </div>
                )
            case 'contacts':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Platform (e.g. Email/WhatsApp)</label>
                            <input value={formData.platform || ''} onChange={e => handleInputChange('platform', e.target.value)} type="text" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Detail Kontak</label>
                            <input value={formData.contact_detail || ''} onChange={e => handleInputChange('contact_detail', e.target.value)} type="text" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                    </div>
                )
            case 'resources':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama File / Dokumen</label>
                            <input value={formData.title || ''} onChange={e => handleInputChange('title', e.target.value)} type="text" placeholder="e.g. Brosur PMB" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Link URL Berkas</label>
                            <div className="flex gap-2">
                                <input value={formData.file_url || ''} onChange={e => handleInputChange('file_url', e.target.value)} type="text" placeholder="https://... atau klik Upload" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" required />
                                <label className="flex-shrink-0 cursor-pointer bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-2 rounded-md text-xs font-bold transition-colors">
                                    Upload
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return
                                            
                                            // Handle upload
                                            const fd = new FormData()
                                            fd.append('file', file)
                                            try {
                                                const res = await fetch('/api/v1/upload', {
                                                    method: 'POST',
                                                    headers: { ...(apiKey ? { 'x-api-key': apiKey } : {}) },
                                                    body: fd
                                                })
                                                const result = await res.json()
                                                if (result.success) {
                                                    handleInputChange('file_url', result.url)
                                                } else {
                                                    alert('Gagal upload: ' + result.error)
                                                }
                                            } catch (err: any) {
                                                alert('Gagal upload: ' + err.message)
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                )
            default:
                return <p className="text-xs text-slate-500">Konfigurasi untuk bagian ini belum tersedia.</p>
        }
    }

    return (
        <div className="bg-white dark:bg-[#121B2E] rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row overflow-hidden min-h-[600px] shadow-sm">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-64 bg-slate-50 dark:bg-[#0D1424] border-r border-slate-200 dark:border-slate-800 p-4 shrink-0 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-3 px-3 tracking-widest">Modul PMB</p>
                {TABS.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all ${
                                isActive 
                                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20' 
                                : 'text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-xs">{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Content Pane */}
            <div className="flex-1 p-6 lg:p-8 bg-white dark:bg-[#121B2E] overflow-y-auto custom-scrollbar relative flex flex-col">
                <div className="max-w-3xl mb-8">
                    <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                            {TABS.find(t => t.id === activeTab)?.label}
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Konfigurasi data untuk portal pendaftaran calon mahasiswa.</p>
                    </div>

                    {message && (
                        <div className={`mb-6 p-3 rounded-lg text-xs font-medium border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-5">
                        <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-[#18233C]/50">
                            {renderFormFields()}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            {editingId && (
                                <button type="button" onClick={() => {setEditingId(null); setFormData({})}} className="mr-3 px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    Batal
                                </button>
                            )}
                            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {editingId ? 'Update Data' : 'Simpan Data'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Data List */}
                <div className="max-w-3xl mt-8">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Daftar Data Tersimpan</h3>
                    
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs">Memuat data...</span>
                        </div>
                    ) : dataList.length > 0 ? (
                        <div className="space-y-3">
                            {dataList.map((item: any, idx: number) => (
                                <div key={item.id || idx} className="flex items-center justify-between p-4 bg-white dark:bg-[#121B2E] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                            {item.program_name || item.event_title || item.question || item.scholarship_name || item.title || item.alumni_name || item.facility_name || item.platform || item.file_name || 'Item Data'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-1">
                                            {item.program_code || item.event_date || item.answer || item.provider || item.description || item.testimonial_text || item.facility_description || item.contact_detail || item.file_url || '...'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            <p className="text-xs text-slate-500">Belum ada data di kategori ini.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
