'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Loader2, ClipboardList, Calendar, 
  ChevronRight, BookOpen, AlertCircle, Clock
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface TodoItem {
  id: string
  class_id: string
  class_name: string
  title: string
  due_date: string | null
  display_status: string
}

export default function StudentTodoList() {
  const [todos, setTodos] = useState<Record<string, TodoItem[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTodos = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch assignments with status for all enrolled classes
        const { data, error } = await supabase
          .from('assignment_with_status')
          .select('*, classes(class_name)')
          .or(`student_id.eq.${user.id},student_id.is.null`)
          .eq('is_published', true)
          .order('due_date', { ascending: true, nullsFirst: false })

        if (error) throw error

        // Filter and Group by class
        const grouped: Record<string, TodoItem[]> = {}
        const now = new Date()

        data?.forEach(item => {
          // Skip if already submitted or graded
          if (item.display_status === 'submitted' || item.display_status === 'graded') return
          
          // Determine if late
          let isMissing = item.display_status === 'missing'
          if (!isMissing && item.due_date && new Date(item.due_date) < now) {
            isMissing = true
          }

          const className = item.classes?.class_name || 'Mata Kuliah'
          if (!grouped[className]) grouped[className] = []
          
          // Deduplicate if needed
          const existing = grouped[className].find(t => t.id === item.id)
          if (!existing || item.student_id === user.id) {
            if (existing) {
              grouped[className] = grouped[className].filter(t => t.id !== item.id)
            }
            grouped[className].push({
              id: item.id,
              class_id: item.class_id,
              class_name: className,
              title: item.title,
              due_date: item.due_date,
              display_status: isMissing ? 'missing' : item.display_status
            })
          }
        })

        setTodos(grouped)
      } catch (err) {
        console.error('[Todo] Load failed:', err)
      } finally {
        setLoading(false)
      }
    }
    loadTodos()
  }, [])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const classNames = Object.keys(todos)

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4 sm:py-8 px-4 font-sans">
      <div className="border-b-2 border-slate-900 pb-3 dark:border-white">
        <h1 className="text-sm sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Daftar Tugas</h1>
        <p className="text-[9px] sm:text-[11px] text-slate-500 uppercase tracking-widest font-bold mt-1 dark:text-gray-400">
          Ringkasan tugas yang belum diselesaikan
        </p>
      </div>

      {classNames.length === 0 ? (
        <div className="py-8 border-b border-slate-200 dark:border-slate-800">
          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white mb-1">Semua tugas selesai.</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-gray-400">Tidak ada tugas yang menunggu pengerjaan Anda saat ini.</p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-10">
          {classNames.map(name => (
            <div key={name} className="space-y-1.5">
              <h2 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 pb-1 border-b border-slate-200 dark:border-slate-800">
                {name}
              </h2>
              
              <div className="flex flex-col">
                {todos[name].map(todo => (
                  <Link
                    key={todo.id}
                    href={`/class/${todo.class_id}/classwork`}
                    className="group flex items-center justify-between py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors dark:border-slate-800/60 dark:hover:bg-[#152033]"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="text-[11px] sm:text-[12px] font-black text-slate-850 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                          {todo.title}
                        </h3>
                        {todo.display_status === 'missing' && (
                          <span className="shrink-0 text-[7px] sm:text-[8px] font-black uppercase bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-sm dark:bg-red-950/30 dark:border-red-900 tracking-wider">Terlambat</span>
                        )}
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-gray-400">
                        {todo.due_date ? (
                          <span className={todo.display_status === 'missing' ? 'text-red-500 dark:text-red-400' : ''}>
                            Tenggat: {formatDate(todo.due_date)}
                          </span>
                        ) : (
                          <span>Tanpa tenggat waktu</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-slate-300 group-hover:text-blue-500 transition-transform transform group-hover:translate-x-1">
                      <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
