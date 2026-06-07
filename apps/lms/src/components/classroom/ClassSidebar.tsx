'use client'

import { useState } from 'react'
import { Video, Clock, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import ClassCalendar from './ClassCalendar'

interface ClassSidebarProps {
  classId: string
  role: 'student' | 'lecturer'
  classCode: string
  enrolledCount: number
  zoomLink: string
  upcomingAssignments: any[]
  zoomProps?: {
    isEditingZoom: boolean
    setIsEditingZoom: (v: boolean) => void
    zoomInput: string
    setZoomInput: (v: string) => void
    handleSaveZoomLink: () => void
    handleDeleteZoomLink: () => void
    zoomError: string | null
  }
}

export default function ClassSidebar({
  classId,
  role,
  classCode,
  enrolledCount,
  zoomLink,
  upcomingAssignments,
  zoomProps,
}: ClassSidebarProps) {
  return (
    <div className="hidden lg:block space-y-5 lg:col-span-1">
      
      {/* 1. Status Kelas */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
        <h3 className="text-xs font-black text-slate-800 dark:text-white leading-none">Status Kelas</h3>
        <ul className="mt-3.5 space-y-2 text-[10px] font-semibold text-slate-500 dark:text-gray-400">
          <li className="flex justify-between">
            <span>Kode Gabung</span>
            <span className="text-slate-850 dark:text-white font-black">{classCode || '-'}</span>
          </li>
          <li className="flex justify-between">
            <span>Mahasiswa Aktif</span>
            <span className="text-slate-850 dark:text-white font-black">{enrolledCount} orang</span>
          </li>
        </ul>
      </div>

      {/* 2. Kalender (Dropdown enabled) */}
      <ClassCalendar classId={classId} role={role} isDropdown={true} />

      {/* 3. Zoom / Meet Online */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
        <div className="flex items-center gap-2 mb-3">
          <Video className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-700 dark:text-white">Zoom / Meet Online</span>
        </div>
        
        {zoomProps?.zoomError && (
          <p className="mt-2 text-[8px] font-bold text-red-650">{zoomProps.zoomError}</p>
        )}

        <div className="mt-3.5">
          {role === 'lecturer' && zoomProps?.isEditingZoom ? (
            <div className="space-y-2">
              <input
                type="text"
                required
                value={zoomProps.zoomInput}
                onChange={(e) => zoomProps.setZoomInput(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-[10px] outline-none focus:border-blue-600 focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => zoomProps.setIsEditingZoom(false)}
                  className="rounded px-2.5 py-1 text-[9px] font-bold text-slate-400 border border-slate-200 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={zoomProps.handleSaveZoomLink}
                  className="rounded bg-blue-600 px-3 py-1 text-[9px] font-bold text-white hover:bg-blue-700"
                >
                  Simpan
                </button>
              </div>
            </div>
          ) : zoomLink ? (
            <div className="space-y-2">
              <a
                href={zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 rounded-full border border-blue-600 hover:bg-blue-50/50 py-2 text-[11px] font-black text-blue-600 transition-all cursor-pointer"
              >
                Gabung Pertemuan
              </a>
              {role === 'lecturer' && zoomProps && (
                <button
                  onClick={zoomProps.handleDeleteZoomLink}
                  className="w-full text-center text-[9px] text-red-600 hover:text-red-700 font-bold tracking-wide transition-colors uppercase pt-1"
                >
                  Hapus Link
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-2.5 space-y-1.5">
              {role === 'lecturer' && zoomProps ? (
                <button
                  onClick={() => zoomProps.setIsEditingZoom(true)}
                  className="w-full flex items-center justify-center gap-1 border border-dashed border-slate-200 rounded-lg py-2.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Buat Link Pertemuan
                </button>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-slate-300 mx-auto mb-1 animate-pulse" />
                  <p className="text-[9px] text-slate-400 leading-normal">Belum ada link pertemuan.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Tugas Mendatang */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E]">
        <h3 className="text-xs font-black text-slate-800 dark:text-white leading-none">Tugas Mendatang</h3>
        <div className="mt-3.5 space-y-3">
          {upcomingAssignments.length === 0 ? (
            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-semibold leading-relaxed">
              Tidak ada tugas mendatang.
            </p>
          ) : (
            <div className="space-y-2.5">
              {upcomingAssignments.map((a) => (
                <div key={a.id} className="min-w-0 text-[10px] font-bold text-slate-650 dark:text-gray-350 bg-slate-50 dark:bg-[#152033] p-2 rounded">
                  <p className="text-slate-800 dark:text-white truncate font-extrabold">{a.title}</p>
                  <span className="text-[9px] text-rose-500 font-bold block mt-0.5">
                    Batas: {a.due_date ? formatDate(a.due_date) : 'Tidak ada waktu'}
                  </span>
                </div>
              ))}
            </div>
          )}
          {upcomingAssignments.length > 0 && role === 'student' && (
            <div className="border-t border-slate-100 pt-2.5 text-right dark:border-slate-800/80">
              <Link href="/todo" className="text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest">
                Lihat semua
              </Link>
            </div>
          )}
        </div>
      </div>
      
    </div>
  )
}
