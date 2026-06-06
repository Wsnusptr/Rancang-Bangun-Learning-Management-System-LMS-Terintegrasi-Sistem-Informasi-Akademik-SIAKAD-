'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Info, Phone, FileText, GraduationCap, Loader2 } from 'lucide-react'

const STATIC_PMB = [
  {
    id: 1,
    category: 'Jalur Pendaftaran',
    title: 'Pendaftaran Mahasiswa Baru 2025/2026',
    description:
      'STMIK Jayakarta membuka pendaftaran mahasiswa baru melalui tiga jalur: Reguler, Beasiswa Prestasi, dan Pindahan.',
    date: '01 Juli - 31 Agustus 2026',
    highlight: true,
  },
]

interface PmbInfoPanelProps {
  className?: string
}

export default function PmbInfoPanel({ className = '' }: PmbInfoPanelProps) {
  const [items, setItems] = useState<any[]>(STATIC_PMB)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('announcements')
          .select('*')
          .order('is_highlight', { ascending: false })
          .order('created_at', { ascending: false })

        if (data?.length) {
          setItems(
            data.map((ann: any) => ({
              id: ann.id,
              category: ann.category,
              title: ann.title,
              description: ann.description,
              date: ann.date_info || '',
              highlight: ann.is_highlight || false,
              media_url: ann.media_url,
              link_url: ann.link_url,
            }))
          )
        }
      } catch {
        /* fallback static */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h1 className="hidden md:block text-sm font-semibold text-slate-800 dark:text-white">Pengumuman PMB</h1>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 md:mt-0.5">
          Berita dan pembaruan informasi terkini dari Akademik STMIK Jayakarta
        </p>
      </div>

      <div className="columns-1 sm:columns-2 gap-3 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`break-inside-avoid rounded-lg border bg-white p-4 shadow-sm dark:bg-[#121B2E] ${
              item.highlight ? 'border-blue-200 dark:border-blue-800/50' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <p className={`text-[9px] font-medium uppercase tracking-wide ${item.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
              {item.category}
            </p>
            <h3 className="mt-1 text-[11px] font-semibold text-slate-800 dark:text-white leading-snug">{item.title}</h3>
            <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
            {item.media_url && (
              <div className="mt-2 overflow-hidden rounded-md border border-slate-100 dark:border-slate-800">
                {item.media_url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                  <video src={item.media_url} controls className="w-full h-auto bg-slate-100 dark:bg-slate-800" />
                ) : (
                  <img src={item.media_url} alt={item.title} className="w-full h-auto bg-slate-100 dark:bg-slate-800" />
                )}
              </div>
            )}
            {item.link_url && (
              <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline">
                Buka tautan
              </a>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
              <span className="text-[9px] text-slate-400">{item.date}</span>
              {item.highlight && <GraduationCap className="h-3.5 w-3.5 text-blue-500" />}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Kontak PMB</p>
        <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> (021) 6300-xxxx</span>
          <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> PMB@jayakarta.ac.id</span>
        </div>
      </div>
    </div>
  )
}
