import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  XCircle,
  X,
} from 'lucide-react'
import { housingProjectsApi, parseProjectEvaluation, type ProjectApplicationEvaluationDto } from '@/api/housing-projects'
import { extractProjects, extractSingleProject } from '@/lib/parsers'
import { navigate, getHashQuery } from '@/hooks/useHashRoute'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { formatError } from '@/lib/format-error'
import { labelProjectStatus } from '@/lib/labels'
import {
  isPending,
  normalizeStatus,
} from '@/lib/project-status-flow'
import type { HousingProjectDto } from '@/types'

type Tab = 'pending' | 'approved' | 'rejected'
const PAGE_SIZE = 12

/** Map tab FE -> statusCode BE để filter trực tiếp trên server. */
function tabToStatusCode(tab: Tab): string | undefined {
  switch (tab) {
    case 'pending': return 'PENDING'
    case 'approved': return 'UPCOMING'
    case 'rejected': return 'REJECTED'
  }
}

/** Lấy role từ JWT (claim: role | Role | UserRole | roleClaim). */
function getJwtRole(): string | null {
  const token =
    sessionStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role ?? payload.Role ?? payload.userRole ?? payload.UserRole ?? payload.RoleName ?? null
  } catch {
    return null
  }
}

function getTotalCount(data: unknown): number {
  if (!data || typeof data !== 'object') return 0
  const o = data as Record<string, unknown>
  if (typeof o.totalCount === 'number') return o.totalCount
  const nested = (o.data ?? o.Data) as Record<string, unknown> | undefined
  if (nested && typeof nested.totalCount === 'number') return nested.totalCount
  return 0
}

function getTotalPages(data: unknown, pageSize = PAGE_SIZE): number {
  if (!data || typeof data !== 'object') return 1
  const o = data as Record<string, unknown>
  if (typeof o.totalPages === 'number' && o.totalPages > 0) return o.totalPages
  const nested = (o.data ?? o.Data) as Record<string, unknown> | undefined
  if (nested && typeof nested.totalPages === 'number' && nested.totalPages > 0) return nested.totalPages
  const totalCount = (nested?.totalCount ?? o.totalCount) as number | undefined
  if (typeof totalCount === 'number' && totalCount > 0) {
    return Math.max(1, Math.ceil(totalCount / pageSize))
  }
  return 1
}

