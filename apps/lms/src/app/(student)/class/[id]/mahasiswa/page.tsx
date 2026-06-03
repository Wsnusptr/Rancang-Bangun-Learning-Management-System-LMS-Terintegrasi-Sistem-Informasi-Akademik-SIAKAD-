'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClassHeader from '@/components/classroom/ClassHeader'
import { Loader2, Users, GraduationCap, ShieldCheck } from 'lucide-react'
import ProfileAvatar from '@/components/ui/ProfileAvatar'

interface Params {
  params: Promise<{ id: string }>
}

export default function StudentClassStudentsPage({ params }: Params) {
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
            profiles!classes_lecturer_id_fkey ( name, avatar_url, nidn, phone )
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
            lecturer_name: (cls as any).profiles?.name || '-',
            lecturer_avatar: (cls as any).profiles?.avatar_url,
            lecturer_nidn: (cls as any).profiles?.nidn,
            lecturer_phone: (cls as any).profiles?.phone,
          })
        }

        const { data: enr } = await supabase
          .from('enrollments')
          .select(`
            id, status, joined_at,
            profiles!enrollments_student_id_fkey ( id, name, nim, phone, avatar_url )
          `)
          .eq('class_id', id)
          .eq('status', 'active')
          .order('joined_at', { ascending: true })

        setStudents(enr || [])
      } catch (e) {
        console.error('[StudentMahasiswa]', e)
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
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <ClassHeader
        id={id}
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
        enrolledCount={students.length}
      />

      {/* Status Class Card */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#121B2E] flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">ID</span>
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Kode Kelas</p>
            <p className="text-xs font-black font-mono text-slate-800 dark:text-white">{classDetail.class_code}</p>
          </div>
        </div>
        <div className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#121B2E] flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Mahasiswa Aktif</p>
            <p className="text-xs font-black text-slate-800 dark:text-white">{students.length} <span className="text-[9px] font-bold text-slate-400">orang</span></p>
          </div>
        </div>
      </div>

      {/* Dosen Pengampu Card */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#121B2E] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-widest">
            Dosen Pengampu
          </h2>
        </div>
        <div className="p-4 flex items-center gap-4">
          <ProfileAvatar 
             src={classDetail.lecturer_avatar} 
             name={classDetail.lecturer_name} 
             size="lg" 
             className="h-11 w-11 border border-slate-100 dark:border-slate-800 shrink-0"
          />
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white">{classDetail.lecturer_name}</h3>
            <div className="flex items-center gap-3 mt-1 text-[9px] text-slate-500">
              <span className="font-semibold tracking-wide">
                NIDN: {classDetail.lecturer_nidn || '-'}
              </span>
              {classDetail.lecturer_phone && (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span className="font-medium">
                    {classDetail.lecturer_phone}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Teman Sekelas */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#121B2E] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-widest">
              Teman Sekelas
            </h2>
          </div>
          <span className="text-[9px] font-bold text-slate-500">
            {students.length} Mahasiswa
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-max w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-widest">NIM</th>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-widest">Nama Mahasiswa</th>
                <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((row) => {
                const p = row.profiles
                return (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-600 dark:text-slate-400">{p?.nim || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ProfileAvatar src={p?.avatar_url} name={p?.name || 'User'} size="sm" className="h-6 w-6" />
                        <span className="font-semibold text-[11px] text-slate-800 dark:text-white">{p?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${row.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {row.status === 'active' ? 'Aktif' : row.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-400 text-[10px]">
                    <Users className="h-6 w-6 mx-auto mb-2 opacity-20" />
                    Belum ada mahasiswa lain yang terdaftar di kelas ini.
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
