import { useCallback, useEffect, useState } from 'react'
import { housingProjectsApi } from '@/api/housing-projects'
import { HouseCard } from '@/components/housing/house-card'
import { HousingSearchForm } from '@/components/housing/housing-search-form'
import { GovHeroBanner } from '@/components/layout/gov-hero-banner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { useWishlist } from '@/hooks/useWishlist'
import { FEATURED_HOUSES } from '@/lib/featured-houses'
import { formatError } from '@/lib/format-error'
import {
  applyClientFilters,
  EMPTY_HOUSING_SEARCH,
  navigateToHousingSearch,
  parseHousingSearchFromHash,
  toApiFilter,
  type HousingSearchFilter,
} from '@/lib/housing-search'
import { extractProjects } from '@/lib/parsers'
import { mapProjectToCard } from '@/lib/projects'
import type { HousingProjectDto } from '@/types'

function featuredAsProjects(): HousingProjectDto[] {
  return FEATURED_HOUSES.map((h) => ({
    id: h.id,
    projectName: h.name,
    name: h.name,
    description: h.description,
    province: h.location.split(',').pop()?.trim(),
    district: h.location.split(',')[0]?.trim(),
    address: h.address,
    location: h.location,
    minPrice: h.paymentAmount * 10,
    maxPrice: h.paymentAmount * 10,
    minArea: parseInt(h.area.replace(/\D/g, ''), 10) || 0,
    maxArea: parseInt(h.area.replace(/\D/g, ''), 10) || 0,
    availableUnits: parseInt(h.units.replace(/\D/g, ''), 10) || 0,
    thumbnailUrl: h.imageUrl,
    status: h.status,
  }))
}

export function HousingSearchPage() {
  const route = useHashRoute()
  const { isWishlisted, toggle } = useWishlist()
  const [filter, setFilter] = useState<HousingSearchFilter>({ ...EMPTY_HOUSING_SEARCH })
  const [results, setResults] = useState<HousingProjectDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [usedFallback, setUsedFallback] = useState(false)

  const runSearch = useCallback(async (nextFilter: HousingSearchFilter) => {
    setLoading(true)
    setError('')
    setUsedFallback(false)
    try {
      const data = await housingProjectsApi.list(toApiFilter(nextFilter))
      let items = extractProjects(data)
      items = applyClientFilters(items, nextFilter)

      if (items.length === 0) {
        const fallback = applyClientFilters(featuredAsProjects(), nextFilter)
        if (fallback.length > 0) {
          items = fallback
          setUsedFallback(true)
        }
      }

      setResults(items)
    } catch (err) {
      const fallback = applyClientFilters(featuredAsProjects(), nextFilter)
      setResults(fallback)
      setUsedFallback(true)
      if (fallback.length === 0) setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (route !== 'tim-nha') return
    const sync = () => {
      const fromHash = parseHousingSearchFromHash()
      setFilter(fromHash)
      void runSearch(fromHash)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [route, runSearch])

  const cards = results.map(mapProjectToCard)

  return (
    <div className="space-y-6">
      <GovHeroBanner
        badge="Tra cứu công khai"
        title="Tìm kiếm nhà ở xã hội"
        subtitle="Tìm dự án theo tỉnh/thành, khoảng giá, diện tích và số căn còn trống."
        compact
      />

      <HousingSearchForm
        value={filter}
        onChange={setFilter}
        loading={loading}
        onSubmit={() => navigateToHousingSearch(filter)}
      />

      {error && <Alert variant="error">{error}</Alert>}

      {usedFallback && !error && cards.length > 0 && (
        <Alert variant="info">
          Đang hiển thị dự án mẫu trên máy local. Khi backend có dữ liệu thật, kết quả sẽ lấy từ hệ thống.
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">
          {loading ? 'Đang tìm kiếm...' : `Tìm thấy ${cards.length} dự án`}
        </p>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      )}

      {!loading && cards.length === 0 && (
        <EmptyState
          title="Không tìm thấy dự án phù hợp"
          description="Thử bỏ bớt bộ lọc hoặc chọn tỉnh/thành khác."
          actionLabel="Xóa bộ lọc"
          onAction={() => {
            setFilter({ ...EMPTY_HOUSING_SEARCH })
            navigateToHousingSearch(EMPTY_HOUSING_SEARCH)
            void runSearch(EMPTY_HOUSING_SEARCH)
          }}
        />
      )}

      {!loading && cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((house) => (
            <HouseCard
              key={house.id}
              house={house}
              fav={isWishlisted(house.id)}
              onToggleFavorite={() => { void toggle(house.id) }}
            />
          ))}
        </div>
      )}

      <div className="flex justify-center pt-2">
        <Button variant="outline" onClick={() => navigate('landing')}>← Về trang chủ</Button>
      </div>
    </div>
  )
}
