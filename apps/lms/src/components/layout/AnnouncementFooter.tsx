'use client'

import React, { useEffect, useState } from 'react'
import { MapPin, Phone, Mail, Globe } from 'lucide-react'

// Custom Brand SVGs
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
)

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
)

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
)

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
)

export default function AnnouncementFooter() {
    const [contactInfo, setContactInfo] = useState({
        address: 'Jl. Salemba Raya No.53, Paseban, Senen, Jakarta Pusat 10440.',
        phone: '(021) 314-xxxx',
        email: 'info@jayakarta.ac.id'
    })

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const res = await fetch('/api/v1/pmb/portal')
                const json = await res.json()
                if (json.success && json.data?.contacts && json.data.contacts.length > 0) {
                    const contacts = json.data.contacts[0]
                    setContactInfo({
                        address: contacts.address || 'Jl. Salemba Raya No.53, Paseban, Senen, Jakarta Pusat 10440.',
                        phone: contacts.phone || '(021) 314-xxxx',
                        email: contacts.email || 'info@jayakarta.ac.id'
                    })
                }
            } catch (err) {
                console.error('Failed to fetch PMB contacts:', err)
            }
        }
        fetchContacts()
    }, [])

    return (
        <footer className="mt-8 md:mt-12 bg-gradient-to-b from-[#0B1528] to-[#060D1A] text-slate-300 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80 relative">
            {/* Mind-blowing subtle glowing effects */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
            <div className="absolute top-0 right-0 -mr-10 -mt-10 md:-mr-20 md:-mt-20 w-40 h-40 md:w-64 md:h-64 rounded-full bg-blue-600/10 md:bg-blue-600/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 p-5 md:p-12 relative z-10">
                
                {/* Left Column: Brand & About */}
                <div className="col-span-1 md:col-span-5 space-y-3 md:space-y-4">
                    <div className="flex items-center gap-2.5 md:gap-3 mb-3 md:mb-6">
                        <img src="/logo-stmik-jayakarta.webp" alt="STMIK Jayakarta" className="h-8 w-8 md:h-10 md:w-10 object-contain drop-shadow-md" />
                        <div>
                            <h3 className="text-[11px] md:text-sm font-black text-white uppercase tracking-widest leading-none">STMIK Jayakarta</h3>
                            <p className="text-[8px] md:text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-1">Excellent in IT</p>
                        </div>
                    </div>
                    <p className="text-[10px] md:text-[11px] leading-relaxed text-slate-400 max-w-sm">
                        Lembaga pendidikan tinggi terkemuka yang berfokus pada inovasi teknologi, rekayasa perangkat lunak, dan riset akademik untuk menghasilkan lulusan yang siap bersaing di era digital.
                    </p>
                    <div className="flex gap-2.5 pt-2 md:pt-4">
                        <a href="#" className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all hover:scale-105 border border-white/10">
                            <Globe className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </a>
                        <a href="#" className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all hover:scale-105 border border-white/10">
                            <FacebookIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </a>
                        <a href="#" className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all hover:scale-105 border border-white/10">
                            <InstagramIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </a>
                        <a href="#" className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all hover:scale-105 border border-white/10">
                            <TwitterIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </a>
                        <a href="#" className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all hover:scale-105 border border-white/10">
                            <YoutubeIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                        </a>
                    </div>
                </div>

                {/* Middle Column: Quick Links (2 cols on mobile) */}
                <div className="col-span-1 md:col-span-3 mt-2 md:mt-0">
                    <h4 className="text-[9px] md:text-[11px] font-bold text-white uppercase tracking-widest mb-4 md:mb-6 border-b border-white/10 pb-2 md:pb-3 inline-block">Tautan Cepat</h4>
                    <ul className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3">
                        <li><a href="#" className="text-[10px] md:text-[11px] text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1.5"><span className="h-1 w-1 bg-blue-500 rounded-full shrink-0"></span> Informasi Akademik</a></li>
                        <li><a href="#" className="text-[10px] md:text-[11px] text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1.5"><span className="h-1 w-1 bg-blue-500 rounded-full shrink-0"></span> E-Library</a></li>
                        <li><a href="#" className="text-[10px] md:text-[11px] text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1.5"><span className="h-1 w-1 bg-blue-500 rounded-full shrink-0"></span> SIAKAD</a></li>
                        <li><a href="#" className="text-[10px] md:text-[11px] text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1.5"><span className="h-1 w-1 bg-blue-500 rounded-full shrink-0"></span> Bantuan</a></li>
                    </ul>
                </div>

                {/* Right Column: Contact Info */}
                <div className="col-span-1 md:col-span-4 mt-2 md:mt-0">
                    <h4 className="text-[9px] md:text-[11px] font-bold text-white uppercase tracking-widest mb-4 md:mb-6 border-b border-white/10 pb-2 md:pb-3 inline-block">Pusat Informasi</h4>
                    <div className="space-y-3 md:space-y-4">
                        <div className="flex items-start gap-2.5">
                            <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] md:text-[11px] text-slate-400 leading-relaxed">{contactInfo.address}</p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <p className="text-[10px] md:text-[11px] text-slate-400">{contactInfo.phone}</p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <p className="text-[10px] md:text-[11px] text-slate-400">{contactInfo.email}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-[#040A14]/80 backdrop-blur-md py-3 md:py-4 px-5 md:px-8 flex flex-col md:flex-row items-center justify-between text-[9px] md:text-[10px] text-slate-500/80 font-medium border-t border-slate-800/50">
                <p>&copy; {new Date().getFullYear()} STMIK Jayakarta. All rights reserved.</p>
                <div className="flex gap-4 mt-2 md:mt-0">
                    <a href="#" className="hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms</a>
                </div>
            </div>
        </footer>
    )
}
