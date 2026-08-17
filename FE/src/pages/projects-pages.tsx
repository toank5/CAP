import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Heart, MapPin, Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { housingProjectsApi, parseApartments } from '@/api/housing-projects'
import { housingProjectStatusesApi, parseStatuses } from '@/api/housing-project-statuses'
import { CreateProjectModal } from '@/components/developer/create-project-modal'
import { DeveloperDecisionPanel } from '@/components/developer-decision-panel'
import { ProjectStatusControl } from '@/components/developer/project-status-control'
import { LocationFields } from '@/components/forms/location-fields'
import { RichEditor } from '@/components/forms/rich-editor'
import { HousingSearchForm } from '@/components/housing/housing-search-form'
import { HouseCard } from '@/components/housing/house-card'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import { useWishlist } from '@/hooks/useWishlist'
import { extractProjects, extractSingleProject } from '@/lib/parsers'
import { formatError, formatSuccess } from '@/lib/format-error'
import { resolveProvinceName } from '@/lib/vietnam-locations'
import { mapProjectToCard } from '@/lib/projects'
import { matchesOpenStatus } from '@/lib/housing-search'
import { FLASH_CREATE_PROJECT_KEY, FLASH_DELETE_PROJECT_KEY } from '@/lib/constants'
import { ensureVerifiedForApplication } from '@/lib/ekyc-gate'
import { getRole, isLoggedIn } from '@/router'
import {
  applyClientFilters,
  EMPTY_HOUSING_SEARCH,
  sortHousingProjects,
  toApiFilter,
  type HousingSearchFilter,
} from '@/lib/housing-search'
import type { CreateApartmentDto, CreateHousingProjectRequestDto, HousingProjectDto } from '@/types'

function getTotalCount(data: unknown): number {
  if (!data || typeof data !== 'object') return 0
  const o = data as Record<string, unknown>
  if (typeof o.totalCount === 'number') return o.totalCount
  const nested = (o.data ?? o.Data) as Record<string, unknown> | undefined
  if (nested && typeof nested.totalCount === 'number') return nested.totalCount
  return 0
}

function getTotalPages(data: unknown, pageSize = 12): number {
  if (!data || typeof data !== 'object') return 1
  const o = data as Record<string, unknown>
  if (typeof o.totalPages === 'number' && o.totalPages > 0) return o.totalPages
  const nested = (o.data ?? o.Data) as Record<string, unknown> | undefined
  if (nested && typeof nested.totalPages === 'number' && nested.totalPages > 0) return nested.totalPages
  // Fallback: tính từ totalCount
  const totalCount = (nested?.totalCount ?? o.totalCount) as number | undefined
  if (typeof totalCount === 'number' && totalCount > 0) {
    return Math.max(1, Math.ceil(totalCount / pageSize))
  }
  return 1
}

