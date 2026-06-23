import { useEffect, useState } from 'react'
import { housingApplicationsApi, parsePagedApplications } from '@/api/housing-applications'
import { wishlistApi } from '@/api/wishlist'
import { HouseCard } from '@/components/housing/house-card'
import { HousingShowcase } from '@/components/housing/housing-showcase'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import { useWishlist } from '@/hooks/useWishlist'
import { countFromPaged, extractWishlistItems } from '@/lib/parsers'
import { mapProjectToCard } from '@/lib/projects'
import { formatError } from '@/lib/format-error'
import { type RouteId } from '@/router'
import type { WishlistItemDto } from '@/types'

interface QuickAction { title: string; desc: string; route: RouteId; cta?: string }

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  )
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((a) => (
        <button key={a.route} type="button" className="glass-card p-4 text-left transition hover:ring-2 hover:ring-primary/20" onClick={() => navigate(a.route)}>
          <p className="font-semibold">{a.title}</p>
          <p className="mt-1 text-sm text-slate-500">{a.desc}</p>
          <span className="mt-2 inline-block text-sm font-semibold text-accent">{a.cta ?? 'Mở →'}</span>
        </button>
      ))}
    </div>
  )
}

export function ApplicantHomePage() {
  return <HousingShowcase />
}

export function InterestedPage() {
  const { isWishlisted, toggle } = useWishlist()
  const [items, setItems] = useState<WishlistItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await wishlistApi.list({ pageSize: 100 })
      setItems(extractWishlistItems(data))
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const cards = items.map((w) =>
    mapProjectToCard({
      id: w.projectId,
      projectName: w.projectName,
      description: w.description,
      province: w.province,
      district: w.district,
      address: w.address,
      minPrice: w.minPrice,
      maxPrice: w.maxPrice,
      minArea: w.minArea,
      maxArea: w.maxArea,
      availableUnits: w.availableUnits,
      thumbnailUrl: w.thumbnailUrl,
      status: w.status,
    }),
  )

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Dự án quan tâm</h1>
      {loading && <Skeleton className="h-40 w-full" />}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && cards.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-500">Bạn chưa quan tâm dự án nào.<br />Nhấn trái tim trên trang chủ để lưu dự án.</p>
          <Button className="mt-4" variant="accent" onClick={() => navigate('home-user')}>Về trang chủ</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((h) => (
            <HouseCard
              key={h.id}
              house={h}
              fav={isWishlisted(h.id)}
              onToggleFavorite={() => { void toggle(h.id).then(() => load()) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}


export function StaffRoleHomePage({ routeId }: { routeId: 'home-ward' | 'home-verifier' }) {
  const [stats, setStats] = useState<Record<string, number | string>>({})

  useEffect(() => {
    const load = async () => {
      if (routeId === 'home-ward') {
        const apps = await housingApplicationsApi.getWmDashboard({ pageSize: 1 }).catch(() => null)
        const total = countFromPaged(apps)
        const pending = parsePagedApplications(apps).filter((a) => a.applicationStatus === 'UNDER_REVIEW').length
        setStats({ total, pending })
      } else {
        const apps = await housingApplicationsApi.getVoDashboard({ pageSize: 1 }).catch(() =>
          housingApplicationsApi.getAll({ pageSize: 1 }),
        )
        const total = countFromPaged(apps)
        const submitted = parsePagedApplications(apps).filter((a) => a.applicationStatus === 'SUBMITTED').length
        setStats({ total, pending: submitted })
      }
    }
    void load()
  }, [routeId])

  const actions: QuickAction[] =
    routeId === 'home-ward'
        ? [
            { title: 'Hồ sơ chờ duyệt', desc: 'Xét duyệt hồ sơ ở trạng thái thẩm định.', route: 'applications' },
            { title: 'Dự án', desc: 'Xem danh sách dự án.', route: 'projects' },
          ]
        : [
            { title: 'Hồ sơ thẩm định', desc: 'Nhận và xử lý hồ sơ được giao.', route: 'applications' },
            { title: 'Tra cứu', desc: 'Tra cứu hồ sơ công khai.', route: 'tra-cuu' },
          ]

  return (
    <div>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={stats.total ?? '—'} label="Hồ sơ" />
        <StatCard value={stats.pending ?? '—'} label="Chờ xử lý" />
      </div>
      <h2 className="mb-4 text-lg font-bold">Thao tác nhanh</h2>
      <QuickActions actions={actions} />
    </div>
  )
}
