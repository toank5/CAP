import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { housingProjectStatusesApi, parseStatuses } from '@/api/housing-project-statuses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  countActiveFilters,
  EMPTY_HOUSING_SEARCH,
  HCM_PROVINCE,
  HOUSING_SORT_OPTIONS,
  type HousingSearchFilter,
  type HousingSortKey,
} from '@/lib/housing-search'
import { ensureHcmLocationsLoaded } from '@/lib/vietnam-locations'

interface HousingSearchFormProps {
  value: HousingSearchFilter
  onChange: (next: HousingSearchFilter) => void
  onSubmit: (filter: HousingSearchFilter) => void
  loading?: boolean
  compact?: boolean
}

export function HousingSearchForm({ value, onChange, onSubmit, loading, compact }: HousingSearchFormProps) {
  const [statuses, setStatuses] = useState<{ id: string; label: string }[]>([])
  const [wards, setWards] = useState<string[]>([])
  const [wardsLoading, setWardsLoading] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    void housingProjectStatusesApi.list()
      .then((data) => setStatuses(parseStatuses(data).map((s) => ({ id: s.id, label: s.label }))))
      .catch(() => setStatuses([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setWardsLoading(true)
    void ensureHcmLocationsLoaded()
      .then((list) => { if (!cancelled) setWards(list) })
      .catch(() => { if (!cancelled) setWards([]) })
      .finally(() => { if (!cancelled) setWardsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const locked = useMemo(
    () => ({ ...value, province: HCM_PROVINCE }),
    [value],
  )
  const activeCount = countActiveFilters(locked)
  const showAdvancedContent = showAdvanced || !compact

  const set = (patch: Partial<HousingSearchFilter>) =>
    onChange({ ...locked, ...patch, province: HCM_PROVINCE })

  const submit = (next: HousingSearchFilter = locked) => {
    onSubmit({ ...next, province: HCM_PROVINCE })
  }

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {/* Hàng 1: Tìm kiếm + Tỉnh/Phường */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {/* Search input */}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-12 w-full border-slate-200 bg-slate-50 pl-11 pr-10 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="Tìm theo tên dự án..."
            value={locked.search}
            onChange={(e) => set({ search: e.target.value })}
          />
          {locked.search && (
            <button
              type="button"
              onClick={() => set({ search: '' })}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tỉnh/Thành - luôn hiển thị nhãn */}
        <div className="w-full lg:w-56">
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Tỉnh/Thành phố
          </label>
          <div className="relative">
            <select
              className="input h-12 w-full cursor-not-allowed appearance-none border-slate-200 bg-slate-100 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              value={HCM_PROVINCE}
              disabled
              aria-label="Tỉnh/thành (chỉ TP. Hồ Chí Minh)"
            >
              <option value={HCM_PROVINCE}>{HCM_PROVINCE}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Phường/Xã */}
        <div className="w-full lg:w-52">
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Phường/Xã
          </label>
          <div className="relative">
            <select
              className="input h-12 w-full appearance-none border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800"
              value={locked.ward}
              disabled={wardsLoading}
              onChange={(e) => {
                const next = { ...locked, ward: e.target.value, province: HCM_PROVINCE }
                onChange(next)
                submit(next)
              }}
            >
              <option value="">{wardsLoading ? 'Đang tải...' : 'Tất cả'}</option>
              {wards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Sắp xếp */}
        <div className="w-full lg:w-44">
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Sắp xếp
          </label>
          <div className="relative">
            <select
              className="input h-12 w-full appearance-none border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800"
              value={locked.sort}
              onChange={(e) => {
                const next = {
                  ...locked,
                  sort: e.target.value as HousingSortKey,
                  province: HCM_PROVINCE,
                }
                onChange(next)
                submit(next)
              }}
              aria-label="Sắp xếp"
            >
              {HOUSING_SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Nút Lọc + Tìm */}
        <div className="flex shrink-0 gap-2 lg:pt-5">
          <Button
            type="button"
            variant={showAdvanced ? 'accent' : 'outline'}
            size="sm"
            className="h-12 gap-1.5 px-3 lg:h-10"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="hidden sm:inline">Lọc</span>
            {activeCount > 0 && (
              <span className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
          </Button>
          <Button type="submit" variant="accent" disabled={loading} className="h-12 w-12 px-0 lg:h-10 lg:w-auto lg:px-4">
            <span className="lg:hidden"><Search className="h-4 w-4" /></span>
            <span className="hidden lg:inline">Tìm kiếm</span>
          </Button>
        </div>
      </div>

      {/* Hàng 2: Bộ lọc nâng cao */}
      {showAdvancedContent && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-6 dark:border-slate-800">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Giá từ (triệu)</label>
            <Input
              className="h-10 text-sm"
              type="number"
              min={0}
              placeholder="VD: 500"
              value={locked.minPriceMillion}
              onChange={(e) => set({ minPriceMillion: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Giá đến (triệu)</label>
            <Input
              className="h-10 text-sm"
              type="number"
              min={0}
              placeholder="VD: 2000"
              value={locked.maxPriceMillion}
              onChange={(e) => set({ maxPriceMillion: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Diện tích từ (m²)</label>
            <Input
              className="h-10 text-sm"
              type="number"
              min={0}
              placeholder="VD: 45"
              value={locked.minArea}
              onChange={(e) => set({ minArea: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Diện tích đến (m²)</label>
            <Input
              className="h-10 text-sm"
              type="number"
              min={0}
              placeholder="VD: 90"
              value={locked.maxArea}
              onChange={(e) => set({ maxArea: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Căn tối thiểu</label>
            <Input
              className="h-10 text-sm"
              type="number"
              min={0}
              placeholder="VD: 1"
              value={locked.minAvailable}
              onChange={(e) => set({ minAvailable: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Trạng thái</label>
            <div className="relative">
              <select
                className="input h-10 w-full appearance-none text-sm"
                value={locked.statusCode || locked.statusId}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'OPEN' || v === 'UPCOMING' || v === 'CLOSED') {
                    set({ statusCode: v, statusId: '' })
                  } else {
                    set({ statusId: v, statusCode: '' })
                  }
                }}
              >
                <option value="">Tất cả</option>
                <option value="OPEN">Đang mở</option>
                <option value="UPCOMING">Sắp mở</option>
                <option value="CLOSED">Đã đóng</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
      )}

      {/* Thanh thông báo lọc */}
      {activeCount > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {activeCount} bộ lọc đang áp dụng
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => {
              const next = { ...EMPTY_HOUSING_SEARCH }
              onChange(next)
              submit(next)
            }}
          >
            <X className="h-3 w-3" />
            Xóa hết
          </Button>
        </div>
      )}
    </form>
  )
}