export function ProjectsPage() {
  const [all, setAll] = useState<HousingProjectDto[]>([])
  const [filter, setFilter] = useState<HousingSearchFilter>({ ...EMPTY_HOUSING_SEARCH })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flashSuccess, setFlashSuccess] = useState<string | null>(null)
  const [flashDelete, setFlashDelete] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const isApplicant = getRole() === 'Applicant'
  const isSxd = getRole() === 'Department Of Construction' || getRole() === 'SXD Staff'
  const PAGE_SIZE = 12

  const load = async (nextFilter: HousingSearchFilter, page = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = await housingProjectsApi.list({ ...toApiFilter(nextFilter), pageIndex: page, pageSize: PAGE_SIZE })
      const items = sortHousingProjects(
        applyClientFilters(extractProjects(data), nextFilter).filter(
          (p) => (p.availableUnits ?? 0) > 0,
        ),
        nextFilter.sort,
      )
      setAll(items)
      setPageIndex(page)
      setTotalCount(getTotalCount(data))
      setTotalPages(getTotalPages(data, PAGE_SIZE))
    } catch (err) {
      setError(formatError(err))
      setAll([])
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const refreshProjects = () => setReloadKey((k) => k + 1)

  useEffect(() => { void load(EMPTY_HOUSING_SEARCH) }, [reloadKey])

  useEffect(() => {
    const name = sessionStorage.getItem(FLASH_CREATE_PROJECT_KEY)
    if (!name) return
    sessionStorage.removeItem(FLASH_CREATE_PROJECT_KEY)
    setFlashSuccess(name)
    const timer = window.setTimeout(() => setFlashSuccess(null), 6000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const flag = sessionStorage.getItem(FLASH_DELETE_PROJECT_KEY)
    if (!flag) return
    sessionStorage.removeItem(FLASH_DELETE_PROJECT_KEY)
    setFlashDelete(true)
    const timer = window.setTimeout(() => setFlashDelete(false), 6000)
    return () => window.clearTimeout(timer)
  }, [])

  const cards = useMemo(() => all.map(mapProjectToCard), [all])

  return (
    <div>
      <PageHeader routeId="projects" />
      <PageCard className="space-y-6 p-6">
        {flashSuccess && (
          <Alert variant="success" className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <p className="font-semibold">Tạo dự án thành công!</p>
                <p className="mt-0.5 text-green-800 dark:text-green-300">
                  Dự án <strong>{flashSuccess}</strong> đã được thêm vào danh sách.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-green-700 hover:bg-green-100 dark:hover:bg-green-900/40"
              aria-label="Đóng thông báo"
              onClick={() => setFlashSuccess(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        )}

        {flashDelete && (
          <Alert variant="success" className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <p className="font-semibold">Xoá dự án thành công!</p>
                <p className="mt-0.5 text-green-800 dark:text-green-300">
                  Dự án đã được xoá khỏi danh sách.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-green-700 hover:bg-green-100 dark:hover:bg-green-900/40"
              aria-label="Đóng thông báo"
              onClick={() => setFlashDelete(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">{loading ? 'Đang tải...' : `${cards.length} dự án`}</p>
          {!isApplicant && (
            <Button variant="accent" onClick={() => setShowCreateProject(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Tạo dự án mới
            </Button>
          )}
        </div>

        <HousingSearchForm
          value={filter}
          onChange={setFilter}
          loading={loading}
          onSubmit={(next) => { void load(next) }}
        />

        {error && <Alert variant="error">{error}</Alert>}

        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        )}

        {!loading && cards.length === 0 && (
          isApplicant ? (
            <EmptyState
              title="Không tìm thấy dự án"
              description="Thử điều chỉnh bộ lọc để xem thêm dự án nhà ở xã hội."
            />
          ) : (
            <EmptyState
              title="Không tìm thấy dự án"
              description="Thử điều chỉnh bộ lọc hoặc tạo dự án mới."
              actionLabel="Tạo dự án mới"
              onAction={() => setShowCreateProject(true)}
            />
          )
        )}

        {!loading && cards.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((house) => {
                const project = all.find((p) => p.id === house.id)
                const isPending = project?.status === 'Đang chờ' || project?.status === 'Pending' || project?.status === 'PENDING'
                return (
                  <HouseCard
                    key={house.id}
                    house={house}
                    actionButton={
                      isSxd && isPending ? (
                        <Button
                          size="sm"
                          variant="accent"
                          className="w-full"
                          onClick={() => {
                            sessionStorage.setItem('projectId', house.id)
                            navigate('project-detail')
                          }}
                        >
                          Duyệt dự án
                        </Button>
                      ) : undefined
                    }
                  />
                )
              })}
            </div>
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Hiển thị {(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, totalCount)} trong {totalCount} dự án
                </p>
                <Pagination pageIndex={pageIndex} totalPages={totalPages} onPageChange={(p) => void load(filter, p)} />
              </div>
            )}
          </>
        )}
      </PageCard>
      <CreateProjectModal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreated={refreshProjects}
      />
    </div>
  )
}

function ProjectForm({ projectId, onDone }: { projectId?: string; onDone?: () => void }) {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(!!projectId)
  const [statuses, setStatuses] = useState<{ id: string; label: string }[]>([])
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [addressDefault, setAddressDefault] = useState('')
  const [addressKey, setAddressKey] = useState('new')
  const [submitting, setSubmitting] = useState(false)
  const [description, setDescription] = useState('')
  const [imagesFiles, setImagesFiles] = useState<File[]>([])
  const [apartments, setApartments] = useState<
    { unitName: string; area: string; price: string }[]
  >([{ unitName: '', area: '', price: '' }])

  useEffect(() => {
    void housingProjectStatusesApi.list()
      .then((data) => setStatuses(parseStatuses(data).map((s) => ({
        id: s.id,
        label: s.label,
      }))))
      .catch(() => setStatuses([]))
  }, [])

  useEffect(() => {
    if (!projectId) return
    void housingProjectsApi.getById(projectId).then((data) => {
      const p = extractSingleProject(data)
      if (!p) return
      const form = document.getElementById('project-form') as HTMLFormElement
      if (!form) return
      const set = (n: string, v: string | number) => {
        const el = form.elements.namedItem(n) as HTMLInputElement
        if (el) el.value = String(v)
      }
      setProvince(resolveProvinceName(p.province ?? ''))
      setDistrict(p.ward || p.district || '')
      setAddressDefault(p.address ?? '')
      setAddressKey(`addr-${projectId}`)
      set('projectName', p.projectName || p.name || '')
      setDescription(p.description ?? '')
      set('minPrice', p.minPrice ?? 0)
      set('maxPrice', p.maxPrice ?? 0)
      set('availableUnits', p.availableUnits ?? 0)
      set(
        'phase1Percentage',
        p.phase1Percentage ?? 20,
      )
      if (p.housingProjectStatusId) set('housingProjectStatusId', p.housingProjectStatusId)
      // load thêm các field mới
      const formEl = form as HTMLFormElement & Record<string, HTMLInputElement>
      if (formEl.decisionNumber && (p as Record<string, unknown>).decisionNumber)
        formEl.decisionNumber.value = String((p as Record<string, unknown>).decisionNumber)
      if (formEl.approvalDate && (p as Record<string, unknown>).approvalDate)
        formEl.approvalDate.value = String((p as Record<string, unknown>).approvalDate).split('T')[0]
      if (formEl.isConfirmed)
        formEl.isConfirmed.checked = Boolean((p as Record<string, unknown>).isConfirmed)
      if (formEl.lotteryDate && (p as Record<string, unknown>).lotteryDate)
        formEl.lotteryDate.value = String((p as Record<string, unknown>).lotteryDate).replace('Z', '')
      if (formEl.lotteryLocation && (p as Record<string, unknown>).lotteryLocation)
        formEl.lotteryLocation.value = String((p as Record<string, unknown>).lotteryLocation)
      if (formEl.applicationOpenDate && (p as Record<string, unknown>).applicationOpenDate)
        formEl.applicationOpenDate.value = String((p as Record<string, unknown>).applicationOpenDate).replace('Z', '')
      if (formEl.applicationCloseDate && (p as Record<string, unknown>).applicationCloseDate)
        formEl.applicationCloseDate.value = String((p as Record<string, unknown>).applicationCloseDate).replace('Z', '')

      const units = parseApartments(data)
      const availableOnly = units.filter(
        (t) => String(t.status || 'AVAILABLE').toUpperCase() === 'AVAILABLE',
      )
      if (availableOnly.length > 0) {
        setApartments(
          availableOnly.map((t) => ({
            unitName: t.unitName,
            area: String(t.area || ''),
            price: String(t.price || ''),
          })),
        )
      } else {
        setApartments([{ unitName: '', area: '', price: '' }])
      }
    }).catch((err) => setMsg({ type: 'error', text: formatError(err) })).finally(() => setLoading(false))
  }, [projectId])

  const readBody = (fd: FormData): CreateHousingProjectRequestDto => {
    const thumb = fd.get('thumbnailFile')
    const wardName = String(fd.get('district') || fd.get('ward') || '').trim()
    const provinceName = String(fd.get('province') || '').trim() || 'Thành phố Hồ Chí Minh'
    const aptPayload: CreateApartmentDto[] = apartments
      .filter((r) => r.unitName.trim())
      .map((r) => ({
        unitName: r.unitName.trim(),
        area: parseFloat(r.area) || 0,
        price: parseFloat(r.price) || 0,
      }))
    const areas = aptPayload.map((a) => a.area)
    const prices = aptPayload.map((a) => a.price)
    return {
      projectName: String(fd.get('projectName')),
      description,
      province: provinceName,
      district: wardName,
      street: String(fd.get('street')) || undefined,
      ward: wardName,
      address: String(fd.get('address')),
      minPrice: prices.length ? Math.min(...prices) : parseFloat(String(fd.get('minPrice'))) || 0,
      maxPrice: prices.length ? Math.max(...prices) : parseFloat(String(fd.get('maxPrice'))) || 0,
      minArea: areas.length ? Math.min(...areas) : 0,
      maxArea: areas.length ? Math.max(...areas) : 0,
      availableUnits: aptPayload.length || parseInt(String(fd.get('availableUnits')), 10) || 0,
      decisionNumber: String(fd.get('decisionNumber')) || undefined,
      approvalDate: String(fd.get('approvalDate')) || undefined,
      isConfirmed: fd.get('isConfirmed') === 'on',
      phase1Percentage: (() => {
        const v = parseFloat(String(fd.get('phase1Percentage')))
        if (!Number.isFinite(v) || v <= 0 || v > 30) {
          throw new Error('Vui lòng nhập tỉ lệ trả trước Đợt 1 (lớn hơn 0 và ≤ 30%).')
        }
        return v
      })(),
      lotteryDate: String(fd.get('lotteryDate')) || undefined,
      lotteryLocation: String(fd.get('lotteryLocation')) || undefined,
      applicationOpenDate: String(fd.get('applicationOpenDate')) || undefined,
      applicationCloseDate: String(fd.get('applicationCloseDate')) || undefined,
      housingProjectStatusId: String(fd.get('housingProjectStatusId')),
      thumbnailFile: thumb instanceof File && thumb.size > 0 ? thumb : undefined,
      imagesFiles: imagesFiles.length > 0 ? imagesFiles : undefined,
      apartments: aptPayload.length > 0 ? aptPayload : undefined,
    }
  }

  return (
    <form id="project-form" className="mx-auto max-w-2xl space-y-4" onSubmit={async (e) => {
      e.preventDefault()
      setMsg(null)
      if (!description.trim()) {
        setMsg({ type: 'error', text: 'Vui lòng nhập mô tả dự án.' })
        return
      }
      setSubmitting(true)
      try {
        const body = readBody(new FormData(e.currentTarget))
        const data = projectId ? await housingProjectsApi.update(projectId, body) : await housingProjectsApi.create(body)
        if (!projectId) {
          sessionStorage.setItem(FLASH_CREATE_PROJECT_KEY, body.projectName)
          navigate('projects')
          return
        }
        setMsg({ type: 'success', text: formatSuccess(data) || 'Cập nhật dự án thành công!' })
        setImagesFiles([])
        onDone?.()
      } catch (err) {
        setMsg({ type: 'error', text: formatError(err) })
      } finally {
        setSubmitting(false)
      }
    }}>
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>}
      <FormField label="Tên dự án" htmlFor="projectName"><Input id="projectName" name="projectName" required /></FormField>
      <div className="space-y-1.5">
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Mô tả <span className="text-red-500">*</span>
        </label>
        <RichEditor value={description} onChange={setDescription} />
        <input type="hidden" name="description" value={description} />
      </div>
      <LocationFields
        province={province}
        district={district}
        onProvinceChange={setProvince}
        onDistrictChange={setDistrict}
        addressDefaultValue={addressDefault}
        addressKey={addressKey}
      />
      <FormField label="Đường/Số nhà" htmlFor="street">
        <Input id="street" name="street" placeholder="VD: 123 Nguyễn Trãi" />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Giá tối thiểu (VNĐ)" htmlFor="minPrice"><Input id="minPrice" name="minPrice" type="number" /></FormField>
        <FormField label="Giá tối đa (VNĐ)" htmlFor="maxPrice"><Input id="maxPrice" name="maxPrice" type="number" /></FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Số căn còn trống" htmlFor="availableUnits"><Input id="availableUnits" name="availableUnits" type="number" /></FormField>
        <FormField label="Trả trước Đợt 1 (%)" htmlFor="phase1Percentage">
          <Input
            id="phase1Percentage"
            name="phase1Percentage"
            type="number"
            min={0.01}
            max={30}
            step={0.01}
            required
            placeholder="VD: 20"
          />
        </FormField>
      </div>
      <p className="text-xs text-slate-500">
        Bắt buộc — công bố cho người dân tỉ lệ trả trước sau ký HĐ (tối đa 30%). Đợt 2 = phần còn lại.
      </p>

      <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Danh sách căn</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setApartments((prev) => [
                ...prev,
                { unitName: '', area: '', price: '' },
              ])
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Thêm căn
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Tên căn · diện tích (m²) · giá (VNĐ). Chỉ sửa căn còn trống; căn đã cấp (ASSIGNED) được giữ và không hiện ở đây.
          Tổng suất chốt/bốc thăm = số căn trống (AVAILABLE).
        </p>
        {apartments.map((row, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <Input
                placeholder="Tên căn (A-101)"
                value={row.unitName}
                onChange={(e) =>
                  setApartments((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, unitName: e.target.value } : r)),
                  )
                }
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                type="number"
                placeholder="m²"
                value={row.area}
                onChange={(e) =>
                  setApartments((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, area: e.target.value } : r)),
                  )
                }
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                type="number"
                placeholder="Giá VNĐ"
                value={row.price}
                onChange={(e) =>
                  setApartments((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, price: e.target.value } : r)),
                  )
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-rose-600"
                disabled={apartments.length <= 1}
                onClick={() => setApartments((prev) => prev.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <FormField label="Trạng thái dự án" htmlFor="housingProjectStatusId">
        <Select id="housingProjectStatusId" name="housingProjectStatusId" required>
          <option value="">{statuses.length ? 'Chọn trạng thái' : 'Đang tải...'}</option>
          {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>
      </FormField>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Số quyết định" htmlFor="decisionNumber">
          <Input id="decisionNumber" name="decisionNumber" placeholder="VD: 1234/QĐ-UBND" />
        </FormField>
        <FormField label="Ngày phê duyệt" htmlFor="approvalDate">
          <Input id="approvalDate" name="approvalDate" type="date" />
        </FormField>
        <FormField label="Đã phê duyệt?" htmlFor="isConfirmed">
          <div className="flex items-center h-full">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input id="isConfirmed" name="isConfirmed" type="checkbox" className="accent-blue-600" />
              Đã phê duyệt
            </label>
          </div>
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Ngày mở đăng ký" htmlFor="applicationOpenDate">
          <Input id="applicationOpenDate" name="applicationOpenDate" type="datetime-local" />
        </FormField>
        <FormField label="Ngày đóng đăng ký" htmlFor="applicationCloseDate">
          <Input id="applicationCloseDate" name="applicationCloseDate" type="datetime-local" />
        </FormField>
        <FormField label="Ngày bốc thăm" htmlFor="lotteryDate">
          <Input id="lotteryDate" name="lotteryDate" type="datetime-local" />
        </FormField>
        <FormField label="Địa điểm bốc thăm" htmlFor="lotteryLocation">
          <Input id="lotteryLocation" name="lotteryLocation" placeholder="VD: Hội trường TTTM Bình Dương" />
        </FormField>
      </div>
      <FormField label="Ảnh thumbnail (tùy chọn)" htmlFor="thumbnailFile">
        <Input id="thumbnailFile" name="thumbnailFile" type="file" accept="image/jpeg,image/png,image/webp" />
      </FormField>
      <FormField label="Ảnh chi tiết dự án (có thể chọn nhiều ảnh)" htmlFor="imagesFiles">
        <Input
          id="imagesFiles"
          name="imagesFiles"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => {
            const list = e.target.files
            if (!list || list.length === 0) {
              setImagesFiles([])
              return
            }
            setImagesFiles(Array.from(list))
          }}
        />
      </FormField>
      {imagesFiles.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Đã chọn {imagesFiles.length} ảnh chi tiết.</p>
      )}
      {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="accent" disabled={submitting || loading}>
          {submitting ? 'Đang lưu...' : projectId ? 'Cập nhật' : 'Tạo dự án'}
        </Button>
        {projectId && (
          <Button type="button" variant="outline" className="text-red-600" onClick={async () => {
            if (!confirm('Bạn có chắc chắn muốn xóa dự án này?')) return
            try {
              await housingProjectsApi.delete(projectId)
              // Lưu thông báo vào sessionStorage để trang projects hiện banner
              // "Xoá dự án thành công" — vì trang này sẽ navigate ra projects
              try {
                sessionStorage.setItem(FLASH_DELETE_PROJECT_KEY, FLASH_DELETE_PROJECT_KEY)
              } catch {
                // sessionStorage có thể không khả dụng — bỏ qua
              }
              navigate('projects')
            } catch (err) { setMsg({ type: 'error', text: formatError(err) }) }
          }}>Xóa</Button>
        )}
      </div>
    </form>
  )
}

export function CreateProjectPage() {
  return (
    <div>
      <PageHeader routeId="create-project" />
      <PageCard className="p-6"><ProjectForm /></PageCard>
    </div>
  )
}

export function ProjectDetailPage() {
  const [projectId] = useState(() => sessionStorage.getItem('projectId') ?? '')
  const role = getRole()
  const logged = isLoggedIn()
  const isApplicant = role === 'Applicant'
  const isDeveloper = role === 'Housing Developer'
  const isAdmin = role === 'System Administrator'
  const isStaffEditor = logged && (isDeveloper || isAdmin || role === 'Department Of Construction')
  const showPublicView = !logged || isApplicant || !isStaffEditor

  return (
    <div>
      <PageHeader routeId="project-detail" />
      <PageCard className="p-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(logged ? 'projects' : 'tim-nha')}
        >
          ← {logged ? 'Danh sách dự án' : 'Tìm nhà ở'}
        </Button>
        {!projectId ? (
          <Alert variant="error">
            Không tìm thấy dự án. Quay lại danh sách và chọn lại dự án.
          </Alert>
        ) : showPublicView ? (
          <ProjectDetailView projectId={projectId} />
        ) : (
          <>
            {(isDeveloper || isAdmin) && (
              <section
                id="developer-decision"
                className="mb-8 rounded-xl border-2 border-blue-200 bg-blue-50/60 p-4 dark:border-blue-800 dark:bg-blue-950/30"
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Bước sau khi Sở duyệt — cấp căn / chốt danh sách
                </p>
                <DeveloperDecisionPanel projectId={projectId} />
              </section>
            )}
            {/* Với SXD/Admin: vẫn render view công khai để xem chi tiết + chèn panel duyệt/từ chối ở đầu */}
            <ProjectDetailView
              projectId={projectId}
              headerSlot={(p) =>
                role === 'Department Of Construction' ? (
                  <section className="mb-6 rounded-xl border-2 border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                      Phê duyệt dự án (Sở Xây Dựng)
                    </p>
                    <ProjectStatusControl project={p} />
                  </section>
                ) : null
              }
            />
            <details className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                Sửa thông tin dự án (tên, căn, tỉ lệ trả trước…)
              </summary>
              <div className="border-t border-slate-200 p-4 dark:border-slate-700">
                <ProjectForm projectId={projectId} />
              </div>
            </details>
          </>
        )}
      </PageCard>
    </div>
  )
}

function ProjectDetailView({
  projectId,
  headerSlot,
}: {
  projectId: string
  /** Render prop để inject nội dung ở đầu trang (vd: panel SXD). */
  headerSlot?: (project: HousingProjectDto) => React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [project, setProject] = useState<HousingProjectDto | null>(null)
  const [currentGalleryIdx, setCurrentGalleryIdx] = useState(0)
  const { isWishlisted, toggle } = useWishlist()
  const [wishlistBusy, setWishlistBusy] = useState(false)
  const logged = isLoggedIn()
  const isApplicant = getRole() === 'Applicant'

  useEffect(() => {
    let cancelled = false
    void housingProjectsApi
      .getById(projectId)
      .then((data) => {
        if (cancelled) return
        const p = extractSingleProject(data)
        setProject(p)
        setCurrentGalleryIdx(0)
      })
      .catch((err) => {
        if (cancelled) return
        setError(formatError(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>
  if (error) return <Alert variant="error">{error}</Alert>
  if (!project) return <Alert variant="error">Không tìm thấy dự án</Alert>

  const wishlisted = isWishlisted(projectId)
  const openDate = project.applicationOpenDate
  const closeDate = project.applicationCloseDate
  const statusLabel = String(project.status || '')
  const now = new Date()
  const openAt = openDate ? new Date(openDate) : null
  const closeAt = closeDate ? new Date(closeDate) : null
  const inOpenWindow =
    (!openAt || Number.isNaN(openAt.getTime()) || now >= openAt) &&
    (!closeAt || Number.isNaN(closeAt.getTime()) || now <= closeAt)
  const canApply = matchesOpenStatus(statusLabel) && inOpenWindow

  const handleWishlist = async () => {
    if (!logged) {
      navigate('login')
      return
    }
    setWishlistBusy(true)
    try {
      await toggle(projectId)
    } finally {
      setWishlistBusy(false)
    }
  }

  const handleApply = async () => {
    if (!logged) {
      navigate('login')
      return
    }
    if (!isApplicant) {
      setError('Chỉ tài khoản người dân mới nộp hồ sơ được.')
      return
    }
    const ok = await ensureVerifiedForApplication({ projectId })
    if (!ok) return
    navigate('create-application')
  }

  const scrollGallery = (idx: number) => {
    if (!project?.images?.length) return
    const len = project.images.length
    setCurrentGalleryIdx(((idx % len) + len) % len)
  }

  const prevGallery = () => {
    if (!project?.images?.length) return
    const len = project.images.length
    setCurrentGalleryIdx((currentGalleryIdx - 1 + len) % len)
  }

  const nextGallery = () => {
    if (!project?.images?.length) return
    const len = project.images.length
    setCurrentGalleryIdx((currentGalleryIdx + 1) % len)
  }

  const formatPrice = (v?: number) => {
    if (!v) return '—'
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} triệu`
    return v.toLocaleString('vi-VN')
  }

  const formatWhen = (v?: string) => {
    if (!v) return '—'
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? v : d.toLocaleString('vi-VN')
  }

  return (
    <div className="space-y-10">
      {project && headerSlot?.(project)}

      {/* Panel thống kê hồ sơ dự án — hiện cho SXD */}
      <EvaluationPanel projectId={projectId} />

      {/* ═══ Hero banner ══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-8 shadow-2xl shadow-blue-900/30 lg:p-10">
        {/* decorative blobs */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-indigo-400/20 blur-2xl" />

        <div className="relative grid gap-6 lg:grid-cols-5">
          {/* Ảnh */}
          <div className="lg:col-span-2">
            {project.thumbnailUrl ? (
              <div className="overflow-hidden rounded-2xl shadow-xl">
                <img
                  src={project.thumbnailUrl}
                  alt={project.projectName || project.name || 'Dự án'}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-white/10 text-6xl">
                🏠
              </div>
            )}
            {/* Gallery carousel */}
            {project.images && project.images.length > 0 && (
              <div className="mt-3 relative group/gallery">
                <div className="overflow-hidden rounded-2xl">
                  <div
                    id="gallery-track"
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentGalleryIdx * 100}%)` }}
                  >
                    {project.images.map((img, idx) => (
                      <div key={img.id} className="w-full flex-shrink-0">
                        <img
                          src={img.imageUrl}
                          alt={`Ảnh ${idx + 1}`}
                          className="aspect-[16/9] w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nút mũi tên */}
                {project.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevGallery}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-all hover:bg-black/60 group-hover/gallery:opacity-100"
                      aria-label="Ảnh trước"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={nextGallery}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-all hover:bg-black/60 group-hover/gallery:opacity-100"
                      aria-label="Ảnh tiếp theo"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Dots + đếm */}
                <div className="mt-2 flex items-center justify-center gap-2">
                  {project.images.length > 1 && project.images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`h-2 rounded-full transition-all ${
                        idx === currentGalleryIdx ? 'w-5 bg-blue-500' : 'w-2 bg-slate-300 dark:bg-slate-600'
                      }`}
                      onClick={() => scrollGallery(idx)}
                      aria-label={`Ảnh ${idx + 1}`}
                    />
                  ))}
                  <span className="ml-1 text-xs text-slate-400">
                    {currentGalleryIdx + 1}/{project.images.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Thông tin */}
          <div className="lg:col-span-3 flex flex-col justify-between space-y-5">
            {/* Tiêu đề + badge */}
            <div className="space-y-3">
              {project.status && (
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {project.status}
                </span>
              )}
              <h2 className="text-3xl font-black leading-tight text-white lg:text-4xl">
                {project.projectName || project.name}
              </h2>
              {(project.address || project.district || project.province) && (
                <div className="flex items-center gap-2 text-blue-100">
                  <MapPin className="h-4 w-4 shrink-0 text-blue-200" />
                  <span className="text-sm">
                    {[project.address, project.district, project.province].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Giá nổi bật */}
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-widest text-blue-200">Giá khởi điểm</p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-4xl font-black text-white">{formatPrice(project.minPrice)}</span>
                {project.maxPrice && project.maxPrice !== project.minPrice && (
                  <span className="text-xl font-semibold text-blue-200">— {formatPrice(project.maxPrice)}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-blue-100">
                {(project.availableUnits ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold">🏠</span>
                    <span>{project.availableUnits} căn còn</span>
                  </div>
                )}
                {project.totalUnits != null && (
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold">📋</span>
                    <span>Tổng {project.totalUnits} căn</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick info grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Mở nhận hồ sơ', value: formatWhen(openDate), icon: '📅' },
                { label: 'Đóng nhận hồ sơ', value: formatWhen(closeDate), icon: '⏰' },
                {
                  label: 'Đợt 1 (trả trước)',
                  value: project.phase1Percentage != null ? `${project.phase1Percentage}%` : '—',
                  icon: '💰',
                },
                { label: 'Diện tích', value: project.minArea ? `${project.minArea} m²` : '—', icon: '📐' },
              ]
                .filter(i => i.value !== '—')
                .map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur-sm">
                    <p className="text-lg">{item.icon}</p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-200">{item.label}</p>
                    <p className="mt-0.5 text-sm font-bold text-white">{item.value}</p>
                  </div>
                ))}
            </div>

            {/* Nút hành động */}
            <div className="flex flex-wrap gap-3">
              {logged && isApplicant && (
                <button
                  disabled={wishlistBusy}
                  onClick={handleWishlist}
                  className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.98] disabled:opacity-50"
                >
                  <Heart className={`h-5 w-5 ${wishlisted ? 'fill-rose-400 text-rose-400' : ''}`} />
                  {wishlisted ? 'Đã quan tâm' : 'Quan tâm'}
                </button>
              )}
              <button
                disabled={!canApply && logged && isApplicant}
                onClick={() => void handleApply()}
                className="flex-1 rounded-2xl bg-white py-3 text-center text-sm font-bold text-blue-700 shadow-xl transition-all hover:bg-blue-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-8"
              >
                {!logged ? 'Đăng nhập để nộp hồ sơ' : '📝 Nộp hồ sơ ngay'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Mô tả ════════════════════════════════════════════════ */}
      {project.description && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900/50">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
            <span className="text-lg">📋</span> Giới thiệu dự án
          </h3>
          <div
            className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-600 dark:text-slate-300 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: project.description }}
          />
        </div>
      )}

      {/* ═══ Danh sách căn hộ ══════════════════════════════════════ */}
      {(project.apartments && project.apartments.length > 0 && (project.availableUnits ?? 0) > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
              <span>🏠</span> Danh sách căn hộ
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {project.apartments.length}
              </span>
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Còn trống</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> Đã bàn giao</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {project.apartments.map((apt) => {
              const isAssigned = String(apt.status).toUpperCase() === 'ASSIGNED'
              return (
                <div
                  key={apt.id}
                  className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    isAssigned
                      ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/30'
                      : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-black text-slate-900 dark:text-slate-100">{apt.unitName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{apt.area} m²</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      isAssigned
                        ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    }`}>
                      {isAssigned ? 'Đã giao' : 'Còn trống'}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-black text-blue-600 dark:text-blue-400">
                    {Number(apt.price).toLocaleString('vi-VN')} VNĐ
                  </p>
                  {!isAssigned && (
                    <p className="mt-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      ✨ Còn nhận hồ sơ
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Panel thống kê hồ sơ dự án (chỉ SXD thấy)
function EvaluationPanel({ projectId }: { projectId: string }) {
  const role = getRole()
  const isSxd = role === 'Department Of Construction' || role === 'SXD Staff' || role === 'System Administrator'
  const [data, setData] = useState<{
    availableUnits?: number
    approvedApplications?: number
    eligibleApplications?: number
    pendingSxdReview?: number
    ineligible?: number
    status?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSxd) return
    let cancelled = false
    setLoading(true)
    housingProjectsApi
      .getEvaluation(projectId)
      .then((raw: unknown) => {
        if (cancelled) return
        const root = raw as Record<string, unknown>
        const nested = (root.data ?? root.Data) as Record<string, unknown> | undefined
        const o = (nested && typeof nested === 'object' ? nested : root) as Record<string, unknown>
        setData({
          availableUnits: o.availableUnits != null ? Number(o.availableUnits) : undefined,
          approvedApplications: o.approvedApplications != null ? Number(o.approvedApplications) : undefined,
          eligibleApplications: o.eligibleApplications != null ? Number(o.eligibleApplications) : undefined,
          pendingSxdReview: o.pendingSxdReview != null ? Number(o.pendingSxdReview) : undefined,
          ineligible: o.ineligible != null ? Number(o.ineligible) : undefined,
          status: o.status != null ? String(o.status) : undefined,
        })
      })
      .catch(() => { /* im lặng nếu API lỗi */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [projectId, isSxd])

  if (!isSxd) return null
  if (loading && !data) return null
  if (!data) return null

  const cards: { label: string; value: number | undefined; color: string }[] = [
    { label: 'Căn khả dụng', value: data.availableUnits, color: 'text-blue-600' },
    { label: 'Hồ sơ đủ ĐK', value: data.eligibleApplications, color: 'text-emerald-600' },
    { label: 'Chờ SXD duyệt', value: data.pendingSxdReview, color: 'text-amber-600' },
    { label: 'Đã phê duyệt', value: data.approvedApplications, color: 'text-indigo-600' },
    { label: 'Không đủ ĐK', value: data.ineligible, color: 'text-rose-600' },
  ]

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Thống kê hồ sơ dự án</h3>
        {data.status && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
            data.status === 'OVERSUBSCRIBED'
              ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800'
              : data.status === 'SUBSCRIBED'
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800'
                : 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
          }`}>
            {data.status === 'OVERSUBSCRIBED' ? 'Vượt suất' : data.status === 'SUBSCRIBED' ? 'Đạt suất' : 'Còn suất'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value ?? '—'}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// Wrapper SXD: load project rồi render ProjectStatusControl — không còn dùng (SXD xem qua ProjectDetailView với headerSlot).
