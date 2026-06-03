'use client'

import { usePathname } from 'next/navigation'

export default function MobileHeaderControls({ role, isGuest }: { role?: string, isGuest?: boolean }) {
    const pathname = usePathname()

    let title = ''
    if (pathname.includes('/informasi-pmb')) {
        title = 'Informasi PMB'
    } else if (pathname === '/dashboard' && isGuest) {
        title = 'Informasi PMB'
    } else if (pathname === '/dashboard' && !isGuest) {
        title = 'Kelas'
    } else if (pathname === '/lecturer/dashboard') {
        title = 'Kelas Saya'
    } else if (pathname.includes('/pengumuman-pmb') || pathname.includes('/pengumuman-mahasiswa') || pathname.includes('/pengumuman-dosen')) {
        title = 'Pengumuman'
    } else if (pathname.includes('/pmb-chat')) {
        title = 'Tanya AI PMB'

    } else if (pathname.includes('/akademik')) {
        title = 'Akademik'
    } else if (pathname.includes('/class') || pathname.includes('/lecturer/class')) {
        title = 'Kelas'
    } else if (pathname.includes('/todo')) {
        title = 'Tugas'
    } else if (pathname.includes('/profile')) {
        title = 'Profil'
    } else if (pathname.includes('/lecturer/backup-dosen')) {
        title = 'Backup Dosen'
    }

    if (!title) return null

    return (
        <div className="md:hidden flex items-center border-l-2 border-primary/50 pl-2 ml-1">
            <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">{title}</span>
        </div>
    )
}
