import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Heart, Layers, MapPin, Ruler } from 'lucide-react'
import { startVnPayPayment } from '@/api/payment'
import { GovAnnouncements } from '@/components/layout/gov-announcements'
import { GovHeroBanner } from '@/components/layout/gov-hero-banner'
import { GovServiceGrid } from '@/components/layout/gov-service-grid'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import { useHousingProjects } from '@/hooks/useHousingProjects'
import { useWishlist } from '@/hooks/useWishlist'
import { isLoggedIn } from '@/router'
import type { ProjectCard } from '@/lib/projects'
import { formatError } from '@/lib/format-error'
import { BRAND } from '@/lib/brand'

function PromoHero({
  house,
  fav,
  onToggleFavorite,
}: {
  house: ProjectCard
  fav: boolean
  onToggleFavorite: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="gov-card overflow-hidden"
    >
      <div className="relative grid md:grid-cols-2">
        <div className="relative min-h-[220px] md:min-h-[320px]">
          <img
            src={house.imageUrl}
            alt={house.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#003D7A]/70 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#003D7A]/20" />
          <span className="absolute left-4 top-4 rounded-md bg-[#DA251D] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">
            Dự án nổi bật
          </span>
        </div>

        <div className="flex flex-col justify-center p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Nhà ở xã hội · {house.type}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#003D7A] dark:text-white">{house.name}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            {house.location}
          </p>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{house.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-primary">{house.area}</span>
            <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">{house.status}</span>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Giá từ</p>
            <p className="text-3xl font-bold text-[#DA251D]">{house.price}</p>
            <p className="text-sm font-medium text-slate-500">{house.units}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="accent" onClick={() => navigate('create-application')}>
              Đăng ký ngay <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onToggleFavorite}>
              <Heart className={`mr-1.5 h-4 w-4 ${fav ? 'fill-red-500 text-red-500' : ''}`} />
              {fav ? 'Đã quan tâm' : 'Quan tâm'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function PromoCard({
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
  const [paying, setPaying] = useState(false)

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="gov-card flex flex-col overflow-hidden transition-shadow hover:shadow-lg hover:shadow-primary/15"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={house.imageUrl}
          alt={house.name}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute left-3 top-3 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow">
          {house.status}
        </div>
        <button
          type="button"
          aria-label="Quan tâm"
          className={`absolute right-3 top-3 rounded-full p-2 shadow-md transition ${fav ? 'bg-red-500 text-white' : 'bg-white/95 text-slate-400 hover:text-red-500'}`}
          onClick={onToggleFavorite}
        >
          <Heart className={`h-4 w-4 ${fav ? 'fill-current' : ''}`} />
        </button>
        <p className="absolute bottom-3 left-3 right-3 truncate text-sm font-semibold text-white drop-shadow">{house.name}</p>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          {house.location}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-secondary/60 px-2 py-2">
            <Ruler className="mx-auto h-3.5 w-3.5 text-primary" />
            <p className="mt-1 text-[10px] text-slate-400">Diện tích</p>
            <p className="text-xs font-semibold">{house.area}</p>
          </div>
          <div className="rounded-lg bg-secondary/60 px-2 py-2">
            <Layers className="mx-auto h-3.5 w-3.5 text-primary" />
            <p className="mt-1 text-[10px] text-slate-400">Còn trống</p>
            <p className="text-xs font-semibold">{house.availableUnits} căn</p>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-2xl font-bold text-[#DA251D]">{house.price}</p>
          <p className="text-xs font-medium text-slate-500">{house.units}</p>
        </div>

        <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">{house.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="flex-1" variant="accent" size="sm" onClick={() => navigate('create-application')}>
            Đăng ký
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={paying}
            onClick={async () => {
              if (!isLoggedIn()) { navigate('login'); return }
              setPaying(true)
              try {
                const url = await startVnPayPayment(`Dat coc - ${house.name}`, house.paymentAmount)
                window.location.href = url
              } catch (err) {
                alert(formatError(err))
                setPaying(false)
              }
            }}
          >
            {paying ? '...' : 'Đặt cọc'}
          </Button>
        </div>
      </div>
    </motion.article>
  )
}

export function HousingShowcase() {
  const { projects, loading } = useHousingProjects(12)
  const { isWishlisted, toggle } = useWishlist()
  const [hero, ...rest] = projects

  return (
    <section className="space-y-6">
      <GovAnnouncements />
      <GovServiceGrid />

      <GovHeroBanner
        badge={BRAND.portalLine}
        title="Danh mục nhà ở xã hội"
        subtitle="Tra cứu dự án, đăng ký hồ sơ trực tuyến và thanh toán minh bạch qua cổng dịch vụ công."
        compact
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="gov-section-title">Dự án đang mở bán</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Các khu nhà ở xã hội được công bố chính thức — hỗ trợ đăng ký trực tuyến, thanh toán đặt cọc qua VNPay.
          </p>
        </div>
        <Button variant="outline" className="border-primary/30 bg-white" onClick={() => navigate('projects')}>
          Xem tất cả dự án <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-64 md:col-span-2 xl:col-span-3" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      )}

      {!loading && hero && (
        <>
          <PromoHero
            house={hero}
            fav={isWishlisted(hero.id)}
            onToggleFavorite={() => { void toggle(hero.id) }}
          />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((house, i) => (
              <PromoCard
                key={house.id}
                house={house}
                index={i}
                fav={isWishlisted(house.id)}
                onToggleFavorite={() => { void toggle(house.id) }}
              />
            ))}
          </div>
        </>
      )}

      {!loading && !hero && (
        <p className="text-sm text-slate-500">Chưa có dự án nào được công bố.</p>
      )}
    </section>
  )
}
