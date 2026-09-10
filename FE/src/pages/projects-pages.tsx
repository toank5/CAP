import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Heart,
  MapPin,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Edit3,
  Building2,
  FileText,
  Home,
  Clock,
  DollarSign,
  Layers,
  Compass,
  Eye,
  ShieldCheck,
  Sparkles,
  Bed,
  Maximize2,
  Box,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { housingProjectsApi, parseApartments } from '@/api/housing-projects'
import { housingProjectStatusesApi, parseStatuses } from '@/api/housing-project-statuses'
import { CreateProjectModal } from '@/components/developer/create-project-modal'
import { EditProjectModal } from '@/components/developer/edit-project-modal'
import { Building3DViewer } from '@/components/housing-projects/building-3d-viewer'
import { Apartment3DViewer } from '@/components/housing-projects/apartment-3d-viewer'
import { DeveloperDecisionPanel } from '@/components/developer-decision-panel'
import { ProjectPaymentManagementPanel } from '@/components/developer/project-payment-management-panel'
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
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import { useWishlist } from '@/hooks/useWishlist'
import { useExistingApplicationBlocker } from '@/hooks/useExistingApplicationBlocker'
import { extractProjects, extractSingleProject } from '@/lib/parsers'
import { formatError, formatSuccess } from '@/lib/format-error'
import { resolveProvinceName } from '@/lib/vietnam-locations'
import { mapProjectToCard } from '@/lib/projects'
import { labelProjectStatus } from '@/lib/labels'
import { matchesOpenStatus } from '@/lib/housing-search'
import { FLASH_CREATE_PROJECT_KEY, FLASH_DELETE_PROJECT_KEY } from '@/lib/constants'
import { ensureVerifiedForApplication } from '@/lib/ekyc-gate'
import { getRole, isLoggedIn } from '@/router'
import {
  isPending,
  isUpcoming,
  isOpenForRegistration,
  isRejected,
  isApplicationIntakeOpen,
  getIntakeCloseInfo,
  formatIntakeDeadline,
  INTAKE_CLOSING_SOON_DAYS,
} from '@/lib/project-status-flow'
import {
  applyClientFilters,
  EMPTY_HOUSING_SEARCH,
  sortHousingProjects,
  toApiFilter,
  type HousingSearchFilter,
} from '@/lib/housing-search'
import type { ApartmentDto, CreateApartmentDto, CreateHousingProjectRequestDto, HousingProjectDto } from '@/types'

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
  const [notice, setNotice] = useState<string | null>(null)
  const { isWishlisted, toggle } = useWishlist()
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

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(id)
  }, [notice])

  const handleToggleFavorite = async (house: ReturnType<typeof mapProjectToCard>) => {
    const added = await toggle(house.id)
    if (added) setNotice(`Đã thêm "${house.name}" vào danh sách quan tâm.`)
  }

  const cards = useMemo(() => all.map(mapProjectToCard), [all])

  return (
    <div className="space-y-6">
      {/* 1. Modern Page Header & Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-6 dark:border-emerald-950/40 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              <Building2 className="h-3.5 w-3.5" />
              CỔNG THÔNG TIN DỰ ÁN NHÀ Ở XÃ HỘI
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Danh mục Dự án Nhà ở Xã hội
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Khám phá các dự án nhà ở xã hội quy hoạch chuẩn mực, thông tin minh bạch, lịch thanh toán do chủ đầu tư công bố theo tiến độ (số đợt không cố định; lần đầu không quá 30% giá trị hợp đồng) và nộp hồ sơ xét duyệt trực tuyến.
            </p>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {loading ? 'Đang tải...' : `${totalCount || cards.length} dự án khả dụng`}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                <MapPin className="h-3 w-3 text-rose-500" />
                TP. Hồ Chí Minh
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Sở Xây dựng giám sát
              </span>
            </div>
          </div>

          {!isApplicant && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-4 py-2.5 shadow-md shadow-emerald-600/20 shrink-0"
              onClick={() => setShowCreateProject(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Tạo dự án mới
            </Button>
          )}
        </div>
      </div>

      {/* 2. Flash Success & Delete Alerts */}
      {flashSuccess && (
        <Alert variant="success" className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">Tạo dự án thành công!</p>
              <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                Dự án <strong>{flashSuccess}</strong> đã được thêm vào hệ thống.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
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
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">Xoá dự án thành công!</p>
              <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                Dự án đã được xoá khỏi danh sách.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
            aria-label="Đóng thông báo"
            onClick={() => setFlashDelete(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      {/* 3. Search & Filter Bar */}
      <HousingSearchForm
        value={filter}
        onChange={setFilter}
        loading={loading}
        onSubmit={(next) => { void load(next) }}
      />

      {error && <Alert variant="error">{error}</Alert>}

      {/* 4. Projects Cards Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Skeleton className="aspect-[16/10] w-full rounded-xl" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-10 rounded-xl" />
                  <Skeleton className="h-10 rounded-xl" />
                </div>
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        isApplicant ? (
          <EmptyState
            title="Không tìm thấy dự án phù hợp"
            description="Thử điều chỉnh hoặc đặt lại bộ lọc để xem các dự án nhà ở xã hội đang mở."
          />
        ) : (
          <EmptyState
            title="Không tìm thấy dự án phù hợp"
            description="Thử điều chỉnh bộ lọc hoặc tạo dự án mới cho hệ thống."
            actionLabel="Tạo dự án mới"
            onAction={() => setShowCreateProject(true)}
          />
        )
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((house) => {
              const project = all.find((p) => p.id === house.id)
              const isPending = project?.status === 'Đang chờ' || project?.status === 'Pending' || project?.status === 'PENDING'
              return (
                <HouseCard
                  key={house.id}
                  house={house}
                  fav={isWishlisted(house.id)}
                  onToggleFavorite={() => { void handleToggleFavorite(house) }}
                  actionButton={
                    isSxd && isPending ? (
                      <Button
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
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

          {/* 5. Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hiển thị <span className="font-semibold text-slate-700 dark:text-slate-200">{(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, totalCount)}</span> trong tổng số <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span> dự án
              </p>
              <Pagination pageIndex={pageIndex} totalPages={totalPages} onPageChange={(p) => void load(filter, p)} />
            </div>
          )}
        </div>
      )}

      {/* Wishlist Toast */}
      {notice && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4 pointer-events-none"
        >
          <div className="pointer-events-auto w-full max-w-sm animate-slide-up">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-600 to-emerald-500 p-px shadow-2xl shadow-emerald-500/30">
              <div className="relative rounded-2xl bg-white px-5 py-4 dark:bg-slate-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                    <Heart className="h-4 w-4 fill-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Danh sách quan tâm</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{notice}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    // const thumb
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
      decisionNumber: String(fd.get('decisionNumber')),
      approvalDate: String(fd.get('approvalDate')) || undefined,
      isConfirmed: fd.get('isConfirmed') === 'on',

      lotteryDate: String(fd.get('lotteryDate')) || undefined,
      lotteryLocation: String(fd.get('lotteryLocation')) || undefined,
      applicationOpenDate: String(fd.get('applicationOpenDate')) || undefined,
      applicationCloseDate: String(fd.get('applicationCloseDate')) || undefined,
      housingProjectStatusId: String(fd.get('housingProjectStatusId')),
      milestones: [],



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
        <FormField label="Tỷ lệ Đợt 1 — thanh toán lần đầu, gồm tiền đặt cọc (%)" htmlFor="phase1Percentage">
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
        Công bố tỷ lệ lần ứng trước đầu (không quá 30% giá trị hợp đồng, gồm tiền đặt cọc nếu có). Số đợt do chủ đầu tư tự chia theo tiến độ, tổng 100%. Căn cứ: Điều 89 Luật Nhà ở năm 2023.
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
  const [project, setProject] = useState<HousingProjectDto | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const role = getRole()
  const logged = isLoggedIn()
  const isApplicant = role === 'Applicant'
  const isDeveloper = role === 'Housing Developer'
  const isAdmin = role === 'System Administrator'
  const isStaffEditor = logged && (isDeveloper || isAdmin || role === 'Department Of Construction')
  const showPublicView = !logged || isApplicant || !isStaffEditor
  const canEditProject = Boolean(project) && isStaffEditor && isPending(project)

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
          <ProjectDetailView projectId={projectId} onLoaded={setProject} />
        ) : (
          <>
            {Boolean(project) && (isDeveloper || isAdmin) && !isPending(project) && !isUpcoming(project) && !isRejected(project) && (
              <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="accent"
                  onClick={() => {
                    sessionStorage.setItem('lotteryProjectId', projectId)
                    sessionStorage.setItem('projectId', projectId)
                    navigate('lottery-detail')
                  }}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Bốc thăm
                </Button>
              </div>
            )}
            {Boolean(project) && (isDeveloper || isAdmin) && !isPending(project) && !isUpcoming(project) && !isRejected(project) && (
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
              onLoaded={setProject}
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
            {canEditProject && (
              <div className="mt-6 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 p-5 shadow-sm dark:border-teal-800/40 dark:bg-slate-900/60">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
                      <Edit3 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Quản lý dự án dành cho Chủ đầu tư
                        </h3>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          Chờ Sở Xây Dựng duyệt (Pending)
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Dự án đang ở trạng thái chờ duyệt. Bạn có thể chỉnh sửa thông tin dự án, lịch thanh toán (số đợt do chủ đầu tư tự chia, lần đầu không quá 30%) và cơ cấu quỹ căn hộ.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="accent"
                      className="inline-flex items-center gap-1.5 bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md"
                      onClick={() => setShowEditModal(true)}
                    >
                      <Edit3 className="h-4 w-4" />
                      Chỉnh sửa dự án & Quỹ căn
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="inline-flex items-center gap-1.5 border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40"
                      onClick={async () => {
                        if (!confirm('Bạn có chắc chắn muốn xóa dự án này? Hành động này sẽ xóa toàn bộ quỹ căn và không thể hoàn tác.')) return
                        try {
                          await housingProjectsApi.delete(projectId)
                          sessionStorage.setItem(FLASH_DELETE_PROJECT_KEY, FLASH_DELETE_PROJECT_KEY)
                          navigate('projects')
                        } catch (err) {
                          alert(formatError(err))
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa dự án
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {Boolean(project) && (isDeveloper || isAdmin) && !isPending(project) && !isUpcoming(project) && !isOpenForRegistration(project) && (
              <div className="mt-8">
                <ProjectPaymentManagementPanel
                  projectId={projectId}
                  projectName={project?.projectName || project?.name}
                />
              </div>
            )}
          </>
        )}
      </PageCard>
      <EditProjectModal
        projectId={projectId}
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdated={() => {
          window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
        }}
      />
    </div>
  )
}

const DIRECTION_LABELS: Record<string, string> = {
  EAST: 'Đông',
  WEST: 'Tây',
  SOUTH: 'Nam',
  NORTH: 'Bắc',
  SOUTH_EAST: 'Đông Nam',
  NORTH_EAST: 'Đông Bắc',
  SOUTH_WEST: 'Tây Nam',
  NORTH_WEST: 'Tây Bắc',
}

const TRIGGER_EVENT_LABELS: Record<string, string> = {
  ON_LOTTERY_WON: 'Khi được cấp suất hoặc trúng bốc thăm (Đợt 1 — thanh toán lần đầu, gồm tiền đặt cọc)',
  ON_CONTRACT_SIGNED: 'Sau khi đã ký hợp đồng mua bán',
  CONSTRUCTION_ROUGH_FLOOR: 'Khi hoàn thành xây dựng phần thô',
  FOUNDATION_COMPLETED: 'Khi hoàn thành móng',
  ROOFING_COMPLETED: 'Khi cất nóc công trình',
  TOPPING_OUT: 'Khi cất nóc công trình',
  HANDOVER: 'Khi bàn giao căn hộ',
  RED_BOOK_ISSUED: 'Khi cấp giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở (sổ hồng)',
  CUSTOM: 'Theo tiến độ thực tế',
}

function ProjectDetailView({
  projectId,
  headerSlot,
  onLoaded,
}: {
  projectId: string
  /** Render prop để inject nội dung ở đầu trang (vd: panel SXD). */
  headerSlot?: (project: HousingProjectDto) => React.ReactNode
  onLoaded?: (project: HousingProjectDto | null) => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [project, setProject] = useState<HousingProjectDto | null>(null)
  const [currentGalleryIdx, setCurrentGalleryIdx] = useState(0)
  const { isWishlisted, toggle } = useWishlist()
  const { canCreate: canCreateNew, message: applicantBlockMessage } = useExistingApplicationBlocker()
  const [wishlistBusy, setWishlistBusy] = useState(false)
  const [openingSale, setOpeningSale] = useState(false)
  const [closingIntake, setClosingIntake] = useState(false)
  const [closeIntakeModalOpen, setCloseIntakeModalOpen] = useState(false)
  const [statusSuccessMsg, setStatusSuccessMsg] = useState('')

  // Apartment filters & 3D state
  const [selectedBlock, setSelectedBlock] = useState<string>('ALL')
  const [selectedBedrooms, setSelectedBedrooms] = useState<string>('ALL')
  const [selectedUnitGroup, setSelectedUnitGroup] = useState<string>('ALL')
  const [selectedSaleType, setSelectedSaleType] = useState<string>('ALL')
  const [searchUnitName, setSearchUnitName] = useState<string>('')
  const [isBuilding3DFullscreen, setIsBuilding3DFullscreen] = useState(false)
  const [active3DApartment, setActive3DApartment] = useState<ApartmentDto | null>(null)
  const [is3DModalOpen, setIs3DModalOpen] = useState(false)

  const logged = isLoggedIn()
  const role = getRole()
  const isApplicant = role === 'Applicant'
  const isDeveloper = role === 'Housing Developer'
  const isAdmin = role === 'System Administrator'
  const canOpenSale = (isDeveloper || isAdmin) && isUpcoming(project)
  // Chốt danh sách để bốc thăm. BE cho cả CĐT làm việc này, không riêng Sở.
  const canCloseIntake = (isDeveloper || isAdmin) && isOpenForRegistration(project)
  const showApply = !logged || isApplicant
  const blockedByExisting = logged && isApplicant && !canCreateNew

  useEffect(() => {
    let cancelled = false
    const load = () => {
      void housingProjectsApi
        .getById(projectId)
        .then((data) => {
          if (cancelled) return
          const p = extractSingleProject(data)
          setProject(p)
          onLoaded?.(p)
          setCurrentGalleryIdx(0)
        })
        .catch((err) => {
          if (cancelled) return
          setError(formatError(err))
          onLoaded?.(null)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }
    load()
    const onStatusChanged = () => load()
    window.addEventListener('fecaps:project-status-changed', onStatusChanged)
    return () => {
      cancelled = true
      window.removeEventListener('fecaps:project-status-changed', onStatusChanged)
    }
  }, [projectId])

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải thông tin dự án...</p>
  if (error) return <Alert variant="error">{error}</Alert>
  if (!project) return <Alert variant="error">Không tìm thấy dự án</Alert>

  const wishlisted = isWishlisted(projectId)
  const openDate = project.applicationOpenDate
  const statusLabel = String(project.status || '')
  const now = new Date()
  const openAt = openDate ? new Date(openDate) : null
  const intakeClose = getIntakeCloseInfo(project, now)
  const closeAt = intakeClose.closeAt
  const inOpenWindow =
    (!openAt || Number.isNaN(openAt.getTime()) || now >= openAt) &&
    (!closeAt || Number.isNaN(closeAt.getTime()) || now <= closeAt)
  const canApply = isApplicationIntakeOpen(project) && matchesOpenStatus(statusLabel) && inOpenWindow

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

  const handleOpenSale = async () => {
    if (!project?.id || openingSale) return
    if (!window.confirm('Mở bán dự án này? Người dân sẽ được nộp hồ sơ (chuyển sang Đang mở đăng ký).')) return
    setOpeningSale(true)
    setError('')
    try {
      await housingProjectsApi.changeLifecycleStatus(project.id, 'OPEN')
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
    } catch (err) {
      setError(formatError(err))
    } finally {
      setOpeningSale(false)
    }
  }

  const handleCloseIntake = () => {
    if (!project?.id || closingIntake) return
    setError('')
    setCloseIntakeModalOpen(true)
  }

  const confirmCloseIntake = async () => {
    if (!project?.id || closingIntake) return
    setClosingIntake(true)
    setError('')
    try {
      await housingProjectsApi.changeLifecycleStatus(project.id, 'CLOSED')
      setCloseIntakeModalOpen(false)
      setStatusSuccessMsg('Đã đóng đợt tiếp nhận hồ sơ thành công. Danh sách hồ sơ đã được chốt để tiến hành thẩm định và lên lịch bốc thăm.')
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
    } catch (err) {
      setError(formatError(err))
    } finally {
      setClosingIntake(false)
    }
  }

  // Gallery images list
  const galleryImages: string[] = []
  if (project.thumbnailUrl) galleryImages.push(project.thumbnailUrl)
  if (project.images && Array.isArray(project.images)) {
    project.images.forEach((img: any) => {
      const u = typeof img === 'string' ? img : img?.imageUrl || img?.ImageUrl || img?.url
      if (u && !galleryImages.includes(u)) galleryImages.push(u)
    })
  }
  const totalSlides = galleryImages.length

  const scrollGallery = (idx: number) => {
    if (totalSlides <= 1) return
    setCurrentGalleryIdx(((idx % totalSlides) + totalSlides) % totalSlides)
  }

  const prevGallery = () => {
    if (totalSlides <= 1) return
    setCurrentGalleryIdx((currentGalleryIdx - 1 + totalSlides) % totalSlides)
  }

  const nextGallery = () => {
    if (totalSlides <= 1) return
    setCurrentGalleryIdx((currentGalleryIdx + 1) % totalSlides)
  }

  const formatPrice = (v?: number) => {
    if (!v) return '—'
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} triệu`
    return v.toLocaleString('vi-VN')
  }

  // Available apartments & filter options
  const allApartments: ApartmentDto[] = project.apartments || []
  const availableBlocks = Array.from(new Set(allApartments.map((a) => a.buildingBlock || 'Block A').filter(Boolean)))

  const filteredApartments = allApartments.filter((apt) => {
    if (selectedBlock !== 'ALL' && (apt.buildingBlock || 'Block A') !== selectedBlock) return false
    if (selectedBedrooms !== 'ALL' && String(apt.numberOfBedrooms ?? 2) !== selectedBedrooms) return false
    if (selectedUnitGroup !== 'ALL') {
      const g = (apt.unitGroup?.toUpperCase() === 'PRIORITY' ? 'PRIORITY' : 'STANDARD')
      if (g !== selectedUnitGroup) return false
    }
    if (selectedSaleType !== 'ALL') {
      const st = (apt.saleType?.toUpperCase() === 'CO_OWNERSHIP' ? 'CO_OWNERSHIP' : 'FULL_OWNERSHIP')
      if (st !== selectedSaleType) return false
    }
    if (searchUnitName.trim()) {
      const term = searchUnitName.trim().toLowerCase()
      if (!apt.unitName.toLowerCase().includes(term)) return false
    }
    return true
  })

  const rawAddressParts = [
    project.street,
    project.ward,
    project.district && project.district.trim().toLowerCase() !== project.ward?.trim().toLowerCase()
      ? project.district
      : null,
    project.province,
  ].filter(Boolean) as string[]
  const fullAddress = Array.from(new Set(rawAddressParts)).join(', ') || project.address || 'Thành phố Hồ Chí Minh'

  const milestonesList = project.milestones && project.milestones.length > 0 ? project.milestones : []

  return (
    <div className="space-y-8">
      {project && headerSlot?.(project)}

      {/* Panel thống kê hồ sơ dự án — hiện cho SXD */}
      <EvaluationPanel projectId={projectId} />

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. HERO BANNER & IMAGE GALLERY                                       */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-8 p-6 lg:grid-cols-12 lg:p-8">
          {/* Gallery Cột Trái (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="relative overflow-hidden rounded-2xl bg-slate-950 aspect-[4/3] shadow-md group">
              {totalSlides > 0 ? (
                <div
                  className="flex h-full transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentGalleryIdx * 100}%)` }}
                >
                  {galleryImages.map((imgUrl, idx) => (
                    <div key={idx} className="h-full w-full flex-shrink-0 flex items-center justify-center bg-slate-900">
                      <img
                        src={imgUrl}
                        alt={`${project.projectName || 'Dự án'} - ${idx + 1}`}
                        className="h-full w-full object-cover"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-teal-800 to-slate-900 text-slate-300">
                  <Building2 className="h-16 w-16 opacity-40 mb-2" />
                  <span className="text-xs">Chưa có hình ảnh dự án</span>
                </div>
              )}

              {/* Nút bấm nhanh mở 3D toàn màn hình từ ảnh */}
              <button
                type="button"
                onClick={() => setIsBuilding3DFullscreen(true)}
                className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-xl bg-teal-600/90 hover:bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:scale-105 active:scale-95 border border-teal-400/40"
              >
                <Box className="h-3.5 w-3.5" />
                Khám phá Sơ đồ 3D
              </button>

              {/* Nút điều hướng Carousel */}
              {totalSlides > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevGallery}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 hover:scale-105 active:scale-95"
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextGallery}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 hover:scale-105 active:scale-95"
                    aria-label="Ảnh tiếp theo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                    {currentGalleryIdx + 1} / {totalSlides} ảnh
                  </div>
                </>
              )}
            </div>

            {/* Dải ảnh Thumbnail nhỏ & Nút Sơ đồ 3D phóng to toàn màn hình */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2.5 pb-2 px-1 scrollbar-thin">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollGallery(idx)}
                  className={`relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${idx === currentGalleryIdx
                    ? 'border-teal-500 ring-2 ring-teal-500/30'
                    : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                >
                  <img src={imgUrl} alt={`Ảnh thu nhỏ ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}

              {/* Nút Xem Sơ đồ 3D phóng to toàn màn hình */}
              <button
                type="button"
                onClick={() => setIsBuilding3DFullscreen(true)}
                className="relative flex h-16 min-w-[6.2rem] flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-teal-500/70 bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-800 px-3 transition hover:border-teal-600 hover:shadow-md hover:scale-105 active:scale-95 dark:from-teal-950/80 dark:to-slate-900 dark:text-teal-300 dark:border-teal-600"
                title="Bấm để mở Sơ đồ 3D toàn màn hình"
              >
                <div className="flex items-center justify-center">
                  <Box className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <span className="text-[11px] font-bold tracking-tight">Sơ đồ 3D</span>
                <span className="absolute -top-2 -right-1 flex h-4.5 items-center rounded-full bg-teal-600 px-1.5 py-0.5 text-[9px] font-black text-white shadow-md ring-2 ring-white dark:ring-slate-900">
                  MỞ 3D
                </span>
              </button>
            </div>
          </div>

          {/* Thông tin Cột Phải (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              {/* Status & Decision Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                  {labelProjectStatus(project.status)}
                </span>
                {project.decisionNumber && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <FileText className="h-3.5 w-3.5" />
                    Số QĐ: {project.decisionNumber}
                  </span>
                )}
                {(project as any).developerName && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Building2 className="h-3.5 w-3.5" />
                    {(project as any).developerName}
                  </span>
                )}
              </div>

              {/* Project Title */}
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
                {project.projectName || project.name}
              </h1>

              {/* Address */}
              <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                <MapPin className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="text-sm font-medium leading-snug">{fullAddress}</span>
              </div>
            </div>

            {/* Price Box */}
            <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50/60 p-5 border border-teal-100 dark:border-teal-900/40 dark:bg-slate-800/60">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
                Mức giá tham chiếu
              </span>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-black text-teal-700 dark:text-teal-300">
                  {formatPrice(project.minPrice)}
                </span>
                {project.maxPrice && project.maxPrice !== project.minPrice && (
                  <span className="text-lg font-bold text-slate-600 dark:text-slate-300">
                    — {formatPrice(project.maxPrice)}
                  </span>
                )}
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  (Đã bao gồm thuế GTGT theo quy định NOXH)
                </span>
              </div>
            </div>

            {/* Quick Metrics (2 cards) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-center dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Quỹ căn trống</p>
                <p className="mt-1 text-base font-bold text-teal-600 dark:text-teal-400">
                  {project.availableUnits ?? 0} {project.totalUnits ? `/ ${project.totalUnits}` : ''} căn
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-center dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Diện tích sàn</p>
                <p className="mt-1 text-base font-bold text-slate-800 dark:text-slate-100">
                  {project.minArea && project.maxArea && project.minArea !== project.maxArea
                    ? `${project.minArea}–${project.maxArea} m²`
                    : project.minArea
                      ? `${project.minArea} m²`
                      : '50–70 m²'}
                </p>
              </div>
            </div>

            {/* Hạn chót tiếp nhận — hạn này có hiệu lực thật ở BE nên phải hiện trước khi bấm nộp */}
            {intakeClose.closeAt && showApply && (
              <div
                className={`mt-4 flex items-start gap-2.5 rounded-2xl border p-4 text-sm ${
                  intakeClose.tone === 'closed'
                    ? 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
                    : intakeClose.tone === 'urgent'
                      ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
                      : intakeClose.tone === 'soon'
                        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
                        : 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200'
                }`}
              >
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">
                    {intakeClose.tone === 'closed'
                      ? 'Đã hết hạn tiếp nhận hồ sơ'
                      : `Hạn chót nộp hồ sơ: ${formatIntakeDeadline(intakeClose.closeAt)}`}
                  </p>
                  <p className="mt-0.5 text-xs opacity-90">
                    {intakeClose.tone === 'closed'
                      ? 'Dự án không còn nhận hồ sơ mới. Hồ sơ nháp chưa nộp sẽ không còn hiệu lực.'
                      : intakeClose.daysLeft != null && intakeClose.daysLeft <= INTAKE_CLOSING_SOON_DAYS
                        ? `Chỉ còn ${intakeClose.daysLeft} ngày. Hồ sơ nháp chưa nộp trước hạn sẽ không còn hiệu lực.`
                        : `Còn ${intakeClose.daysLeft} ngày. Hồ sơ phải được nộp trước hạn này mới được xét.`}
                  </p>
                </div>
              </div>
            )}
            {statusSuccessMsg && (
              <Alert variant="success" className="mb-2 text-xs font-semibold">
                {statusSuccessMsg}
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {logged && isApplicant && (
                <button
                  type="button"
                  disabled={wishlistBusy}
                  onClick={handleWishlist}
                  className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Heart className={`h-4 w-4 ${wishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                  {wishlisted ? 'Đã lưu quan tâm' : 'Lưu quan tâm'}
                </button>
              )}

              {canOpenSale && (
                <button
                  type="button"
                  disabled={openingSale}
                  onClick={() => void handleOpenSale()}
                  className="flex-1 rounded-xl bg-teal-600 py-3 text-center text-sm font-bold text-white shadow-md transition hover:bg-teal-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-8"
                >
                  {openingSale ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang mở bán…
                    </span>
                  ) : (
                    'Mở bán dự án'
                  )}
                </button>
              )}

              {canCloseIntake && (
                <button
                  type="button"
                  disabled={closingIntake}
                  onClick={() => void handleCloseIntake()}
                  title="Chốt danh sách hồ sơ để chuẩn bị bốc thăm"
                  className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-center text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:flex-none sm:px-8"
                >
                  {closingIntake ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang đóng…
                    </span>
                  ) : (
                    'Đóng đợt tiếp nhận'
                  )}
                </button>
              )}

              {showApply && (
                <button
                  type="button"
                  disabled={(!canApply && logged && isApplicant) || blockedByExisting}
                  title={
                    blockedByExisting
                      ? applicantBlockMessage || undefined
                      : !canApply && logged && isApplicant
                        ? 'Dự án đã khóa nhận hồ sơ mới (đã đóng đăng ký hoặc đã mở lịch bốc thăm).'
                        : undefined
                  }
                  onClick={() => void handleApply()}
                  className="flex-1 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 py-3 text-center text-sm font-bold text-white shadow-lg shadow-teal-700/20 transition hover:from-teal-700 hover:to-teal-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-8"
                >
                  {!logged
                    ? 'Đăng nhập để nộp hồ sơ'
                    : blockedByExisting
                      ? '⛔ Bạn đã có hồ sơ đang xử lý'
                      : !canApply
                        ? 'Đã khóa nhận hồ sơ'
                        : '📝 Nộp hồ sơ đăng ký'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. THÔNG TIN PHÁP LÝ & QUY MÔ DỰ ÁN                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 dark:text-white">
          <ShieldCheck className="h-5 w-5 text-teal-600" />
          Thông số pháp lý & Quy mô quy hoạch
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-slate-500">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-600" />
                <span className="text-xs font-semibold uppercase">Số quyết định phê duyệt</span>
              </div>
              {project.decisionDocumentUrl && (
                <a
                  href={project.decisionDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-700 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300"
                >
                  <ExternalLink className="h-3 w-3" /> Xem văn bản
                </a>
              )}
            </div>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              {project.decisionNumber || 'Đang cập nhật'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-semibold uppercase">Đường / Số nhà</span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              {project.street || 'Chưa cập nhật tên đường'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-slate-500">
              <Building2 className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-semibold uppercase">Phường / Xã & Quận / Huyện</span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              {Array.from(
                new Set(
                  [
                    project.ward,
                    project.district && project.district.trim().toLowerCase() !== project.ward?.trim().toLowerCase()
                      ? project.district
                      : null,
                  ].filter(Boolean)
                )
              ).join(', ') || project.ward || project.district || 'Thành phố Hồ Chí Minh'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-slate-500">
              <Home className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-semibold uppercase">Tổng quy mô căn hộ</span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              {project.totalUnits || project.availableUnits || 0} căn ({project.availableUnits ?? 0} căn khả dụng)
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-slate-500">
              <Layers className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-semibold uppercase">Khung diện tích điển hình</span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              {project.minArea || 0} m² – {project.maxArea || 0} m²
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-slate-500">
              <DollarSign className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-semibold uppercase">Tỷ lệ Đợt 1 (thanh toán lần đầu)</span>
            </div>
            <p className="mt-2 text-sm font-bold text-teal-700 dark:text-teal-400">
              {project.phase1Percentage ?? 30}% giá trị căn hộ
            </p>
          </div>
        </div>

        {/* Giới thiệu / Tiện ích dự án */}
        {project.description && (
          <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Giới thiệu & Tiện ích dự án
            </h3>
            <div
              className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-600 dark:text-slate-300 dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: project.description }}
            />
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 3. LỘ TRÌNH TIẾN ĐỘ THANH TOÁN (PAYMENT MILESTONES)                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 dark:text-white">
              <DollarSign className="h-5 w-5 text-teal-600" />
              Tiến độ thanh toán ({milestonesList.length} đợt)
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Lịch do chủ đầu tư công bố theo tiến độ (số đợt không cố định). Lần đầu ≤ 30% · trước bàn giao ≤ 70% · trước sổ hồng ≤ 95%.
            </p>
          </div>
          {milestonesList.length > 0 && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              Tổng cộng: {milestonesList.reduce((s: number, m: { percentage?: number }) => s + (Number(m.percentage) || 0), 0)}% giá trị căn hộ
            </span>
          )}
        </div>

        {milestonesList.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
            Chủ đầu tư chưa công bố lịch thanh toán cho dự án này.
          </p>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {milestonesList.map((m: any, idx: number) => {
            const phaseOrder = m.phaseOrder || idx + 1
            const pct = Number(m.percentage) || 0
            const eventLabel = TRIGGER_EVENT_LABELS[m.triggerEvent] || m.triggerEvent || 'Theo tiến độ'
            const days = m.dueDays || 7
            return (
              <div
                key={idx}
                className="relative flex flex-col justify-between rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/40 to-white p-5 dark:border-teal-900/30 dark:from-slate-800/60 dark:to-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                      {phaseOrder}
                    </span>
                    <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
                      {pct}%
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                    {m.phaseName || `Đợt ${phaseOrder}`}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Sự kiện: <strong>{eventLabel}</strong>
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-teal-100/60 text-[11px] text-slate-500 dark:border-slate-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-teal-600" />
                  <span>Thời hạn nộp: <strong>{days} ngày</strong> kể từ khi có thông báo</span>
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 4. DANH SÁCH QUỸ CĂN HỘ CHI TIẾT                                      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 4. DANH SÁCH QUỸ CĂN HỘ CHI TIẾT & SƠ ĐỒ 3D TÒA NHÀ                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {allApartments.length > 0 && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 dark:text-white">
                <Home className="h-5 w-5 text-teal-600" />
                Quỹ căn hộ chi tiết ({filteredApartments.length} / {allApartments.length} căn)
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Duyệt danh sách chi tiết các căn hộ, diện tích, mức giá và xem nội thất 3D từng căn
              </p>
            </div>

            {/* Status Indicators & Nút mở Sơ đồ 3D */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Khả dụng ({allApartments.filter(a => String(a.status).toUpperCase() !== 'ASSIGNED').length})
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  Đã giao ({allApartments.filter(a => String(a.status).toUpperCase() === 'ASSIGNED').length})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsBuilding3DFullscreen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60 transition shadow-sm border border-teal-200/60 dark:border-teal-800"
              >
                <Box className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Xem Sơ đồ 3D Toàn khu</span>
              </button>
            </div>
          </div>

          <div>
            {/* Bộ lọc căn hộ */}
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 rounded-2xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Mã căn</label>
                <input
                  type="text"
                  placeholder="Tìm mã căn (vd: A-101)..."
                  value={searchUnitName}
                  onChange={(e) => setSearchUnitName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              {availableBlocks.length > 1 && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Tòa / Block</label>
                  <select
                    value={selectedBlock}
                    onChange={(e) => setSelectedBlock(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="ALL">Tất cả các tòa</option>
                    {availableBlocks.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Số phòng ngủ</label>
                <select
                  value={selectedBedrooms}
                  onChange={(e) => setSelectedBedrooms(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="ALL">Tất cả số phòng ngủ</option>
                  <option value="1">1 Phòng ngủ</option>
                  <option value="2">2 Phòng ngủ</option>
                  <option value="3">3 Phòng ngủ</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Nhóm căn</label>
                <select
                  value={selectedUnitGroup}
                  onChange={(e) => setSelectedUnitGroup(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="ALL">Tất cả nhóm căn</option>
                  <option value="STANDARD">Căn chuẩn</option>
                  <option value="PRIORITY">Suất ưu tiên ⭐</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Hình thức sở hữu</label>
                <select
                  value={selectedSaleType}
                  onChange={(e) => setSelectedSaleType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="ALL">Tất cả hình thức</option>
                  <option value="FULL_OWNERSHIP">Sở hữu toàn phần (100%)</option>
                  <option value="CO_OWNERSHIP">Đồng sở hữu</option>
                </select>
              </div>
            </div>

            {/* Grid Căn hộ */}
            {filteredApartments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Không tìm thấy căn hộ phù hợp với bộ lọc.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredApartments.map((apt) => {
                  const isAssigned = String(apt.status).toUpperCase() === 'ASSIGNED'
                  const isPriority = apt.unitGroup?.toUpperCase() === 'PRIORITY'
                  const isCoOwnership = apt.saleType?.toUpperCase() === 'CO_OWNERSHIP'

                  return (
                    <div
                      key={apt.id || apt.unitName}
                      className={`flex flex-col justify-between rounded-2xl border p-4 transition-all hover:shadow-md ${isAssigned
                        ? 'border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/40 opacity-75'
                        : 'border-slate-200/90 bg-white hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900'
                        }`}
                    >
                      <div>
                        {/* Top Header: Unit Name + Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-base font-black text-slate-900 dark:text-white">
                              {apt.unitName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {apt.buildingBlock || 'Block A'} · Tầng {apt.floorNumber ?? 1}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isAssigned
                              ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                          >
                            {isAssigned ? 'Đã cấp' : 'Còn trống'}
                          </span>
                        </div>

                        {/* Thông số kỹ thuật */}
                        <div className="mt-3 space-y-1.5 border-t border-b border-slate-100 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Maximize2 className="h-3 w-3" /> Diện tích:
                            </span>
                            <span className="font-semibold">
                              {apt.area} m² {apt.grossArea ? `(${apt.grossArea} m² tim tường)` : ''}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Bed className="h-3 w-3" /> Cơ cấu phòng:
                            </span>
                            <span className="font-semibold">
                              {apt.numberOfBedrooms ?? 2} Phòng ngủ · {apt.numberOfBathrooms ?? 1} Phòng vệ sinh
                            </span>
                          </div>

                          {(apt.mainDoorDirection || apt.balconyDirection) && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Compass className="h-3 w-3" /> Hướng:
                              </span>
                              <span className="font-semibold">
                                Cửa {apt.mainDoorDirection ? DIRECTION_LABELS[apt.mainDoorDirection] || apt.mainDoorDirection : 'Đông Nam'}
                                {apt.balconyDirection ? ` · Ban công ${DIRECTION_LABELS[apt.balconyDirection] || apt.balconyDirection}` : ''}
                              </span>
                            </div>
                          )}

                          {apt.viewDescription && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Eye className="h-3 w-3" /> Hướng nhìn:
                              </span>
                              <span className="font-medium truncate max-w-[130px] text-right" title={apt.viewDescription}>
                                {apt.viewDescription}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Loại hình & Tỷ lệ */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {isPriority && (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              Suất ưu tiên ⭐
                            </span>
                          )}
                          {isCoOwnership ? (
                            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                              Đồng sở hữu ({apt.coOwnershipRatio || 50}%)
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Toàn quyền sở hữu
                            </span>
                          )}
                          {apt.maxOccupants && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Tối đa {apt.maxOccupants} người
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price & 3D Action bottom */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium block">Giá niêm yết:</span>
                          <p className="text-sm font-black text-teal-600 dark:text-teal-400">
                            {Number(apt.price).toLocaleString('vi-VN')} VNĐ
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActive3DApartment(apt)
                            setIs3DModalOpen(true)
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60 transition shadow-sm"
                          title="Xem mô hình 3D nội thất căn hộ"
                        >
                          <Box className="h-3.5 w-3.5" />
                          <span>Xem 3D</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Fullscreen Sơ đồ 3D Không gian Quy hoạch & Tòa nhà */}
      {isBuilding3DFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 backdrop-blur-2xl animate-in fade-in duration-200">
          {/* Modal Header */}
          <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/30">
                <Box className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  Sơ đồ 3D Không gian Quy hoạch & Tòa nhà
                  <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-xs font-bold text-teal-300">
                    {project.projectName || project.name}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Khám phá toàn cảnh 3D đô thị, bóc tách tầng, hồ bơi, sân thể thao và chọn từng căn hộ để xem nội thất chi tiết
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsBuilding3DFullscreen(false)}
                className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95 border border-slate-700 shadow-md"
              >
                <X className="h-4 w-4" />
                Đóng sơ đồ 3D
              </button>
            </div>
          </div>

          {/* Modal Body - 100% full screen 3D canvas trọn vẹn */}
          <div className="relative flex-1 w-full min-h-0 overflow-hidden p-2 sm:p-4">
            <Building3DViewer
              projectId={projectId}
              apartments={allApartments}
              onSelectApartment={(apt) => {
                setActive3DApartment(apt)
                setIs3DModalOpen(true)
              }}
            />
          </div>
        </div>
      )}

      {/* Modal xem 3D căn hộ */}
      <Apartment3DViewer
        apartment={active3DApartment}
        isOpen={is3DModalOpen}
        onClose={() => setIs3DModalOpen(false)}
      />

      {/* MODAL THÔNG BÁO XÁC NHẬN ĐÓNG ĐỢT TIẾP NHẬN HỒ SƠ */}
      <Modal
        open={closeIntakeModalOpen}
        onClose={() => { if (!closingIntake) setCloseIntakeModalOpen(false) }}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 shadow-sm ring-4 ring-amber-50 dark:ring-amber-950/30">
              <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Xác nhận đóng đợt tiếp nhận hồ sơ
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Dự án: <strong className="font-semibold text-slate-800 dark:text-slate-200">{project.projectName || project.name}</strong>
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
            <p className="font-bold text-amber-900 dark:text-amber-300">
              Hệ thống sẽ thực hiện các tác vụ sau khi đóng tiếp nhận:
            </p>
            <ul className="space-y-1.5 pl-4 list-disc text-[12px]">
              <li>
                <strong>Khóa nộp hồ sơ mới:</strong> Người dân không thể đăng ký thêm hồ sơ mới vào dự án này.
              </li>
              <li>
                <strong>Hủy hiệu lực hồ sơ nháp:</strong> Các hồ sơ đang ở trạng thái Bản nháp (chưa bấm nộp) sẽ không thể gửi đi được nữa.
              </li>
              <li>
                <strong>Chốt danh sách bốc thăm:</strong> Chốt toàn bộ hồ sơ hợp lệ để Chủ đầu tư tiến hành thẩm định và mở lịch bốc thăm suất mua.
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/60 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
            <span className="text-sm">⚠️</span>
            <span><strong>Lưu ý:</strong> Thao tác này <strong>không thể mở lại</strong> đợt tiếp nhận sau khi đã đóng.</span>
          </div>

          {error && <Alert variant="error" className="text-xs">{error}</Alert>}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={closingIntake}
              onClick={() => setCloseIntakeModalOpen(false)}
              className="text-xs font-semibold"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={closingIntake}
              onClick={() => void confirmCloseIntake()}
              className="gap-1.5 bg-rose-600 font-bold text-white shadow-md shadow-rose-600/25 hover:bg-rose-700 text-xs"
            >
              {closingIntake ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Đang đóng đợt...
                </>
              ) : (
                'Xác nhận đóng tiếp nhận'
              )}
            </Button>
          </div>
        </div>
      </Modal>
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
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${data.status === 'OVERSUBSCRIBED'
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
