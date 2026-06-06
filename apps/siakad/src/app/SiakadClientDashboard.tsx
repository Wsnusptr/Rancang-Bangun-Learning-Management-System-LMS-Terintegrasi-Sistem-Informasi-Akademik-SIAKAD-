'use client'

import { useState, useTransition, useEffect } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  School, Database, Users, GraduationCap, CheckCircle2,
  Clock, AlertTriangle, FileSpreadsheet, History, Search,
  HelpCircle, RefreshCw, BarChart2, Calendar, FileText,
  UserCheck, BookOpen, AlertCircle, Plus, Trash2, Edit2, Edit3, Pencil, Save,
  ExternalLink, LogOut, Megaphone, Check, X, ShieldAlert,
  Menu, Info, Video, Image as ImageIcon, Sparkles, PlusCircle, ArrowRight, Loader2, LayoutDashboard, ChevronLeft, ChevronRight
} from 'lucide-react'
import PmbManagerClient from '../components/PmbManagerClient'

function formatProgramStudi(code?: string | null): string {
  if (!code || !String(code).trim()) return 'Belum diisi'
  if (code === 'S1-SI') return 'S1 Sistem Informasi'
  if (code === 'S1-TI') return 'S1 Teknik Informatika'
  return String(code)
}

function formatTanggalLahir(value?: string | null): string {
  if (!value || !String(value).trim()) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function resolveProgramStudi(row: {
  study_program_name?: string | null
  study_program_code?: string | null
  intended_program?: string | null
}): string {
  if (row.study_program_name) return row.study_program_name
  if (row.study_program_code) return formatProgramStudi(row.study_program_code)
  return formatProgramStudi(row.intended_program)
}

const TABLE_SCROLL = 'overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]'
const TABLE_BASE = 'min-w-max w-full text-[11px] text-slate-700 dark:text-slate-300 border-collapse'
const TH_CELL = 'px-3 py-2.5 text-left text-[10px] text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap'
const TD_CELL = 'px-3 py-2.5 whitespace-nowrap align-middle'

interface SiakadClientProps {
  initialRecords: any[]
  initialReceipts: any[]
  initialStudents: any[]
  initialPmbApplicants: any[]
  initialLecturers: any[]
  initialAnnouncements: any[]
  coursesCatalog: any[]
  semestersCatalog: any[]
  roomsCatalog: any[]
  programsCatalog: any[]
  initialClasses?: any[]
  initialEnrollments?: any[]
  apiKey: string
}

export default function SiakadClientDashboard({
  initialRecords,
  initialReceipts,
  initialStudents,
  initialPmbApplicants,
  initialLecturers,
  initialAnnouncements,
  coursesCatalog = [],
  semestersCatalog = [],
  roomsCatalog = [],
  programsCatalog = [],
  initialClasses = [],
  initialEnrollments = [],
  apiKey,
}: SiakadClientProps) {
  const authHeaders = { 'Content-Type': 'application/json', 'x-api-key': apiKey }

  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Navigation Tabs State
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mahasiswa' | 'pmb' | 'dosen' | 'kelas' | 'pengumuman' | 'sync' | 'setting_perkuliahan' | 'portal_pmb' | 'log_backup'>('dashboard')

  // Search States
  const [searchQuery, setSearchQuery] = useState('')

  // KRS approval and inner settings states
  const [enrollmentsList, setEnrollmentsList] = useState<any[]>(initialEnrollments || [])
  const [subSettingTab, setSubSettingTab] = useState<'periode' | 'daftar_ulang' | 'bobot_nilai'>('periode')
  const [krsSearchQuery, setKrsSearchQuery] = useState('')
  const [krsActionLoading, setKrsActionLoading] = useState<string | null>(null)

  // Backup Dosen Logs State
  const [backupLogs, setBackupLogs] = useState<any[]>([])
  const [backupLogsLoading, setBackupLogsLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'log_backup') {
      const loadLogs = async () => {
        setBackupLogsLoading(true)
        try {
          const res = await fetch('/api/v1/dosen/backup/history', { headers: authHeaders })
          const json = await res.json()
          if (json.success) setBackupLogs(json.data)
        } catch (e) {
          console.error(e)
        } finally {
          setBackupLogsLoading(false)
        }
      }
      loadLogs()
    }
  }, [activeTab])

  const [greeting, setGreeting] = useState('Selamat pagi')
  useEffect(() => {
    setEnrollmentsList(initialEnrollments || [])
    
    const hour = new Date().getHours()
    if (hour < 10) setGreeting('Selamat pagi')
    else if (hour < 15) setGreeting('Selamat siang')
    else if (hour < 18) setGreeting('Selamat sore')
    else setGreeting('Selamat malam')
  }, [initialEnrollments])

  // Student Edit Modal States
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentForm, setStudentForm] = useState({
    name: '',
    nim: '',
    phone: '',
    address: '',
    gender: '',
    dateOfBirth: '',
    study_program_id: ''
  })
  const [studentSubmitting, setStudentSubmitting] = useState(false)
  const [studentError, setStudentError] = useState<string | null>(null)
  const [studentSuccess, setStudentSuccess] = useState<string | null>(null)

  // PMB Verification Modal States
  const [showPmbModal, setShowPmbModal] = useState(false)
  const [selectedPmb, setSelectedPmb] = useState<any | null>(null)
  const [generatedNim, setGeneratedNim] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSuccess, setModalSuccess] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  // PMB Edit Modal States
  const [showPmbEditModal, setShowPmbEditModal] = useState(false)
  const [selectedPmbEdit, setSelectedPmbEdit] = useState<any | null>(null)
  const [pmbEditForm, setPmbEditForm] = useState({
    fullName: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    intendedProgram: ''
  })
  const [pmbEditSubmitting, setPmbEditSubmitting] = useState(false)
  const [pmbEditError, setPmbEditError] = useState<string | null>(null)

  // Announcements CRUD Modal States
  const [showAnnModal, setShowAnnModal] = useState(false)
  const [selectedAnn, setSelectedAnn] = useState<any | null>(null) // null = Create, otherwise Edit
  const [annFilterTab, setAnnFilterTab] = useState<'all' | 'pmb' | 'student' | 'lecturer'>('all')
  const [annForm, setAnnForm] = useState({
    category: 'Jalur Pendaftaran',
    title: '',
    description: '',
    date_info: '',
    media_url: '',
    link_url: '',
    is_highlight: false
  })
  const [annError, setAnnError] = useState<string | null>(null)
  const [annSuccess, setAnnSuccess] = useState<string | null>(null)
  const [annSubmitting, setAnnSubmitting] = useState(false)

  // Dosen Creation Modal States
  const [showDosenModal, setShowDosenModal] = useState(false)
  const [selectedDosenId, setSelectedDosenId] = useState<string | null>(null)
  const [dosenForm, setDosenForm] = useState({
    fullName: '',
    email: '',
    nip: '',
    nidn: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    password: 'DosenJayakarta2026!'
  })
  const [dosenError, setDosenError] = useState<string | null>(null)
  const [dosenSuccess, setDosenSuccess] = useState<string | null>(null)
  const [dosenSubmitting, setDosenSubmitting] = useState(false)

  // Class Creation Modal States
  const [showClassModal, setShowClassModal] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [classForm, setClassForm] = useState({
    courseId: coursesCatalog?.[0]?.id || '',
    semesterId: semestersCatalog?.find((s: any) => s.is_active)?.id || semestersCatalog?.[0]?.id || '',
    lecturerId: initialLecturers?.[0]?.id || '',
    backupLecturerId: '',
    roomId: roomsCatalog?.[0]?.id || '',
    className: '',
    classSection: 'A',
    dayOfWeek: 'Senin',
    startTime: '08:00',
    endTime: '10:30',
    maxStudents: '40'
  })
  const [classError, setClassError] = useState<string | null>(null)
  const [classSuccess, setClassSuccess] = useState<string | null>(null)
  const [classSubmitting, setClassSubmitting] = useState(false)

  // Status Alerts
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Semester Manual Creation States
  const [semForm, setSemForm] = useState({
    code: '',
    name: '',
    academicYear: '',
    semesterType: 'Ganjil',
    startDate: '',
    endDate: '',
    isActive: false
  })
  const [semSubmitting, setSemSubmitting] = useState(false)
  const [semError, setSemError] = useState<string | null>(null)
  const [semSuccess, setSemSuccess] = useState<string | null>(null)

  // Master Academic Weights States
  const [masterWeights, setMasterWeights] = useState({
    absen: 10,
    tugas: 20,
    kuis: 10,
    uts: 30,
    uas: 30
  })
  const [weightsLoading, setWeightsLoading] = useState(false)
  const [weightsMessage, setWeightsMessage] = useState<{type: 'success'|'error', text: string} | null>(null)

  useEffect(() => {
    // Load initial master weights
    const loadWeights = async () => {
      try {
        const res = await fetch('/api/v1/settings/weights', { headers: authHeaders })
        const json = await res.json()
        if (json.success && json.data) {
          setMasterWeights(json.data)
        }
      } catch (err) {
        console.error('Failed to load weights')
      }
    }
    loadWeights()
  }, [])

  const handleSaveMasterWeights = async (e: React.FormEvent) => {
    e.preventDefault()
    setWeightsMessage(null)
    const total = Number(masterWeights.absen) + Number(masterWeights.tugas) + Number(masterWeights.kuis) + Number(masterWeights.uts) + Number(masterWeights.uas)
    if (total !== 100) {
      setWeightsMessage({ type: 'error', text: `Total bobot harus 100%. Saat ini: ${total}%` })
      return
    }
    setWeightsLoading(true)
    try {
      const res = await fetch('/api/v1/settings/weights', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(masterWeights)
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || '-')
      setWeightsMessage({ type: 'success', text: 'Bobot master akademik berhasil disimpan dan akan berlaku pada seluruh kelas.' })
    } catch (err: any) {
      setWeightsMessage({ type: 'error', text: err.message })
    } finally {
      setWeightsLoading(false)
    }
  }

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault()
    setSemSubmitting(true)
    setSemError(null)
    setSemSuccess(null)
    try {
      const res = await fetch('/api/v1/semesters', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          action: 'create',
          ...semForm
        })
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '-')
      }

      setSemSuccess(json.message)
      setSemForm({
        code: '',
        name: '',
        academicYear: '',
        semesterType: 'Ganjil',
        startDate: '',
        endDate: '',
        isActive: false
      })
      router.refresh()
    } catch (err: any) {
      setSemError(err.message)
    } finally {
      setSemSubmitting(false)
    }
  }

  // Helper: show transient alerts
  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text })
    setTimeout(() => setAlertMsg(null), 4000)
  }

  // KRS Enrollments Handlers
  const handleApproveEnrollment = async (enrollmentId: string) => {
    setKrsActionLoading(enrollmentId)
    try {
      const res = await fetch('/api/v1/enrollments', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action: 'approve', enrollmentId })
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '-')
      }
      showAlert('success', 'Pendaftaran kelas berhasil disetujui.')
      
      // Local state update for instant visual feedback
      setEnrollmentsList(prev => prev.map(item => 
        item.id === enrollmentId ? { ...item, status: 'active' } : item
      ))
      router.refresh()
    } catch (err: any) {
      showAlert('error', err.message || '-')
    } finally {
      setKrsActionLoading(null)
    }
  }

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan dan menghapus rencana studi mahasiswa ini?')) return
    setKrsActionLoading(enrollmentId)
    try {
      const res = await fetch(`/api/v1/enrollments?id=${enrollmentId}`, {
        method: 'DELETE', headers: authHeaders })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '-')
      }
      showAlert('success', 'Rencana studi berhasil dibatalkan dan dihapus.')
      
      // Local state update for instant visual feedback
      setEnrollmentsList(prev => prev.filter(item => item.id !== enrollmentId))
      router.refresh()
    } catch (err: any) {
      showAlert('error', err.message || '-')
    } finally {
      setKrsActionLoading(null)
    }
  }

  const handleApproveAllEnrollments = async () => {
    if (!confirm('Apakah Anda yakin ingin menyetujui semua rencana studi mahasiswa berstatus pending untuk semester aktif saat ini?')) return
    setKrsActionLoading('bulk')
    try {
      const res = await fetch('/api/v1/enrollments', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action: 'approve_all' })
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '-')
      }
      showAlert('success', json.message || '-')
      
      // Local state update: set all to active
      setEnrollmentsList(prev => prev.map(item => ({ ...item, status: 'active' })))
      router.refresh()
    } catch (err: any) {
      showAlert('error', err.message || '-')
    } finally {
      setKrsActionLoading(null)
    }
  }

  // --- Dynamic Stats calculation ---
  const totalRecords = initialRecords.length
  const uniqueStudents = new Set(initialRecords.map(r => r.nim)).size
  const totalSks = initialRecords.reduce((sum, r) => sum + (r.credits || 3), 0)
  const avgScore = totalRecords > 0
    ? initialRecords.reduce((sum, r) => sum + Number(r.final_score), 0) / totalRecords
    : 0

  const matchSyncStudents = (courseCode: string, semesterName: string, academicYear: string) =>
    initialRecords.filter(
      (r) =>
        r.course_code === courseCode &&
        r.semester === semesterName &&
        String(r.academic_year) === String(academicYear)
    )

  const classesList = (initialClasses.length > 0
    ? initialClasses.map((cls) => ({
        id: cls.id,
        courseCode: cls.course_code,
        courseName: cls.course_name,
        credits: cls.course_credits || 3,
        semester: cls.semester_name,
        academicYear: cls.academic_year,
        className: cls.class_name,
        classSection: cls.class_section,
        classCode: cls.class_code,
        lecturerName: cls.lecturer_name,
        enrolledCount: initialEnrollments.filter(e => e.classes?.id === cls.id && e.status === 'active').length || 0,
        isActive: cls.is_active !== false,
        students: matchSyncStudents(cls.course_code, cls.semester_name, cls.academic_year),
        // Add raw fields for editing
        courseId: cls.course_id,
        semesterId: cls.semester_id,
        lecturerId: cls.lecturer_id,
        backupLecturerId: cls.backup_lecturer_id,
        roomId: cls.room_id,
        dayOfWeek: cls.day_of_week,
        startTime: cls.start_time,
        endTime: cls.end_time,
        maxStudents: cls.max_students
      }))
    : []
  ).sort((a, b) => `${b.academicYear}${b.semester}`.localeCompare(`${a.academicYear}${a.semester}`))

  // --- Refresh Database Stats ---
  const handleRefresh = () => {
    startTransition(() => {
      router.refresh()
      showAlert('success', 'Data statistik akademik berhasil disegarkan.')
    })
  }

  // --- PMB NIM Generation helper ---
  const handleOpenPmbModal = (pmb: any) => {
    setSelectedPmb(pmb)
    // Auto-generate NIM format: [Year] [ProgramCode 11/12] [RunningNumber 3 digits]
    const year = new Date().getFullYear().toString().substring(2)
    const progCode = pmb.intended_program === 'S1-SI' || pmb.intended_program?.toLowerCase().includes('sistem') ? '12' : '11'
    const rand = Math.floor(100 + Math.random() * 900).toString() // Generate 3 digit random code for dummy
    setGeneratedNim(`20${year}${progCode}${rand}`)
    setModalError(null)
    setModalSuccess(null)
    setShowPmbModal(true)
  }

  const handleVerifyPmb = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!generatedNim.trim()) {
      setModalError('NIM harus diisi.')
      return
    }
    if (!selectedPmb?.intended_program?.trim()) {
      setModalError('Calon mahasiswa belum mengisi program studi di profil LMS.')
      return
    }
    
    setVerifying(true)
    setModalError(null)

    try {
      const res = await fetch('/api/v1/verify-pmb', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          userId: selectedPmb.id && selectedPmb.id.length === 36 ? selectedPmb.id : null, // Check if it's a Supabase UUID
          email: selectedPmb.email,
          fullName: selectedPmb.name || selectedPmb.full_name,
          nim: generatedNim.trim(),
          intendedProgram: selectedPmb.intended_program || '-'
        })
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || '-')

      setModalSuccess(json.message)
      showAlert('success', `Calon mahasiswa ${selectedPmb?.full_name} berhasil diverifikasi.`)

      setTimeout(() => {
        setShowPmbModal(false)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setModalError(err.message || '-')
    } finally {
      setVerifying(false)
    }
  }

  const handleOpenPmbEditModal = (pmb: any) => {
    setSelectedPmbEdit(pmb)
    setPmbEditForm({
      fullName: pmb.name || pmb.full_name || '',
      phone: pmb.phone || '',
      dateOfBirth: pmb.date_of_birth || '',
      address: pmb.address || '',
      intendedProgram: pmb.intended_program || ''
    })
    setPmbEditError(null)
    setShowPmbEditModal(true)
  }

  const handleEditPmbSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pmbEditForm.fullName.trim()) {
      setPmbEditError('Nama lengkap wajib diisi.')
      return
    }

    setPmbEditSubmitting(true)
    setPmbEditError(null)
    try {
      const isUUID = selectedPmbEdit.id && selectedPmbEdit.id.length === 36
      const payload = {
        userId: isUUID ? selectedPmbEdit.id : null,
        email: selectedPmbEdit.email,
        fullName: pmbEditForm.fullName,
        phone: pmbEditForm.phone,
        dateOfBirth: pmbEditForm.dateOfBirth,
        address: pmbEditForm.address,
        intendedProgram: pmbEditForm.intendedProgram
      }

      const res = await fetch('/api/v1/pmb', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal memperbarui data PMB')

      showAlert('success', 'Data Calon Mahasiswa (PMB) berhasil diperbarui.')
      setShowPmbEditModal(false)
      router.refresh()
    } catch (err: any) {
      setPmbEditError(err.message)
    } finally {
      setPmbEditSubmitting(false)
    }
  }

  const handleDeletePmb = async (pmb: any) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data calon mahasiswa ${pmb.name || pmb.full_name}? Akun loginnya juga akan terhapus jika ada.`)) return

    try {
      const isUUID = pmb.id && pmb.id.length === 36
      const searchParams = new URLSearchParams()
      if (isUUID) searchParams.append('userId', pmb.id)
      searchParams.append('email', pmb.email)

      const res = await fetch(`/api/v1/pmb?${searchParams.toString()}`, {
        method: 'DELETE',
        headers: authHeaders
      })
      
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menghapus PMB')

      showAlert('success', 'Calon Mahasiswa (PMB) berhasil dihapus permanen.')
      router.refresh()
    } catch (err: any) {
      showAlert('error', `Gagal menghapus PMB: ${err.message}`);
    }
  }

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name.trim() || !studentForm.nim.trim()) {
      setStudentError('Nama dan NIM wajib diisi.');
      return;
    }
    setStudentSubmitting(true);
    setStudentError(null);
    try {
      const res = await fetch('/api/v1/students', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ ...studentForm, id: selectedStudentId })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || '-');
      setStudentSuccess(json.message);
      showAlert('success', 'Data mahasiswa berhasil diperbarui.');
      setTimeout(() => {
        setShowStudentModal(false);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setStudentError(err.message || '-');
    } finally {
      setStudentSubmitting(false);
    }
  }

  const handleDeleteStudent = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/students?id=${id}`, { method: 'DELETE', headers: authHeaders });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || '-');
      showAlert('success', 'Data mahasiswa berhasil dihapus.');
      router.refresh();
    } catch (err: any) {
      showAlert('error', `Gagal menghapus mahasiswa: ${err.message}`);
    }
  }

  // --- Announcements CRUD Actions ---
  const handleOpenAnnModal = (ann: any = null) => {
    setSelectedAnn(ann)
    if (ann) {
      setAnnForm({
        category: ann.category,
        title: ann.title,
        description: ann.description,
        date_info: ann.date_info || '',
        media_url: ann.media_url || '',
        link_url: ann.link_url || '',
        is_highlight: ann.is_highlight || false
      })
    } else {
      setAnnForm({
        category: 'Jalur Pendaftaran',
        title: '',
        description: '',
        date_info: '',
        media_url: '',
        link_url: '',
        is_highlight: false
      })
    }
    setAnnError(null)
    setAnnSuccess(null)
    setShowAnnModal(true)
  }

  const handleAnnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!annForm.title.trim() || !annForm.description.trim()) {
      setAnnError('Judul dan Deskripsi pengumuman wajib diisi.')
      return
    }
    setAnnSubmitting(true)
    setAnnError(null)

    try {
      const isEdit = !!selectedAnn
      const url = '/api/v1/announcements'
      const method = isEdit ? 'PUT' : 'POST'

      const payload = isEdit
        ? { id: selectedAnn.id, ...annForm }
        : annForm

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || '-')

      setAnnSuccess(isEdit ? 'Pengumuman berhasil diperbarui.' : 'Pengumuman baru berhasil diterbitkan.')
      showAlert('success', isEdit ? 'Pengumuman telah diperbarui.' : 'Pengumuman baru telah terbit di portal LMS!')

      setTimeout(() => {
        setShowAnnModal(false)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setAnnError(err.message || '-')
    } finally {
      setAnnSubmitting(false)
    }
  }

  const handleAnnDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengumuman ini? Pengumuman ini akan langsung hilang dari dashboard mahasiswa LMS.')) return

    try {
      const res = await fetch(`/api/v1/announcements?id=${id}`, { method: 'DELETE', headers: authHeaders })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || '-')

      showAlert('success', 'Pengumuman berhasil dihapus.')
      router.refresh()
    } catch (err: any) {
      showAlert('error', err.message || '-')
    }
  }

  // --- Dosen Registration ---
  const handleOpenDosenModal = () => {
    setSelectedDosenId(null)
    setDosenForm({
      fullName: '',
      email: '',
      nip: '',
      nidn: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      password: ''
    })
    setDosenError(null)
    setDosenSuccess(null)
    setShowDosenModal(true)
  }

  const handleDosenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Email is removed from validation since it's auto-generated for both POST and PUT (actually for PUT we don't even submit password necessarily, but let's keep it simple)
    if (!dosenForm.fullName.trim()) {
      setDosenError('Nama Lengkap wajib diisi.')
      return
    }
    setDosenSubmitting(true)
    setDosenError(null)

    try {
      const isEdit = !!selectedDosenId;
      const res = await fetch('/api/v1/dosen', {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ...dosenForm, id: selectedDosenId })
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || '-')

      setDosenSuccess(json.message)
      showAlert('success', isEdit ? `Data Dosen ${dosenForm.fullName} berhasil diperbarui.` : `Dosen ${dosenForm.fullName} berhasil didaftarkan di LMS & SIAKAD.`)

      setTimeout(() => {
        setShowDosenModal(false)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setDosenError(err.message || '-')
    } finally {
      setDosenSubmitting(false)
    }
  }

  const handleDeleteDosen = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/dosen?id=${id}`, { method: 'DELETE', headers: authHeaders });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || '-');
      showAlert('success', 'Data dosen berhasil dihapus.');
      router.refresh();
    } catch (err: any) {
      showAlert('error', `Gagal menghapus dosen: ${err.message}`);
    }
  }

  // --- Class Registration ---
  const handleOpenClassModal = () => {
    setSelectedClassId(null)
    setClassForm({
      courseId: coursesCatalog?.[0]?.id || '',
      semesterId: semestersCatalog?.find((s: any) => s.is_active)?.id || semestersCatalog?.[0]?.id || '',
      lecturerId: '',
      backupLecturerId: '',
      roomId: '',
      className: '',
      classSection: 'Reguler Pagi',
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      maxStudents: '40'
    })
    setClassError(null)
    setClassSuccess(null)
    setShowClassModal(true)
  }

  // Auto set class name when course and section change in form
  const handleCourseSectionChange = (courseId: string, section: string) => {
    const course = coursesCatalog.find(c => c.id === courseId)
    if (course) {
      setClassForm(prev => ({
        ...prev,
        courseId,
        classSection: section,
        className: `${course.name} - Kelas ${section}`
      }))
    } else {
      setClassForm(prev => ({ ...prev, courseId, classSection: section }))
    }
  }

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classForm.className.trim() || !classForm.courseId || !classForm.lecturerId || !classForm.semesterId) {
      setClassError('Mata Kuliah, Semester, Dosen, dan Nama Kelas wajib diisi.')
      return
    }
    setClassSubmitting(true)
    setClassError(null)

    try {
      const isEdit = !!selectedClassId;
      const res = await fetch('/api/v1/classes', {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ...classForm, id: selectedClassId })
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || '-')

      setClassSuccess(json.message)
      showAlert('success', isEdit ? `Kelas ${classForm.className} berhasil diperbarui.` : `Kelas baru ${classForm.className} berhasil dibuka di LMS.`)

      setTimeout(() => {
        setShowClassModal(false)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setClassError(err.message || '-')
    } finally {
      setClassSubmitting(false)
    }
  }

  const handleDeleteClass = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/classes?id=${id}`, { method: 'DELETE', headers: authHeaders });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || '-');
      showAlert('success', 'Kelas berhasil dihapus.');
      router.refresh();
    } catch (err: any) {
      showAlert('error', `Gagal menghapus kelas: ${err.message}`);
    }
  }

  // --- Filtering calculations ---
  const filteredStudents = initialStudents.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nim?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter Calon Mahasiswa (PMB) to exclude those who are already verified/enrolled
  const filteredPmb = initialPmbApplicants.filter(p => {
    if (p.status === 'enrolled' || p.assigned_nim) return false
    return (p.name || p.full_name)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredLecturers = initialLecturers.filter(d =>
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.nip?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.nidn?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredClasses = classesList.filter(c => {
    const q = searchQuery.toLowerCase()
    return (
      c.courseCode?.toLowerCase().includes(q) ||
      c.courseName?.toLowerCase().includes(q) ||
      c.className?.toLowerCase().includes(q) ||
      c.classCode?.toLowerCase().includes(q) ||
      c.lecturerName?.toLowerCase().includes(q)
    )
  })

  // Filter announcements based on sub-tabs
  const filteredAnnouncements = initialAnnouncements.filter(ann => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = ann.title?.toLowerCase().includes(query) || ann.description?.toLowerCase().includes(query)
    if (!matchesSearch) return false

    if (annFilterTab === 'pmb') {
      return ['Jalur Pendaftaran', 'Program Studi', 'Biaya & Beasiswa', 'Fasilitas', 'PMB / Calon Mahasiswa'].includes(ann.category)
    } else if (annFilterTab === 'student') {
      return ann.category === 'Mahasiswa Aktif'
    } else if (annFilterTab === 'lecturer') {
      return ann.category === 'Dosen Akademik'
    }
    return true
  })

  return (
    <div className="flex h-screen bg-[#F9FAFB] dark:bg-[#080B11] transition-colors text-slate-900 overflow-hidden font-sans">

      <aside className={`hidden md:flex flex-col shrink-0 border-r border-slate-200 bg-white dark:bg-[#080B11] dark:border-white/5 relative z-50 shadow-sm transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        {/* Particle/Abstract background effect */}
        <div className="absolute inset-0 opacity-100 pointer-events-none mt-[100px] dark:hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse"></div>
          <div className="absolute top-40 -left-10 w-40 h-40 bg-indigo-300 rounded-full mix-blend-screen filter blur-3xl opacity-40"></div>
          <div className="absolute -bottom-20 right-20 w-40 h-40 bg-cyan-200 rounded-full mix-blend-screen filter blur-3xl opacity-50"></div>
          <div className="absolute top-1/2 left-1/4 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
        </div>

        {/* Brand Crest Header */}
        <div className="relative z-10 flex items-center gap-3 px-6 h-[100px] bg-white dark:bg-[#080B11] dark:border-white/5 shrink-0 border-b border-slate-200 shadow-sm transition-colors">
          <div className="relative w-[40px] h-[40px] shrink-0 flex items-center justify-center pointer-events-none">
            <Image
              src="/logo-stmik-jayakarta.webp"
              alt="STMIK Jayakarta"
              fill
              sizes="40px"
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col justify-center">
              <h2 className="text-xl font-black tracking-tight text-blue-950 dark:text-white leading-none">SIAKAD</h2>
              <p className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest mt-1">STMIK JAYAKARTA</p>
            </div>
          )}
        </div>

        {/* Tab Navigation Menu */}
        <nav className="relative z-10 flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {!collapsed && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-blue-200/60 px-3 mb-3 transition-colors">Menu Utama</p>}

          <button
            onClick={() => { setActiveTab('dashboard'); setSearchQuery('') }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'dashboard'
              ? 'bg-blue-50 text-blue-700 dark:bg-white/20 dark:text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
          >
            <LayoutDashboard className={`h-4 w-4 ${activeTab === 'dashboard' ? 'text-blue-700 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`} />
            Dashboard Induk
          </button>

          <button
            onClick={() => { setActiveTab('mahasiswa'); setSearchQuery('') }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'mahasiswa'
              ? 'bg-blue-50 text-blue-700 dark:bg-white/20 dark:text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <Users className={`h-4 w-4 ${activeTab === 'mahasiswa' ? 'text-blue-700 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`} />
              <span>Mahasiswa Aktif</span>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {filteredStudents.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('pmb'); setSearchQuery('') }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'pmb'
              ? 'bg-blue-50 text-blue-700 dark:bg-white/20 dark:text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck className={`h-4 w-4 ${activeTab === 'pmb' ? 'text-blue-700 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`} />
              <span>Calon Mahasiswa</span>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {filteredPmb.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('dosen'); setSearchQuery('') }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'dosen'
              ? 'bg-blue-50 text-blue-700 dark:bg-white/20 dark:text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <GraduationCap className={`h-4 w-4 ${activeTab === 'dosen' ? 'text-blue-700 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`} />
              <span>Tenaga Pengajar</span>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {initialLecturers.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('kelas'); setSearchQuery('') }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'kelas'
              ? 'bg-blue-50 text-blue-700 dark:bg-white/20 dark:text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <BookOpen className={`h-4 w-4 ${activeTab === 'kelas' ? 'text-blue-700 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`} />
              <span>Kelas & Nilai</span>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {classesList.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('pengumuman'); setSearchQuery('') }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'pengumuman'
              ? 'bg-blue-50 text-blue-700 dark:bg-white/20 dark:text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <Megaphone className={`h-4 w-4 ${activeTab === 'pengumuman' ? 'text-blue-700 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`} />
              <span>Pengumuman</span>
            </div>
          </button>

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-blue-200/60 px-3 pt-6 mb-3 transition-colors">Sistem & Log</p>

          <button
            onClick={() => { setActiveTab('log_backup'); setSearchQuery('') }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'log_backup'
              ? 'bg-blue-50 text-blue-700 dark:bg-white/20 dark:text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
          >
            <History className={`h-4 w-4 ${activeTab === 'log_backup' ? 'text-blue-700 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`} />
            Log Backup Dosen
          </button>

          <button
            onClick={() => { setActiveTab('portal_pmb'); setSearchQuery('') }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'portal_pmb'
              ? 'bg-blue-50 text-blue-700 dark:bg-white/20 dark:text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
          >
            <Sparkles className={`h-4 w-4 ${activeTab === 'portal_pmb' ? 'text-blue-700 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`} />
            Portal PMB
          </button>

          <button
            onClick={() => { setActiveTab('sync'); setSearchQuery('') }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'sync'
              ? 'bg-blue-50 text-blue-700 dark:bg-white/20 dark:text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
          >
            <History className={`h-4 w-4 ${activeTab === 'sync' ? 'text-blue-700 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`} />
            Riwayat Integrasi LMS
          </button>

          <button
            onClick={() => { setActiveTab('setting_perkuliahan'); setSearchQuery('') }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'setting_perkuliahan'
              ? 'bg-blue-50 text-blue-700 dark:bg-white/20 dark:text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
          >
            <Calendar className={`h-4 w-4 ${activeTab === 'setting_perkuliahan' ? 'text-blue-700 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`} />
            Setting Perkuliahan
          </button>
        </nav>

        {/* Footer Admin info */}
        <div className="p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#080B11] text-xs flex items-center gap-3 transition-colors">
          <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-blue-800 border border-slate-300 dark:border-white/20 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-white">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 dark:text-white truncate leading-none">Administrator</p>
            <span className="text-[10px] text-slate-500 dark:text-blue-200 mt-1 block">STMIK Jayakarta</span>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[108px] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:border-blue-500 cursor-pointer z-50 transition-all shadow-sm"
          title="Toggle Sidebar"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Navbar Header (Clean Academic Theme) */}
        <header className="h-24 border-b border-slate-200 bg-white px-8 sm:px-10 z-10 shrink-0 flex items-center justify-between dark:bg-[#080B11] dark:border-white/5 transition-colors">

          <div className="flex items-center gap-4">
            <div className="hidden sm:block py-1">
              <h1 className="text-xl font-black text-blue-950 dark:text-white tracking-tight leading-none capitalize">
                {greeting} jayakarta
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mt-1.5">
                Semangat beraktivitas!!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer shadow-sm dark:border-white/10 dark:bg-[#111A2B] dark:text-gray-300 dark:hover:bg-[#1A2640]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Global Transient Alerts */}
        {alertMsg && (
          <div className={`fixed top-28 right-10 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-lg border shadow-lg animate-fade-in ${alertMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p className="text-sm font-bold">{alertMsg.text}</p>
          </div>
        )}

        {/* 3. Dynamic Section Board */}
        <main className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-8">

          {/* TAB 1: DASHBOARD PORTAL OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">

              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-black text-blue-950 dark:text-white">Dashboard Akademik</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Ringkasan data rekapitulasi sistem informasi akademik STMIK Jayakarta.
                </p>
              </div>

              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#121B2E] flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-[#080B11]/20 shrink-0">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide block">Mahasiswa Aktif</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white block">{filteredStudents.length}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#121B2E] flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/20 shrink-0">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide block">Calon Mahasiswa</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white block">{filteredPmb.length}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#121B2E] flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide block">Kelas Akademik</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white block">{classesList.length}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#121B2E] flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-50 text-violet-600 dark:bg-violet-950/20 shrink-0">
                    <History className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide block">Log Sinkronisasi</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white block">{initialReceipts.length}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 text-blue-500" />
                      Riwayat Sinkronisasi Terbaru
                    </h3>
                    <button
                      onClick={() => setActiveTab('sync')}
                      className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Semua Log
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#121B2E] divide-y divide-slate-100 dark:divide-slate-800">
                    {initialReceipts.slice(0, 5).map((rec: any) => (
                      <div key={rec.id} className="px-3 py-2.5 flex items-center justify-between text-[11px]">
                        <div className="min-w-0 pr-3">
                          <p className="font-medium text-slate-800 dark:text-white truncate">{rec.course_name}</p>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {rec.course_code} -- {rec.semester} {rec.academic_year}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium ${rec.status === 'processed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                            }`}>
                            {rec.records_received} mhs -- {rec.status}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {new Date(rec.processed_at || rec.received_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                    {initialReceipts.length === 0 && (
                      <div className="py-6 text-center text-slate-400 text-[11px]">Belum ada sinkronisasi.</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Megaphone className="h-3.5 w-3.5 text-amber-500" />
                      Pengumuman
                    </h3>
                    <button
                      onClick={() => setActiveTab('pengumuman')}
                      className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Kelola
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#121B2E] divide-y divide-slate-100 dark:divide-slate-800">
                    {initialAnnouncements.slice(0, 3).map((ann: any) => (
                      <div key={ann.id} className="px-3 py-2.5 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[9px] font-medium uppercase ${ann.is_highlight ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                            {ann.category}
                          </span>
                          {ann.is_highlight && (
                            <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1 py-0.5 rounded text-[8px] font-medium">Utama</span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-slate-800 dark:text-white">{ann.title}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{ann.description}</p>
                      </div>
                    ))}
                    {initialAnnouncements.length === 0 && (
                      <div className="py-6 text-center text-slate-400 text-[11px]">Belum ada pengumuman.</div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ACTIVE STUDENTS LIST */}
          {activeTab === 'mahasiswa' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Daftar Mahasiswa Aktif
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Seluruh mahasiswa yang terdaftar dengan NIM resmi di STMIK Jayakarta
                  </p>
                </div>

                {/* Search query input */}
                <div className="relative w-full sm:w-72 shrink-0 flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, NIM..."
                    className="block w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 dark:border-slate-800 dark:bg-[#121B2E] dark:text-white"
                  />
                </div>
              </div>

              <p className="text-[9px] text-slate-400 dark:text-slate-500 dark:text-slate-400">Geser tabel ke kanan untuk melihat semua kolom</p>
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#121B2E] overflow-hidden">
                <div className={TABLE_SCROLL}>
                  <table className={TABLE_BASE}>
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className={TH_CELL}>Nama Lengkap</th>
                        <th className={TH_CELL}>NIM</th>
                        <th className={TH_CELL}>Email</th>
                        <th className={TH_CELL}>Telepon</th>
                        <th className={TH_CELL}>Tanggal Lahir</th>
                        <th className={TH_CELL}>Program Studi</th>
                        <th className={TH_CELL}>Angkatan</th>
                        <th className={TH_CELL}>Alamat</th>
                        <th className={`${TH_CELL} text-center`}>Status</th>
                        <th className={`${TH_CELL} text-right`}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((stud: any) => (
                        <tr key={stud.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className={`${TD_CELL} font-medium text-slate-800 dark:text-white`}>{stud.name}</td>
                          <td className={`${TD_CELL} font-mono text-slate-600 dark:text-slate-400`}>{stud.nim}</td>
                          <td className={`${TD_CELL} text-slate-500 dark:text-slate-400`}>{stud.email || '-'}</td>
                          <td className={`${TD_CELL} text-slate-500 dark:text-slate-400`}>{stud.phone || '-'}</td>
                          <td className={`${TD_CELL} text-slate-500 dark:text-slate-400`}>{formatTanggalLahir(stud.date_of_birth)}</td>
                          <td className={`${TD_CELL} text-blue-600 dark:text-blue-400 font-medium`}>{resolveProgramStudi(stud)}</td>
                          <td className={`${TD_CELL} text-slate-500 dark:text-slate-400`}>{stud.enrollment_year || '-'}</td>
                          <td className={`${TD_CELL} text-slate-500 dark:text-slate-400 max-w-[220px]`} title={stud.address || ''}>{stud.address || '-'}</td>
                          <td className={`${TD_CELL} text-center`}>
                            <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                              {stud.is_active === false ? 'Nonaktif' : 'Aktif'}
                            </span>
                          </td>
                          <td className={`${TD_CELL} text-right whitespace-nowrap`}>
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedStudentId(stud.id);
                                  setStudentForm({
                                    name: stud.name || '',
                                    nim: stud.nim || '',
                                    phone: stud.phone || '',
                                    address: stud.address || '',
                                    gender: stud.gender || '',
                                    dateOfBirth: stud.date_of_birth ? new Date(stud.date_of_birth).toISOString().split('T')[0] : '',
                                    study_program_id: stud.study_program_id || ''
                                  });
                                  setShowStudentModal(true);
                                }}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                                title="Edit"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Yakin ingin menghapus mahasiswa ini? Tindakan ini tidak dapat dibatalkan.')) {
                                    handleDeleteStudent(stud.id);
                                  }
                                }}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                                title="Hapus"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-3 py-10 text-center text-slate-400 text-[11px]">
                            Tidak ada mahasiswa aktif yang cocok dengan pencarian.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PMB PROSPECTIVE STUDENTS & NIM ISSUANCE */}
          {activeTab === 'pmb' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-amber-600" />
                  Pendaftar Mahasiswa Baru (PMB)
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Verifikasi berkas calon pendaftar, edit program studi dan terbitkan NIM resmi mahasiswa
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative w-full sm:w-72 shrink-0 flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari pendaftar..."
                    className="block w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 dark:border-slate-800 dark:bg-[#121B2E] dark:text-white"
                  />
                </div>
              </div>

              <p className="text-[9px] text-slate-400 dark:text-slate-500 dark:text-slate-400">Geser tabel ke kanan untuk melihat semua kolom</p>
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#121B2E] overflow-hidden">
                <div className={TABLE_SCROLL}>
                  <table className={TABLE_BASE}>
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className={TH_CELL}>Nama Lengkap</th>
                        <th className={TH_CELL}>Email</th>
                        <th className={TH_CELL}>Telepon</th>
                        <th className={TH_CELL}>Tanggal Lahir</th>
                        <th className={TH_CELL}>Program Studi</th>
                        <th className={TH_CELL}>Alamat</th>
                        <th className={TH_CELL}>Status</th>
                        <th className={`${TH_CELL} text-right`}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredPmb.map((pmb: any) => (
                        <tr key={pmb.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className={`${TD_CELL} font-medium text-slate-800 dark:text-white`}>
                            {pmb.name || pmb.full_name}
                          </td>
                          <td className={`${TD_CELL} text-slate-600 dark:text-slate-400`}>{pmb.email}</td>
                          <td className={`${TD_CELL} text-slate-600 dark:text-slate-400`}>{pmb.phone || '-'}</td>
                          <td className={`${TD_CELL} text-slate-600 dark:text-slate-400`}>{formatTanggalLahir(pmb.date_of_birth)}</td>
                          <td className={TD_CELL}>
                            <span className={`font-medium ${!pmb.intended_program ? 'text-slate-400 dark:text-slate-500' : 'text-blue-600 dark:text-blue-400'}`}>
                              {formatProgramStudi(pmb.intended_program)}
                            </span>
                          </td>
                          <td className={`${TD_CELL} text-slate-500 dark:text-slate-400`} title={pmb.address || ''}>{pmb.address || '-'}</td>
                          <td className={TD_CELL}>
                            <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                              Pending Verifikasi
                            </span>
                          </td>
                          <td className={`${TD_CELL} text-right space-x-1`}>
                            <button
                              onClick={() => handleOpenPmbModal(pmb)}
                              className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-2 py-1.5 rounded-md font-medium text-[10px] transition-all shadow-sm whitespace-nowrap"
                              title="Verifikasi & Buat NIM"
                            >
                              Verifikasi
                            </button>
                            <button
                              onClick={() => handleOpenPmbEditModal(pmb)}
                              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-2 py-1.5 rounded-md font-medium text-[10px] transition-all shadow-sm"
                              title="Edit PMB"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeletePmb(pmb)}
                              className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 px-2 py-1.5 rounded-md font-medium text-[10px] transition-all shadow-sm"
                              title="Hapus PMB"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredPmb.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-3 py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <UserCheck className="h-6 w-6 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                  Tidak ada calon pendaftar PMB baru
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-500 dark:text-slate-400 mt-0.5">
                                  Data akan muncul ketika ada mahasiswa baru yang mendaftar via LMS
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LECTURERS (DOSEN) */}
          {activeTab === 'dosen' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    Daftar Dosen Akademik
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Dosen tetap terdaftar di STMIK Jayakarta
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleOpenDosenModal}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Dosen
                  </button>
                  <div className="relative w-full sm:w-56 flex items-center">
                    <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari dosen..."
                      className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[11px] text-slate-800 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-[#121B2E] dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 dark:text-slate-400">Geser tabel ke kanan untuk melihat semua kolom</p>
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#121B2E] overflow-hidden">
                <div className={TABLE_SCROLL}>
                  <table className={TABLE_BASE}>
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className={TH_CELL}>Nama Lengkap</th>
                        <th className={TH_CELL}>NIP</th>
                        <th className={TH_CELL}>NIDN</th>
                        <th className={TH_CELL}>Email</th>
                        <th className={TH_CELL}>Telepon</th>
                        <th className={TH_CELL}>Tanggal Lahir</th>
                        <th className={TH_CELL}>Alamat</th>
                        <th className={`${TH_CELL} text-center`}>Status</th>
                        <th className={`${TH_CELL} text-right`}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLecturers.map((doc: any) => (
                        <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className={`${TD_CELL} font-medium text-slate-800 dark:text-white`}>{doc.name}</td>
                          <td className={`${TD_CELL} font-mono text-slate-600 dark:text-slate-400`}>{doc.nip || '-'}</td>
                          <td className={`${TD_CELL} font-mono text-slate-600 dark:text-slate-400`}>{doc.nidn || '-'}</td>
                          <td className={`${TD_CELL} text-slate-500 dark:text-slate-400`}>{doc.email || '-'}</td>
                          <td className={`${TD_CELL} text-slate-500 dark:text-slate-400`}>{doc.phone || '-'}</td>
                          <td className={`${TD_CELL} text-slate-500 dark:text-slate-400`}>{formatTanggalLahir(doc.date_of_birth)}</td>
                          <td className={`${TD_CELL} text-slate-500 dark:text-slate-400`} title={doc.address || ''}>{doc.address || '-'}</td>
                          <td className={`${TD_CELL} text-center`}>
                            <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
                              {doc.is_active === false ? 'Nonaktif' : 'Aktif'}
                            </span>
                          </td>
                          <td className={`${TD_CELL} text-right whitespace-nowrap`}>
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedDosenId(doc.id)
                                  setDosenForm({
                                    fullName: doc.name || '',
                                    email: doc.email || '',
                                    nip: doc.nip || '',
                                    nidn: doc.nidn || '',
                                    phone: doc.phone || '',
                                    dateOfBirth: doc.date_of_birth ? new Date(doc.date_of_birth).toISOString().split('T')[0] : '',
                                    gender: doc.gender || '',
                                    address: doc.address || '',
                                    password: ''
                                  })
                                  setShowDosenModal(true)
                                }}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                                title="Edit"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Yakin ingin menghapus dosen ini? Tindakan ini tidak dapat dibatalkan.')) {
                                    handleDeleteDosen(doc.id);
                                  }
                                }}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                                title="Hapus"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredLecturers.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-3 py-10 text-center text-slate-400 text-[11px]">
                            Tidak ada data dosen yang cocok dengan pencarian.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLASSES & GRADE ROSTERS */}
          {activeTab === 'kelas' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    Kelas & Nilai Ujian
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Kelas dari LMS (live) + roster nilai hasil sinkronisasi
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleOpenClassModal}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Kelas
                  </button>
                  <div className="relative w-full sm:w-56 flex items-center">
                    <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari kelas..."
                      className="block w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[11px] dark:border-slate-800 dark:bg-[#121B2E] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {filteredClasses.map((cls) => (
                  <details
                    key={cls.id}
                    className="group rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#121B2E] [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex items-center justify-between px-3 py-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-[#080B11]/30 px-1.5 py-0.5 rounded">
                            {cls.courseCode}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">Kode: {cls.classCode || '-'}</span>
                        </div>
                        <h3 className="text-[11px] font-semibold text-slate-800 dark:text-white mt-1">{cls.className || cls.courseName}</h3>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {cls.semester} {cls.academicYear} -- {cls.credits} SKS -- Dosen: {cls.lecturerName || '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-500 dark:text-slate-400">
                        <div className="hidden sm:flex gap-3 pr-3 border-r border-slate-200 dark:border-slate-700">
                          <span>{cls.enrolledCount} mhs LMS</span>
                          <span>{cls.students.length} sync nilai</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedClassId(cls.id);
                              setClassForm({
                                courseId: cls.courseId || '',
                                semesterId: cls.semesterId || '',
                                lecturerId: cls.lecturerId || '',
                                backupLecturerId: cls.backupLecturerId || '',
                                roomId: cls.roomId || '',
                                className: cls.className || '',
                                classSection: cls.classSection || '',
                                dayOfWeek: cls.dayOfWeek || '',
                                startTime: cls.startTime || '',
                                endTime: cls.endTime || '',
                                maxStudents: cls.maxStudents?.toString() || '40'
                              });
                              setShowClassModal(true);
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                            title="Edit"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (confirm('Yakin ingin menghapus kelas ini? Tindakan ini tidak dapat dibatalkan.')) {
                                handleDeleteClass(cls.id);
                              }
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                            title="Hapus"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 transition group-open:rotate-90 ml-1" />
                      </div>
                    </summary>
                    <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-3">
                      <p className="text-[9px] text-slate-400 mb-2">Geser tabel untuk melihat roster nilai sync</p>
                      {cls.students.length === 0 ? (
                        <p className="text-[10px] text-slate-400 py-4 text-center">
                          Belum ada nilai tersinkron. Mahasiswa terdaftar di LMS: {cls.enrolledCount}.
                        </p>
                      ) : (
                        <div className={TABLE_SCROLL}>
                          <table className={TABLE_BASE}>
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                              <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className={TH_CELL}>NIM</th>
                                <th className={TH_CELL}>Nama</th>
                                <th className={`${TH_CELL} text-center`}>Absensi</th>
                                <th className={`${TH_CELL} text-right`}>Nilai</th>
                                <th className={`${TH_CELL} text-center`}>Huruf</th>
                                <th className={`${TH_CELL} text-right`}>Indeks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {cls.students.map((r: any) => (
                                <tr key={r.id}>
                                  <td className={`${TD_CELL} font-mono`}>{r.nim}</td>
                                  <td className={`${TD_CELL} font-medium text-slate-800 dark:text-white`}>{r.student_name}</td>
                                  <td className={`${TD_CELL} text-center`}>{Number(r.attendance_percentage || 0).toFixed(0)}%</td>
                                  <td className={`${TD_CELL} text-right`}>{Number(r.final_score || 0).toFixed(1)}</td>
                                  <td className={`${TD_CELL} text-center`}>
                                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                      {r.letter_grade || '-'}
                                    </span>
                                  </td>
                                  <td className={`${TD_CELL} text-right font-mono`}>{Number(r.grade_points || 0).toFixed(1)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
                {filteredClasses.length === 0 && (
                  <div className="py-10 text-center text-slate-400 text-[11px] border border-dashed border-slate-200 rounded-lg dark:border-slate-800">
                    Belum ada kelas di LMS. Klik Tambah Kelas untuk membuat.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: ANNOUNCEMENTS CRUDS PANEL */}
          {activeTab === 'pengumuman' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Megaphone className="h-5 w-5 text-blue-500" />
                    Manajemen Pengumuman Akademik
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Menerbitkan pengumuman yang tersinkronisasi di berbagai portal LMS (PMB, Mahasiswa, & Dosen)
                  </p>
                </div>

                <button
                  onClick={() => handleOpenAnnModal()}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/10 hover:bg-blue-700 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Pengumuman
                </button>
              </div>

              {/* Sub-tab subsections filters (Subbab) */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 pb-1">
                {[
                  { id: 'all', label: 'Semua Pengumuman' },
                  { id: 'pmb', label: 'PMB / Calon Mahasiswa' },
                  { id: 'student', label: 'Mahasiswa Aktif' },
                  { id: 'lecturer', label: 'Dosen Akademik' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setAnnFilterTab(tab.id as any); setSearchQuery('') }}
                    className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${annFilterTab === tab.id
                      ? 'bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400 border-t-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Announcements Grid cards */}
              <div className="grid gap-6 sm:grid-cols-2">
                {filteredAnnouncements.map((ann: any) => (
                  <div
                    key={ann.id}
                    className={`rounded-xl border bg-white p-5 shadow-sm dark:bg-[#121B2E] transition-all hover:shadow-md flex flex-col justify-between ${ann.is_highlight
                      ? 'border-blue-300 dark:border-blue-800/60 shadow-blue-500/5'
                      : 'border-slate-200 dark:border-slate-800'
                      }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${ann.is_highlight ? 'text-blue-600 dark:text-blue-400' : 'text-slate-450'}`}>
                          Target: {ann.category}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          {ann.is_highlight && (
                            <span className="bg-blue-550/10 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase">
                              Utama / Highlight
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenAnnModal(ann)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleAnnDelete(ann.id)}
                            className="p-1 rounded hover:bg-red-50 text-red-500 dark:hover:bg-red-950/20 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm font-black text-slate-850 dark:text-white leading-snug">
                        {ann.title}
                      </h3>

                      <p className="text-[11px] text-slate-550 dark:text-gray-400 leading-relaxed font-semibold">
                        {ann.description}
                      </p>

                      {ann.media_url && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                          {ann.media_url.match(/\.(mp4|webm)$/i) ? (
                            <video src={ann.media_url} controls className="w-full h-32 object-cover" />
                          ) : (
                            <img src={ann.media_url} alt={ann.title} className="w-full h-32 object-cover" />
                          )}
                        </div>
                      )}

                      {ann.link_url && (
                        <div className="pt-1.5">
                          <a
                            href={ann.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Buka Tautan Lampiran
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between items-center text-[9px] font-bold text-slate-400">
                      <span>Tanggal: {ann.date_info || '-'}</span>
                      <span>Dibuat: {new Date(ann.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                ))}
                {filteredAnnouncements.length === 0 && (
                  <div className="sm:col-span-2 py-16 text-center text-slate-400 border border-slate-200 border-dashed rounded-xl bg-white dark:border-slate-800 dark:bg-[#121B2E]">
                    <Megaphone className="h-8 w-8 mx-auto text-slate-350 dark:text-slate-650 mb-2" />
                    <p className="font-bold text-xs">Belum ada pengumuman untuk subbab kategori ini.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Mulai dengan klik tombol "Tambah Pengumuman" di kanan atas.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PORTAL PMB */}
          {activeTab === 'portal_pmb' && (
            <div className="p-4 md:p-6 lg:p-8">
              <PmbManagerClient />
            </div>
          )}

          {/* TAB: LOG BACKUP DOSEN */}
          {activeTab === 'log_backup' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <History className="h-5 w-5 text-blue-500" />
                  Log Backup Dosen
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Rekapitulasi riwayat pendelegasian dosen pengganti melalui portal LMS
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#121B2E] overflow-x-auto">
                {backupLogsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <table className="w-full text-xs font-bold text-slate-650 dark:text-slate-350">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-widest text-left">
                        <th className="pb-3 pr-4">Waktu Dibuat</th>
                        <th className="pb-3 pr-4">Nama Dosen Pengganti</th>
                        <th className="pb-3 pr-4">Akun Login</th>
                        <th className="pb-3 pr-4">Mata Kuliah / Kelas</th>
                        <th className="pb-3 text-center">Batas Waktu (Expired)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {backupLogs.length > 0 ? backupLogs.map((log: any, i: number) => {
                        const isExpired = new Date(log.expiredAt) < new Date()
                        return (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{new Date(log.createdAt).toLocaleString('id-ID')}</td>
                            <td className="py-3 pr-4">
                              <p className="font-extrabold text-slate-850 dark:text-white">{log.backupName}</p>
                            </td>
                            <td className="py-3 pr-4 font-mono text-[10px] text-slate-400">{log.email}</td>
                            <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{log.className}</td>
                            <td className="py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${isExpired ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'}`}>
                                  {isExpired ? 'Expired' : 'Aktif'}
                                </span>
                                <span className="text-[9px] text-slate-400">{new Date(log.expiredAt).toLocaleString('id-ID')}</span>
                              </div>
                            </td>
                          </tr>
                        )
                      }) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                            Tidak ada riwayat pembuatan akun backup.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: SYNC LOGS HISTORY */}
          {activeTab === 'sync' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <History className="h-5 w-5 text-blue-500" />
                  Log Audit Integrasi LMS J-Learn
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Rekapitulasi batch pengiriman nilai terintegrasi dari portal pembelajaran J-Learn
                </p>
              </div>

              {/* Logs table */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#121B2E] overflow-x-auto">
                <table className="w-full text-xs font-bold text-slate-650 dark:text-slate-350">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-widest text-left">
                      <th className="pb-3 pr-4">Batch ID</th>
                      <th className="pb-3 pr-4">Mata Kuliah Sync</th>
                      <th className="pb-3 pr-4 text-center">Batch Ke-</th>
                      <th className="pb-3 pr-4 text-center">Data Diterima</th>
                      <th className="pb-3 pr-4 text-center">Data Ter-update</th>
                      <th className="pb-3 pr-4 text-right">Waktu Sinkronisasi</th>
                      <th className="pb-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {initialReceipts.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-3 pr-4 font-mono font-bold text-slate-500 dark:text-slate-400">
                          {rec.batch_id}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-extrabold text-slate-850 dark:text-white">{rec.course_name}</p>
                          <span className="text-[9px] font-bold text-slate-455 block uppercase mt-0.5">
                            {rec.course_code} - {rec.semester} {rec.academic_year}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {rec.batch_index} / {rec.total_batches}
                        </td>
                        <td className="py-3 pr-4 text-center text-slate-850 dark:text-white font-extrabold">
                          {rec.records_received} records
                        </td>
                        <td className="py-3 pr-4 text-center text-emerald-600 dark:text-emerald-450">
                          +{rec.records_inserted || rec.records_received} data
                        </td>
                        <td className="py-3 pr-4 text-right font-medium text-slate-400">
                          {new Date(rec.processed_at || rec.received_at).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${rec.status === 'processed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450'
                            }`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {initialReceipts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                          Tidak ada log audit integrasi terdaftar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: SETTING PERKULIAHAN */}
          {activeTab === 'setting_perkuliahan' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Setting Perkuliahan
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Kelola Periode Akademik Semester Aktif dan Persetujuan KRS/Daftar Ulang Rencana Studi Mahasiswa
                </p>
              </div>

              {/* Sub Navigation Sidebar/Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-px">
                <button
                  type="button"
                  onClick={() => setSubSettingTab('periode')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                    subSettingTab === 'periode'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Setting Periode
                </button>
                <button
                  type="button"
                  onClick={() => setSubSettingTab('daftar_ulang')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                    subSettingTab === 'daftar_ulang'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Setting Daftar Ulang (Persetujuan KRS)
                </button>
                <button
                  type="button"
                  onClick={() => setSubSettingTab('bobot_nilai')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                    subSettingTab === 'bobot_nilai'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Setting Bobot Nilai Master
                </button>
              </div>

              {/* Sub-Tab Content 1: Setting Periode */}
              {subSettingTab === 'periode' && (
                <div className="animate-fade-in max-w-xl mx-auto relative z-10">
                  {/* Form Tambah Periode Manual */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#121B2E]">
                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <PlusCircle className="h-4 w-4 text-blue-500" />
                      Input Periode Manual
                    </h3>

                    {semError && (
                      <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[10px] text-red-700 border border-red-100">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
                        {semError}
                      </div>
                    )}

                    {semSuccess && (
                      <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-[10px] text-emerald-700 border border-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
                        {semSuccess}
                      </div>
                    )}

                    <form onSubmit={handleCreateSemester} className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kode Semester</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 20261"
                          value={semForm.code}
                          onChange={(e) => setSemForm({ ...semForm, code: e.target.value })}
                          className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-800 dark:border-slate-750 dark:bg-[#18233C] dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Semester</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Semester Ganjil 2026/2027"
                          value={semForm.name}
                          onChange={(e) => setSemForm({ ...semForm, name: e.target.value })}
                          className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-800 dark:border-slate-750 dark:bg-[#18233C] dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tahun Akademik</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 2026/2027"
                          value={semForm.academicYear}
                          onChange={(e) => setSemForm({ ...semForm, academicYear: e.target.value })}
                          className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-800 dark:border-slate-750 dark:bg-[#18233C] dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipe Semester</label>
                        <select
                          value={semForm.semesterType}
                          onChange={(e) => setSemForm({ ...semForm, semesterType: e.target.value })}
                          className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-800 dark:border-slate-750 dark:bg-[#18233C] dark:text-white outline-none focus:border-blue-500"
                        >
                          <option value="Ganjil">Ganjil</option>
                          <option value="Genap">Genap</option>
                          <option value="Pendek">Pendek</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Mulai</label>
                          <input
                            type="date"
                            required
                            value={semForm.startDate}
                            onChange={(e) => setSemForm({ ...semForm, startDate: e.target.value })}
                            className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-850 dark:border-slate-750 dark:bg-[#18233C] dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Selesai</label>
                          <input
                            type="date"
                            required
                            value={semForm.endDate}
                            onChange={(e) => setSemForm({ ...semForm, endDate: e.target.value })}
                            className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-850 dark:border-slate-750 dark:bg-[#18233C] dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1.5">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={semForm.isActive}
                          onChange={(e) => setSemForm({ ...semForm, isActive: e.target.checked })}
                          className="rounded border-slate-250 bg-slate-50 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isActive" className="text-[10px] font-bold text-slate-600 dark:text-slate-350 cursor-pointer select-none">
                          Aktifkan langsung
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={semSubmitting}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 py-2 px-4 text-xs font-black text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-2"
                      >
                        {semSubmitting ? (
                          <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</>
                        ) : (
                          'Simpan Periode'
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Sub-Tab Content 2: Setting Daftar Ulang */}
              {subSettingTab === 'daftar_ulang' && (() => {
                const filteredEnrollments = enrollmentsList.filter((item: any) => {
                  const student = item.profiles || item.student || {}
                  const cls = item.classes || item.class || {}
                  const course = cls.courses || cls.course || {}
                  const studentName = student.name || ''
                  const studentNim = student.nim || ''
                  const courseName = course.name || cls.class_name || ''
                  const courseCode = course.code || ''
                  const classCode = cls.class_code || ''
                  const matchQuery = krsSearchQuery.toLowerCase()

                  return (
                    studentName.toLowerCase().includes(matchQuery) ||
                    studentNim.toLowerCase().includes(matchQuery) ||
                    courseName.toLowerCase().includes(matchQuery) ||
                    courseCode.toLowerCase().includes(matchQuery) ||
                    classCode.toLowerCase().includes(matchQuery)
                  )
                })

                return (
                  <div className="space-y-4 animate-fade-in">
                    {/* Info Header & Bulk Approve */}
                    <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-5 dark:border-blue-900/30 dark:bg-[#080B11]/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1.5 max-w-2xl">
                        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Info className="h-4 w-4 text-blue-500" />
                          Alur Persetujuan Rencana Studi (KRS)
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                          Mahasiswa baru/lama yang mengambil kelas daftar ulang akan masuk status <strong>Rencana Studi (Pending)</strong> terlebih dahulu. Kelas tidak akan diaktifkan di LMS mahasiswa sebelum disetujui Admin. Anda dapat menyetujui satu per satu, menghapusnya jika dibatalkan, atau melakukan persetujuan massal pada H-1 perkuliahan.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={krsActionLoading !== null}
                        onClick={handleApproveAllEnrollments}
                        className="self-start md:self-center shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/10 transition-all cursor-pointer"
                      >
                        {krsActionLoading === 'bulk' ? (
                          <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Memproses...</>
                        ) : (
                          <><CheckCircle2 className="h-4 w-4" /> Setujui Semua Rencana Studi (H-1)</>
                        )}
                      </button>
                    </div>

                    {/* Search Bar Filter */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#121B2E]">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari nama mahasiswa, NIM, mata kuliah, atau kode kelas pengajuan..."
                          value={krsSearchQuery}
                          onChange={(e) => setKrsSearchQuery(e.target.value)}
                          className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-750 dark:bg-[#18233C] dark:text-white outline-none focus:border-blue-500 focus:bg-white transition-all placeholder-slate-400"
                        />
                      </div>
                    </div>

                    {/* Table of Enrollments */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#121B2E] overflow-x-auto">
                      <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                        <span>Daftar Pengajuan KRS / Daftar Ulang</span>
                        <span className="text-[10px] text-slate-400 lowercase font-medium">menampilkan {filteredEnrollments.length} dari {enrollmentsList.length} data</span>
                      </h3>

                      <table className="w-full text-xs font-bold text-slate-650 dark:text-slate-350">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-widest text-left">
                            <th className="pb-3 pr-4">NIM</th>
                            <th className="pb-3 pr-4">Nama Mahasiswa</th>
                            <th className="pb-3 pr-4">Mata Kuliah & Kelas</th>
                            <th className="pb-3 pr-4 text-center">SKS</th>
                            <th className="pb-3 pr-4 text-center">Status KRS</th>
                            <th className="pb-3 pr-4">Tanggal Pengajuan</th>
                            <th className="pb-3 text-right">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredEnrollments.map((item: any) => {
                            const student = item.profiles || item.student || {}
                            const cls = item.classes || item.class || {}
                            const course = cls.courses || cls.course || {}
                            const isPending = item.status === 'dropped'
                            const isLoading = krsActionLoading === item.id

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                <td className="py-3.5 pr-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                  {student.nim || '-'}
                                </td>
                                <td className="py-3.5 pr-4 whitespace-nowrap">
                                  <p className="font-extrabold text-slate-850 dark:text-white">{student.name || '-'}</p>
                                </td>
                                <td className="py-3.5 pr-4 whitespace-nowrap">
                                  <p className="font-extrabold text-slate-850 dark:text-white">{course.name || cls.class_name}</p>
                                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Kelas {cls.class_section || 'A'} - Kode: {cls.class_code}</span>
                                </td>
                                <td className="py-3.5 pr-4 text-center font-extrabold text-blue-600 dark:text-blue-400">
                                  {course.credits || 3} SKS
                                </td>
                                <td className="py-3.5 pr-4 text-center whitespace-nowrap">
                                  {!isPending ? (
                                    <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                      Terdaftar (Aktif)
                                    </span>
                                  ) : (
                                    <span className="inline-flex rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                      Rencana Studi (Pending)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 pr-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                  {item.joined_at ? new Date(item.joined_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                </td>
                                <td className="py-3.5 text-right whitespace-nowrap">
                                  <div className="flex gap-2 justify-end">
                                    {isPending && (
                                      <button
                                        type="button"
                                        disabled={krsActionLoading !== null}
                                        onClick={() => handleApproveEnrollment(item.id)}
                                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 uppercase tracking-wider dark:bg-emerald-950/20 dark:text-emerald-450"
                                        title="Setujui Pengajuan KRS"
                                      >
                                        {isLoading ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Check className="h-3 w-3" />
                                        )}
                                        Setujui
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      disabled={krsActionLoading !== null}
                                      onClick={() => handleDeleteEnrollment(item.id)}
                                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 uppercase tracking-wider dark:bg-rose-950/20 dark:text-rose-450"
                                      title="Batalkan/Hapus KRS"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Hapus
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          {filteredEnrollments.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                                Tidak ada pengajuan KRS yang cocok dengan pencarian atau terdaftar.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* Sub-Tab Content 3: Setting Bobot Nilai */}
              {subSettingTab === 'bobot_nilai' && (
                <div className="animate-fade-in max-w-3xl">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#121B2E]">
                    <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-blue-500" />
                        Konfigurasi Bobot Master Akademik
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Bobot yang diatur di sini bersifat absolut. Dosen hanya akan menghitung nilai partisipasi/komponen internal di LMS. Ketika sinkronisasi dari LMS dilakukan, bobot ini yang menjadi penentu akhir dari Nilai Mutu mahasiswa. Pastikan total persentase sama dengan 100%.
                      </p>
                    </div>

                    {weightsMessage && (
                      <div className={`mb-5 flex items-start gap-2.5 rounded-lg border p-3.5 ${
                        weightsMessage.type === 'success' 
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-900/10'
                          : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/30 dark:bg-rose-900/10'
                      }`}>
                        {weightsMessage.type === 'success' ? (
                          <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${weightsMessage.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`} />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                        )}
                        <p className="text-xs font-semibold leading-relaxed">{weightsMessage.text}</p>
                      </div>
                    )}

                    <form onSubmit={handleSaveMasterWeights} className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Kehadiran (%)</label>
                          <input type="number" min="0" max="100" value={masterWeights.absen} onChange={(e) => setMasterWeights({...masterWeights, absen: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tugas (%)</label>
                          <input type="number" min="0" max="100" value={masterWeights.tugas} onChange={(e) => setMasterWeights({...masterWeights, tugas: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Kuis (%)</label>
                          <input type="number" min="0" max="100" value={masterWeights.kuis} onChange={(e) => setMasterWeights({...masterWeights, kuis: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">UTS (%)</label>
                          <input type="number" min="0" max="100" value={masterWeights.uts} onChange={(e) => setMasterWeights({...masterWeights, uts: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">UAS (%)</label>
                          <input type="number" min="0" max="100" value={masterWeights.uas} onChange={(e) => setMasterWeights({...masterWeights, uas: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none dark:bg-[#0D1424] dark:border-slate-700 dark:text-white" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Total Kalkulasi: <span className={`text-sm ${Number(masterWeights.absen) + Number(masterWeights.tugas) + Number(masterWeights.kuis) + Number(masterWeights.uts) + Number(masterWeights.uas) === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>{Number(masterWeights.absen) + Number(masterWeights.tugas) + Number(masterWeights.kuis) + Number(masterWeights.uts) + Number(masterWeights.uas)}%</span>
                        </div>
                        <button type="submit" disabled={weightsLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50">
                          {weightsLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Simpan Bobot
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* PMB Edit Modal */}
      {showPmbEditModal && selectedPmbEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0A0D14] w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-white">Edit Calon Mahasiswa</h3>
              </div>
              <button onClick={() => setShowPmbEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {pmbEditError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{pmbEditError}</p>
                </div>
              )}

              <form id="pmb-edit-form" onSubmit={handleEditPmbSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={pmbEditForm.fullName}
                    onChange={(e) => setPmbEditForm({ ...pmbEditForm, fullName: e.target.value })}
                    className="w-full bg-white dark:bg-[#111520] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Program Studi *</label>
                    <select
                      value={pmbEditForm.intendedProgram}
                      onChange={(e) => setPmbEditForm({ ...pmbEditForm, intendedProgram: e.target.value })}
                      className="w-full bg-white dark:bg-[#111520] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Pilih Prodi --</option>
                      {programsCatalog.map((prog: any) => (
                        <option key={prog.id} value={prog.code}>{prog.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">No. HP / WA</label>
                    <input
                      type="text"
                      value={pmbEditForm.phone}
                      onChange={(e) => setPmbEditForm({ ...pmbEditForm, phone: e.target.value })}
                      className="w-full bg-white dark:bg-[#111520] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={pmbEditForm.dateOfBirth}
                    onChange={(e) => setPmbEditForm({ ...pmbEditForm, dateOfBirth: e.target.value })}
                    className="w-full bg-white dark:bg-[#111520] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Alamat</label>
                  <textarea
                    rows={2}
                    value={pmbEditForm.address}
                    onChange={(e) => setPmbEditForm({ ...pmbEditForm, address: e.target.value })}
                    className="w-full bg-white dark:bg-[#111520] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPmbEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="pmb-edit-form"
                disabled={pmbEditSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {pmbEditSubmitting ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : <Save className="w-4 h-4" />}
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: VERIFY PMB & ASSIGN NIM */}
      {showPmbModal && selectedPmb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121B2E] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-850">
              <h3 className="text-sm font-black flex items-center gap-1.5 uppercase tracking-wider">
                <UserCheck className="h-4.5 w-4.5 text-amber-400" />
                Verifikasi Calon Mahasiswa
              </h3>
              <button onClick={() => setShowPmbModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyPmb} className="p-6 space-y-4">

              {/* Message Alerts */}
              {modalError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-800 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-tight">{modalError}</p>
                </div>
              )}

              {modalSuccess && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-tight">{modalSuccess}</p>
                </div>
              )}

                <div className="space-y-3">
                  <div className="flex flex-col border-b border-slate-50 dark:border-slate-800 pb-2 text-xs gap-1.5">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Nama Calon</span>
                    <input 
                      type="text" 
                      value={selectedPmb.name || selectedPmb.full_name || ''} 
                      onChange={(e) => setSelectedPmb({...selectedPmb, name: e.target.value})} 
                      className="w-full bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 font-extrabold text-slate-850 dark:text-white outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Email</span>
                    <span className="font-semibold text-slate-650 dark:text-gray-300 pr-1">{selectedPmb.email}</span>
                  </div>

                  <div className="flex flex-col border-b border-slate-50 dark:border-slate-800 pb-2 text-xs gap-1.5">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">WhatsApp</span>
                    <input 
                      type="text" 
                      value={selectedPmb.phone || ''} 
                      onChange={(e) => setSelectedPmb({...selectedPmb, phone: e.target.value})} 
                      className="w-full bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 font-semibold text-slate-650 dark:text-gray-300 outline-none focus:border-blue-500" 
                      placeholder="Contoh: 0812xxxx"
                    />
                  </div>

                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 text-xs">
                    <span className="text-slate-400 font-medium">Tanggal Lahir</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatTanggalLahir(selectedPmb.date_of_birth)}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 text-xs">
                    <span className="text-slate-400 font-medium">Program Studi</span>
                    <span className={`font-medium ${!selectedPmb.intended_program ? 'text-slate-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {formatProgramStudi(selectedPmb.intended_program)}
                    </span>
                  </div>

                  <div className="flex flex-col border-b border-slate-50 dark:border-slate-800 pb-2 text-xs gap-1.5">
                    <span className="text-slate-400 font-medium block mb-1">Alamat Domisili</span>
                    <textarea 
                      value={selectedPmb.address || ''} 
                      onChange={(e) => setSelectedPmb({...selectedPmb, address: e.target.value})} 
                      className="w-full bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed outline-none focus:border-blue-500 min-h-[60px]" 
                      placeholder="Alamat lengkap..."
                    />
                  </div>
                </div>

              {/* Issue NIM input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  Terbitkan Nomor Induk Mahasiswa (NIM)
                </label>
                <input
                  type="text"
                  value={generatedNim}
                  onChange={(e) => setGeneratedNim(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 font-mono font-black tracking-wider outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  placeholder="202611xxx"
                />
                <span className="text-[9px] text-slate-400 font-medium leading-normal block">
                  * Sistem otomatis mendaftarkan mahasiswa baru ke seluruh kelas aktif yang diampu program studi terkait.
                </span>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPmbModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 py-2.5 rounded-xl font-black text-xs text-slate-900 uppercase tracking-wide transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  {verifying ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-900" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Luluskan & Enroll
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: ANNOUNCEMENTS ADD/EDIT */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121B2E] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-850">
              <h3 className="text-sm font-black flex items-center gap-1.5 uppercase tracking-wider">
                <Megaphone className="h-4.5 w-4.5 text-blue-400" />
                {selectedAnn ? 'Perbarui Pengumuman' : 'Penerbitan Pengumuman Baru'}
              </h3>
              <button onClick={() => setShowAnnModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAnnSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

              {annError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-800 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-tight">{annError}</p>
                </div>
              )}

              {annSuccess && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-tight">{annSuccess}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Kategori / Target</label>
                  <select
                    value={annForm.category}
                    onChange={(e) => setAnnForm({ ...annForm, category: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="Jalur Pendaftaran">PMB: Jalur Pendaftaran</option>
                    <option value="Program Studi">PMB: Program Studi</option>
                    <option value="Biaya & Beasiswa">PMB: Biaya & Beasiswa</option>
                    <option value="Fasilitas">PMB: Fasilitas</option>
                    <option value="Mahasiswa Aktif">LMS: Mahasiswa Aktif</option>
                    <option value="Dosen Akademik">LMS: Dosen Akademik</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Keterangan Subteks / Tanggal</label>
                  <input
                    type="text"
                    value={annForm.date_info}
                    onChange={(e) => setAnnForm({ ...annForm, date_info: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                    placeholder="e.g. 01 Juli - 31 Agustus, Akreditasi: Unggul"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Judul Pengumuman</label>
                <input
                  type="text"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  placeholder="e.g. Pengumuman Ujian Tengah Semester Ganjil"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Konten Deskripsi Lengkap</label>
                <textarea
                  rows={4}
                  value={annForm.description}
                  onChange={(e) => setAnnForm({ ...annForm, description: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white resize-none"
                  placeholder="Ketik pengumuman detail di sini..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-slate-450" />
                  URL Media Lampiran (Opsional Gambar/Video)
                </label>
                <input
                  type="url"
                  value={annForm.media_url}
                  onChange={(e) => setAnnForm({ ...annForm, media_url: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  placeholder="https://example.com/assets/poster-akademik.png"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-450" />
                  Tautan Aksi Eksternal (Opsional Link CTA)
                </label>
                <input
                  type="url"
                  value={annForm.link_url}
                  onChange={(e) => setAnnForm({ ...annForm, link_url: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  placeholder="https://stmikjayakarta.ac.id/download-pdf"
                />
              </div>

              <div className="flex items-center gap-2 pt-2.5">
                <input
                  type="checkbox"
                  id="is_highlight"
                  checked={annForm.is_highlight}
                  onChange={(e) => setAnnForm({ ...annForm, is_highlight: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-slate-350 focus:ring-blue-500"
                />
                <label htmlFor="is_highlight" className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                  Tandai sebagai pengumuman utama (Highlight / Pin to Top)
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={annSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-2.5 rounded-xl font-black text-xs text-white uppercase tracking-wide transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  {annSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {selectedAnn ? 'Simpan Perubahan' : 'Terbitkan Pengumuman'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: EDIT STUDENT */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121B2E] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-[#080B11]/50">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Edit Data Mahasiswa
              </h3>
              <button onClick={() => setShowStudentModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {studentError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-800 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-tight">{studentError}</p>
                </div>
              )}
              {studentSuccess && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-tight">{studentSuccess}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">NIM</label>
                  <input
                    type="text"
                    required
                    value={studentForm.nim}
                    onChange={(e) => setStudentForm({ ...studentForm, nim: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Program Studi</label>
                  <select
                    value={studentForm.study_program_id}
                    onChange={(e) => setStudentForm({ ...studentForm, study_program_id: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="">-- Pilih Prodi --</option>
                    {programsCatalog?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Nomor Telepon</label>
                  <input
                    type="text"
                    value={studentForm.phone}
                    onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={studentForm.dateOfBirth}
                    onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Alamat</label>
                <textarea
                  value={studentForm.address}
                  onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                  rows={2}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={studentSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-2.5 rounded-xl font-black text-xs text-white uppercase tracking-wide transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  {studentSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 6. MODAL: ADD DOSEN (LECTURER) */}
      {showDosenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121B2E] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-850">
              <h3 className="text-sm font-black flex items-center gap-1.5 uppercase tracking-wider">
                <GraduationCap className="h-4.5 w-4.5 text-blue-400" />
                Registrasi Dosen Baru
              </h3>
              <button onClick={() => setShowDosenModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDosenSubmit} className="p-6 space-y-4">

              {dosenError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-800 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-tight">{dosenError}</p>
                </div>
              )}

              {dosenSuccess && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-tight">{dosenSuccess}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Nama Lengkap Dosen</label>
                <input
                  type="text"
                  required
                  value={dosenForm.fullName}
                  onChange={(e) => setDosenForm({ ...dosenForm, fullName: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  placeholder="e.g. Dr. H. Heri Hermawan, M.T."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    value={dosenForm.nip}
                    onChange={(e) => setDosenForm({ ...dosenForm, nip: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                    placeholder="1978xxxx"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">NIDN (Nasional)</label>
                  <input
                    type="text"
                    value={dosenForm.nidn}
                    onChange={(e) => setDosenForm({ ...dosenForm, nidn: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                    placeholder="0420xxxx"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">No. Telpon / WhatsApp</label>
                <input
                  type="tel"
                  value={dosenForm.phone}
                  onChange={(e) => setDosenForm({ ...dosenForm, phone: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  placeholder="0812xxxxxxxx"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={dosenForm.dateOfBirth}
                    onChange={(e) => setDosenForm({ ...dosenForm, dateOfBirth: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Jenis Kelamin</label>
                  <select
                    value={dosenForm.gender}
                    onChange={(e) => setDosenForm({ ...dosenForm, gender: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="">- Pilih Jenis Kelamin -</option>
                    <option value="L">Laki-Laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Alamat Domisili</label>
                <input
                  type="text"
                  value={dosenForm.address}
                  onChange={(e) => setDosenForm({ ...dosenForm, address: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  placeholder="e.g. Jl. Salemba Raya No. 24, Jakarta"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Kata Sandi Default (LMS)</label>
                <input
                  type="text"
                  required
                  value={dosenForm.password}
                  onChange={(e) => setDosenForm({ ...dosenForm, password: e.target.value })}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-855 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDosenModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={dosenSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-2.5 rounded-xl font-black text-xs text-white uppercase tracking-wide transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  {dosenSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {selectedDosenId ? 'Simpan Perubahan' : 'Daftarkan Dosen'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: ADD CLASS (TAMBAH KELAS) */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#121B2E] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-850">
              <h3 className="text-sm font-black flex items-center gap-1.5 uppercase tracking-wider">
                <BookOpen className="h-4.5 w-4.5 text-blue-400" />
                Buka Kelas Baru (LMS)
              </h3>
              <button onClick={() => setShowClassModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleClassSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

              {classError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-800 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-tight">{classError}</p>
                </div>
              )}

              {classSuccess && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-tight">{classSuccess}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Katalog Mata Kuliah</label>
                  <select
                    value={classForm.courseId}
                    onChange={(e) => handleCourseSectionChange(e.target.value, classForm.classSection)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="">-- Pilih Mata Kuliah </option>
                    {coursesCatalog.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name} ({c.credits} SKS)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Seksi / Seksi Kelas</label>
                  <select
                    value={classForm.classSection}
                    onChange={(e) => handleCourseSectionChange(classForm.courseId, e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="Reguler Pagi">Kelas Reguler Pagi</option>
                    <option value="Reguler Malam">Kelas Reguler Malam</option>
                    <option value="Karyawan">Kelas Karyawan</option>
                    <option value="Eksekutif">Kelas Eksekutif</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Nama Ruang Kelas (Generated)</label>
                <input
                  type="text"
                  required
                  value={classForm.className}
                  onChange={(e) => setClassForm({ ...classForm, className: e.target.value })}
                  className="block w-full rounded-xl border border-slate-250 bg-slate-100 py-2.5 px-3.5 text-xs text-slate-750 font-bold outline-none dark:border-slate-800 dark:bg-[#151F32] dark:text-gray-300"
                  placeholder="Mata Kuliah - Kelas Seksi"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Dosen Pengampu</label>
                  <select
                    value={classForm.lecturerId}
                    onChange={(e) => setClassForm({ ...classForm, lecturerId: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="">-- Pilih Dosen Akademik </option>
                    {initialLecturers.map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name} {l.nip ? `(NIP: ${l.nip})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Dosen Pengganti (Opsional)</label>
                  <select
                    value={classForm.backupLecturerId}
                    onChange={(e) => setClassForm({ ...classForm, backupLecturerId: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="">- Tanpa Dosen Pengganti -</option>
                    {initialLecturers.map((l: any) => (
                      <option key={`backup-${l.id}`} value={l.id}>{l.name} {l.nip ? `(NIP: ${l.nip})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Semester & Tahun Akademik</label>
                  <select
                    value={classForm.semesterId}
                    onChange={(e) => setClassForm({ ...classForm, semesterId: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="">-- Pilih Semester </option>
                    {semestersCatalog.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} {s.is_active ? '(Aktif)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Ruangan Kuliah</label>
                  <select
                    value={classForm.roomId}
                    onChange={(e) => setClassForm({ ...classForm, roomId: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="">-- Pilih Ruangan </option>
                    {roomsCatalog.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.code} ({r.name})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Kapasitas Maksimal Kelas</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={classForm.maxStudents}
                    onChange={(e) => setClassForm({ ...classForm, maxStudents: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-450">Hari</label>
                  <select
                    value={classForm.dayOfWeek}
                    onChange={(e) => setClassForm({ ...classForm, dayOfWeek: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Jam Mulai</label>
                  <input
                    type="time"
                    value={classForm.startTime}
                    onChange={(e) => setClassForm({ ...classForm, startTime: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-455">Jam Selesai</label>
                  <input
                    type="time"
                    value={classForm.endTime}
                    onChange={(e) => setClassForm({ ...classForm, endTime: e.target.value })}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-850 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-[#18233C] dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={classSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-2.5 rounded-xl font-black text-xs text-white uppercase tracking-wide transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  {classSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {selectedClassId ? 'Simpan Perubahan' : 'Buat Kelas'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}









