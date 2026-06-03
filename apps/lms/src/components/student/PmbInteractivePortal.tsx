'use client'

import { useState, useEffect } from 'react'
import { 
    BookOpen, Calendar, HelpCircle, DollarSign, FileCheck, 
    MessageSquare, Building, Phone, Download, Loader2, GraduationCap 
} from 'lucide-react'

const MENU_ITEMS = [
    { id: 'programs', label: 'Program Studi', icon: BookOpen },
    { id: 'schedules', label: 'Jadwal Penting', icon: Calendar },
    { id: 'scholarships', label: 'Biaya & Beasiswa', icon: DollarSign },
    { id: 'requirements', label: 'Syarat Daftar', icon: FileCheck },
    { id: 'testimonials', label: 'Kisah Alumni', icon: MessageSquare },
    { id: 'facilities', label: 'Fasilitas', icon: Building },
    { id: 'contacts', label: 'Kontak', icon: Phone },
    { id: 'resources', label: 'Brosur', icon: Download },
]

export default function PmbInteractivePortal() {
    const [activeMenu, setActiveMenu] = useState('programs')
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPortalData = async () => {
            try {
                const res = await fetch('/api/v1/pmb/portal')
                if (!res.ok) throw new Error('Failed to fetch data')
                const json = await res.json()
                setData(json.data)
            } catch (err) {
                console.error('Portal Data Error:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchPortalData()
    }, [])

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center bg-white dark:bg-[#121B2E] rounded-xl border border-slate-200 dark:border-slate-800">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-[#121B2E] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
            {/* Horizontal Tabs Navigation */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0D1424]">
                <div className="flex overflow-x-auto hide-scrollbar custom-scrollbar px-2 py-2 gap-1 items-center">
                    <div className="px-3 shrink-0 flex items-center gap-2 border-r border-slate-200 dark:border-slate-700 mr-2">
                        <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest hidden sm:block">Info Lengkap</span>
                    </div>
                    {MENU_ITEMS.map((item) => {
                        const Icon = item.icon
                        const isActive = activeMenu === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveMenu(item.id)}
                                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                                    isActive 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                <Icon className={`h-3 w-3 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                                {item.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Content Display Area */}
            <div className="p-4 md:p-6 lg:p-8 relative min-h-[400px]">
                {/* 1. PROGRAM STUDI */}
                {activeMenu === 'programs' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Program Studi Tersedia</h3>
                        <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 mb-5 md:mb-6">Pilih jenjang pendidikan yang sesuai dengan target karir Anda di masa depan.</p>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                            {data?.programs?.length > 0 ? data.programs.map((prog: any) => (
                                <div key={prog.id} className="bg-slate-50 dark:bg-[#0D1424] border border-slate-200 dark:border-slate-800/60 p-4 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-widest mb-2">{prog.degree_level} - {prog.program_code}</span>
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1.5">{prog.program_name}</h4>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{prog.program_description}</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-[10px]">
                                            <span className="text-slate-500 dark:text-slate-400">Prospek Karir: </span>
                                            <span className="text-amber-600 dark:text-amber-400 font-bold">{prog.career_prospects}</span>
                                        </div>
                                        {prog.accreditation_status && (
                                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Akreditasi {prog.accreditation_status}</span>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400">Data program studi belum tersedia.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. JADWAL PENTING */}
                {activeMenu === 'schedules' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Jadwal & Agenda PMB</h3>
                        <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 mb-5 md:mb-6">Catat tanggal-tanggal penting agar Anda tidak tertinggal gelombang pendaftaran.</p>
                        
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {data?.schedules?.length > 0 ? data.schedules.map((sch: any) => (
                                <div key={sch.id} className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#0D1424] border border-slate-200 dark:border-slate-800/60 hover:border-blue-500 transition-colors">
                                    <div className="flex flex-col items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded-lg px-3 py-2 min-w-[60px] shrink-0">
                                        <span className="text-sm font-black">{new Date(sch.event_date).getDate()}</span>
                                        <span className="text-[9px] uppercase font-bold">{new Date(sch.event_date).toLocaleString('id-ID', { month: 'short' })}</span>
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-800 dark:text-white mb-1 leading-tight">{sch.event_title}</h4>
                                        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 uppercase"><Calendar className="h-3 w-3" /> {sch.event_type.replace('_', ' ')}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl col-span-full">
                                    <Calendar className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-xs text-slate-500">Belum ada agenda terdekat.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}



                {/* PLACEHOLDER UNTUK MENU LAINNYA */}
                {['scholarships', 'requirements', 'testimonials', 'facilities', 'contacts', 'resources'].includes(activeMenu) && (
                    <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center justify-center h-full text-center p-12 opacity-70">
                        <Building className="h-10 w-10 text-slate-400 dark:text-slate-600 mb-4" />
                        <h3 className="text-[10px] md:text-xs font-black text-slate-800 dark:text-white mb-2 uppercase tracking-widest">
                            Segera Hadir: {MENU_ITEMS.find(m => m.id === activeMenu)?.label}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-sm">Data sedang dipersiapkan oleh pihak akademik. Anda akan dapat melihat informasi ini dalam waktu dekat.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
