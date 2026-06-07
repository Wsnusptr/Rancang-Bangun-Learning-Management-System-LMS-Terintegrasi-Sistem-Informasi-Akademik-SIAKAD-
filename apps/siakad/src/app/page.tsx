import { createClient } from '@supabase/supabase-js'
import SiakadClientDashboard from './SiakadClientDashboard'

// Create client using service role key on the server-side to bypass RLS for admin dashboard
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const revalidate = 0 // Disable cache for live statistics

export default async function SiakadDashboard() {
  let records: any[] = []
  let receipts: any[] = []
  let students: any[] = []
  let pmbApplicants: any[] = []
  let lecturers: any[] = []
  let announcements: any[] = []
  let courses: any[] = []
  let semesters: any[] = []
  let rooms: any[] = []
  let lmsClasses: any[] = []
  let enrollments: any[] = []
  let programs: any[] = []

  // Concurrent execution of all 14 queries to minimize database roundtrips and network waterfalls
  const results = await Promise.allSettled([
    supabase.from('academic_records').select('*').order('sync_at', { ascending: false }),
    supabase.from('sync_receipts').select('*').order('processed_at', { ascending: false }).limit(30),
    supabase.auth.admin.listUsers(),
    supabase.from('profiles').select('*, study_programs(id, code, name)').eq('role', 'student').not('nim', 'is', null).neq('nim', '').order('name', { ascending: true }),
    supabase.from('profiles').select('*').in('role', ['student', 'guest', 'user']).order('name', { ascending: true }),
    supabase.from('mahasiswa_baru').select('*'),
    supabase.from('profiles').select('*').eq('role', 'lecturer').order('name', { ascending: true }),
    supabase.from('announcements').select('*').order('is_highlight', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('courses').select('id, code, name, credits').eq('is_active', true).order('code', { ascending: true }),
    supabase.from('academic_semesters').select('id, code, name, academic_year, semester_type, is_active').order('start_date', { ascending: false }),
    supabase.from('rooms').select('id, code, name').eq('is_active', true).order('code', { ascending: true }),
    supabase.from('class_details').select('*').order('created_at', { ascending: false }),
    supabase.from('enrollments').select(`
      id,
      status,
      joined_at,
      student_id,
      profiles (id, name, nim, study_program_id),
      classes (
        id,
        class_name,
        class_code,
        class_section,
        semester_id,
        courses (id, code, name, credits)
      )
    `).order('joined_at', { ascending: false }),
    supabase.from('study_programs').select('id, code, name').eq('is_active', true).order('code', { ascending: true })
  ])

  // Extract academic_records
  const recordsRes = results[0]
  if (recordsRes.status === 'fulfilled' && !(recordsRes.value as any).error) {
    records = (recordsRes.value as any).data || []
  }

  // Extract sync_receipts
  const receiptsRes = results[1]
  if (receiptsRes.status === 'fulfilled' && !(receiptsRes.value as any).error) {
    receipts = (receiptsRes.value as any).data || []
  }

  // Fetch Auth Users to map emails across profiles
  const userEmails = new Map<string, string>()
  const authUsersRes = results[2]
  if (authUsersRes.status === 'fulfilled') {
    const authUsersData = (authUsersRes.value as any).data
    if (authUsersData && authUsersData.users) {
      authUsersData.users.forEach((u: any) => {
        userEmails.set(u.id, u.email || '')
      })
    }
  }

  // Extract active students profiles
  const studentsRes = results[3]
  if (studentsRes.status === 'fulfilled' && !(studentsRes.value as any).error) {
    const studentData = (studentsRes.value as any).data || []
    students = studentData.map((p: any) => ({
      ...p,
      email: userEmails.get(p.id) || '',
      study_program_name: p.study_programs?.name || null,
      study_program_code: p.study_programs?.code || null,
    }))
  }

  // Extract PMB Applicants (guests) profiles
  const profilesPmbRes = results[4]
  const mbRes = results[5]
  
  try {
    let profilesPmb: any[] = []
    if (profilesPmbRes.status === 'fulfilled' && !(profilesPmbRes.value as any).error) {
      profilesPmb = (profilesPmbRes.value as any).data || []
    }

    let mb: any[] = []
    if (mbRes.status === 'fulfilled' && !(mbRes.value as any).error) {
      mb = (mbRes.value as any).data || []
    }

    // Combine profiles and mb unique by email
    const combined: any[] = []
    const emails = new Set<string>()

    // Process profiles PMB (guests) - ONLY those without NIM and not using a NIM-based email
    if (profilesPmb && profilesPmb.length > 0) {
      const filteredPmbProfiles = profilesPmb.filter(p => {
        // Must have no NIM
        if (p.nim && p.nim.trim() !== '') return false
        // Must not be using a NIM institutional email
        const authEmail = userEmails.get(p.id) || ''
        if (authEmail.endsWith('@stmik.jayakarta.ac.id')) return false
        return true
      })
      filteredPmbProfiles.forEach(p => {
        const email = userEmails.get(p.id) || ''
        const dedupeKey = email ? email.toLowerCase() : p.id

        if (!emails.has(dedupeKey)) {
          emails.add(dedupeKey)
          combined.push({
            id: p.id,
            name: p.name,
            email: email || '-',
            phone: p.phone || '',
            date_of_birth: p.date_of_birth || '',
            address: p.address || '',
            intended_program: p.intended_program || '',
            role: 'student',
            status: 'registered',
            avatar_url: p.avatar_url || null
          })
        }
      })
    }

    // Process mahasiswa_baru table
    for (const m of mb) {
      if (m.status === 'enrolled' || m.assigned_nim) {
        if (!students.some(s => s.nim === m.assigned_nim)) {
          students.push({
            id: m.id,
            name: m.full_name,
            nim: m.assigned_nim,
            email: m.email,
            phone: m.phone || '',
            role: 'student',
            enrollment_year: m.enrollment_year || new Date().getFullYear(),
            is_active: true,
            study_program_code: m.intended_program,
            intended_program: m.intended_program
          })
        }
      } else {
        const mEmail = m.email?.toLowerCase()
        const isInStudents = students.some(s => s.email?.toLowerCase() === mEmail || s.email?.toLowerCase() === `${m.assigned_nim}@stmik.jayakarta.ac.id`)
        if (mEmail && !emails.has(mEmail) && !isInStudents) {
          emails.add(mEmail)
          combined.push({
            id: m.id,
            name: m.full_name,
            email: m.email,
            phone: m.phone || '',
            date_of_birth: m.date_of_birth || '',
            address: m.address || '',
            intended_program: m.intended_program || '',
            role: 'student',
            status: m.status || 'registered',
            avatar_url: null
          })
        }
      }
    }

    pmbApplicants = combined
  } catch (e) {
    console.error('[SIAKAD] Error processing PMB applicants:', e)
  }

  // Extract lecturers profiles
  const lecturersRes = results[6]
  if (lecturersRes.status === 'fulfilled' && !(lecturersRes.value as any).error) {
    const lecturerData = (lecturersRes.value as any).data || []
    lecturers = lecturerData.map((p: any) => ({
      ...p,
      email: userEmails.get(p.id) || ''
    }))
  }

  // Extract announcements
  const announcementsRes = results[7]
  if (announcementsRes.status === 'fulfilled' && !(announcementsRes.value as any).error) {
    announcements = (announcementsRes.value as any).data || []
  }

  // Extract courses catalog
  const coursesRes = results[8]
  if (coursesRes.status === 'fulfilled' && !(coursesRes.value as any).error) {
    courses = (coursesRes.value as any).data || []
  }

  // Extract semesters catalog
  const semestersRes = results[9]
  if (semestersRes.status === 'fulfilled' && !(semestersRes.value as any).error) {
    semesters = (semestersRes.value as any).data || []
  }

  // Extract rooms catalog
  const roomsRes = results[10]
  if (roomsRes.status === 'fulfilled' && !(roomsRes.value as any).error) {
    rooms = (roomsRes.value as any).data || []
  }

  // Extract LMS classes
  const lmsClassesRes = results[11]
  if (lmsClassesRes.status === 'fulfilled' && !(lmsClassesRes.value as any).error) {
    lmsClasses = (lmsClassesRes.value as any).data || []
  }

  // Extract student enrollments
  const enrollmentsRes = results[12]
  if (enrollmentsRes.status === 'fulfilled' && !(enrollmentsRes.value as any).error) {
    enrollments = (enrollmentsRes.value as any).data || []
  }

  // Extract study programs
  const programsRes = results[13]
  if (programsRes.status === 'fulfilled' && !(programsRes.value as any).error) {
    programs = (programsRes.value as any).data || []
  }

  return (
    <SiakadClientDashboard
      initialRecords={records}
      initialReceipts={receipts}
      initialStudents={students}
      initialPmbApplicants={pmbApplicants}
      initialLecturers={lecturers}
      initialAnnouncements={announcements}
      coursesCatalog={courses}
      semestersCatalog={semesters}
      roomsCatalog={rooms}
      initialClasses={lmsClasses}
      initialEnrollments={enrollments}
      programsCatalog={programs}
      apiKey={process.env.SIAKAD_API_KEY || ''}
    />
  )
}