export function SxdProjectsPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [projects, setProjects] = useState<HousingProjectDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [debugInfo, setDebugInfo] = useState<string>('')

  const load = async (page = pageIndex, currentTab: Tab = tab) => {
    setLoading(true)
    setError('')
    try {
      const statusCode = tabToStatusCode(currentTab)
      const params: { pageIndex: number; pageSize: number; statusCode?: string; search?: string } = {
        pageIndex: page,
        pageSize: PAGE_SIZE,
      }
      if (statusCode) params.statusCode = statusCode
      if (search.trim()) params.search = search.trim()

      const data = await housingProjectsApi.list(params)
      const parsed = extractProjects(data)
      setProjects(parsed)
      setTotalCount(getTotalCount(data))
      const tp = getTotalPages(data, PAGE_SIZE)
      setTotalPages(Math.max(1, tp))
      setPageIndex(page)
      setDebugInfo(`statusCode=${statusCode ?? 'ALL'} | role=${getJwtRole() ?? 'N/A'} | returned=${parsed.length}/${getTotalCount(data)}`)
    } catch (err) {
      setError(formatError(err))
      setProjects([])
      setTotalCount(0)
      setTotalPages(1)
      setDebugInfo(`Lỗi: ${formatError(err)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handler = () => { void load(pageIndex, tab) }
    window.addEventListener('fecaps:project-status-changed', handler)
    return () => window.removeEventListener('fecaps:project-status-changed', handler)
  }, [tab])

  useEffect(() => {
    void load(1, tab)
  }, [tab])

  /** Danh sách trên trang hiện tại — đã được BE filter theo statusCode. */
  const filtered = search
    ? projects.filter((p) => (p.projectName || p.name || '').toLowerCase().includes(search.toLowerCase()))
    : projects

  /** Đếm = số item BE trả về trên trang hiện tại. Phân trang là tổng BE trả. */
  const counts = {
    pending: tab === 'pending' ? totalCount : 0,
    approved: tab === 'approved' ? totalCount : 0,
    rejected: tab === 'rejected' ? totalCount : 0,
  }
  const activeFilterInfo = `Đang hiển thị: ${filtered.length} dự án trong tổng ${totalCount} (tab ${tab})`

  return (
    <div>
      <PageHeader routeId="sxd-projects" />
      <PageCard className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-0">
            <label htmlFor="sxd-proj-search" className="mb-0.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="sxd-proj-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên dự án..."
                className="pl-9"
              />
            </div>
          </div>
          <Button type="button" variant="ghost" onClick={() => { setSearch(''); void load(pageIndex, tab) }}>
            Tải lại
          </Button>
        </div>

        {debugInfo && (
          <p className="rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            {activeFilterInfo} · {debugInfo}
          </p>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
          {([
            { id: 'pending' as Tab, label: 'Chờ duyệt', count: counts.pending },
            { id: 'approved' as Tab, label: 'Đã duyệt', count: counts.approved },
            { id: 'rejected' as Tab, label: 'Từ chối', count: counts.rejected },
          ]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setPageIndex(1); void load(1, t.id) }}
              className={`relative -mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 rounded-full px-1.5 text-xs ${
                tab === t.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {msg && (
          <Alert variant={msg.type === 'error' ? 'error' : 'success'}>
            {msg.text}
          </Alert>
        )}

        {/* Table */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        )}

        {!loading && error && <Alert variant="error">{error}</Alert>}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-12 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 font-semibold text-slate-500">Không có dự án nào</p>
            <p className="mt-1 text-sm text-slate-400">
              {tab === 'pending' ? 'Không có dự án nào đang chờ phê duyệt.' : 'Không có dự án trong danh mục này.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Tên dự án</th>
                    <th className="px-4 py-3">Địa chỉ</th>
                    <th className="px-4 py-3">Số căn</th>
                    <th className="px-4 py-3">Giá</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <ProjectRow
                      key={p.id}
                      project={p}
                      onRefresh={() => { void load(pageIndex, tab) }}
                      onMsg={(m) => setMsg(m)}
                      onNavigateToDetail={(id) => {
                        sessionStorage.setItem('sxdProjectId', id)
                        navigate(`sxd-project-detail?id=${encodeURIComponent(id)}`)
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Hiển thị {(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, totalCount)} trong {totalCount} dự án
                </p>
                <Pagination
                  pageIndex={pageIndex}
                  totalPages={totalPages}
                  onPageChange={(p) => { setPageIndex(p); void load(p) }}
                />
              </div>
            )}
          </>
        )}
      </PageCard>
    </div>
  )
}

