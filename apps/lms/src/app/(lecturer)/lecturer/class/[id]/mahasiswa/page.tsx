'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import { Loader2, Users } from 'lucide-react'

interface Params {
  params: Promise<{ id: string }>
}

export default function LecturerClassStudentsPage({ params }: Params) {
  const { id } = use(params)
  const [classDetail, setClassDetail] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      try {
        const { data: cls } = await supabase
          .from('classes')
          .select(`
            id, class_name, class_code, class_section, cover_color, cover_image_url, day_of_week, start_time, end_time,
            courses ( code, name, credits ),
            academic_semesters ( name ),
            rooms ( code, name ),
            profiles!classes_lecturer_id_fkey ( name, avatar_url )
          `)
          .eq('id', id)
          .single()

        if (cls) {
          setClassDetail({
            id: cls.id,
            class_name: cls.class_name,
            class_code: cls.class_code,
            class_section: cls.class_section,
            cover_color: cls.cover_color || '#1A3A6B',
            cover_image_url: (cls as any).cover_image_url,
            course_code: (cls as any).courses?.code,
            course_name: (cls as any).courses?.name,
            course_credits: (cls as any).courses?.credits || 0,
            semester_name: (cls as any).academic_semesters?.name,
            room_code: (cls as any).rooms?.code,
            room_name: (cls as any).rooms?.name,
            day_of_week: cls.day_of_week,
            start_time: cls.start_time,
            end_time: cls.end_time,
            enrolled_count: 0,
            lecturer_name: (cls as any).profiles?.name || '-',
            lecturer_avatar: (cls as any).profiles?.avatar_url,
          })
        }

        const { data: enr } = await supabase
          .from('enrollments')
          .select(`
            id, status, joined_at,
            profiles!enrollments_student_id_fkey ( id, name, nim, phone )
          `)
          .eq('class_id', id)
          .eq('status', 'active')
          .order('joined_at', { ascending: true })

        setStudents(enr || [])
      } catch (e) {
        console.error('[LecturerMahasiswa]', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading || !classDetail) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <ClassHeader
        id={id}
        role="lecturer"
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
        enrolledCount={students.length}
      />

      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#121B2E] overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <h2 className="text-[11px] font-semibold text-slate-800 dark:text-white">
            Daftar Mahasiswa ({students.length})
          </h2>
        </div>
        <p className="px-3 py-1 text-[9px] text-slate-400">Geser tabel jika kolom banyak</p>
        <div className="overflow-x-auto">
          <table className="min-w-max w-full text-[11px]">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500">NIM</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500">Nama</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500">Status</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500">Bergabung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((row) => {
                const p = row.profiles
                return (
                  <tr key={row.id}>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{p?.nim || '-'}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-white">{p?.name || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-500">{row.status}</td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {row.joined_at ? new Date(row.joined_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                  </tr>
                )
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-400 text-[11px]">
                    Belum ada mahasiswa terdaftar. Bagikan kode join: <strong className="font-mono">{classDetail.class_code}</strong>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
