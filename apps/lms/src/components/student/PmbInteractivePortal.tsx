'use client'

import { useState, useEffect } from 'react'
import { 
    BookOpen, Calendar, HelpCircle, DollarSign, FileCheck, 
    MessageSquare, Building, Phone, Download, Loader2, GraduationCap,
    Mail, Globe, Youtube, Linkedin, Twitter, Instagram, Send, FileArchive, FileText, Image as ImageIcon, ExternalLink
} from 'lucide-react'

// --- Platform icon/color mapper ---
function getPlatformMeta(platform: string): { icon: React.ReactNode; color: string; bg: string } {
    const p = platform.toLowerCase()
    if (p.includes('instagram')) return { icon: <Instagram className="h-3.5 w-3.5" />, color: 'text-pink-600', bg: 'bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/40 dark:to-purple-900/40' }
    if (p.includes('whatsapp') || p.includes('wa')) return { icon: <Send className="h-3.5 w-3.5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' }
    if (p.includes('email') || p.includes('gmail') || p.includes('mail')) return { icon: <Mail className="h-3.5 w-3.5" />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' }
    if (p.includes('youtube')) return { icon: <Youtube className="h-3.5 w-3.5" />, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30' }
    if (p.includes('linkedin')) return { icon: <Linkedin className="h-3.5 w-3.5" />, color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/30' }
    if (p.includes('twitter') || p.includes('x.com') || p.includes('/ x')) return { icon: <Twitter className="h-3.5 w-3.5" />, color: 'text-slate-800 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800' }
    if (p.includes('tiktok')) return { icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'text-slate-800 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800' }
    if (p.includes('website') || p.includes('web') || p.includes('http')) return { icon: <Globe className="h-3.5 w-3.5" />, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' }
    if (p.includes('telepon') || p.includes('phone') || p.includes('telp') || p.includes('hotline')) return { icon: <Phone className="h-3.5 w-3.5" />, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/30' }
    return { icon: <Globe className="h-3.5 w-3.5" />, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' }
}

// --- File type detector ---
function getFileType(url: string): 'image' | 'pdf' | 'other' {
    if (!url) return 'other'
    const u = url.toLowerCase().split('?')[0]
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(u)) return 'image'
    if (/\.pdf$/.test(u)) return 'pdf'
    return 'other'
}

function getFileExt(url: string): string {
    if (!url) return 'FILE'
    const u = url.toLowerCase().split('?')[0]
    const match = u.match(/\.([a-z0-9]+)$/)
    return match ? match[1].toUpperCase() : 'FILE'
}

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
                const res = await fetch(`/api/v1/pmb/portal?t=${Date.now()}`)
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



                {/* 3. BIAYA & BEASISWA */}
                {activeMenu === 'scholarships' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Biaya & Beasiswa</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4">Jalur beasiswa dan bantuan biaya pendidikan yang tersedia.</p>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            {data?.scholarships?.length > 0 ? data.scholarships.map((item: any, i: number) => (
                                <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#121B2E] hover:bg-slate-50 dark:hover:bg-[#0D1424] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 shrink-0">{i + 1}</span>
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.scholarship_name}</span>
                                    </div>
                                    {item.amount && (
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 px-2 py-0.5 rounded-full shrink-0 ml-3">{item.amount}</span>
                                    )}
                                </div>
                            )) : (
                                <div className="px-4 py-8 text-center bg-white dark:bg-[#121B2E]">
                                    <p className="text-xs text-slate-400">Data beasiswa belum tersedia.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. SYARAT DAFTAR */}
                {activeMenu === 'requirements' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Syarat & Ketentuan Pendaftaran</h3>
                        <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 mb-5 md:mb-6">Dokumen dan persyaratan yang harus Anda penuhi.</p>
                        <div className="space-y-3">
                            {data?.requirements?.length > 0 ? data.requirements.map((item: any) => (
                                <div key={item.id} className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1424] border border-slate-200 dark:border-slate-800/60 flex gap-3 items-start">
                                    <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-800 dark:text-white mb-1">{item.title}</h4>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400">Data syarat pendaftaran belum tersedia.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. KISAH ALUMNI */}
                {activeMenu === 'testimonials' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Kisah Sukses Alumni</h3>
                        <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 mb-5 md:mb-6">Apa kata mereka yang telah lulus dari kampus ini.</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {data?.testimonials?.length > 0 ? data.testimonials.map((item: any) => (
                                <div key={item.id} className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1424] border border-slate-200 dark:border-slate-800/60 flex flex-col justify-between">
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 italic mb-4">"{item.testimonial_text}"</p>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white">{item.alumni_name}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.alumni_position}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400 col-span-full">Belum ada testimoni.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* 6. FASILITAS */}
                {activeMenu === 'facilities' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Fasilitas Kampus</h3>
                        <p className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 mb-5 md:mb-6">Sarana dan prasarana penunjang perkuliahan Anda.</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {data?.facilities?.length > 0 ? data.facilities.map((item: any) => (
                                <div key={item.id} className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1424] border border-slate-200 dark:border-slate-800/60">
                                    <h4 className="text-[11px] font-bold text-slate-800 dark:text-white mb-1">{item.facility_name}</h4>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400">{item.facility_description}</p>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400 col-span-full">Data fasilitas belum tersedia.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* 7. KONTAK */}
                {activeMenu === 'contacts' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Pusat Layanan PMB</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4">Hubungi kami untuk informasi pendaftaran lebih lanjut.</p>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            {data?.contacts?.length > 0 ? data.contacts.map((item: any) => {
                                const meta = getPlatformMeta(item.platform)
                                return (
                                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#121B2E] hover:bg-slate-50 dark:hover:bg-[#0D1424] transition-colors">
                                        <div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${meta.bg} ${meta.color}`}>
                                            {meta.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.platform}</p>
                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{item.contact_detail}</p>
                                        </div>
                                        <ExternalLink className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                                    </div>
                                )
                            }) : (
                                <div className="px-4 py-8 text-center bg-white dark:bg-[#121B2E]">
                                    <p className="text-xs text-slate-400">Data kontak belum tersedia.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 8. BROSUR & MEDIA */}
                {activeMenu === 'resources' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Unduhan & Brosur</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4">Unduh brosur resmi dan panduan PMB.</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {data?.resources?.length > 0 ? data.resources.map((item: any) => {
                                const fileType = getFileType(item.file_url)
                                const ext = getFileExt(item.file_url)
                                return (
                                    <a key={item.id} href={item.file_url} target="_blank" rel="noopener noreferrer"
                                        className="group block rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#121B2E] overflow-hidden hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-sm hover:shadow-md">
                                        {/* Preview area */}
                                        {fileType === 'image' ? (
                                            <div className="w-full aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
                                                <img src={item.file_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            </div>
                                        ) : fileType === 'pdf' ? (
                                            <div className="w-full aspect-video overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
                                                <iframe src={`${item.file_url}#page=1&view=FitH&toolbar=0&navpanes=0`}
                                                    className="w-full h-full pointer-events-none" title={item.title} />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                                                <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">PDF</span>
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-video flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0D1424]">
                                                <FileArchive className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ext}</span>
                                            </div>
                                        )}
                                        {/* Footer */}
                                        <div className="flex items-center justify-between px-3 py-2.5">
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.title}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-semibold">{ext}</p>
                                            </div>
                                            <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                                                <Download className="h-3 w-3" /> Unduh
                                            </span>
                                        </div>
                                    </a>
                                )
                            }) : (
                                <p className="text-xs text-slate-400 col-span-full">Media unduhan belum tersedia.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
