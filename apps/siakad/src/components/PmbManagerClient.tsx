'use client'

import { useState } from 'react'
import { 
    BookOpen, Calendar, HelpCircle, DollarSign, FileCheck, 
    MessageSquare, Building, Phone, BarChart, Download, Save, Loader2 
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

export default function PmbManagerClient() {
    const [activeTab, setActiveTab] = useState(TABS[0].id)
    const [loading, setLoading] = useState(false)

    // Dummy save for MVP representation
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => setLoading(false), 800)
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
            <div className="flex-1 p-6 lg:p-8 bg-white dark:bg-[#121B2E] overflow-y-auto custom-scrollbar relative">
                <div className="max-w-3xl">
                    <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                            {TABS.find(t => t.id === activeTab)?.label}
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Konfigurasi data untuk portal pendaftaran calon mahasiswa (Guest Mode).</p>
                    </div>

                    {/* Generic Editor Placeholder (Production would map to Supabase Tables) */}
                    <form onSubmit={handleSave} className="space-y-5">
                        <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-[#18233C]/50">
                            {activeTab === 'programs' && (
                                <div className="w-full text-left space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Kode Program</label>
                                        <input type="text" placeholder="e.g. S1-TI" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama Program Studi</label>
                                        <input type="text" placeholder="e.g. Teknik Informatika" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Prospek Karir</label>
                                        <textarea rows={3} placeholder="Software Engineer, Data Scientist..." className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'schedules' && (
                                <div className="w-full text-left space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama Kegiatan</label>
                                        <input type="text" placeholder="e.g. Pendaftaran Gelombang 1" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Tanggal Mulai</label>
                                            <input type="date" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Tanggal Selesai</label>
                                            <input type="date" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'faqs' && (
                                <div className="w-full text-left space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Pertanyaan</label>
                                        <input type="text" placeholder="e.g. Kapan pendaftaran ditutup?" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Jawaban</label>
                                        <textarea rows={4} placeholder="Pendaftaran ditutup pada..." className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'scholarships' && (
                                <div className="w-full text-left space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Tipe (Biaya / Beasiswa)</label>
                                        <select className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white">
                                            <option value="biaya">Biaya Perkuliahan</option>
                                            <option value="beasiswa">Program Beasiswa</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama / Keterangan Biaya</label>
                                        <input type="text" placeholder="e.g. Biaya SPP per Semester" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nominal (Rp)</label>
                                        <input type="number" placeholder="e.g. 5000000" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'requirements' && (
                                <div className="w-full text-left space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Jalur Pendaftaran</label>
                                        <input type="text" placeholder="e.g. Reguler / Prestasi" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Persyaratan (Pisahkan dengan koma atau baris baru)</label>
                                        <textarea rows={5} placeholder="Fotokopi Ijazah, Pas Foto 4x6..." className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'testimonials' && (
                                <div className="w-full text-left space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama Alumni</label>
                                        <input type="text" placeholder="e.g. Budi Santoso" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Profesi / Pekerjaan Saat Ini</label>
                                        <input type="text" placeholder="e.g. Senior Software Engineer at Google" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Kutipan Testimoni</label>
                                        <textarea rows={3} placeholder="Kuliah di sini sangat membantu karir saya..." className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'facilities' && (
                                <div className="w-full text-left space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama Fasilitas</label>
                                        <input type="text" placeholder="e.g. Laboratorium Komputer" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Deskripsi Singkat</label>
                                        <input type="text" placeholder="e.g. Dilengkapi PC spesifikasi tinggi dan koneksi super cepat" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'contacts' && (
                                <div className="w-full text-left space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Email Bantuan PMB</label>
                                            <input type="email" placeholder="pmb@kampus.ac.id" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nomor WhatsApp</label>
                                            <input type="text" placeholder="+62812..." className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Alamat Kampus</label>
                                        <textarea rows={2} placeholder="Jl. Raya Kampus No. 1..." className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'resources' && (
                                <div className="w-full text-left space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Nama File / Dokumen</label>
                                        <input type="text" placeholder="e.g. Brosur PMB 2026" className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Link URL Berkas</label>
                                        <input type="url" placeholder="https://..." className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Simpan Perubahan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

function DatabaseIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5V19A9 3 0 0 0 21 19V5" />
            <path d="M3 12A9 3 0 0 0 21 12" />
        </svg>
    )
}
