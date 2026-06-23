import { cn } from '@/lib/utils'
import { BRAND, COLORS } from '@/lib/brand'

const sizes = {
  sm: {
    box: 'h-10 w-10',
    portal: 'text-[7px]',
    title: 'text-[11px] leading-snug',
    sub: 'text-[9px]',
    gap: 'gap-2.5',
  },
  md: {
    box: 'h-12 w-12',
    portal: 'text-[8px]',
    title: 'text-xs leading-snug',
    sub: 'text-[10px]',
    gap: 'gap-3',
  },
  lg: {
    box: 'h-14 w-14',
    portal: 'text-[9px]',
    title: 'text-sm leading-snug',
    sub: 'text-[11px]',
    gap: 'gap-3.5',
  },
} as const

/** Huy hiệu cổng TTĐT — khu nhà ở xã hội tầng thấp liền kề */
export function BrandMark({ className, size = 'md' }: { className?: string; size?: keyof typeof sizes }) {
  const s = sizes[size]

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(s.box, 'shrink-0 drop-shadow-sm', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="brand-bg" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor={COLORS.primaryDark} />
          <stop offset="1" stopColor={COLORS.primary} />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="10" fill="url(#brand-bg)" />
      <rect
        x="2.75"
        y="2.75"
        width="42.5"
        height="42.5"
        rx="9.25"
        fill="none"
        stroke={COLORS.gold}
        strokeWidth="0.75"
        opacity="0.85"
      />

      {/* Ngôi sao — biểu tượng nhà nước */}
      <path
        d="M24 9.5 L25 12.2 L27.8 12.2 L25.4 13.9 L26.4 16.6 L24 14.9 L21.6 16.6 L22.6 13.9 L20.2 12.2 L23 12.2 Z"
        fill={COLORS.govGold}
      />

      {/* Khu nhà ở xã hội — 3 căn liền kề 2 tầng, mái ngói, cùng chiều cao */}
      {[
        { x: 10.5, win: 12.5 },
        { x: 19.5, win: 21.5 },
        { x: 28.5, win: 30.5 },
      ].map(({ x, win }) => (
        <g key={x}>
          {/* Mái ngói đỏ */}
          <path d={`M${x} 27 L${x + 4} 22.5 L${x + 8} 27 Z`} fill={COLORS.govRed} />
          {/* Thân nhà 2 tầng */}
          <rect x={x + 0.5} y="27" width="7" height="7" rx="0.4" fill="#fff" />
          {/* Cửa sổ tầng 1 & 2 */}
          <rect x={x + 1.5} y="28.2" width="2" height="2" rx="0.25" fill={COLORS.primary} opacity="0.55" />
          <rect x={x + 4.5} y="28.2" width="2" height="2" rx="0.25" fill={COLORS.primary} opacity="0.55" />
          <rect x={x + 1.5} y="31.2" width="2" height="2" rx="0.25" fill={COLORS.primary} opacity="0.55" />
          <rect x={x + 4.5} y="31.2" width="2" height="2" rx="0.25" fill={COLORS.primary} opacity="0.55" />
          {/* Cửa chính */}
          <rect x={win} y="31.5" width="1.8" height="2.5" rx="0.2" fill={COLORS.primaryDark} opacity="0.75" />
        </g>
      ))}

      {/* Hàng rào / sân chung khu dân cư */}
      <path d="M9 34.5 H39" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      <path d="M11 34.5 V32.8 M15 34.5 V32.8 M33 34.5 V32.8 M37 34.5 V32.8" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />

      {/* Sọc cờ */}
      <rect x="8" y="38" width="32" height="1.5" rx="0.5" fill={COLORS.govRed} opacity="0.9" />
      <rect x="8" y="40" width="32" height="1.5" rx="0.5" fill={COLORS.govGold} opacity="0.9" />
      <rect x="8" y="42" width="32" height="1.5" rx="0.5" fill="#fff" opacity="0.55" />
    </svg>
  )
}

export function BrandWordmark({
  size = 'md',
  showPortal = true,
  showAcronym = true,
  inverse = false,
  className,
}: {
  size?: keyof typeof sizes
  showPortal?: boolean
  showAcronym?: boolean
  inverse?: boolean
  className?: string
}) {
  const s = sizes[size]
  return (
    <span className={cn('min-w-0 leading-none', className)}>
      {showPortal && (
        <span
          className={cn(
            'block font-semibold uppercase tracking-[0.14em]',
            inverse ? 'text-white/75' : 'text-slate-500 dark:text-slate-400',
            s.portal,
          )}
        >
          {BRAND.portalLine}
        </span>
      )}
      <span
        className={cn(
          'mt-0.5 block font-bold tracking-tight',
          inverse ? 'text-white' : 'text-[#003D7A] dark:text-slate-100',
          s.title,
          size === 'sm' ? 'line-clamp-2' : 'line-clamp-3',
        )}
      >
        {BRAND.projectName}
      </span>
      {showAcronym && (
        <span className={cn('mt-1 block font-semibold tracking-wide', inverse ? 'text-[#FFCD00]' : 'text-primary', s.sub)}>
          {BRAND.acronym}
          <span className={cn('ml-1.5 font-normal', inverse ? 'text-white/65' : 'text-slate-400 dark:text-slate-500')}>
            · {BRAND.acronymExpanded}
          </span>
        </span>
      )}
    </span>
  )
}

export function BrandLogo({
  size = 'md',
  showWordmark = true,
  showPortal,
  showAcronym = true,
  inverse = false,
  className,
}: {
  size?: keyof typeof sizes
  showWordmark?: boolean
  showPortal?: boolean
  showAcronym?: boolean
  inverse?: boolean
  className?: string
}) {
  const s = sizes[size]
  const portal = showPortal ?? size !== 'sm'

  return (
    <span className={cn('inline-flex min-w-0 items-center', s.gap, className)}>
      <BrandMark size={size} />
      {showWordmark && (
        <BrandWordmark size={size} showPortal={portal} showAcronym={showAcronym} inverse={inverse} />
      )}
    </span>
  )
}
