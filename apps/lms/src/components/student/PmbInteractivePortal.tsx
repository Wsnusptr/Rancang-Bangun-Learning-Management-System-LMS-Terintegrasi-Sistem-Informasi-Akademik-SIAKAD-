'use client'

import { useState, useEffect } from 'react'
import { 
    BookOpen, Calendar, HelpCircle, DollarSign, FileCheck, 
    MessageSquare, Building, Phone, Download, Loader2, GraduationCap,
    Mail, Globe, PlayCircle, Link2, AtSign, Heart, Send, FileArchive, ExternalLink, Video
} from 'lucide-react'

// --- Custom Brand SVGs ---
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
)

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
)

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
)

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
)

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
)

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
)

// --- Platform icon/color mapper ---
function getPlatformMeta(platform: string): { icon: React.ReactNode; color: string; bg: string } {
    const p = platform.toLowerCase()
    if (p.includes('instagram')) return { icon: <InstagramIcon className="h-3.5 w-3.5" />, color: 'text-pink-600', bg: 'bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/40 dark:to-purple-900/40' }
    if (p.includes('whatsapp') || p.includes('wa')) return { icon: <WhatsAppIcon className="h-3.5 w-3.5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' }
    if (p.includes('facebook') || p.includes('fb')) return { icon: <FacebookIcon className="h-3.5 w-3.5" />, color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/30' }
    if (p.includes('email') || p.includes('gmail') || p.includes('mail')) return { icon: <Mail className="h-3.5 w-3.5" />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' }
    if (p.includes('youtube')) return { icon: <YoutubeIcon className="h-3.5 w-3.5" />, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30' }
    if (p.includes('linkedin')) return { icon: <LinkedinIcon className="h-3.5 w-3.5" />, color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/30' }
    if (p.includes('twitter') || p.includes('tiktok') || p.includes('x.com')) return { icon: <TwitterIcon className="h-3.5 w-3.5" />, color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-800' }
    if (p.includes('telepon') || p.includes('phone') || p.includes('telp') || p.includes('hotline')) return { icon: <Phone className="h-3.5 w-3.5" />, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/30' }
    return { icon: <Globe className="h-3.5 w-3.5" />, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' }
}

function getFileType(url: string): 'image' | 'pdf' | 'video' | 'other' {
    if (!url) return 'other'
    const u = url.toLowerCase().split('?')[0]
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(u)) return 'image'
    if (/\.pdf$/.test(u)) return 'pdf'
    if (/\.(mp4|webm|ogg|mov)$/.test(u)) return 'video'
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
                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-3 md:px-4 py-3 bg-white dark:bg-[#121B2E] hover:bg-slate-50 dark:hover:bg-[#0D1424] transition-colors gap-2 sm:gap-4">
                                    <div className="flex items-start sm:items-center gap-2.5 md:gap-3">
                                        <span className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] md:text-[10px] font-black text-slate-500 shrink-0 mt-0.5 sm:mt-0">{i + 1}</span>
                                        <span className="text-[11px] md:text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words">{item.scholarship_name}</span>
                                    </div>
                                    {item.amount && (
                                        <div className="pl-7 sm:pl-0 shrink-0">
                                            <span className="inline-block text-[9px] md:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 px-2 py-0.5 rounded-md md:rounded-full break-words max-w-full">{item.amount}</span>
                                        </div>
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
                        <div className="columns-1 sm:columns-2 gap-4 space-y-4">
                            {data?.resources?.length > 0 ? data.resources.map((item: any) => {
                                const fileType = getFileType(item.file_url)
                                const ext = getFileExt(item.file_url)
                                return (
                                    <a key={item.id} href={item.file_url} target="_blank" rel="noopener noreferrer"
                                        className="break-inside-avoid group block rounded-xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#121B2E] overflow-hidden hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-sm hover:shadow-md">
                                        {/* Preview area */}
                                        {fileType === 'image' ? (
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 flex justify-center items-center overflow-hidden">
                                                <img src={item.file_url} alt={item.title} className="w-full h-auto max-h-[500px] object-contain group-hover:scale-[1.02] transition-transform duration-300" />
                                            </div>
                                        ) : fileType === 'video' ? (
                                            <div className="w-full bg-black relative flex justify-center items-center overflow-hidden">
                                                <video 
                                                    src={item.file_url} 
                                                    className="w-full h-auto max-h-[500px] object-contain pointer-events-none" 
                                                    autoPlay 
                                                    muted 
                                                    loop 
                                                    playsInline
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-center justify-center">
                                                    <PlayCircle className="h-10 w-10 text-white/80 group-hover:text-white transition-colors group-hover:scale-110 duration-300" />
                                                </div>
                                                <span className="absolute top-2 right-2 bg-purple-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm">VIDEO</span>
                                            </div>
                                        ) : fileType === 'pdf' ? (
                                            <div className="w-full h-[400px] overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
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
