'use client'

import { useState } from 'react'
import { Video, Clock, ChevronDown, ChevronUp, ExternalLink, Calendar as CalendarIcon, X } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import ClassCalendar from './ClassCalendar'

interface ClassMobileWidgetsProps {
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

export default function ClassMobileWidgets({
  classId,
  role,
  classCode,
  enrolledCount,
  zoomLink,
  upcomingAssignments,
  zoomProps,
}: ClassMobileWidgetsProps) {
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false)

  return (
    <>
      <div className="lg:hidden space-y-4 mb-4">
        {/* Mobile Status Kelas */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#121B2E] shadow-sm">
          <h3 className="text-[11px] font-black text-slate-800 dark:text-white leading-none uppercase tracking-wider mb-3">Status Kelas</h3>
          <ul className="space-y-2 text-[10px] font-semibold text-slate-500 dark:text-gray-400">
            <li className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
              <span>Kode Gabung</span>
              <span className="text-slate-850 dark:text-white font-black">{classCode || '-'}</span>
            </li>
            <li className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
              <span>Mahasiswa Aktif</span>
              <span className="text-slate-850 dark:text-white font-black">{enrolledCount} orang</span>
            </li>
          </ul>
        </div>

        {/* Mobile Upcoming Assignments */}
        {upcomingAssignments.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20 overflow-hidden shadow-sm">
            <button
              onClick={() => setShowUpcoming(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
            >
              <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {upcomingAssignments.length} Tugas Mendatang
              </span>
              {showUpcoming ? <ChevronUp className="h-4 w-4 text-amber-600" /> : <ChevronDown className="h-4 w-4 text-amber-600" />}
            </button>
            {showUpcoming && (
              <div className="px-4 pb-3 space-y-2 border-t border-amber-200 dark:border-amber-900/30 pt-3 bg-white/50 dark:bg-[#121B2E]/50">
                {upcomingAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 bg-white dark:bg-[#121B2E] px-3 rounded shadow-sm">
                    <p className="text-[10px] font-bold text-slate-800 dark:text-white truncate flex-1">{a.title}</p>
                    <span className="text-[9px] text-rose-500 font-bold shrink-0">
                      {a.due_date ? formatDate(a.due_date) : 'No deadline'}
                    </span>
                  </div>
                ))}
                {role === 'student' && (
                  <Link href="/todo" className="text-[9px] font-black text-blue-600 uppercase tracking-widest block text-right pt-2 hover:text-blue-700">
                    Lihat semua →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Buttons Container */}
      <div className="lg:hidden fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3 pointer-events-none">
        
        {/* Calendar FAB */}
        <button
          onClick={() => setIsCalendarModalOpen(true)}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 hover:bg-indigo-700"
        >
          <CalendarIcon className="h-5 w-5" />
        </button>

        {/* Zoom FAB */}
        {(zoomLink || role === 'lecturer') && (
          <button
            onClick={() => {
              if (zoomLink && role === 'student') {
                window.open(zoomLink, '_blank')
              } else {
                setIsZoomModalOpen(true)
              }
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-3 text-[11px] font-black text-white shadow-lg shadow-blue-600/30 transition-transform active:scale-95"
          >
            <Video className="h-4 w-4" />
            {zoomLink ? 'Zoom / Meet' : 'Buat Zoom'}
            {zoomLink && role === 'student' && <ExternalLink className="h-3 w-3 ml-1" />}
          </button>
        )}
      </div>

      {/* Mobile Zoom Modal */}
      {isZoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm lg:hidden select-none animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#121B2E] animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setIsZoomModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-[13px] font-black text-slate-800 dark:text-white leading-none">Zoom / Meet Online</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Akses pertemuan virtual kelas ini</p>
              </div>
            </div>
            
            <div className="mt-4">
              {zoomProps?.zoomError && (
                <p className="mb-2 text-[10px] font-bold text-red-650">{zoomProps.zoomError}</p>
              )}

              {role === 'lecturer' && zoomProps?.isEditingZoom ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={zoomProps.zoomInput}
                    onChange={(e) => zoomProps.setZoomInput(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs outline-none focus:border-blue-600 focus:bg-white dark:border-slate-800 dark:bg-[#18233C] dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => zoomProps.setIsEditingZoom(false)}
                      className="flex-1 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={zoomProps.handleSaveZoomLink}
                      className="flex-1 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ) : zoomLink ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                    <span className="text-[10px] font-black uppercase text-green-600 dark:text-green-400">Status: Kelas Tersedia</span>
                  </div>
                  <a
                    href={zoomLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-[11px] font-black text-white hover:bg-blue-700 transition-colors"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Buka Link Zoom
                  </a>
                  {role === 'lecturer' && zoomProps && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => zoomProps.setIsEditingZoom(true)}
                        className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={zoomProps.handleDeleteZoomLink}
                        className="flex-1 rounded-xl border border-red-100 bg-red-50 text-red-600 py-2.5 text-[10px] font-bold hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <Clock className="mx-auto h-6 w-6 text-slate-400 animate-pulse mb-2" />
                  <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Belum Ada Link</h4>
                  <p className="mt-1 text-[9px] text-slate-500">
                    {role === 'lecturer' ? 'Anda belum menambahkan link zoom.' : 'Dosen belum menyertakan link pertemuan virtual.'}
                  </p>
                  {role === 'lecturer' && zoomProps && (
                    <button
                      onClick={() => zoomProps.setIsEditingZoom(true)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 py-2 text-[10px] font-bold text-blue-600 hover:bg-blue-100"
                    >
                      <Video className="h-3 w-3" />
                      Buat Link Sekarang
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Calendar Modal */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 p-4 backdrop-blur-sm lg:hidden animate-in fade-in duration-200">
          <div className="relative w-full rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <button
              onClick={() => setIsCalendarModalOpen(false)}
              className="absolute -top-12 right-0 bg-white/20 hover:bg-white/30 backdrop-blur-md p-2.5 rounded-full text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {/* The calendar inside modal shouldn't be a dropdown */}
            <ClassCalendar classId={classId} role={role} isDropdown={false} />
          </div>
        </div>
      )}
    </>
  )
}
