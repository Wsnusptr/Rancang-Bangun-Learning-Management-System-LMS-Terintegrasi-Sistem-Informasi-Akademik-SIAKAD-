'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Megaphone } from 'lucide-react'
import AnnouncementFooter from '@/components/layout/AnnouncementFooter'

const PMB_CATEGORIES = ['Jalur Pendaftaran', 'Program Studi', 'Biaya & Beasiswa', 'Fasilitas', 'PMB / Calon Mahasiswa']

type AnnTab = 'pmb' | 'mahasiswa' | 'dosen'

interface LecturerAnnouncementsPanelProps {
  tab: AnnTab
}

export default function LecturerAnnouncementsPanel({ tab }: LecturerAnnouncementsPanelProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const titles: Record<AnnTab, { h: string; sub: string }> = {
    pmb: { h: 'Pengumuman PMB', sub: 'Informasi untuk calon mahasiswa' },
    mahasiswa: { h: 'Pengumuman Mahasiswa Aktif', sub: 'Informasi perkuliahan mahasiswa' },
    dosen: { h: 'Pengumuman Dosen', sub: 'Informasi untuk civitas dosen' },
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('announcements')
          .select('*')
          .order('is_highlight', { ascending: false })
          .order('created_at', { ascending: false })

        let filtered = data || []
        if (tab === 'pmb') {
          filtered = filtered.filter((a) => PMB_CATEGORIES.includes(a.category))
        } else if (tab === 'mahasiswa') {
          filtered = filtered.filter((a) => a.category === 'Mahasiswa Aktif')
        } else {
          filtered = filtered.filter((a) => a.category === 'Dosen Akademik')
        }
        setItems(filtered)
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tab])

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      </div>
    )
  }

  const t = titles[tab]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-sm font-semibold text-slate-800 dark:text-white">{t.h}</h1>
        <p className="text-[10px] text-slate-500 mt-0.5">{t.sub}</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#121B2E]">
          <Megaphone className="h-7 w-7 text-slate-300 mx-auto mb-2" />
          <p className="text-[11px] text-slate-500">Belum ada pengumuman.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((ann) => (
            <div key={ann.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[9px] font-medium text-slate-400 uppercase">{ann.category}</span>
                {ann.is_highlight && (
                  <span className="text-[8px] bg-blue-50 text-blue-600 dark:bg-blue-900/30 px-1 py-0.5 rounded">Utama</span>
                )}
              </div>
              <h3 className="text-[11px] font-semibold text-slate-800 dark:text-white">{ann.title}</h3>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-3">{ann.description}</p>
              {ann.date_info && <p className="text-[9px] text-slate-400 mt-2">{ann.date_info}</p>}
            </div>
          ))}
        </div>
      )}
      
      <AnnouncementFooter />
    </div>
  )
}
