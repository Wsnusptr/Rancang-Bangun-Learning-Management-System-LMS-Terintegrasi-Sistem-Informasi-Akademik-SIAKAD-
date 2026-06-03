'use client'

const SIZE_MAP = {
  sm: { box: 'h-8 w-8', text: 'text-[9px]' },
  md: { box: 'h-12 w-12', text: 'text-[11px]' },
  lg: { box: 'h-16 w-16', text: 'text-sm' },
  xl: { box: 'h-20 w-20', text: 'text-base' },
} as const

type AvatarSize = keyof typeof SIZE_MAP

interface ProfileAvatarProps {
  src?: string | null
  name: string
  size?: AvatarSize
  className?: string
  borderClassName?: string
}

export default function ProfileAvatar({
  src,
  name,
  size = 'md',
  className = '',
  borderClassName = 'border-2 border-white',
}: ProfileAvatarProps) {
  const { box, text } = SIZE_MAP[size]
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div
      className={`${box} shrink-0 overflow-hidden rounded-full bg-slate-200 ${borderClassName} shadow-sm ${className}`}
      title={name}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className={`flex h-full w-full items-center justify-center bg-[#1A3A6B] font-semibold text-white ${text}`}>
          {initials}
        </div>
      )}
    </div>
  )
}
