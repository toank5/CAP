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
import { formatError } from '@/lib/format-error'
import {
  applyClientFilters,
  EMPTY_HOUSING_SEARCH,
  navigateToHousingSearch,
  parseHousingSearchFromHash,
  sortHousingProjects,
  toApiFilter,
  type HousingSearchFilter,
} from '@/lib/housing-search'
import { extractProjects } from '@/lib/parsers'
import { mapProjectToCard } from '@/lib/projects'
import type { HousingProjectDto } from '@/types'

export function HousingSearchPage() {
  const route = useHashRoute()
  const { isWishlisted, toggle } = useWishlist()
  const [filter, setFilter] = useState<HousingSearchFilter>({ ...EMPTY_HOUSING_SEARCH })
  const [results, setResults] = useState<HousingProjectDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const runSearch = useCallback(async (nextFilter: HousingSearchFilter) => {
    setLoading(true)
    setError('')
    try {
      const data = await housingProjectsApi.list(toApiFilter(nextFilter))
      const items = sortHousingProjects(
        applyClientFilters(extractProjects(data), nextFilter),
        nextFilter.sort,
      )
      setResults(items)
    } catch (err) {
      setResults([])
      setError(formatError(err))
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
        subtitle="TP. Hồ Chí Minh — tìm theo tên dự án, phường/xã (API v2), giá, diện tích và sắp xếp."
        compact
      />

      <HousingSearchForm
        value={filter}
        onChange={setFilter}
        loading={loading}
        onSubmit={(next) => navigateToHousingSearch(next)}
      />

      {error && <Alert variant="error">{error}</Alert>}

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
          description="Thử bỏ bớt bộ lọc hoặc đổi từ khóa. Địa giới theo API v2 (phường/xã TP.HCM)."
          actionLabel="Xóa bộ lọc"
          onAction={() => {
            const next = { ...EMPTY_HOUSING_SEARCH }
            setFilter(next)
            navigateToHousingSearch(next)
            void runSearch(next)
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
