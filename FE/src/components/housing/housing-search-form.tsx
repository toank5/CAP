import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { housingProjectStatusesApi, parseStatuses } from '@/api/housing-project-statuses'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input, Select } from '@/components/ui/input'
import {
  countActiveFilters,
  EMPTY_HOUSING_SEARCH,
  type HousingSearchFilter,
} from '@/lib/housing-search'
import { getDistrictsByProvince, VIETNAM_PROVINCES } from '@/lib/vietnam-locations'

interface HousingSearchFormProps {
  value: HousingSearchFilter
  onChange: (next: HousingSearchFilter) => void
  onSubmit: () => void
  loading?: boolean
  compact?: boolean
}

export function HousingSearchForm({ value, onChange, onSubmit, loading, compact }: HousingSearchFormProps) {
  const [statuses, setStatuses] = useState<{ id: string; label: string }[]>([])
  const [expanded, setExpanded] = useState(!compact)

  useEffect(() => {
    void housingProjectStatusesApi.list()
      .then((data) => setStatuses(parseStatuses(data).map((s) => ({ id: s.id, label: s.label }))))
      .catch(() => setStatuses([]))
  }, [])

  const districts = useMemo(() => getDistrictsByProvince(value.province), [value.province])
  const activeCount = countActiveFilters(value)
  const showAdvanced = expanded || !compact

  const set = (patch: Partial<HousingSearchFilter>) => onChange({ ...value, ...patch })

  const fieldClass = 'min-w-0'

  return (
    <form
      className="gov-card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-[#003D7A] dark:text-white">Tìm kiếm nhà ở</p>
            {!compact && (
              <p className="text-xs text-slate-500">Lọc theo vị trí, giá, diện tích và trạng thái dự án</p>
            )}
          </div>
        </div>
        {compact && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Thu gọn' : 'Bộ lọc nâng cao'}
          </Button>
        )}
      </div>

      {/* Thanh tìm kiếm — tách riêng khỏi bộ lọc */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <FormField label="Từ khóa" htmlFor="search-q">
              <div className={`relative ${fieldClass}`}>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="search-q"
                  className="h-11 border-slate-200 bg-white pl-10 dark:border-slate-600 dark:bg-slate-900"
                  placeholder="Tên dự án, quận/huyện, địa chỉ..."
                  value={value.search}
                  onChange={(e) => set({ search: e.target.value })}
                />
              </div>
            </FormField>
          </div>
          <Button
            type="submit"
            variant="accent"
            disabled={loading}
            className="h-11 w-full shrink-0 px-8 sm:w-auto"
          >
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </Button>
        </div>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
          <FormField label="Tỉnh/Thành" htmlFor="search-province">
            <Select
              id="search-province"
              className={`h-11 ${fieldClass}`}
              value={value.province}
              onChange={(e) => set({ province: e.target.value, district: '' })}
            >
              <option value="">Tất cả tỉnh/thành</option>
              {VIETNAM_PROVINCES.map((p) => (
                <option key={p.code} value={p.name}>{p.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Quận/Huyện" htmlFor="search-district">
            <Select
              id="search-district"
              className={`h-11 ${fieldClass}`}
              value={value.district}
              disabled={!value.province}
              onChange={(e) => set({ district: e.target.value })}
            >
              <option value="">{value.province ? 'Tất cả quận/huyện' : 'Chọn tỉnh/thành trước'}</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Giá từ (triệu VNĐ)" htmlFor="search-min-price">
            <Input
              id="search-min-price"
              className={`h-11 ${fieldClass}`}
              type="number"
              min={0}
              placeholder="VD: 500"
              value={value.minPriceMillion}
              onChange={(e) => set({ minPriceMillion: e.target.value })}
            />
          </FormField>

          <FormField label="Giá đến (triệu VNĐ)" htmlFor="search-max-price">
            <Input
              id="search-max-price"
              className={`h-11 ${fieldClass}`}
              type="number"
              min={0}
              placeholder="VD: 2000"
              value={value.maxPriceMillion}
              onChange={(e) => set({ maxPriceMillion: e.target.value })}
            />
          </FormField>

          <FormField label="Diện tích từ (m²)" htmlFor="search-min-area">
            <Input
              id="search-min-area"
              className={`h-11 ${fieldClass}`}
              type="number"
              min={0}
              placeholder="VD: 45"
              value={value.minArea}
              onChange={(e) => set({ minArea: e.target.value })}
            />
          </FormField>

          <FormField label="Diện tích đến (m²)" htmlFor="search-max-area">
            <Input
              id="search-max-area"
              className={`h-11 ${fieldClass}`}
              type="number"
              min={0}
              placeholder="VD: 90"
              value={value.maxArea}
              onChange={(e) => set({ maxArea: e.target.value })}
            />
          </FormField>

          <FormField label="Số căn tối thiểu" htmlFor="search-min-units">
            <Input
              id="search-min-units"
              className={`h-11 ${fieldClass}`}
              type="number"
              min={0}
              placeholder="VD: 1"
              value={value.minAvailable}
              onChange={(e) => set({ minAvailable: e.target.value })}
            />
          </FormField>

          <FormField label="Trạng thái dự án" htmlFor="search-status">
            <Select
              id="search-status"
              className={`h-11 ${fieldClass}`}
              value={value.statusId}
              onChange={(e) => set({ statusId: e.target.value })}
            >
              <option value="">Tất cả trạng thái</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </FormField>
        </div>
      )}

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-xs text-slate-500">{activeCount} bộ lọc đang áp dụng</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...EMPTY_HOUSING_SEARCH })}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Xóa bộ lọc
          </Button>
        </div>
      )}
    </form>
  )
}
