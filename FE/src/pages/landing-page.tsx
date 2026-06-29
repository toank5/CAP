import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Mail,
  Newspaper,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/brand'
import { GOV_IMAGES } from '@/lib/media'
import { LANDING_NEWS, LANDING_STATS } from '@/lib/landing-stats'
import { navigate } from '@/hooks/useHashRoute'
import { PromoProjectsCarousel } from '@/components/landing/promo-projects-carousel'

const PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Minh bạch',
    desc: 'Mọi bước xét duyệt và phân bổ được công khai, có thể tra cứu theo thời gian thực.',
  },
  {
    icon: Users,
    title: 'Phục vụ người dân',
    desc: 'Một cổng duy nhất — không cần đến trực tiếp cơ quan nhà nước.',
  },
  {
    icon: CheckCircle2,
    title: 'Đúng quy trình',
    desc: 'Tuân thủ Nghị định, Thông tư hiện hành về nhà ở xã hội.',
  },
]

const STEPS = [
  { num: '01', title: 'Khám phá chương trình', desc: 'Tìm hiểu các dự án nhà ở xã hội đang triển khai trên toàn quốc.' },
  { num: '02', title: 'Đăng ký tài khoản', desc: 'Tạo tài khoản công dân — xác thực email, bổ sung hồ sơ cá nhân.' },
  { num: '03', title: 'Theo dõi tiến độ', desc: 'Cập nhật trạng thái xét duyệt và kết quả thẩm định theo thời gian thực.' },
  { num: '04', title: 'Phân bổ minh bạch', desc: 'Công bố kết quả phân bổ nhà ở theo đúng quy trình nhà nước.' },
]

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: 'easeOut' as const },
}

