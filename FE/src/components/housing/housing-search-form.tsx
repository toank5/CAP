import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X, RotateCcw } from 'lucide-react'
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

  // Quick filter helpers
  const isFilterAll = !locked.statusCode && !locked.statusId && !locked.minPriceMillion && !locked.maxPriceMillion && !locked.minArea && !locked.maxArea
  const isFilterOpen = locked.statusCode === 'OPEN'
  const isFilterUpcoming = locked.statusCode === 'UPCOMING'
  const isFilterUnder15B = locked.maxPriceMillion === '1500' && !locked.minPriceMillion
  const isFilterMediumArea = locked.minArea === '50' && locked.maxArea === '70'

  return (
    <form
      className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {/* Hàng 1: Thanh tìm kiếm & bộ lọc chính */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search input */}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder="Tìm theo tên dự án, chủ đầu tư, địa chỉ..."
            value={locked.search}
            onChange={(e) => set({ search: e.target.value })}
          />
          {locked.search && (
            <button
              type="button"
              onClick={() => {
                const next = { ...locked, search: '' }
                onChange(next)
                submit(next)
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Phường/Xã / Khu vực */}
        <div className="w-full sm:w-52">
          <div className="relative">
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3 pr-8 text-xs font-medium text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 appearance-none"
              value={locked.ward}
              disabled={wardsLoading}
              onChange={(e) => {
                const next = { ...locked, ward: e.target.value, province: HCM_PROVINCE }
                onChange(next)
                submit(next)
              }}
            >
              <option value="">Khu vực: {wardsLoading ? 'Đang tải...' : 'Toàn TP. HCM'}</option>
              {wards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Sắp xếp */}
        <div className="w-full sm:w-44">
          <div className="relative">
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3 pr-8 text-xs font-medium text-slate-700 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 appearance-none"
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
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Nút Lọc nâng cao + Tìm kiếm */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`h-10 rounded-xl px-3 text-xs font-semibold gap-1.5 transition ${showAdvanced
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-200'
              }`}
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Bộ lọc</span>
            {activeCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5 ml-0.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-0.5" />}
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
          >
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Tìm kiếm
          </Button>
        </div>
      </div>

      {/* Hàng 2: Tag lọc nhanh */}
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-400 mr-1">Lọc nhanh:</span>
        <button
          type="button"
          onClick={() => {
            const next = { ...EMPTY_HOUSING_SEARCH, search: locked.search, ward: locked.ward, sort: locked.sort }
            onChange(next)
            submit(next)
          }}
          className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${isFilterAll
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
        >
          Tất cả
        </button>
        <button
          type="button"
          onClick={() => {
            const next = { ...locked, statusCode: isFilterOpen ? '' : 'OPEN', statusId: '' }
            onChange(next)
            submit(next)
          }}
          className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${isFilterOpen
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
        >
          Đang mở đăng ký
        </button>
        <button
          type="button"
          onClick={() => {
            const next = { ...locked, statusCode: isFilterUpcoming ? '' : 'UPCOMING', statusId: '' }
            onChange(next)
            submit(next)
          }}
          className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${isFilterUpcoming
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
        >
          Sắp mở bán
        </button>
        <button
          type="button"
          onClick={() => {
            const next = {
              ...locked,
              maxPriceMillion: isFilterUnder15B ? '' : '1500',
              minPriceMillion: '',
            }
            onChange(next)
            submit(next)
          }}
          className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${isFilterUnder15B
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
        >
          Giá dưới 1.5 tỷ
        </button>
        <button
          type="button"
          onClick={() => {
            const next = {
              ...locked,
              minArea: isFilterMediumArea ? '' : '50',
              maxArea: isFilterMediumArea ? '' : '70',
            }
            onChange(next)
            submit(next)
          }}
          className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${isFilterMediumArea
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
        >
          Diện tích 50–70 m²
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              const next = { ...EMPTY_HOUSING_SEARCH }
              onChange(next)
              submit(next)
            }}
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600"
          >
            <RotateCcw className="h-3 w-3" />
            Đặt lại bộ lọc
          </button>
        )}
      </div>

      {/* Hàng 3: Khối lọc nâng cao */}
      {showAdvancedContent && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-6 dark:border-slate-800">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Giá từ (triệu)</label>
            <Input
              className="h-9 rounded-xl text-xs focus:border-emerald-500 focus:ring-emerald-500/20"
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
              className="h-9 rounded-xl text-xs focus:border-emerald-500 focus:ring-emerald-500/20"
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
              className="h-9 rounded-xl text-xs focus:border-emerald-500 focus:ring-emerald-500/20"
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
              className="h-9 rounded-xl text-xs focus:border-emerald-500 focus:ring-emerald-500/20"
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
              className="h-9 rounded-xl text-xs focus:border-emerald-500 focus:ring-emerald-500/20"
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
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 appearance-none h-9"
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
    </form>
  )
}

