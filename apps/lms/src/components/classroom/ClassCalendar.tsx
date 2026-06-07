'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ClassEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  event_time: string | null
  event_type: 'reminder' | 'replacement' | 'exam' | 'holiday' | 'other'
}

interface ClassCalendarProps {
  classId: string
  role: 'student' | 'lecturer'
  isDropdown?: boolean
}

export default function ClassCalendar({ classId, role, isDropdown = false }: ClassCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<ClassEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  
  // Accordion state
  const [isExpanded, setIsExpanded] = useState(!isDropdown)

  // Modal states for lecturer
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [eventDateStr, setEventDateStr] = useState('')
  const [eventTimeStr, setEventTimeStr] = useState('')
  const [eventType, setEventType] = useState<ClassEvent['event_type']>('reminder')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchEvents = async (year: number, month: number) => {
    try {
      const res = await fetch(`/api/classes/${classId}/events?year=${year}&month=${month + 1}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setEvents(json.data)
        }
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isDropdown && !isExpanded) return // Don't fetch if dropdown is collapsed
    setLoading(true)
    fetchEvents(currentDate.getFullYear(), currentDate.getMonth())
  }, [currentDate.getMonth(), currentDate.getFullYear(), classId, isExpanded, isDropdown])

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return events.filter(e => e.event_date === dateStr)
  }

  const getEventColorClass = (type: string) => {
    switch (type) {
      case 'reminder': return 'bg-blue-500'
      case 'replacement': return 'bg-orange-500'
      case 'exam': return 'bg-red-500'
      case 'holiday': return 'bg-green-500'
      default: return 'bg-slate-500'
    }
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/classes/${classId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle,
          description: eventDesc,
          event_date: eventDateStr,
          event_time: eventTimeStr || null,
          event_type: eventType
        })
      })
      const json = await res.json()
      if (json.success) {
        setEvents(prev => [...prev, json.data])
        setIsModalOpen(false)
        setEventTitle('')
        setEventDesc('')
      } else {
        alert(json.error || 'Failed to create event')
      }
    } catch (err) {
      alert('Error creating event')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <div className={`rounded-xl border border-slate-200 bg-white ${isDropdown ? 'p-0' : 'p-4'} dark:border-slate-800 dark:bg-[#121B2E]`}>
      {isDropdown ? (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-xl"
        >
          <h3 className="text-xs font-black text-slate-800 dark:text-white leading-none flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-blue-600" /> Kalender
          </h3>
          <div className="flex items-center gap-2">
            {role === 'lecturer' && isExpanded && (
              <div 
                onClick={(e) => {
                  e.stopPropagation()
                  if (selectedDate) {
                    setEventDateStr(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`)
                  }
                  setIsModalOpen(true)
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </div>
            )}
            {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </button>
      ) : (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black text-slate-800 dark:text-white leading-none flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-blue-600" /> Kalender
          </h3>
          {role === 'lecturer' && (
            <button 
              onClick={() => {
                if (selectedDate) {
                  setEventDateStr(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`)
                }
                setIsModalOpen(true)
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {isExpanded && (
        <div className={`${isDropdown ? 'px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </button>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
              {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                  <div key={day} className="text-[9px] font-black text-slate-400 uppercase">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-7"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                  const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentDate.getMonth()
                  const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()
                  const dayEvents = getEventsForDate(date)

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`relative flex h-7 w-full items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                        isSelected ? 'bg-blue-600 text-white shadow-sm' 
                        : isToday ? 'border border-blue-600 text-blue-600 dark:text-blue-400' 
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {day}
                      {dayEvents.length > 0 && !isSelected && (
                        <div className="absolute bottom-0.5 flex gap-0.5">
                          {dayEvents.slice(0, 3).map((e, idx) => (
                            <div key={idx} className={`h-1 w-1 rounded-full ${getEventColorClass(e.event_type)}`}></div>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {selectedDate && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-[10px] font-bold text-slate-500 mb-2">
                Jadwal: {selectedDate.getDate()} {selectedDate.toLocaleDateString('id-ID', { month: 'short' })}
              </h4>
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-2">
                  {selectedDateEvents.map(e => (
                    <div key={e.id} className="flex items-start gap-2 bg-slate-50 dark:bg-[#152033] p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className={`h-2 w-2 mt-1 rounded-full shrink-0 ${getEventColorClass(e.event_type)}`}></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold text-slate-800 dark:text-white leading-tight">{e.title}</p>
                        {e.event_time && <span className="text-[9px] font-semibold text-slate-500">{e.event_time.substring(0,5)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">Tidak ada pengingat.</p>
              )}
            </div>
          )}
        </div>
      )}

      {isModalOpen && role === 'lecturer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#121B2E]">
            <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4">Buat Pengingat Kalender</h3>
            <form onSubmit={handleAddEvent} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Judul / Nama Acara</label>
                <input required type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-700 outline-none" placeholder="Contoh: Kelas Pengganti" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Tanggal</label>
                  <input required type="date" value={eventDateStr} onChange={e => setEventDateStr(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-700 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Waktu (Opsional)</label>
                  <input type="time" value={eventTimeStr} onChange={e => setEventTimeStr(e.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-700 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Tipe Pengingat</label>
                <select value={eventType} onChange={e => setEventType(e.target.value as any)} className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-slate-50 dark:bg-slate-800 dark:border-slate-700 outline-none">
                  <option value="reminder">Pengingat Biasa</option>
                  <option value="replacement">Kelas Pengganti</option>
                  <option value="exam">Ujian / Quiz</option>
                  <option value="holiday">Libur</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="w-1/2 rounded-xl bg-blue-600 py-2.5 text-[10px] font-bold text-white hover:bg-blue-700 transition-colors">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
