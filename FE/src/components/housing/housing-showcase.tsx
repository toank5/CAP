import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Heart,
  Layers,
  MapPin,
  Ruler,
  ShieldCheck,
  Sparkles,
  Dices,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Building2,
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
    const id = window.setTimeout(onClose, 4000)
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
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40">
                <Heart className="h-5 w-5 fill-white text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Đã lưu vào danh sách quan tâm
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                  {message}
                </p>
              </div>
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
            <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-2xl bg-slate-100 dark:bg-slate-800">
              <div className="h-full animate-shrink-width bg-gradient-to-r from-emerald-500 to-emerald-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Showcase Skeleton ─────────────────────────────────────────────────────────
function ShowcaseSkeleton() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-6 md:grid-cols-12">
          <Skeleton className="min-h-[260px] rounded-xl md:col-span-5" />
          <div className="space-y-4 md:col-span-7 flex flex-col justify-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-10 flex-1 rounded-xl" />
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <Skeleton className="aspect-[16/10] w-full rounded-xl" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Spotlight Bento Hero Project ──────────────────────────────────────────────
const SpotlightProjectCard = memo(function SpotlightProjectCard({
  house,
  fav,
  onToggleFavorite,
}: {
  house: ProjectCard
  fav: boolean
  onToggleFavorite: () => void
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="grid md:grid-cols-12 gap-0 items-stretch">
        {/* Left: Compact Feature Image (5 cols) */}
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[260px] md:max-h-[310px] md:col-span-5 overflow-hidden bg-slate-900 group">
          <img
            src={house.imageUrl}
            alt={house.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

          {/* Floating Badges on Image */}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-emerald-600/95 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-amber-300" />
              DỰ ÁN TIÊU BIỂU
            </span>
            <span className="rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
              {house.status}
            </span>
          </div>

          {/* Favorite button on image */}
          <button
            type="button"
            onClick={onToggleFavorite}
            className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow-md backdrop-blur-md transition active:scale-90 ${fav
              ? 'bg-rose-500 text-white'
              : 'bg-white/90 text-slate-600 hover:bg-white hover:text-rose-500 dark:bg-slate-900/90 dark:text-slate-300'
              }`}
            title={fav ? 'Bỏ lưu quan tâm' : 'Lưu quan tâm dự án'}
          >
            <Heart className={`h-4 w-4 ${fav ? 'fill-white' : ''}`} />
          </button>

          {/* Location bottom overlay */}
          <div className="absolute bottom-2.5 left-3 right-3 truncate text-xs font-medium text-white drop-shadow">
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-400" />
              <span className="truncate">{house.address || house.location}</span>
            </span>
          </div>
        </div>

        {/* Right: Project Info & Actions (7 cols) */}
        <div className="flex flex-col justify-between p-5 md:col-span-7 md:p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Building2 className="h-3.5 w-3.5" />
                Nhà ở xã hội tiêu chuẩn
              </span>
            </div>

            <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-white line-clamp-1">
              {house.name}
            </h3>

            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {house.description || 'Dự án nhà ở xã hội quy hoạch xanh, kết nối giao thông đồng bộ, hỗ trợ chính sách an cư bền vững.'}
            </p>

            {/* Quick Metrics Grid */}
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-center dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400">
                  <Ruler className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] font-medium">Diện tích</span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100">{house.area}</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-center dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400">
                  <Layers className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] font-medium">Quỹ căn</span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100">{house.availableUnits} căn trống</p>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Price and Actions on same line */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 dark:border-slate-800">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mức giá tham chiếu
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {house.price}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-200"
                onClick={() => goToProjectDetail(house)}
              >
                Chi tiết dự án <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
                onClick={() => {
                  sessionStorage.setItem('projectId', house.id)
                  navigate('create-application')
                }}
              >
                Nộp hồ sơ ngay
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
})

// ─── Curated Project Card ──────────────────────────────────────────────────────
const ProjectGridCard = memo(function ProjectGridCard({
  house,
  fav,
  onToggleFavorite,
}: {
  house: ProjectCard
  fav: boolean
  onToggleFavorite: () => void
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      {/* Thumbnail Area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
        <img
          src={house.imageUrl}
          alt={house.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

        {/* Top Floating Badges */}
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-emerald-600/90 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-md">
            {house.status}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          aria-label="Quan tâm"
          onClick={onToggleFavorite}
          className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow-md backdrop-blur-md transition active:scale-90 ${fav
            ? 'bg-rose-500 text-white'
            : 'bg-white/90 text-slate-500 hover:bg-white hover:text-rose-500 dark:bg-slate-900/90 dark:text-slate-300'
            }`}
        >
          <Heart className={`h-4 w-4 ${fav ? 'fill-white' : ''}`} />
        </button>

        {/* Location Bottom Overlay */}
        <div className="absolute bottom-2.5 left-3 right-3 truncate text-xs font-medium text-white drop-shadow">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
            <span className="truncate">{house.location}</span>
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 transition group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400 line-clamp-1">
            {house.name}
          </h3>

          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 dark:text-slate-400 leading-relaxed">
            {house.description || 'Dự án nhà ở xã hội tiêu chuẩn, chính sách vay vốn ưu đãi và tiến độ thanh toán minh bạch.'}
          </p>

          {/* Metrics Pill Row */}
          <div className="mt-3.5 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Diện tích</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{house.area}</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Khả dụng</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{house.availableUnits} căn</span>
            </div>
          </div>
        </div>

        {/* Card Footer: Price & CTA grouped naturally */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Giá tham chiếu
            </span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 truncate block">
              {house.price}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 text-xs font-semibold px-2.5 h-8 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => goToProjectDetail(house)}
            >
              Chi tiết
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-emerald-600 text-xs font-semibold px-3 h-8 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
              onClick={() => {
                sessionStorage.setItem('projectId', house.id)
                navigate('create-application')
              }}
            >
              Nộp hồ sơ
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
})

// ─── Home Hero Banner (Modern Government & Proptech) ───────────────────────────
const BANNER_SLIDES = [
  {
    src: '/assets/hero-eco-residence.jpg',
    title: 'Khu Đô Thị Xã Hội Kiểu Mẫu',
    subtitle: 'Quy hoạch xanh đồng bộ, kiến trúc hiện đại, tiện ích sống hoàn chỉnh',
    tag: 'Cộng đồng xanh 2026',
  },
  {
    src: '/assets/hero-family-balcony.jpg',
    title: 'Mái Ấm An Cư & Khởi Đầu Tương Lai',
    subtitle: 'Hiện thực hóa ước mơ sở hữu nhà ở chất lượng cao cho mọi gia đình',
    tag: 'Chính sách nhân văn',
  },
]

function HomeHeroBanner() {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (isHovered) return
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % BANNER_SLIDES.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [isHovered])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-[32px] border border-sky-300/30 bg-gradient-to-br from-[#1d4ed8] via-[#0284c7] to-[#0d9488] text-white shadow-2xl shadow-blue-600/20"
    >
      {/* Dynamic Ambient Background Glows */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-80 w-80 rounded-full bg-white/25 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-20 right-1/3 h-80 w-80 rounded-full bg-emerald-300/20 blur-[100px]" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-sky-200/30 blur-[90px]" />

      {/* Grid Pattern Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:gap-8 lg:p-10 xl:p-12 items-center">
        {/* LEFT COLUMN: HERO HEADLINE & TRUST STATS (7 COLS) */}
        <div className="space-y-6 lg:col-span-7 flex flex-col justify-center">
          {/* Top Badge (No law year) */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/35 bg-white/20 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300"></span>
            </span>
            <span>CỔNG THÔNG TIN ĐIỆN TỬ QUỐC GIA VỀ NHÀ Ở XÃ HỘI</span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-[2.65rem] xl:text-[3rem] leading-[1.14] text-white drop-shadow-sm">
              Nơi kết nối người dân với{' '}
              <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-emerald-200 bg-clip-text text-transparent drop-shadow-sm">
                Nhà ở Xã hội Văn minh
              </span>{' '}
              & Đáng sống
            </h1>
            <p className="max-w-xl text-sm sm:text-base leading-relaxed text-sky-50 drop-shadow-sm">
              Nền tảng chính thống kết nối và điều phối nguồn cung nhà ở xã hội toàn diện. Minh bạch 100% quy trình xét duyệt hồ sơ, thẩm định điều kiện tự động bằng AI và bốc thăm công khai.
            </p>
          </div>

          {/* Key Trust Badges Ribbon */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20 sm:grid-cols-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/15 p-3 backdrop-blur-md shadow-sm hover:bg-white/25 transition">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/25 text-white border border-white/30">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">eKYC Quốc gia</p>
                <p className="text-[11px] text-sky-100 truncate">Xác thực CCCD</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/15 p-3 backdrop-blur-md shadow-sm hover:bg-white/25 transition">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/25 text-white border border-white/30">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Thẩm định AI</p>
                <p className="text-[11px] text-sky-100 truncate">Chuẩn 3 điều kiện</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/15 p-3 backdrop-blur-md shadow-sm hover:bg-white/25 transition">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/25 text-white border border-white/30">
                <Dices className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Bốc thăm chuẩn</p>
                <p className="text-[11px] text-sky-100 truncate">Sở XD giám sát</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/15 p-3 backdrop-blur-md shadow-sm hover:bg-white/25 transition">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/25 text-white border border-white/30">
                <Layers className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Thanh toán 3–6 đợt</p>
                <p className="text-[11px] text-sky-100 truncate">Linh hoạt tài chính</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE POSTER SHOWCASE CAROUSEL (5 COLS) */}
        <div
          className="relative lg:col-span-5"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Glass Outer Glow Frame */}
          <div className="relative overflow-hidden rounded-[26px] border border-white/25 bg-white/15 p-2.5 shadow-2xl backdrop-blur-xl">
            {/* Slide Container */}
            <div className="relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-slate-900">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute inset-0"
                >
                  <img
                    src={BANNER_SLIDES[currentIdx].src}
                    alt={BANNER_SLIDES[currentIdx].title}
                    className="h-full w-full object-cover"
                  />
                  {/* Subtle Gradient Shade for text visibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

                  {/* Slide Floating Text */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-block rounded-md bg-sky-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                      {BANNER_SLIDES[currentIdx].tag}
                    </span>
                    <h3 className="mt-1 text-base font-bold text-white drop-shadow">
                      {BANNER_SLIDES[currentIdx].title}
                    </h3>
                    <p className="text-xs text-slate-200 line-clamp-1 opacity-90 drop-shadow">
                      {BANNER_SLIDES[currentIdx].subtitle}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/70 hover:scale-110"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => (prev + 1) % BANNER_SLIDES.length)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/70 hover:scale-110"
                aria-label="Next slide"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Top Verified Badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md backdrop-blur-md">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Thẩm định chính thức</span>
              </div>
            </div>

            {/* Pagination Dots Indicator */}
            <div className="mt-2.5 flex items-center justify-center gap-1.5">
              {BANNER_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIdx
                    ? 'w-7 bg-sky-400 shadow-sm shadow-sky-400/50'
                    : 'w-2 bg-white/30 hover:bg-white/60'
                    }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Showcase ────────────────────────────────────────────────────────────
export function HousingShowcase() {
  const { projects, loading } = useHousingProjects(16)
  const { isWishlisted, toggle } = useWishlist()
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 4000)
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

  // Featured spotlight is first project (if available)
  const spotlightProject = projects[0]
  const listProjects = projects.length > 1 ? projects.slice(1) : projects

  return (
    <section className="space-y-10">
      {/* 1. Bright Fresh Home Hero Banner */}
      <HomeHeroBanner />

      {/* 2. Featured Projects & Catalog */}
      {loading ? (
        <ShowcaseSkeleton />
      ) : spotlightProject ? (
        <div className="space-y-10">
          {/* Spotlight Section */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Dự án nổi bật trong tuần
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dự án quy mô lớn được Sở Xây dựng công bố và đang tiếp nhận hồ sơ đăng ký
              </p>
            </div>

            <SpotlightProjectCard
              house={spotlightProject}
              fav={isWishlisted(spotlightProject.id)}
              onToggleFavorite={toggleHandlers.get(spotlightProject.id) ?? (() => { void handleToggle(spotlightProject) })}
            />
          </div>

          {/* Curated Projects Grid */}
          {listProjects.length > 0 && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Danh mục dự án Nhà ở Xã hội
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Danh sách {projects.length} dự án được công bố chính thức trên toàn quốc
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {listProjects.map((house) => (
                  <ProjectGridCard
                    key={house.id}
                    house={house}
                    fav={isWishlisted(house.id)}
                    onToggleFavorite={toggleHandlers.get(house.id) ?? (() => { void handleToggle(house) })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Building2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-base font-bold text-slate-700 dark:text-slate-200">
            Chưa có dự án nào được công bố
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Vui lòng quay lại sau khi có thông tin mở bán từ Sở Xây dựng.
          </p>
        </div>
      )}

      {/* Toast thông báo quan tâm */}
      {notice && (
        <WishlistToast
          message={notice}
          onClose={() => setNotice(null)}
        />
      )}
    </section>
  )
}

