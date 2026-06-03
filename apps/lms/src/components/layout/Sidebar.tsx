import SidebarClient from './SidebarClient'

interface SidebarProps {
  role: 'student' | 'lecturer' | 'admin' | 'staff'
  name: string
  avatarUrl?: string | null
  isGuest?: boolean
}

type NavLink = { href: string; label: string; iconName: string }

export default function Sidebar({ role, name, avatarUrl, isGuest }: SidebarProps) {
  const guestLinks: NavLink[] = [
    { href: '/dashboard', label: 'Informasi PMB', iconName: 'Sparkles' },
    { href: '/pengumuman-pmb', label: 'Pengumuman PMB', iconName: 'Megaphone' },
    { href: '/pmb-chat', label: 'Tanya AI PMB', iconName: 'Bot' },
  ]

  const studentLinks: NavLink[] = [
    { href: '/dashboard', label: 'Kelas', iconName: 'BookOpen' },
    { href: '/todo', label: 'Daftar Tugas', iconName: 'ClipboardList' },
    { href: '/akademik', label: 'Akademik & KRS', iconName: 'GraduationCap' },
    { href: '/informasi-pmb', label: 'Informasi PMB', iconName: 'Sparkles' },
    { href: '/pengumuman-mahasiswa', label: 'Pengumuman Mahasiswa', iconName: 'Megaphone' },
  ]

  const lecturerLinks: NavLink[] = [
    { href: '/lecturer/dashboard', label: 'Kelas', iconName: 'BookOpen' },
    { href: '/lecturer/informasi-pmb', label: 'Informasi PMB', iconName: 'Sparkles' },
    { href: '/lecturer/pengumuman-mahasiswa', label: 'Pengumuman Mahasiswa', iconName: 'GraduationCap' },
    { href: '/lecturer/pengumuman-dosen', label: 'Pengumuman Dosen', iconName: 'Megaphone' },
    { href: '/lecturer/backup-dosen', label: 'Backup Dosen', iconName: 'Users' },
  ]

  const getLinks = (): NavLink[] => {
    if (role === 'admin' || role === 'staff' || role === 'lecturer') return lecturerLinks
    if (isGuest) return guestLinks
    return studentLinks
  }

  const links = getLinks()
  const displayRole = isGuest ? 'Calon Mahasiswa' : role === 'student' ? 'Mahasiswa' : role === 'lecturer' ? 'Dosen' : 'Admin'
  const profileHref = role === 'lecturer' || role === 'admin' || role === 'staff' ? '/lecturer/profile' : '/profile'

  return (
    <SidebarClient
      role={role}
      name={name}
      avatarUrl={avatarUrl}
      isGuest={isGuest}
      links={links}
      displayRole={displayRole}
      profileHref={profileHref}
    />
  )
}