/** Thông báo nổi cố định bên phải — auto 5s mở / 5s thu, đứng im khi có tương tác */
function AppFloatingNotice() {
  const [expanded, setExpanded] = useState(false)
  const [interacted, setInteracted] = useState(false)

  useEffect(() => {
    if (interacted) return
    const id = window.setInterval(() => {
      setExpanded((prev) => !prev)
    }, 5000)
    return () => window.clearInterval(id)
  }, [interacted])

  const handleEnter = () => setInteracted(true)

  const handleToggle = (next: boolean) => {
    setExpanded(next)
    setInteracted(true)
  }

  const wrapperMotion = {
    initial: false,
    animate: { opacity: 1, y: 0, x: 0, scale: 1 },
    exit: { opacity: 0, y: 0, x: 40, scale: 0.9 },
    transition: { type: 'spring' as const, stiffness: 220, damping: 26, mass: 0.7 },
  }

  return (
    <div className="pointer-events-none fixed right-4 top-1/2 z-40 -translate-y-1/2">
      <div className="pointer-events-auto" onMouseEnter={handleEnter}>
        <AnimatePresence mode="popLayout" initial={false}>
          {expanded ? (
            <motion.div
              key="expanded"
              {...wrapperMotion}
              className="relative w-72 will-change-transform"
            >
            {/* Outer glow */}
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-[#FFCD00]/40 via-[#DA251D]/30 to-[#005BAC]/40 blur-2xl opacity-80" />

            {/* Card */}
            <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_25px_60px_-15px_rgba(0,91,172,0.6)]">
              {/* Banner top gradient */}
              <div className="relative h-14 bg-gradient-to-r from-[#DA251D] via-[#FF6B35] to-[#FFCD00]">
                {/* Decorative blobs */}
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
                {/* Mockup điện thoại nhỏ — góc trái */}
                <div className="absolute left-3 bottom-0 translate-y-1/3">
                  <PhoneMockup />
                </div>
                {/* Badge "Mới" — góc phải banner */}
                <div className="absolute right-12 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 shadow-md">
                  <Sparkles className="h-2.5 w-2.5 text-orange-500" />
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-orange-600">Mới ra mắt</span>
                </div>
                {/* Toggle collapse — nút riêng, to, dễ bấm */}
                <button
                  onClick={() => handleToggle(false)}
                  title="Thu gọn thông báo"
                  className="absolute -right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white text-slate-700 shadow-lg transition-all hover:scale-110 hover:bg-slate-50 hover:text-orange-600 active:scale-95"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Bottom content */}
              <div className="pt-10 pb-3 px-3 bg-gradient-to-b from-white to-slate-50">
                {/* Title */}
                <div className="text-center">
                  <h3 className="text-base font-extrabold bg-gradient-to-r from-[#003D7A] via-[#005BAC] to-[#00B4D8] bg-clip-text text-transparent">
                    Tải RHS App ngay!
                  </h3>
                  <p className="mt-0.5 text-[10px] text-slate-600 leading-tight">
                    Ứng dụng <span className="font-bold text-slate-800">Nhà ở xã hội</span> chính thức
                  </p>
                </div>

                {/* Rating + Stats */}
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-700">4.9</span>
                  <span className="text-[9px] text-slate-400">· 12.500+ lượt tải</span>
                </div>

                {/* Features */}
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-start gap-2 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 p-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#003D7A] to-[#005BAC] shadow-sm">
                      <ShieldCheck className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-slate-800">Theo dõi hồ sơ realtime</p>
                      <p className="text-[9px] leading-tight text-slate-500">Cập nhật trạng thái mọi lúc</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 p-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-yellow-400 to-orange-500 shadow-sm">
                      <Newspaper className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-slate-800">Thông báo dự án mới</p>
                      <p className="text-[9px] leading-tight text-slate-500">Đăng ký nhận tin ngay</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 p-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm">
                      <Users className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-slate-800">Tư vấn 24/7 miễn phí</p>
                      <p className="text-[9px] leading-tight text-slate-500">Hỗ trợ trực tiếp qua chat</p>
                    </div>
                  </div>
                </div>

                {/* Download buttons */}
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => alert('Đang chuyển hướng đến App Store...')}
                    className="group flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#003D7A] to-[#005BAC] px-2 py-2 text-white shadow-md shadow-blue-500/30 transition-all hover:shadow-lg hover:shadow-blue-500/50 hover:scale-[1.03] active:scale-95"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <div className="text-left min-w-0">
                      <p className="text-[7px] leading-none text-white/70">Tải về từ</p>
                      <p className="text-[11px] font-extrabold leading-tight">App Store</p>
                    </div>
                  </button>

                  <button
                    onClick={() => alert('Đang chuyển hướng đến Google Play...')}
                    className="group flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 py-2 text-white shadow-md shadow-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/50 hover:scale-[1.03] active:scale-95"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 18.134h3.205l1.794-2.955L3 11.224v6.91zm3.205 1.133V21.5l3.205-2.955L6.205 19.267zm12.59-1.133H3v1.866h15.795v-1.866zm-2.405 1.133l-1.795 2.955H21.5v-2.955l-8.11.001zM3 9.866l4.81 8.368L3 18.234V9.866zm8.11-6.732L14.973 0 21.5 18.234l-10.39-8.368z"/>
                    </svg>
                    <div className="text-left min-w-0">
                      <p className="text-[7px] leading-none text-white/80">Tải về từ</p>
                      <p className="text-[11px] font-extrabold leading-tight">Google Play</p>
                    </div>
                  </button>
                </div>

                {/* Footer note */}
                <p className="mt-2 text-center text-[9px] text-slate-400 italic">
                  Miễn phí · Hỗ trợ iOS & Android
                </p>
              </div>

              {/* Bottom ribbon sọc cờ */}
              <div className="h-1 w-full bg-gradient-to-r from-[#DA251D] via-[#FFCD00] to-white/70" />
            </div>

            {/* Pulse dot */}
            <div className="absolute -right-1 -top-1 z-10 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, mass: 0.7 }}
            onClick={() => handleToggle(true)}
            title="Mở thông báo tải app"
            className="group relative flex h-16 w-44 items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-white/80 bg-gradient-to-r from-[#DA251D] via-[#FF6B35] to-[#FFCD00] px-3 text-white shadow-[0_15px_40px_-8px_rgba(218,37,29,0.7)] transition-[width,box-shadow] duration-300 ease-out hover:w-48 hover:shadow-[0_20px_50px_-8px_rgba(218,37,29,0.9)] active:scale-95 will-change-transform"
          >
            {/* Halo glow */}
            <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 opacity-50 blur-xl" />

            {/* Inner shine */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/15" />
            {/* Decorative blobs */}
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/20 blur-xl" />
            <div className="absolute -left-6 -bottom-6 h-20 w-20 rounded-full bg-yellow-200/20 blur-xl" />

            {/* Icon tròn trắng */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/40 backdrop-blur-sm">
              <Smartphone className="h-5 w-5" />
            </div>

            {/* Text ngang */}
            <div className="relative flex flex-col items-start leading-tight">
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/90">
                <Download className="h-2.5 w-2.5" />
                Mới ra mắt
              </span>
              <span className="text-base font-extrabold">Tải App</span>
            </div>

            <ChevronLeft className="relative h-5 w-5 shrink-0 transition-transform group-hover:-translate-x-1" />

            {/* Pulse dot */}
            <span className="absolute right-2 top-2 z-10 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </span>

            {/* Bottom ribbon sọc cờ ngang */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DA251D] via-[#FFCD00] to-white/70" />
          </motion.button>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

/** Mockup điện thoại nhỏ — trang trí góc banner */
function PhoneMockup() {
  return (
    <div className="relative">
      {/* Halo glow */}
      <div className="absolute -inset-2 rounded-[1.6rem] bg-gradient-to-br from-cyan-300 via-blue-400 to-emerald-400 blur-md opacity-80" />

      {/* Phone frame */}
      <div
        className="relative overflow-hidden rounded-[1rem] border-[2.5px] border-white bg-gradient-to-b from-[#003D7A] to-[#005BAC] shadow-xl"
        style={{ width: '68px', height: '130px' }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between bg-[#003D7A]/50 px-1 py-0.5">
          <span className="text-[5px] font-bold text-white">9:41</span>
          <div className="flex gap-px">
            <div className="h-0.5 w-1.5 rounded-sm bg-white/70" />
            <div className="h-0.5 w-1.5 rounded-sm bg-white/90" />
            <div className="h-0.5 w-1.5 rounded-sm bg-white" />
          </div>
        </div>

        {/* Notch */}
        <div className="mx-auto mt-0.5 h-2 w-6 rounded-full bg-black/50" />

        {/* App screen */}
        <div className="mx-0.5 mt-1 space-y-0.5">
          {/* Welcome card */}
          <div className="rounded-sm bg-white/15 p-0.5">
            <div className="flex items-center gap-0.5 mb-0.5">
              <div className="h-1.5 w-1.5 rounded-sm bg-gradient-to-br from-yellow-300 to-orange-400" />
              <div className="h-0.5 w-4 rounded bg-white/70" />
            </div>
            <div className="h-1 w-10 rounded bg-white" />
          </div>

          {/* Stat cards 2x2 */}
          <div className="grid grid-cols-2 gap-0.5">
            <div className="rounded-sm bg-gradient-to-br from-emerald-300 to-emerald-500 p-0.5">
              <div className="h-0.5 w-3 rounded bg-white/70 mb-px" />
              <div className="h-1 w-4 rounded bg-white" />
            </div>
            <div className="rounded-sm bg-gradient-to-br from-yellow-300 to-orange-400 p-0.5">
              <div className="h-0.5 w-3 rounded bg-white/70 mb-px" />
              <div className="h-1 w-4 rounded bg-white" />
            </div>
          </div>

          {/* Chart card */}
          <div className="rounded-sm bg-white/15 p-0.5">
            <div className="flex items-end gap-px h-3">
              {[3, 5, 4, 6, 7, 5, 8, 6].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-cyan-300 via-emerald-300 to-yellow-300" style={{ height: `${h * 0.3}px` }} />
              ))}
            </div>
          </div>

          {/* CTA button */}
          <div className="rounded-sm bg-gradient-to-r from-yellow-400 to-orange-500 p-0.5 text-center">
            <div className="h-1 w-10 mx-auto rounded bg-white" />
          </div>
        </div>
      </div>

      {/* Floating sparkle */}
      <motion.div
        animate={{ y: [0, -3, 0], rotate: [0, 15, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-yellow-400 shadow-md ring-2 ring-white"
      >
        <Sparkles className="h-2 w-2 text-white" />
      </motion.div>
    </div>
  )
}
function AnimatedStat({ value, label, sub, icon: Icon, delay = 0 }: { value: string; label: string; sub: string; icon: typeof LANDING_STATS[number]['icon']; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const [shown, setShown] = useState('0')
  const target = parseFloat(value.replace(/\D/g, ''))
  const suffix = value.replace(/[0-9.,\s]/g, '')

  useEffect(() => {
    if (!inView || Number.isNaN(target)) {
      setShown(value)
      return
    }
    let raf: number
    const start = performance.now() + delay * 1000
    const duration = 1400
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(target * eased)
      const formatted = current >= 1000 ? current.toLocaleString('vi-VN').replace(/,/g, '.') : String(current)
      setShown(formatted + (t < 1 ? '' : ''))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, delay])

  const display = Number.isNaN(target)
    ? value
    : shown + (Number(shown.replace(/\D/g, '') || '0') >= target ? suffix : '')

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ delay, duration: 0.5 }}
      className="gov-card relative overflow-hidden p-6"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5" />
      <p className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-md">
        <Icon className="h-5 w-5" />
      </p>
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-[#003D7A] md:text-4xl">
        {display}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </motion.div>
  )
}

export function LandingPage() {
  return (
    <div className="-mx-4 lg:-mx-8">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="relative min-h-[540px] md:min-h-[600px]">
          {/* Nền gradient chính */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#003D7A] via-[#005BAC] to-[#1A7FD4]" />
          {/* Pattern overlay */}
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: `url(${GOV_IMAGES.pattern})`, backgroundSize: '32px 32px' }}
          />
          {/* Blob radial */}
          <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[320px] w-[320px] rounded-full bg-[#FFCD00]/15 blur-3xl" />
          {/* Sọc cờ đáy */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#DA251D] via-[#FFCD00] to-white/70" />

          <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-20">
            <motion.div {...fadeUp} className="text-white lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FFCD00] backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                {BRAND.tagline}
              </div>

              <h1 className="mt-5 text-3xl font-extrabold leading-[1.1] tracking-tight md:text-5xl lg:text-[3.4rem]">
                {BRAND.projectName}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/90 md:text-lg">
                Nền tảng số chính thức hỗ trợ công dân tiếp cận nguồn cung nhà ở xã hội —
                minh bạch, hiện đại, hoạt động xuyên suốt theo quy trình nhà nước.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" variant="accent" className="shadow-2xl shadow-accent/40" onClick={() => navigate('register')}>
                  Đăng ký tài khoản <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                  onClick={() => navigate('login')}
                >
                  Đăng nhập
                </Button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#FFCD00]" />
                  Hoàn toàn miễn phí
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#FFCD00]" />
                  Xác thực email
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#FFCD00]" />
                  Sẵn sàng trong 2 phút
                </span>
              </div>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="relative mx-auto w-full max-w-md lg:col-span-5"
            >
              <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-primary/30">
                <img
                  src={GOV_IMAGES.heroBanner}
                  alt="Nhà ở xã hội"
                  className="h-full w-full object-cover"
                  style={{ aspectRatio: '4/3' }}
                />
              </div>
              <div className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-2xl md:max-w-xs">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Trong tuần</p>
                  <p className="text-sm font-bold text-[#003D7A]">+312 hồ sơ mới</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS — số liệu nhất quán */}
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="bento-grid">
          {LANDING_STATS.map((s, i) => (
            <AnimatedStat key={s.label} {...s} delay={i * 0.1} />
          ))}
        </div>
      </section>

      {/* PROMO CAROUSEL — banner quảng bá sinh động */}
      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="gov-section-title text-2xl">Dự án đang mở bán</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Các dự án nhà ở xã hội đang mở đăng ký — cập nhật liên tục từ chủ đầu tư.
          </p>
          <div className="mt-8">
            <PromoProjectsCarousel />
          </div>
        </motion.div>
      </section>

      {/* PILLARS */}
      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="gov-section-title text-2xl">Vì sao chọn cổng số này</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Cam kết của chúng tôi với người dân và cơ quan quản lý nhà nước.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title} className="gov-card p-6">
                <p className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </p>
                <h3 className="mt-4 text-lg font-bold text-[#003D7A]">{p.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* STEPS */}
      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="gov-section-title text-2xl">Quy trình tham gia</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Bốn bước rõ ràng để người dân đăng ký và theo dõi nhà ở xã hội.
          </p>
          <div className="relative mt-10">
            {/* Đường nối dashed chỉ md trở lên */}
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-9 hidden border-t-2 border-dashed border-primary/20 md:block" />
            <div className="grid gap-4 md:grid-cols-4">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="gov-card relative p-5"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-extrabold text-white shadow-md">
                    {step.num}
                  </span>
                  <h3 className="mt-3 font-semibold text-[#003D7A]">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* NEWS */}
      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        <motion.div {...fadeUp}>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="gov-section-title text-2xl">Tin tức & thông báo</h2>
              <p className="mt-2 max-w-2xl text-slate-600">
                Cập nhật mới nhất từ chương trình nhà ở xã hội.
              </p>
            </div>
            <span className="hidden items-center gap-1.5 text-sm font-semibold text-primary md:inline-flex">
              <Newspaper className="h-4 w-4" /> Cập nhật liên tục
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {LANDING_NEWS.map((n, i) => (
              <motion.article
                key={n.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="gov-card relative overflow-hidden p-6"
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent">
                  {n.tag}
                </span>
                <h3 className="mt-3 text-base font-bold leading-snug text-[#003D7A]">
                  {n.title}
                </h3>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <time className="font-semibold">{n.date}</time>
                  <button
                    type="button"
                    onClick={() => navigate('notifications')}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    Đọc tiếp <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CONTACT + CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#003D7A] via-[#005BAC] to-[#005BAC] text-white">
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${GOV_IMAGES.pattern})`, backgroundSize: '32px 32px' }}
        />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex-1">
            <h2 className="text-2xl font-extrabold md:text-3xl">Sẵn sàng tham gia?</h2>
            <p className="mt-2 max-w-xl text-white/85">
              Tạo tài khoản công dân ngay hôm nay để nhận thông báo khi có dự án nhà ở xã hội phù hợp.
            </p>
            <div className="mt-5 flex flex-col gap-2 text-sm text-white/85 sm:flex-row sm:items-center sm:gap-5">
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#FFCD00]" />
                Tổng đài: <strong className="text-white">{BRAND.hotline}</strong>
              </span>
              <span className="hidden text-white/40 sm:inline">·</span>
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#FFCD00]" />
                {BRAND.email}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="accent" className="shadow-lg shadow-accent/40" onClick={() => navigate('register')}>
              Đăng ký miễn phí <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
              onClick={() => navigate('login')}
            >
              Đã có tài khoản
            </Button>
          </div>
        </div>
      </section>

      {/* Thông báo nổi bên phải — quảng cáo app */}
      <AppFloatingNotice />
    </div>
  )
}
