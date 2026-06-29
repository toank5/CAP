import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { housingProjectsApi } from '@/api/housing-projects'
import { housingProjectStatusesApi, parseStatuses } from '@/api/housing-project-statuses'
import { LocationFields } from '@/components/forms/location-fields'
import { HousingSearchForm } from '@/components/housing/housing-search-form'
import { HouseCard } from '@/components/housing/house-card'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input, Select, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import { extractProjects, extractSingleProject } from '@/lib/parsers'
import { formatError, formatSuccess } from '@/lib/format-error'
import { resolveProvinceName } from '@/lib/vietnam-locations'
import { mapProjectToCard } from '@/lib/projects'
import { FLASH_CREATE_PROJECT_KEY } from '@/lib/constants'
import {
  applyClientFilters,
  EMPTY_HOUSING_SEARCH,
  toApiFilter,
  type HousingSearchFilter,
} from '@/lib/housing-search'
import type { CreateHousingProjectRequestDto, HousingProjectDto } from '@/types'

export function ProjectsPage() {
  const [all, setAll] = useState<HousingProjectDto[]>([])
  const [filter, setFilter] = useState<HousingSearchFilter>({ ...EMPTY_HOUSING_SEARCH })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flashSuccess, setFlashSuccess] = useState<string | null>(null)

  const load = async (nextFilter: HousingSearchFilter) => {
    setLoading(true)
    setError('')
    try {
      const data = await housingProjectsApi.list(toApiFilter(nextFilter))
      const items = applyClientFilters(extractProjects(data), nextFilter)
      setAll(items)
    } catch (err) {
      setError(formatError(err))
      setAll([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(EMPTY_HOUSING_SEARCH) }, [])

  useEffect(() => {
    const name = sessionStorage.getItem(FLASH_CREATE_PROJECT_KEY)
    if (!name) return
    sessionStorage.removeItem(FLASH_CREATE_PROJECT_KEY)
    setFlashSuccess(name)
    const timer = window.setTimeout(() => setFlashSuccess(null), 6000)
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{loading ? 'Đang tải...' : `${cards.length} dự án`}</p>
          <Button variant="accent" onClick={() => navigate('create-project')}>Tạo dự án mới</Button>
        </div>

        <HousingSearchForm
          value={filter}
          onChange={setFilter}
          loading={loading}
          onSubmit={() => { void load(filter) }}
        />

        {error && <Alert variant="error">{error}</Alert>}

        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        )}

        {!loading && cards.length === 0 && (
          <EmptyState
            title="Không tìm thấy dự án"
            description="Thử điều chỉnh bộ lọc hoặc tạo dự án mới."
            actionLabel="Tạo dự án mới"
            onAction={() => navigate('create-project')}
          />
        )}

        {!loading && cards.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((house) => (
              <div key={house.id} className="relative">
                <HouseCard house={house} />
                <Button
                  className="absolute bottom-4 right-4 z-10"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sessionStorage.setItem('projectId', house.id)
                    navigate('project-detail')
                  }}
                >
                  Quản trị
                </Button>
              </div>
            ))}
          </div>
        )}
      </PageCard>
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
      setDistrict(p.district ?? '')
      setAddressDefault(p.address ?? '')
      setAddressKey(`addr-${projectId}`)
      set('projectName', p.projectName || p.name || '')
      set('description', p.description ?? '')
      set('minPrice', p.minPrice ?? 0)
      set('maxPrice', p.maxPrice ?? 0)
      set('minArea', p.minArea ?? 0)
      set('maxArea', p.maxArea ?? 0)
      set('availableUnits', p.availableUnits ?? 0)
      if (p.housingProjectStatusId) set('housingProjectStatusId', p.housingProjectStatusId)
    }).catch((err) => setMsg({ type: 'error', text: formatError(err) })).finally(() => setLoading(false))
  }, [projectId])

  const readBody = (fd: FormData): CreateHousingProjectRequestDto => {
    const thumb = fd.get('thumbnailFile')
    return {
      projectName: String(fd.get('projectName')),
      description: String(fd.get('description') || ''),
      province: String(fd.get('province')),
      district: String(fd.get('district')),
      address: String(fd.get('address')),
      minPrice: parseFloat(String(fd.get('minPrice'))) || 0,
      maxPrice: parseFloat(String(fd.get('maxPrice'))) || 0,
      minArea: parseFloat(String(fd.get('minArea'))) || 0,
      maxArea: parseFloat(String(fd.get('maxArea'))) || 0,
      availableUnits: parseInt(String(fd.get('availableUnits')), 10) || 0,
      housingProjectStatusId: String(fd.get('housingProjectStatusId')),
      thumbnailFile: thumb instanceof File && thumb.size > 0 ? thumb : undefined,
    }
  }

  return (
    <form id="project-form" className="mx-auto max-w-xl space-y-4" onSubmit={async (e) => {
      e.preventDefault()
      setMsg(null)
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
        onDone?.()
      } catch (err) {
        setMsg({ type: 'error', text: formatError(err) })
      } finally {
        setSubmitting(false)
      }
    }}>
      {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
      <FormField label="Tên dự án" htmlFor="projectName"><Input id="projectName" name="projectName" required /></FormField>
      <FormField label="Mô tả" htmlFor="description"><Textarea id="description" name="description" required /></FormField>
      <LocationFields
        province={province}
        district={district}
        onProvinceChange={setProvince}
        onDistrictChange={setDistrict}
        addressDefaultValue={addressDefault}
        addressKey={addressKey}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Giá tối thiểu (VNĐ)" htmlFor="minPrice"><Input id="minPrice" name="minPrice" type="number" required /></FormField>
        <FormField label="Giá tối đa (VNĐ)" htmlFor="maxPrice"><Input id="maxPrice" name="maxPrice" type="number" required /></FormField>
        <FormField label="Diện tích min (m²)" htmlFor="minArea"><Input id="minArea" name="minArea" type="number" required /></FormField>
        <FormField label="Diện tích max (m²)" htmlFor="maxArea"><Input id="maxArea" name="maxArea" type="number" required /></FormField>
      </div>
      <FormField label="Số căn còn trống" htmlFor="availableUnits"><Input id="availableUnits" name="availableUnits" type="number" required /></FormField>
      <FormField label="Trạng thái dự án" htmlFor="housingProjectStatusId">
        <Select id="housingProjectStatusId" name="housingProjectStatusId" required>
          <option value="">{statuses.length ? 'Chọn trạng thái' : 'Đang tải...'}</option>
          {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>
      </FormField>
      <FormField label="Ảnh thumbnail (tùy chọn)" htmlFor="thumbnailFile">
        <Input id="thumbnailFile" name="thumbnailFile" type="file" accept="image/jpeg,image/png,image/webp" />
      </FormField>
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
  const projectId = sessionStorage.getItem('projectId')
  return (
    <div>
      <PageHeader routeId="project-detail" />
      <PageCard className="p-6">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('projects')}>← Danh sách dự án</Button>
        {!projectId ? <Alert variant="error">Không tìm thấy dự án</Alert> : <ProjectForm projectId={projectId} />}
      </PageCard>
    </div>
  )
}