function ProjectRow({
  project,
  onRefresh,
  onMsg,
  onNavigateToDetail,
}: {
  project: HousingProjectDto
  onRefresh: () => void
  onMsg: (m: { type: 'success' | 'error'; text: string }) => void
  /** Navigate to project detail — called when user clicks anywhere on the row. */
  onNavigateToDetail: (id: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const raw = normalizeStatus(project.status)
  const isPend = isPending(project) || raw === 'PENDING'

  const handleApprove = async () => {
    if (busy) return
    if (!window.confirm(`Phê duyệt dự án "${project.projectName || project.name}"?`)) return
    setBusy(true)
    try {
      await housingProjectsApi.sxdReviewProject(project.id!, { action: 'APPROVE' })
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
      onMsg({ type: 'success', text: 'Đã phê duyệt dự án.' })
      onRefresh()
    } catch (err) {
      onMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      onMsg({ type: 'error', text: 'Vui lòng nhập lý do từ chối.' })
      return
    }
    setBusy(true)
    try {
      await housingProjectsApi.sxdReviewProject(project.id!, { action: 'REJECT', note: rejectReason.trim() })
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
      onMsg({ type: 'success', text: 'Đã từ chối dự án.' })
      setRejectOpen(false)
      setRejectReason('')
      onRefresh()
    } catch (err) {
      onMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy(false)
    }
  }

  const formatPrice = (v?: number) => {
    if (!v) return '—'
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ`
    return `${(v / 1_000_000).toLocaleString('vi-VN')} triệu`
  }

  return (
    <>
      <tr
        className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
        onClick={() => { if (project.id) onNavigateToDetail(project.id) }}
      >
        <td className="px-4 py-3">
          <span className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
            {project.projectName || project.name || '—'}
            <ExternalLink className="h-3 w-3 opacity-50" />
          </span>
          {(project as Record<string, unknown>).decisionNumber as string && (
            <div className="mt-0.5 text-xs text-slate-400">QĐ: {(project as Record<string, unknown>).decisionNumber as string}</div>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
          {[project.address, project.district, project.province].filter(Boolean).join(', ') || '—'}
        </td>
        <td className="px-4 py-3 text-center">
          {project.availableUnits ?? 0}
        </td>
        <td className="px-4 py-3 text-sm">
          {project.minPrice || project.maxPrice
            ? `${formatPrice(project.minPrice)} – ${formatPrice(project.maxPrice)}`
            : '—'}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isPend
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : normalizeStatus(project.status) === 'REJECTED'
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          }`}>
            {isPend ? <><XCircle className="h-3 w-3" /> Chờ duyệt</> :
             normalizeStatus(project.status) === 'REJECTED' ? <><X className="h-3 w-3" /> Từ chối</> :
             <><CheckCircle2 className="h-3 w-3" /> {labelProjectStatus(project.status)}</>}
          </span>
        </td>
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap justify-end gap-2">
            {isPend && (
              <>
                <Button
                  variant="accent"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleApprove()}
                >
                  {busy ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Đang duyệt...</> : 'Phê duyệt'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-300 text-rose-700 dark:text-rose-300"
                  disabled={busy}
                  onClick={() => setRejectOpen(true)}
                >
                  Từ chối
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Reject modal */}
      {rejectOpen && (
        <tr>
          <td colSpan={6} className="border-t border-slate-100 bg-rose-50/50 px-4 py-4 dark:border-slate-800 dark:bg-rose-950/20">
            <div className="rounded-lg border border-rose-200 bg-white p-4 dark:border-rose-800 dark:bg-slate-900">
              <p className="mb-2 text-sm font-semibold text-rose-800 dark:text-rose-200">
                Lý do từ chối dự án "{project.projectName || project.name}"
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="VD: Hồ sơ pháp lý chưa đầy đủ, vui lòng bổ sung..."
                className="mb-3 block w-full rounded-md border border-rose-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-rose-500 focus:outline-none dark:border-rose-700 dark:bg-slate-800 dark:text-slate-50"
              />
              <div className="flex gap-2">
                <Button
                  variant="accent"
                  size="sm"
                  disabled={busy || !rejectReason.trim()}
                  onClick={() => void handleReject()}
                >
                  {busy ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Đang gửi...</> : 'Xác nhận từ chối'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => { setRejectOpen(false); setRejectReason('') }}
                >
                  Huỷ
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// TRANG CHI TIẾT DỰ ÁN DÀNH CHO SXD
// ═══════════════════════════════════════════════════════════════

export function SxdProjectDetailPage() {
  const [projectId, setProjectId] = useState<string>(() => {
    const fromQuery = getHashQuery().id
    if (fromQuery) {
      sessionStorage.setItem('sxdProjectId', fromQuery)
      return fromQuery
    }
    return sessionStorage.getItem('sxdProjectId') ?? ''
  })
  const [project, setProject] = useState<HousingProjectDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [evaluation, setEvaluation] = useState<ProjectApplicationEvaluationDto | null>(null)
  const [evalLoading, setEvalLoading] = useState(false)

  // Đồng bộ projectId khi URL hash thay đổi (vd user back/forward, hoặc paste URL trực tiếp)
  useEffect(() => {
    const sync = () => {
      const fromQuery = getHashQuery().id
      if (fromQuery && fromQuery !== projectId) {
        sessionStorage.setItem('sxdProjectId', fromQuery)
        setProjectId(fromQuery)
      }
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [projectId])

  const load = () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    setError('')
    void housingProjectsApi.getById(projectId)
      .then((data) => {
        const p = extractSingleProject(data)
        setProject(p)
      })
      .catch((err) => setError(formatError(err)))
      .finally(() => setLoading(false))
  }

  const loadEvaluation = () => {
    if (!projectId) return
    setEvalLoading(true)
    void housingProjectsApi.getEvaluation(projectId)
      .then((data) => {
        const ev = parseProjectEvaluation(data)
        setEvaluation(ev)
      })
      .catch(() => setEvaluation(null))
      .finally(() => setEvalLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener('fecaps:project-status-changed', handler)
    return () => window.removeEventListener('fecaps:project-status-changed', handler)
  }, [])

  useEffect(() => {
    if (project) loadEvaluation()
  }, [project?.id])

  const raw = project ? normalizeStatus(project.status) : ''
  const isPend = project ? (isPending(project) || raw === 'PENDING') : false

  const handleApprove = async () => {
    if (!project) return
    if (!window.confirm(`Phê duyệt dự án "${project.projectName || project.name}"?`)) return
    try {
      await housingProjectsApi.sxdReviewProject(project.id!, { action: 'APPROVE' })
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
      setMsg({ type: 'success', text: 'Đã phê duyệt dự án.' })
      load()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    }
  }

  const handleReject = async () => {
    const reason = window.prompt('Nhập lý do từ chối:')
    if (!reason?.trim()) return
    if (!project) return
    try {
      await housingProjectsApi.sxdReviewProject(project.id!, { action: 'REJECT', note: reason.trim() })
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
      setMsg({ type: 'success', text: 'Đã từ chối dự án.' })
      load()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    }
  }

  const formatPrice = (v?: number) => {
    if (!v) return '—'
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ`
    return `${(v / 1_000_000).toLocaleString('vi-VN')} triệu`
  }

  const formatDate = (v?: string | null) => {
    if (!v) return '—'
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? v : d.toLocaleString('vi-VN')
  }

  return (
    <div>
      <PageHeader routeId="sxd-project-detail" />
      <PageCard className="p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('sxd-projects')}>
          ← Quay lại danh sách
        </Button>

        {msg && (
          <Alert variant={msg.type === 'error' ? 'error' : 'success'}>
            {msg.text}
          </Alert>
        )}

        {loading && <Skeleton className="h-64 w-full" />}

        {error && <Alert variant="error">{error}</Alert>}

        {!loading && !error && !project && (
          <Alert variant="error">Không tìm thấy dự án.</Alert>
        )}

        {!loading && !error && project && (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{project.projectName || project.name}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" />
                  {[project.address, project.ward, project.district, project.province].filter(Boolean).join(', ')}
                </p>
                {(project as Record<string, unknown>).decisionNumber as string && (
                  <p className="mt-0.5 text-xs text-slate-400">Quyết định: {(project as Record<string, unknown>).decisionNumber as string}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  isPend
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : raw === 'REJECTED'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                    : raw === 'UPCOMING'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                }`}>
                  {isPend ? <><XCircle className="h-4 w-4" /> Chờ duyệt</> :
                   raw === 'REJECTED' ? <><X className="h-4 w-4" /> Từ chối</> :
                   raw === 'UPCOMING' ? <><CheckCircle2 className="h-4 w-4" /> Sắp mở bán</> :
                   <><CheckCircle2 className="h-4 w-4" /> {labelProjectStatus(project.status)}</>}
                </span>
              </div>
            </div>

            {/* Nút phê duyệt */}
            {isPend && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
                <p className="mb-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Dự án đang chờ phê duyệt. Vui lòng xem xét trước khi duyệt hoặc từ chối.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="accent" onClick={handleApprove}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Phê duyệt dự án
                  </Button>
                  <Button
                    variant="outline"
                    className="border-rose-300 text-rose-700 dark:text-rose-300"
                    onClick={handleReject}
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Từ chối
                  </Button>
                </div>
              </div>
            )}

            {/* Thống kê hồ sơ đủ điều kiện */}
            {(raw === 'UPCOMING' || raw === 'OPEN') && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                <h2 className="mb-3 text-sm font-semibold text-blue-800 dark:text-blue-200">
                  Thống kê hồ sơ đủ điều kiện
                </h2>
                {evalLoading ? (
                  <p className="text-sm text-slate-500">Đang tải...</p>
                ) : evaluation ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-white p-3 text-center shadow-sm dark:bg-slate-800">
                      <p className="text-2xl font-bold text-blue-600">{evaluation.totalQualifiedApplications}</p>
                      <p className="text-xs text-slate-500">Tổng hồ sơ đủ điều kiện</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 text-center shadow-sm dark:bg-slate-800">
                      <p className="text-2xl font-bold text-emerald-600">{evaluation.availableUnits}</p>
                      <p className="text-xs text-slate-500">Căn có sẵn</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 text-center shadow-sm dark:bg-slate-800">
                      <p className="text-2xl font-bold text-amber-600">{evaluation.priorityCount}</p>
                      <p className="text-xs text-slate-500">Ưu tiên</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Chưa có dữ liệu hồ sơ.</p>
                )}
              </div>
            )}

            {/* Thông tin chi tiết */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Cột trái */}
              <div className="space-y-4">
                <h2 className="border-b border-slate-200 pb-2 text-base font-semibold dark:border-slate-700">Thông tin chung</h2>
                <DetailRow label="Số căn hộ" value={String(project.availableUnits ?? 0)} />
                <DetailRow label="Diện tích" value={project.minArea && project.maxArea
                  ? `${project.minArea} – ${project.maxArea} m²` : project.minArea
                  ? `Từ ${project.minArea} m²` : project.maxArea ? `Đến ${project.maxArea} m²` : '—'} />
                <DetailRow label="Giá" value={project.minPrice && project.maxPrice
                  ? `${formatPrice(project.minPrice)} – ${formatPrice(project.maxPrice)}`
                  : project.minPrice ? `Từ ${formatPrice(project.minPrice)}` : project.maxPrice ? `Đến ${formatPrice(project.maxPrice)}` : '—'} />
                <DetailRow label="Ngày tạo" value={formatDate(project.createdAt)} />
                <DetailRow label="Ngày phê duyệt" value={formatDate((project as Record<string, unknown>).approvalDate as string | null)} />
                <DetailRow label="Ngày công bố" value={formatDate(project.publicAnnounceAt)} />
                <DetailRow label="Ngày mở đăng ký" value={formatDate(project.applicationOpenDate)} />
                <DetailRow label="Ngày đóng đăng ký" value={formatDate(project.applicationCloseDate)} />
              </div>

              {/* Cột phải */}
              <div className="space-y-4">
                <h2 className="border-b border-slate-200 pb-2 text-base font-semibold dark:border-slate-700">Hình ảnh &amp; Mô tả</h2>
                {project.thumbnailUrl && (
                  <img src={project.thumbnailUrl} alt="thumbnail" className="w-full rounded-xl object-cover" style={{ maxHeight: 200 }} />
                )}
                {project.images && project.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {project.images.map((img) => (
                      <img key={img.id} src={img.imageUrl} alt="" className="w-full rounded-lg object-cover" style={{ height: 80 }} />
                    ))}
                  </div>
                )}
                {project.description && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">Mô tả</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{project.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lý do từ chối */}
            {raw === 'REJECTED' && project.rejectReason && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/30">
                <p className="mb-1 text-sm font-semibold text-rose-800 dark:text-rose-200">Lý do từ chối</p>
                <p className="text-sm text-rose-700 dark:text-rose-300">{project.rejectReason}</p>
              </div>
            )}
          </>
        )}
      </PageCard>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium dark:text-slate-200">{value}</span>
    </div>
  )
}
