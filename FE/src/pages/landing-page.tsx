import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, FileCheck, MapPin, Shield } from 'lucide-react'
import { housingProjectsApi } from '@/api/housing-projects'
import { FaqAccordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GovAnnouncements } from '@/components/layout/gov-announcements'
import { GovHeroBanner } from '@/components/layout/gov-hero-banner'
import { GovServiceGrid } from '@/components/layout/gov-service-grid'
import { BRAND } from '@/lib/brand'
import { GOV_IMAGES } from '@/lib/media'
import { extractProjects } from '@/lib/parsers'
import { mapProjectToCard, type ProjectCard } from '@/lib/projects'
import { FEATURED_HOUSES } from '@/lib/featured-houses'
import { navigate } from '@/hooks/useHashRoute'

const STATS = [
  { icon: Building2, value: '2.400+', label: 'Căn hộ được quản lý', span: 'md:col-span-2' },
  { icon: MapPin, value: '48', label: 'Dự án nhà ở xã hội', span: '' },
  { icon: FileCheck, value: '8.200+', label: 'Hồ sơ đã xử lý', span: '' },
  { icon: Shield, value: '99,2%', label: 'Minh bạch & hoạt động ổn định', span: 'md:col-span-2' },
]

const STEPS = [
  { num: '01', title: 'Khám phá dự án', desc: 'Tìm nhà ở xã hội phù hợp theo vị trí và tiêu chí.' },
  { num: '02', title: 'Đăng ký hồ sơ số', desc: 'Biểu mẫu trực tuyến, định danh điện tử và nộp giấy tờ.' },
  { num: '03', title: 'Thẩm định minh bạch', desc: 'Theo dõi tiến độ trạng thái theo thời gian thực.' },
  { num: '04', title: 'Phân bổ & thanh toán', desc: 'Hoàn tất nghĩa vụ qua cổng tích hợp VNPay.' },
]

const FAQ = [
  { q: 'Ai được đăng ký nhà ở xã hội qua RHS?', a: 'Công dân đáp ứng điều kiện theo quy định nhà nước, có thể nộp hồ sơ trực tuyến và theo dõi tiến độ minh bạch.' },
  { q: 'Làm sao tra cứu trạng thái hồ sơ?', a: 'Dùng mã hồ sơ tại mục Tra cứu hoặc đăng nhập vào trang cá nhân để xem tiến độ chi tiết.' },
  { q: 'RHS có hỗ trợ thanh toán trực tuyến?', a: 'Có — tích hợp cổng thanh toán VNPay cho các khoản đặt cọc và phí theo quy định dự án.' },
]

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: 'easeOut' as const },
}

function fallbackLandingProjects(): ProjectCard[] {
  return FEATURED_HOUSES.slice(0, 3).map((h) => ({
    id: h.id,
    name: h.name,
    location: h.location,
    address: h.address,
    price: h.price,
    units: h.units,
    type: h.type,
    area: h.area,
    status: h.status,
    description: h.description,
    paymentAmount: h.paymentAmount,
    imageUrl: h.imageUrl,
    minPrice: 0,
    maxPrice: 0,
    availableUnits: 0,
  }))
}

export function LandingPage() {
  const [projects, setProjects] = useState<ProjectCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void housingProjectsApi.list({ pageIndex: 1, pageSize: 3 })
      .then((data) => {
        const items = extractProjects(data).map(mapProjectToCard)
        setProjects(items.length > 0 ? items.slice(0, 3) : fallbackLandingProjects())
      })
      .catch(() => setProjects(fallbackLandingProjects()))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="-mx-4 lg:-mx-8">
      <section className="relative overflow-hidden">
        <div className="relative min-h-[420px] md:min-h-[480px]">
          <img
            src={GOV_IMAGES.heroBanner}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#003D7A]/95 via-[#005BAC]/88 to-[#005BAC]/55" />
          <div
            className="absolute inset-0 opacity-25"
            style={{ backgroundImage: `url(${GOV_IMAGES.pattern})`, backgroundSize: '24px 24px' }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#DA251D] via-[#FFCD00] to-white/70" />

          <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-4 py-14 lg:px-8 lg:py-20">
            <motion.div {...fadeUp} className="max-w-2xl text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-[#FFCD00]">{BRAND.tagline}</p>
              <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
                Cổng đăng ký nhà ở xã hội trực tuyến
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 md:text-lg">
                Nền tảng chính thức kết nối người dân với nguồn cung nhà ở xã hội — minh bạch, hiện đại, phục vụ người dân.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" variant="accent" className="shadow-lg" onClick={() => navigate('register')}>
                  Bắt đầu đăng ký <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate('tra-cuu')}>
                  Tra cứu hồ sơ
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 lg:px-8">
        <GovAnnouncements />
        <GovServiceGrid />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
        <motion.div {...fadeUp} className="bento-grid">
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              whileHover={{ scale: 1.01 }}
              className={`gov-card p-6 ${s.span}`}
            >
              <s.icon className="h-5 w-5 text-primary" />
              <p className="mt-4 text-3xl font-bold tracking-tight text-[#003D7A] dark:text-white">{s.value}</p>
              <p className="mt-1 text-sm text-slate-600">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <motion.div {...fadeUp}>
          <h2 className="gov-section-title text-2xl">Quy trình đăng ký</h2>
          <p className="mt-2 text-slate-600">Timeline minh bạch từ khám phá đến phân bổ nhà ở</p>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="gov-card p-5"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{step.num}</span>
                <h3 className="mt-3 font-semibold text-[#003D7A]">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <GovHeroBanner
          badge="Danh mục chính thức"
          title="Nhà ở xã hội đang mở bán"
          subtitle="Thông tin dự án được công bố công khai, minh bạch theo quy định."
          compact
        />

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-64" />)}
          {!loading && projects.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Card className="gov-card group cursor-pointer overflow-hidden p-0" onClick={() => navigate('login')}>
                <div className="relative h-44 overflow-hidden">
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  <span className="absolute left-3 top-3 rounded-md bg-[#DA251D] px-2 py-0.5 text-[10px] font-bold uppercase text-white">{p.status}</span>
                </div>
                <CardHeader className="px-5 pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base text-[#003D7A]">{p.name}</CardTitle>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary">{p.type}</span>
                  </div>
                  <CardDescription>{p.location}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between px-5 pb-5 pt-3 text-sm">
                  <span className="font-bold text-[#DA251D]">{p.price}</span>
                  <span className="text-slate-500">{p.units}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 lg:px-8">
        <h2 className="gov-section-title mb-6 justify-center text-2xl">Câu hỏi thường gặp</h2>
        <FaqAccordion items={FAQ} />
      </section>
    </div>
  )
}
