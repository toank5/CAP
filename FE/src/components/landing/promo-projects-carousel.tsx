import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Building2, ChevronLeft, ChevronRight, ImageIcon, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { navigate } from '@/hooks/useHashRoute'
import { useHousingProjects } from '@/hooks/useHousingProjects'
import { Skeleton } from '@/components/ui/skeleton'

const AUTOPLAY_MS = 5000
const MAX_SLIDES = 6

const FALLBACK_PALETTE = ['#e63946', '#0077c8', '#0E8F6E', '#fb8500', '#7B1FA2', '#C2185B']

function pickColor(seed: string, index: number): string {
  // Tạo màu ổn định theo id — cùng dự án luôn cùng tông
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length]!
}

interface Slide {
  id: string
  name: string
  location: string
  price: string
  units: string
  type: string
  area: string
  status: string
  color: string
  imageUrl: string
  description?: string
}

function ProjectImage({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (broken || !src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/30 via-primary/10 to-accent/30">
        <ImageIcon className="h-12 w-12 text-white/60" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  )
}

export function PromoProjectsCarousel() {
  const { projects, loading, error } = useHousingProjects(50)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const slides: Slide[] = useMemo(() => {
    return projects
      .slice(0, MAX_SLIDES)
      .map((p, i) => ({
        id: p.id,
        name: p.name,
        location: p.location,
        price: p.price,
        units: p.units,
        type: p.type,
        area: p.area,
        status: p.status,
        color: pickColor(p.id, i),
        imageUrl: p.imageUrl,
        description: p.description,
      }))
  }, [projects])

  const total = slides.length
  const project = slides[index]
  // Reset index khi data đổi (số phần tử thay đổi)
  useEffect(() => {
    if (index >= total && total > 0) setIndex(0)
  }, [total, index])

  useEffect(() => {
    if (paused || total <= 1) return
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % total)
    }, AUTOPLAY_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [paused, total])

  const go = (delta: number) => {
    if (total <= 0) return
    setIndex((i) => (i + delta + total) % total)
    setPaused(true)
  }

  if (loading && total === 0) {
    return <Skeleton className="h-72 w-full rounded-3xl md:h-96" />
  }

  if (!loading && total === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Building2 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-[#003D7A]">Chưa có dự án đang mở bán</h3>
        <p className="mt-1 text-sm text-slate-500">
          {error ? `Tạm thời không tải được dự án (${error}).` : 'Danh sách đang được cập nhật.'}
        </p>
        <div className="mt-6">
          <Button variant="accent" onClick={() => navigate('projects')}>
            Khám phá dự án <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  if (!project) return null

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-primary/15 bg-white shadow-[0_30px_60px_-30px_rgb(0_61_122_/_45%)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Sọc cờ trên cùng */}
      <div className="flex h-1.5">
        <div className="flex-1 bg-[#DA251D]" />
        <div className="flex-1 bg-[#FFCD00]" />
        <div className="flex-1 bg-[#005BAC]" />
      </div>

      <div className="grid gap-0 md:grid-cols-5">
        {/* Phần ảnh */}
        <div className="relative aspect-[16/10] md:col-span-2 md:aspect-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={project.id}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <ProjectImage src={project.imageUrl} alt={project.name} />
            </motion.div>
          </AnimatePresence>
          {/* Lớp gradient phủ giúp chữ nổi */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 35%, ${project.color}b3 100%)`,
            }}
          />

          {/* Badge trạng thái */}
          <motion.span
            key={`badge-${project.id}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#003D7A] shadow-md backdrop-blur"
          >
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ backgroundColor: project.color }}
            />
            {project.status}
          </motion.span>

          {/* Số thứ tự */}
          <div className="absolute bottom-3 left-3 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
        </div>

        {/* Phần nội dung */}
        <div className="relative md:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={project.id + '-content'}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="flex h-full flex-col gap-4 p-6 md:p-8"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Building2 className="h-3.5 w-3.5" />
                Dự án nổi bật
              </div>

              <h3 className="text-2xl font-extrabold tracking-tight text-[#003D7A] md:text-3xl">
                {project.name}
              </h3>

              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-primary" />
                {project.location}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                <div className="rounded-xl bg-primary/5 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Giá</p>
                  <p className="mt-0.5 font-bold text-[#003D7A]">{project.price}</p>
                </div>
                <div className="rounded-xl bg-primary/5 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Loại</p>
                  <p className="mt-0.5 font-bold text-[#003D7A]">{project.type}</p>
                </div>
                <div className="rounded-xl bg-primary/5 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Diện tích</p>
                  <p className="mt-0.5 font-bold text-[#003D7A]">{project.area}</p>
                </div>
              </div>

              <div
                className="rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{ backgroundColor: `${project.color}1f`, color: project.color }}
              >
                {project.units}
              </div>

              <div className="mt-auto flex flex-wrap gap-3 pt-2">
                <Button
                  variant="accent"
                  size="default"
                  onClick={() => navigate('register')}
                  className="shadow-lg"
                >
                  Đăng ký mua <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => navigate('projects')}
                >
                  Xem tất cả dự án <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {total > 1 && (
        <>
          {/* Controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary shadow-md transition hover:bg-white"
              aria-label="Dự án trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary shadow-md transition hover:bg-white"
              aria-label="Dự án tiếp theo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Dots */}
          <div className="pointer-events-auto absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setIndex(i)
                  setPaused(true)
                }}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-6 bg-[#003D7A]' : 'w-1.5 bg-[#003D7A]/30',
                )}
                aria-label={`Dự án ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
