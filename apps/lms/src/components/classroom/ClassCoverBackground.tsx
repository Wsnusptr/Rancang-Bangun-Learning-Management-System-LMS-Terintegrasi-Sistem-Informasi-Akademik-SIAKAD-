'use client'

import { getEffectiveClassCover, resolveClassCoverColor } from '@/lib/class-cover'

interface ClassCoverBackgroundProps {
  coverColor?: string | null
  coverImageUrl?: string | null
  courseName?: string
  courseCode?: string
  className?: string
  overlayClassName?: string
}

/** Banner background - gambar otomatis per mata kuliah atau upload dosen */
export default function ClassCoverBackground({
  coverColor,
  coverImageUrl,
  courseName = '',
  courseCode = '',
  className = '',
  overlayClassName = 'bg-gradient-to-t from-black/70 via-black/35 to-black/20',
}: ClassCoverBackgroundProps) {
  const bgColor = resolveClassCoverColor(coverColor)
  const imageUrl = getEffectiveClassCover(coverImageUrl, courseName || 'Kelas', courseCode)

  return (
    <>
      <div className={`absolute inset-0 ${className}`} style={{ backgroundColor: bgColor }} />
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div className={`absolute inset-0 pointer-events-none ${overlayClassName}`} />
    </>
  )
}
