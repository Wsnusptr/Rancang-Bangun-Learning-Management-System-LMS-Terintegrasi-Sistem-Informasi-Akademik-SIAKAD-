'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import { 
  Loader2, AlertCircle, Award, 
  HelpCircle, BarChart3, 
  Percent, ClipboardCheck
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Params {
  params: Promise<{ id: string }>
}

interface GradeSummary {
  attendance_score: number
  assignment_score: number
  quiz_score: number
  midterm_score: number
  final_exam_score: number
  weighted_total: number | null
  letter_grade: string | null
  attendance_percentage: number
  total_sessions: number
  attended_sessions: number
}

interface SubmissionGrade {
  id: string
  score: number
  final_score: number
  graded_at: string
  feedback: string | null
  assignments: {
    id: string
    title: string
    type: string
    max_score: number
  }
}

export default function StudentGrades({ params }: Params) {
  const { id } = use(params)
  const [classDetail, setClassDetail] = useState<any>(null)
  const [gradeSummary, setGradeSummary] = useState<GradeSummary | null>(null)
  const [detailedGrades, setDetailedGrades] = useState<SubmissionGrade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      try {
        const [{ data: cls }, { data: summary }, { data: subs }] = await Promise.all([
          supabase.from('class_details').select('*').eq('id', id).single(),
          user ? supabase.from('grade_summaries').select('*').eq('class_id', id).eq('student_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
          user ? supabase.from('submissions').select('id, score, final_score, graded_at, feedback, assignments!inner(id, title, type, max_score)').eq('student_id', user.id).eq('status', 'graded') : Promise.resolve({ data: [] })
        ])

        if (cls) {
          // Fetch real-time enrolled count from stats API
          try {
            const statsRes = await fetch(`/api/classes/stats?ids=${id}`, { cache: 'no-store' })
            const statsJson = await statsRes.json()
            if (statsJson.success && statsJson.data[id]) {
              cls.enrolled_count = statsJson.data[id].enrolled_count
            }
          } catch (err) {
            console.error('Failed to fetch stats', err)
          }
          setClassDetail(cls)
        }
        if (summary) setGradeSummary(summary)
        if (subs) setDetailedGrades(subs as unknown as SubmissionGrade[])
      } catch (err) {
        console.error('[Grades] Load failed:', err)
      }
      setLoading(false)
    }
    init()
  }, [id])

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  if (!classDetail) return null

  return (
    <div className="space-y-6 select-none bg-[#F8F9FA] dark:bg-[#0D1424] min-h-screen pb-12 font-sans">
      <ClassHeader
        id={classDetail.id}
        role="student"
        className={classDetail.class_name}
        classCode={classDetail.class_code}
        classSection={classDetail.class_section}
        coverColor={classDetail.cover_color}
        coverImageUrl={classDetail.cover_image_url}
        lecturerName={classDetail.lecturer_name}
        lecturerAvatar={classDetail.lecturer_avatar}
        backupLecturerName={classDetail.backup_lecturer_name}
        backupLecturerAvatar={classDetail.backup_lecturer_avatar}
        courseCode={classDetail.course_code}
        courseName={classDetail.course_name}
        credits={classDetail.course_credits}
        semesterName={classDetail.semester_name}
        roomCode={classDetail.room_code}
        roomName={classDetail.room_name}
        dayOfWeek={classDetail.day_of_week}
        startTime={classDetail.start_time}
        endTime={classDetail.end_time}
        enrolledCount={classDetail.enrolled_count}
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4 max-w-7xl mx-auto px-1 md:px-3">
        {/* Left Side: Summary Panel */}
        <div className="space-y-4 lg:col-span-1">
          {/* Index Letter */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-[#121B2E] dark:border-slate-800">
            <h3 className="text-[11px] font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5 mb-4">
              <Award className="h-4 w-4 text-blue-600" /> Hasil Akhir
            </h3>
            
            {gradeSummary?.letter_grade ? (
               <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex flex-col items-center justify-center text-white shadow-lg shadow-blue-600/20 mb-3">
                     <span className="text-2xl font-black">{gradeSummary.letter_grade}</span>
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Skor Kumulatif</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{gradeSummary.weighted_total?.toFixed(1)} / 100</p>
               </div>
            ) : (
               <div className="text-center py-4">
                  <HelpCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Belum Tersedia</p>
               </div>
            )}
          </div>

          {/* Component Weights */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-[#121B2E] dark:border-slate-800">
             <h3 className="text-[11px] font-black uppercase text-slate-800 dark:text-white flex items-center gap-1.5 mb-4">
               <Percent className="h-4 w-4 text-amber-500" /> Bobot Komponen
             </h3>
             <div className="space-y-2 text-[10px] font-bold">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800"><span>Kehadiran</span> <span className="text-slate-800 dark:text-white">{classDetail.weight_attendance}%</span></div>
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800"><span>Tugas</span> <span className="text-slate-800 dark:text-white">{classDetail.weight_assignments}%</span></div>
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800"><span>Kuis</span> <span className="text-slate-800 dark:text-white">{classDetail.weight_quiz}%</span></div>
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800"><span>UTS</span> <span className="text-slate-800 dark:text-white">{classDetail.weight_midterm}%</span></div>
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400"><span>UAS</span> <span className="text-slate-800 dark:text-white">{classDetail.weight_final}%</span></div>
             </div>
          </div>
        </div>

        {/* Right Side: Detailed Table and Feed */}
        <div className="lg:col-span-3 space-y-4">
           {/* Detailed Component Breakdown */}
           <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:bg-[#121B2E] dark:border-slate-800">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
               <BarChart3 className="h-4 w-4 text-blue-600" />
               <h2 className="text-[11px] font-black uppercase text-slate-800 dark:text-white">Rincian Kalkulasi Skor</h2>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left text-[10px]">
                 <thead className="bg-slate-50 dark:bg-[#152033] text-slate-500 font-black uppercase">
                   <tr>
                     <th className="px-4 py-3 whitespace-nowrap">Komponen</th>
                     <th className="px-4 py-3 text-center whitespace-nowrap">Bobot</th>
                     <th className="px-4 py-3 text-right whitespace-nowrap">Rata-rata</th>
                     <th className="px-4 py-3 text-right whitespace-nowrap">Kontribusi</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold text-slate-700 dark:text-slate-300">
                   {gradeSummary ? (
                     (() => {
                        const assignmentCount = detailedGrades.filter(sub => {
                           const t = sub.assignments.type?.toLowerCase();
                           return t === 'tugas' || t === 'homework' || t === 'assignment';
                        }).length
                        const quizCount = detailedGrades.filter(sub => {
                           const t = sub.assignments.type?.toLowerCase();
                           return t === 'kuis' || t === 'quiz';
                        }).length
                        return (
                     <>
                        <tr>
                           <td className="px-4 py-3 whitespace-nowrap">Kehadiran</td>
                           <td className="px-4 py-3 text-center text-slate-400 whitespace-nowrap">{classDetail.weight_attendance}%</td>
                           <td className="px-4 py-3 text-right whitespace-nowrap">{gradeSummary.attended_sessions || 0}</td>
                           <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 whitespace-nowrap">{((gradeSummary.attendance_percentage * classDetail.weight_attendance)).toFixed(1)}</td>
                        </tr>
                        <tr>
                           <td className="px-4 py-3 whitespace-nowrap">Tugas Harian</td>
                           <td className="px-4 py-3 text-center text-slate-400 whitespace-nowrap">{classDetail.weight_assignments}%</td>
                           <td className="px-4 py-3 text-right whitespace-nowrap">{assignmentCount}</td>
                           <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 whitespace-nowrap">{((Number(gradeSummary.assignment_score) * classDetail.weight_assignments) / 100).toFixed(1)}</td>
                        </tr>
                        <tr>
                           <td className="px-4 py-3 whitespace-nowrap">Kuis</td>
                           <td className="px-4 py-3 text-center text-slate-400 whitespace-nowrap">{classDetail.weight_quiz}%</td>
                           <td className="px-4 py-3 text-right whitespace-nowrap">{quizCount}</td>
                           <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 whitespace-nowrap">{((Number(gradeSummary.quiz_score) * classDetail.weight_quiz) / 100).toFixed(1)}</td>
                        </tr>
                        <tr>
                           <td className="px-4 py-3 whitespace-nowrap">UTS</td>
                           <td className="px-4 py-3 text-center text-slate-400 whitespace-nowrap">{classDetail.weight_midterm}%</td>
                           <td className="px-4 py-3 text-right whitespace-nowrap">{Number(gradeSummary.midterm_score).toFixed(1)}</td>
                           <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 whitespace-nowrap">{((Number(gradeSummary.midterm_score) * classDetail.weight_midterm) / 100).toFixed(1)}</td>
                        </tr>
                        <tr>
                           <td className="px-4 py-3 whitespace-nowrap">UAS</td>
                           <td className="px-4 py-3 text-center text-slate-400 whitespace-nowrap">{classDetail.weight_final}%</td>
                           <td className="px-4 py-3 text-right whitespace-nowrap">{Number(gradeSummary.final_exam_score).toFixed(1)}</td>
                           <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 whitespace-nowrap">{((Number(gradeSummary.final_exam_score) * classDetail.weight_final) / 100).toFixed(1)}</td>
                        </tr>
                        <tr className="bg-slate-50/50 dark:bg-transparent text-[11px]">
                           <td colSpan={3} className="px-4 py-3 font-black text-right text-slate-800 dark:text-white uppercase whitespace-nowrap">Total Skor</td>
                           <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-black whitespace-nowrap">{gradeSummary.weighted_total?.toFixed(2)}</td>
                        </tr>
                     </>
                        )
                     })()
                   ) : (
                     <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 font-medium">Belum ada data nilai tersedia.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>

           {/* Assignment Scores Feed */}
           <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-[#121B2E] dark:border-slate-800">
              <h3 className="text-[11px] font-black uppercase text-slate-800 dark:text-white flex items-center gap-2 mb-4">
               <ClipboardCheck className="h-4 w-4 text-blue-600" /> Riwayat Nilai Tugas
              </h3>

              {detailedGrades.length === 0 ? (
                 <div className="text-center py-6 text-[10px] font-bold text-slate-400">Belum ada tugas yang dinilai oleh dosen.</div>
              ) : (
                 <div className="space-y-3">
                    {detailedGrades.map((sub) => (
                       <div key={sub.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 dark:border-slate-800 dark:bg-[#152033]">
                          <div className="min-w-0">
                             <div className="flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">{sub.assignments.type}</span>
                                <h4 className="text-[11px] font-black text-slate-800 dark:text-white truncate">{sub.assignments.title}</h4>
                             </div>
                             {sub.feedback && <p className="mt-1.5 text-[10px] text-slate-500 italic truncate">"{sub.feedback}"</p>}
                             <p className="mt-1 text-[8px] font-bold text-slate-400 uppercase">Dinilai: {formatDate(sub.graded_at)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                             <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Skor Final</span>
                             <span className="text-sm font-black text-slate-800 dark:text-white">{sub.final_score} <span className="text-[10px] text-slate-400">/ {sub.assignments.max_score}</span></span>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  )
}
