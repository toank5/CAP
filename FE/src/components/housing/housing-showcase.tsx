import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Heart,
  Layers,
  MapPin,
  Ruler,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import { useHousingProjects } from '@/hooks/useHousingProjects'
import { useWishlist } from '@/hooks/useWishlist'
import type { ProjectCard } from '@/lib/projects'

function goToProjectDetail(house: ProjectCard) {
  sessionStorage.setItem('projectId', house.id)
  navigate('project-detail')
}

// ─── Wishlist Toast ────────────────────────────────────────────────────────────
function WishlistToast({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 5000)
    return () => window.clearTimeout(id)
  }, [onClose])

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-sm animate-slide-up">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-600 to-emerald-500 p-px shadow-2xl shadow-emerald-500/30">
          <div className="relative rounded-2xl bg-white px-5 py-4 dark:bg-slate-900">
            {/* Nền gradient mờ */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10" />
            <div className="relative flex items-start gap-4">
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40">
                <Heart className="h-5 w-5 fill-white text-white" />
              </div>
              {/* Nội dung */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Đã thêm vào danh sách quan tâm
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                  {message}
                </p>
              </div>
              {/* Đóng */}
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Thanh tiến trình */}
            <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-2xl bg-slate-100 dark:bg-slate-800">
              <div className="h-full animate-shrink-width bg-gradient-to-r from-emerald-500 to-emerald-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PromoHero ────────────────────────────────────────────────────────────────
const PromoHero = memo(function PromoHero({
  house,
  fav,
  onToggleFavorite,
}: {
  house: ProjectCard
  fav: boolean
  onToggleFavorite: () => void
}) {
  return (
    <article className="soft-card overflow-hidden">
      <div className="grid md:grid-cols-2">
        {/* Ảnh */}
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[300px]">
          <img
            src={house.imageUrl}
            alt={house.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {/* Overlay nhẹ — không đậm như trước */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-slate-900/20" />
          {/* Badge dự án nổi bật */}
          <span className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur-sm">
            Nổi bật
          </span>
        </div>

        {/* Nội dung */}
        <div className="flex flex-col justify-center p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">
            Nhà ở xã hội
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-800 dark:text-white md:text-2xl">
            {house.name}
          </h2>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <MapPin className="h-4 w-4 shrink-0 text-blue-400" />
            {house.location}
          </p>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {house.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800">
              {house.area}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800">
              {house.status}
            </span>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Giá từ
            </p>
            <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">{house.price}</p>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{house.units}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => goToProjectDetail(house)} size="sm">
              Xem dự án <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFavorite}
              className="gap-1.5"
            >
              <Heart className={`h-4 w-4 ${fav ? 'fill-current text-red-400' : ''}`} />
              {fav ? 'Đã quan tâm' : 'Quan tâm'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
})

// ─── PromoCard ────────────────────────────────────────────────────────────────
const PromoCard = memo(function PromoCard({
  house,
  index,
  fav,
  onToggleFavorite,
}: {
  house: ProjectCard
  index: number
  fav: boolean
  onToggleFavorite: () => void
}) {
  return (
    <article
      className="soft-card flex flex-col overflow-hidden transition-shadow hover:shadow-md"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Ảnh */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={house.imageUrl}
          alt={house.name}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
        {/* Nút trái tim */}
        {onToggleFavorite && (
          <button
            type="button"
            aria-label="Quan tâm"
            className={`absolute right-3 top-3 rounded-full p-2 shadow-sm backdrop-blur-sm transition ${fav
                ? 'bg-blue-500 text-white'
                : 'bg-white/90 text-slate-400 hover:text-blue-500'
              }`}
            onClick={onToggleFavorite}
          >
            <Heart className={`h-4 w-4 ${fav ? 'fill-current' : ''}`} />
          </button>
        )}
        <p className="absolute bottom-3 left-3 right-3 truncate text-sm font-semibold text-white drop-shadow-sm">
          {house.name}
        </p>
      </div>

      {/* Nội dung */}
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          {house.location}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 px-3 py-3 text-center dark:bg-slate-800/60">
            <Ruler className="mx-auto h-4 w-4 text-blue-400" />
            <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">Diện tích</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{house.area}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-3 text-center dark:bg-slate-800/60">
            <Layers className="mx-auto h-4 w-4 text-emerald-400" />
            <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">Còn trống</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{house.availableUnits} căn</p>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{house.price}</p>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{house.units}</p>
        </div>

        <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {house.description}
        </p>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => goToProjectDetail(house)}
          >
            Chi tiết
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleFavorite} className="gap-1.5">
            <Heart className={`h-4 w-4 ${fav ? 'fill-current text-red-400' : ''}`} />
          </Button>
        </div>
      </div>
    </article>
  )
})

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}

// ─── Showcase Skeleton ─────────────────────────────────────────────────────────
function ShowcaseSkeleton() {
  return (
    <div className="space-y-5">
      <article className="soft-card overflow-hidden">
        <div className="grid md:grid-cols-2">
          <Skeleton className="aspect-[4/3] rounded-none md:aspect-auto md:min-h-[300px]" />
          <div className="space-y-3 p-6 md:p-8">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      </article>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <article key={i} className="soft-card overflow-hidden">
            <Skeleton className="aspect-[16/10] rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-3 w-2/3" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </div>
              <Skeleton className="h-7 w-1/2" />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// ─── Main Showcase ────────────────────────────────────────────────────────────
export function HousingShowcase() {
  const { projects, loading } = useHousingProjects(12)
  const { isWishlisted, toggle } = useWishlist()
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(id)
  }, [notice])

  const handleToggle = useCallback(
    async (house: ProjectCard) => {
      const added = await toggle(house.id)
      if (added) setNotice(`Đã thêm "${house.name}" vào danh sách quan tâm.`)
    },
    [toggle],
  )

  const toggleHandlers = useMemo(() => {
    const map = new Map<string, () => void>()
    projects.forEach((p) => {
      map.set(p.id, () => {
        void handleToggle(p)
      })
    })
    return map
  }, [projects, handleToggle])

  const { hero, rest } = useMemo(() => {
    const [first, ...others] = projects
    return { hero: first, rest: others }
  }, [projects])

  return (
    <section className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-sky-100 via-cyan-100 to-emerald-100 shadow-[0_20px_60px_rgba(37,99,235,0.16)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 dark:shadow-[0_20px_60px_rgba(15,23,42,0.35)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.20),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.14),transparent_22%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(52,211,153,0.12),transparent_22%)]" />
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8 xl:p-10">
          <div className="relative z-10 flex flex-col justify-center gap-4">
            <h1 className="max-w-[620px] text-3xl font-extrabold leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-4xl lg:text-[3.4rem] dark:text-white">
              Nơi kết nối người dân với nhà ở xã hội hiện đại và cộng đồng xanh.
            </h1>
            <p className="max-w-[620px] text-base leading-8 text-slate-700 dark:text-slate-300">
              Khám phá dự án xây dựng hạnh phúc trong không gian công cộng đầy ánh sáng ban mai, cây xanh và sự tin cậy từ cổng dịch vụ công.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                variant="default"
                className="rounded-xl bg-blue-600 px-6 py-3 text-white shadow-[0_15px_40px_rgba(37,99,235,0.20)] hover:bg-blue-700"
                onClick={() => navigate('projects')}
              >
                Khám phá dự án
              </Button>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[24px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-white/90 via-white/30 to-transparent" />
            <div className="absolute -left-6 top-10 h-28 w-28 rounded-full bg-[#2563EB]/10 blur-3xl" />
            <div className="absolute right-6 bottom-8 h-24 w-24 rounded-full bg-[#16A34A]/10 blur-3xl" />
            <div className="p-4 md:p-6">
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                whileHover={{ scale: 1.06 }}
                className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/75 shadow-[0_16px_40px_rgba(37,99,235,0.2)] dark:border-slate-700 dark:bg-slate-900/85 dark:shadow-[0_16px_40px_rgba(15,23,42,0.35)]"
                style={{ minHeight: '340px' }}
              >
                <motion.img
                  src="/assets/banner1.png"
                  alt="Banner nhà ở xã hội hiện đại"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.98, 1, 0.98] }}
                  transition={{ duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tiêu đề danh mục */}
      <SectionHeader
        title="Danh mục nhà ở xã hội"
        subtitle="Tra cứu dự án và theo dõi hồ sơ đã đăng ký qua cổng dịch vụ công."
      />

      {/* Danh sách dự án */}
      <div aria-busy={loading} aria-live="polite">
        {loading ? (
          <ShowcaseSkeleton />
        ) : hero ? (
          <div className="space-y-5">
            <PromoHero
              house={hero}
              fav={isWishlisted(hero.id)}
              onToggleFavorite={toggleHandlers.get(hero.id) ?? (() => { void handleToggle(hero) })}
            />
            {rest.length > 0 && (
              <SectionHeader
                title="Dự án đang mở bán"
                subtitle={`${rest.length} dự án được công bố chính thức trên toàn quốc.`}
              />
            )}
            {rest.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {rest.map((house, i) => (
                  <PromoCard
                    key={house.id}
                    house={house}
                    index={i}
                    fav={isWishlisted(house.id)}
                    onToggleFavorite={toggleHandlers.get(house.id) ?? (() => { void handleToggle(house) })}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có dự án nào được công bố.</p>
        )}
      </div>

      {/* Toast thông báo */}
      {notice && (
        <WishlistToast
          message={notice}
          onClose={() => setNotice(null)}
        />
      )}
    </section>
  )
}
