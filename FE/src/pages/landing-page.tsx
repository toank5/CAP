import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Clock4,
  Mail,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PromoProjectsCarousel } from '@/components/landing/promo-projects-carousel'
import { BRAND } from '@/lib/brand'
import { GOV_IMAGES } from '@/lib/media'
import { LANDING_NEWS } from '@/lib/landing-stats'
import { navigate } from '@/hooks/useHashRoute'

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
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { duration: 0.4, ease: 'easeOut' as const },
}

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
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

          <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 px-4 py-14 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-20">
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
                  <Clock4 className="h-3.5 w-3.5 text-[#FFCD00]" />
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURED PROJECTS */}
      <section className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="gov-section-title text-2xl">Dự án nổi bật</h2>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            Khám phá các dự án nhà ở xã hội đang mở bán trên toàn quốc.
          </p>
          <div className="mt-8">
            <PromoProjectsCarousel />
          </div>
        </motion.div>
      </section>

      {/* PILLARS */}
      <section className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="gov-section-title text-2xl">Vì sao chọn cổng số này</h2>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            Cam kết của chúng tôi với người dân và cơ quan quản lý nhà nước.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title} className="gov-card p-6">
                <p className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </p>
                <h3 className="mt-4 text-lg font-bold text-[#003D7A] dark:text-white">{p.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* STEPS */}
      <section className="mx-auto max-w-[1400px] px-4 pb-20 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="gov-section-title text-2xl">Quy trình tham gia</h2>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            Bốn bước rõ ràng để người dân đăng ký và theo dõi nhà ở xã hội.
          </p>
          <div className="relative mt-10">
            {/* Đường nối dashed chỉ md trở lên */}
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-9 hidden border-t-2 border-dashed border-primary/20 md:block" />
            <div className="grid gap-4 md:grid-cols-4">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="gov-card anim-up relative p-5"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-extrabold text-white shadow-md">
                    {step.num}
                  </span>
                  <h3 className="mt-3 font-semibold text-[#003D7A] dark:text-white">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* NEWS */}
      <section className="mx-auto max-w-[1400px] px-4 pb-20 lg:px-8">
        <motion.div {...fadeUp}>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="gov-section-title text-2xl">Tin tức &amp; thông báo</h2>
              <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
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
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="gov-card anim-up relative overflow-hidden p-6"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent">
                  {n.tag}
                </span>
                <h3 className="mt-3 text-base font-bold leading-snug text-[#003D7A] dark:text-white">
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

      {/* FOOTER */}
      <footer className="bg-[#003D7A] text-white">
        <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <h3 className="text-base font-bold leading-snug">{BRAND.projectName}</h3>
              <p className="mt-2 text-sm text-white/80">{BRAND.acronymExpanded}</p>
              <p className="mt-1 text-xs italic text-white/55">{BRAND.slogan}</p>
              <p className="mt-3 text-xs text-white/60">{BRAND.footerLine}</p>
            </div>
            <div>
              <h4 className="mb-3 border-l-4 border-[#FFCD00] pl-3 text-sm font-bold uppercase tracking-wide">Trụ sở</h4>
              <div className="space-y-2 text-sm text-white/75">
                <p>{BRAND.address}</p>
                <p className="text-xs text-white/55">Trụ sở chính — TP. Hồ Chí Minh</p>
              </div>
            </div>
            <div>
              <h4 className="mb-3 border-l-4 border-[#FFCD00] pl-3 text-sm font-bold uppercase tracking-wide">Liên hệ</h4>
              <div className="space-y-2 text-sm text-white/75">
                <p>Email: {BRAND.email}</p>
                <p>Hotline: {BRAND.hotline}</p>
                <p>Fax: (028) 3822 1234</p>
                <p className="text-xs text-white/55">{BRAND.workingHours}</p>
              </div>
            </div>
            <div>
              <h4 className="mb-3 border-l-4 border-[#FFCD00] pl-3 text-sm font-bold uppercase tracking-wide">Cơ quan vận hành</h4>
              <div className="space-y-2 text-sm text-white/75">
                <p>Sở Xây dựng TP. Hồ Chí Minh</p>
                <p className="text-xs text-white/55">Đơn vị quản trị hệ thống</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold text-white/80">Phiên bản 1.0.0</span>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 font-semibold text-emerald-300">● Đang hoạt động</span>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/20 pt-6 md:flex-row">
            <p className="text-xs text-white/55">
              © {new Date().getFullYear()} {BRAND.projectName}. Mọi quyền được bảo lưu.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-white/55">
              <span>Chính sách bảo mật</span>
              <span>·</span>
              <span>Điều khoản sử dụng</span>
              <span>·</span>
              <span>Sơ đồ trang</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
