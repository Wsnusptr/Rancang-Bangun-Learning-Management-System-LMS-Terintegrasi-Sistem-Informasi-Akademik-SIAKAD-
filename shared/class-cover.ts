/**
 * Banner kelas otomatis dari gambar open-source (Unsplash CDN).
 * Shared LMS + SIAKAD.
 */

type CoverEntry = { keywords: string[]; url: string }

const COVER_LIBRARY: CoverEntry[] = [
  {
    keywords: ['web', 'html', 'css', 'javascript', 'frontend', 'react', 'php', 'pemrograman web'],
    url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  },
  {
    keywords: ['mobile', 'android', 'ios', 'flutter', 'kotlin'],
    url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  },
  {
    keywords: ['database', 'basis data', 'sql', 'postgresql', 'mysql', 'db'],
    url: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  },
  {
    keywords: ['jaringan', 'network', 'cisco', 'routing', 'komputer'],
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  },
  {
    keywords: ['algoritma', 'struktur data', 'logika', 'pemrograman', 'coding', 'program'],
    url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  },
  {
    keywords: ['kecerdasan', 'machine learning', 'deep learning', 'ai', 'data science', 'statistik'],
    url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  },
  {
    keywords: ['sistem operasi', 'linux', 'server', 'devops', 'cloud'],
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  },
  {
    keywords: ['desain', 'ui', 'ux', 'grafis', 'multimedia'],
    url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  },
  {
    keywords: ['matematika', 'kalkulus', 'aljabar', 'diskrit'],
    url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  },
  {
    keywords: ['bisnis', 'manajemen', 'ekonomi', 'akuntansi'],
    url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  },
  {
    keywords: ['sistem informasi', 'analisis', 'rekayasa'],
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  },
]

const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=900&h=360&q=80&fm=webp',
]

function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function resolveClassCoverUrl(courseName: string, courseCode = ''): string {
  const haystack = `${courseName} ${courseCode}`.toLowerCase()
  for (const entry of COVER_LIBRARY) {
    if (entry.keywords.some((kw) => haystack.includes(kw))) return entry.url
  }
  const seed = courseCode || courseName || 'default'
  return FALLBACK_COVERS[hashSeed(seed) % FALLBACK_COVERS.length]
}

export function getEffectiveClassCover(
  coverImageUrl: string | null | undefined,
  courseName: string,
  courseCode = ''
): string {
  if (coverImageUrl?.trim()) return coverImageUrl.trim()
  return resolveClassCoverUrl(courseName, courseCode)
}

export function resolveClassCoverColor(coverColor?: string | null): string {
  return coverColor?.trim() || '#1A3A6B'
}
