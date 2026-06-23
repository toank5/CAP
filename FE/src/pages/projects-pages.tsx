import { useEffect, useMemo, useState } from 'react'
import { housingProjectsApi } from '@/api/housing-projects'
import { housingProjectStatusesApi, parseStatuses } from '@/api/housing-project-statuses'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input, Select, Textarea } from '@/components/ui/input'
import { navigate } from '@/hooks/useHashRoute'
import { extractProjects, extractSingleProject } from '@/lib/parsers'
import { formatPriceRange, resolveProjectImageUrl } from '@/lib/projects'
import { labelProjectStatus } from '@/lib/labels'
import { formatError, formatSuccess } from '@/lib/format-error'
import type { CreateHousingProjectRequestDto, HousingProjectDto } from '@/types'

export function ProjectsPage() {
  const [all, setAll] = useState<HousingProjectDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [province, setProvince] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minAvailable, setMinAvailable] = useState('')

  const load = async (filter?: { search?: string; province?: string; maxPrice?: number }) => {
    setLoading(true)
    setError('')
    try {
      const data = await housingProjectsApi.list({
        pageIndex: 1,
        pageSize: 100,
        search: filter?.search,
        province: filter?.province,
        maxPrice: filter?.maxPrice,
      })
      setAll(extractProjects(data))
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const min = parseFloat(minAvailable) || 0
    return all.filter((p) => {
      if (p.availableUnits != null && p.availableUnits < min) return false
      return true
    })
  }, [all, minAvailable])

  return (
    <div>
      <PageHeader routeId="projects" />
      <PageCard className="p-6">
        <div className="mb-4"><Button variant="accent" onClick={() => navigate('create-project')}>Tạo dự án mới</Button></div>
        <form
          className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault()
            void load({
              search: search || undefined,
              province: province || undefined,
              maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            })
          }}
        >
          <FormField label="Tìm kiếm" htmlFor="search"><Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} /></FormField>
          <FormField label="Tỉnh/Thành" htmlFor="province"><Input id="province" value={province} onChange={(e) => setProvince(e.target.value)} /></FormField>
          <FormField label="Giá tối đa" htmlFor="maxPrice"><Input id="maxPrice" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} /></FormField>
          <FormField label="Số căn tối thiểu" htmlFor="minAvailable"><Input id="minAvailable" type="number" value={minAvailable} onChange={(e) => setMinAvailable(e.target.value)} /></FormField>
          <div className="flex items-end"><Button type="submit" variant="outline">Lọc</Button></div>
        </form>
        {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
        {error && <Alert variant="error">{error}</Alert>}
        {!loading && filtered.length === 0 && <p className="text-sm text-slate-500">Không tìm thấy dự án nào.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.filter((p) => p.id).map((p) => (
            <div key={p.id} className="glass-card overflow-hidden">
              {p.thumbnailUrl && (
                <img src={resolveProjectImageUrl(p.thumbnailUrl)} alt="" className="h-36 w-full object-cover" loading="lazy" />
              )}
              <div className="p-4">
                <h3 className="font-semibold">{p.projectName || p.name}</h3>
                <p className="text-sm text-slate-500">{p.district}, {p.province}</p>
                <p className="text-sm font-medium text-primary">{formatPriceRange(p.minPrice ?? 0, p.maxPrice ?? 0)}</p>
                <p className="text-sm text-slate-500">Còn {p.availableUnits ?? 0} căn · {labelProjectStatus(p.status)}</p>
                <Button className="mt-3" variant="outline" size="sm" onClick={() => {
                  sessionStorage.setItem('projectId', p.id!)
                  navigate('project-detail')
                }}>Chi tiết</Button>
              </div>
            </div>
          ))}
        </div>
      </PageCard>
    </div>
  )
}

function ProjectForm({ projectId, onDone }: { projectId?: string; onDone?: () => void }) {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(!!projectId)
  const [statuses, setStatuses] = useState<{ id: string; label: string }[]>([])

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
      set('projectName', p.projectName || p.name || '')
      set('description', p.description ?? '')
      set('province', p.province ?? '')
      set('district', p.district ?? '')
      set('address', p.address ?? '')
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
      try {
        const body = readBody(new FormData(e.currentTarget))
        const data = projectId ? await housingProjectsApi.update(projectId, body) : await housingProjectsApi.create(body)
        setMsg({ type: 'success', text: formatSuccess(data) })
        if (!projectId) setTimeout(() => navigate('projects'), 800)
        onDone?.()
      } catch (err) {
        setMsg({ type: 'error', text: formatError(err) })
      }
    }}>
      {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
      <FormField label="Tên dự án" htmlFor="projectName"><Input id="projectName" name="projectName" required /></FormField>
      <FormField label="Mô tả" htmlFor="description"><Textarea id="description" name="description" required /></FormField>
      <FormField label="Tỉnh/Thành" htmlFor="province"><Input id="province" name="province" required /></FormField>
      <FormField label="Quận/Huyện" htmlFor="district"><Input id="district" name="district" required /></FormField>
      <FormField label="Địa chỉ" htmlFor="address"><Input id="address" name="address" required /></FormField>
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
        <Button type="submit" variant="accent">{projectId ? 'Cập nhật' : 'Tạo dự án'}</Button>
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
