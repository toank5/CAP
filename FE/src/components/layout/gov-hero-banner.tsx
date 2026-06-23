import { cn } from '@/lib/utils'
import { GOV_IMAGES } from '@/lib/media'

interface GovHeroBannerProps {
  title: string
  subtitle?: string
  badge?: string
  className?: string
  compact?: boolean
}

/** Banner ảnh nền kiểu cổng dịch vụ công */
export function GovHeroBanner({ title, subtitle, badge, className, compact }: GovHeroBannerProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-primary/15 shadow-md shadow-primary/10',
        compact ? 'min-h-[120px]' : 'min-h-[160px] md:min-h-[200px]',
        className,
      )}
    >
      <img
        src={GOV_IMAGES.heroBanner}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#003D7A]/92 via-[#005BAC]/85 to-[#005BAC]/55" />
      <div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: `url(${GOV_IMAGES.pattern})`, backgroundSize: '24px 24px' }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DA251D] via-[#FFCD00] to-white/80" />

      <div className={cn('relative flex h-full flex-col justify-center px-5 py-5 text-white', compact ? 'md:px-6' : 'md:px-8 md:py-7')}>
        {badge && (
          <span className="mb-2 inline-flex w-fit rounded-full border border-white/30 bg-white/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
            {badge}
          </span>
        )}
        <h2 className={cn('font-bold leading-tight tracking-tight', compact ? 'text-lg md:text-xl' : 'text-xl md:text-2xl lg:text-3xl')}>
          {title}
        </h2>
        {subtitle && (
          <p className={cn('mt-1.5 max-w-2xl text-white/88', compact ? 'text-xs md:text-sm' : 'text-sm md:text-base')}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
