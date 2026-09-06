import { useEffect, useState, useMemo } from 'react'
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  XCircle,
  X,
  Building2,
  FileText,
  Calendar,
  Layers,
  Image as ImageIcon,
  AlertCircle,
  Eye,
  RefreshCw,
  Clock,
  Sparkles,
  Check,
  Building,
} from 'lucide-react'
import {
  housingProjectsApi,
  parseProjectEvaluation,
  type ProjectApplicationEvaluationDto,
} from '@/api/housing-projects'
import { extractProjects, extractSingleProject } from '@/lib/parsers'
import { navigate, getHashQuery } from '@/hooks/useHashRoute'
import { Modal } from '@/components/ui/modal'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatError } from '@/lib/format-error'
import { labelProjectStatus } from '@/lib/labels'
import { isPending, isRejected, normalizeStatus } from '@/lib/project-status-flow'
import type { ApartmentDto, HousingProjectDto } from '@/types'

type Tab = 'pending' | 'approved' | 'rejected'
type DetailTab = 'overview' | 'apartments' | 'timeline' | 'gallery' | 'evaluation'

export function SxdProjectsPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [allProjects, setAllProjects] = useState<HousingProjectDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modal xem chi tiết / thẩm định dự án
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [inspectModalOpen, setInspectModalOpen] = useState(false)

  // Load toàn bộ danh sách dự án
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await housingProjectsApi.list({ pageIndex: 1, pageSize: 200 })
      const parsed = extractProjects(data)
      setAllProjects(parsed)
    } catch (err) {
      setError(formatError(err))
      setAllProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const handler = () => {
      void load()
    }
    window.addEventListener('fecaps:project-status-changed', handler)
    return () => window.removeEventListener('fecaps:project-status-changed', handler)
  }, [])

  // Phân nhóm dự án theo trạng thái chính xác
  const { pendingProjects, approvedProjects, rejectedProjects } = useMemo(() => {
    const pending: HousingProjectDto[] = []
    const approved: HousingProjectDto[] = []
    const rejected: HousingProjectDto[] = []

    allProjects.forEach((p) => {
      if (isPending(p)) {
        pending.push(p)
      } else if (isRejected(p)) {
        rejected.push(p)
      } else {
        approved.push(p)
      }
    })

    return {
      pendingProjects: pending,
      approvedProjects: approved,
      rejectedProjects: rejected,
    }
  }, [allProjects])

  // Lọc theo tab hiện tại & ô tìm kiếm
  const currentList = useMemo(() => {
    let list: HousingProjectDto[] = []
    if (tab === 'pending') list = pendingProjects
    else if (tab === 'approved') list = approvedProjects
    else if (tab === 'rejected') list = rejectedProjects

    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter((p) => {
      const name = (p.projectName || p.name || '').toLowerCase()
      const dec = ((p.decisionNumber || '') as string).toLowerCase()
      const addr = [p.address, p.district, p.province, p.ward].filter(Boolean).join(' ').toLowerCase()
      return name.includes(q) || dec.includes(q) || addr.includes(q)
    })
  }, [tab, pendingProjects, approvedProjects, rejectedProjects, search])

  const openInspector = (id: string) => {
    setSelectedProjectId(id)
    setInspectModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader routeId="sxd-projects" />

      {/* KPI Thống Kê Tổng Quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setTab('pending')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${tab === 'pending'
              ? 'border-amber-400 bg-amber-50/70 shadow-md ring-2 ring-amber-300'
              : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Chờ phê duyệt
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-200">
            {pendingProjects.length}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Hồ sơ dự án mới gửi cần thẩm định
          </p>
        </div>

        <div
          onClick={() => setTab('approved')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${tab === 'approved'
              ? 'border-emerald-400 bg-emerald-50/70 shadow-md ring-2 ring-emerald-300'
              : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Đã phê duyệt
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-200">
            {approvedProjects.length}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Dự án hợp lệ đang công bố &amp; mở bán
          </p>
        </div>

        <div
          onClick={() => setTab('rejected')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${tab === 'rejected'
              ? 'border-rose-400 bg-rose-50/70 shadow-md ring-2 ring-rose-300'
              : 'border-slate-200 bg-white hover:border-rose-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Đã từ chối
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
              <XCircle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-900 dark:text-rose-200">
            {rejectedProjects.length}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Dự án không đạt tiêu chuẩn pháp lý
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Tổng số dự án
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              <Building2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-200">
            {allProjects.length}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Toàn bộ dự án NOXH trong hệ thống
          </p>
        </div>
      </div>

      <PageCard className="p-6 space-y-6">
        {/* Thanh Tìm Kiếm & Tải Lại */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[260px] max-w-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="sxd-proj-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên dự án, số quyết định, địa chỉ..."
                className="pl-10 h-10 rounded-xl"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearch('')
              void load()
            }}
            className="flex items-center gap-1.5 rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Tải lại
          </Button>
        </div>

        {/* Tabs Điều Hướng */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={`relative -mb-px flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${tab === 'pending'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
          >
            <Clock className="h-4 w-4" />
            Chờ duyệt
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-black ${tab === 'pending'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
            >
              {pendingProjects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('approved')}
            className={`relative -mb-px flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${tab === 'approved'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Đã duyệt
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-black ${tab === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
            >
              {approvedProjects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('rejected')}
            className={`relative -mb-px flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${tab === 'rejected'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
          >
            <XCircle className="h-4 w-4" />
            Từ chối
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-black ${tab === 'rejected'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
            >
              {rejectedProjects.length}
            </span>
          </button>
        </div>

        {msg && (
          <Alert variant={msg.type === 'error' ? 'error' : 'success'}>
            {msg.text}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-18 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && error && <Alert variant="error">{error}</Alert>}

        {/* Empty State */}
        {!loading && !error && currentList.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <p className="mt-4 text-base font-bold text-slate-700 dark:text-slate-200">
              Không có dự án nào
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {tab === 'pending'
                ? 'Hiện tại không có hồ sơ dự án nào đang chờ phê duyệt.'
                : tab === 'approved'
                  ? 'Chưa có dự án nào trong danh sách đã phê duyệt.'
                  : 'Không có dự án nào bị từ chối.'}
            </p>
          </div>
        )}

        {/* Danh Sách Dự Án Dạng Bảng */}
        {!loading && !error && currentList.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-4">Dự án &amp; Pháp lý</th>
                  <th className="px-4 py-4">Địa chỉ</th>
                  <th className="px-4 py-4 text-center">Số căn</th>
                  <th className="px-4 py-4">Khung giá</th>
                  <th className="px-4 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentList.map((p) => (
                  <ProjectTableRow
                    key={p.id}
                    project={p}
                    onOpenInspector={() => p.id && openInspector(p.id)}
                    onRefresh={load}
                    onMsg={(m) => setMsg(m)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* Modal Thẩm Định & Xem Chi Tiết Dự Án Toàn Diện */}
      {selectedProjectId && (
        <ProjectInspectorModal
          projectId={selectedProjectId}
          open={inspectModalOpen}
          onClose={() => {
            setInspectModalOpen(false)
            setSelectedProjectId(null)
          }}
          onRefresh={() => {
            void load()
          }}
          onMsg={(m) => setMsg(m)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// HÀNG BẢNG DỰ ÁN (ProjectTableRow)
// ═══════════════════════════════════════════════════════════════

function ProjectTableRow({
  project,
  onOpenInspector,
  onRefresh,
  onMsg,
}: {
  project: HousingProjectDto
  onOpenInspector: () => void
  onRefresh: () => void
  onMsg: (m: { type: 'success' | 'error'; text: string }) => void
}) {
  const [busy, setBusy] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isPend = isPending(project)
  const isRej = isRejected(project)
  const raw = normalizeStatus(project.status)

  const handleApprove = async () => {
    if (busy || !project.id) return
    setApproveOpen(false)
    setBusy(true)
    try {
      await housingProjectsApi.sxdReviewProject(project.id, { action: 'APPROVE' })
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
      onMsg({ type: 'success', text: `Đã phê duyệt dự án "${project.projectName || project.name}".` })
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
    if (busy || !project.id) return
    setBusy(true)
    try {
      await housingProjectsApi.sxdReviewProject(project.id, {
        action: 'REJECT',
        note: rejectReason.trim(),
      })
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
      onMsg({ type: 'success', text: `Đã từ chối dự án "${project.projectName || project.name}".` })
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
        onClick={onOpenInspector}
        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
      >
        {/* Tên & Pháp lý */}
        <td className="px-5 py-4">
          <div className="flex items-start gap-3">
            {project.thumbnailUrl ? (
              <img
                src={project.thumbnailUrl}
                alt=""
                className="h-11 w-11 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 transition-colors">
                {project.projectName || project.name || 'Dự án chưa đặt tên'}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {project.decisionNumber && (
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    QĐ: {project.decisionNumber}
                  </span>
                )}
                {project.phase1Percentage ? (
                  <span className="text-[11px] text-emerald-600 font-medium">
                    Đợt 1: {project.phase1Percentage}%
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </td>

        {/* Địa chỉ */}
        <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-300 max-w-[220px]">
          <div className="flex items-start gap-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              {[project.street, project.ward, project.district, project.province]
                .filter(Boolean)
                .join(', ') || project.address || '—'}
            </span>
          </div>
        </td>

        {/* Số căn */}
        <td className="px-4 py-4 text-center">
          <span className="inline-flex items-center justify-center font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs">
            {project.availableUnits ?? project.totalUnits ?? 0} căn
          </span>
        </td>

        {/* Khung giá */}
        <td className="px-4 py-4 text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
          {project.minPrice || project.maxPrice
            ? `${formatPrice(project.minPrice)} – ${formatPrice(project.maxPrice)}`
            : '—'}
        </td>

        {/* Trạng thái */}
        <td className="px-4 py-4 whitespace-nowrap">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isPend
                ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                : isRej
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                  : raw === 'UPCOMING'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300'
                    : raw === 'OPEN'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            {isPend ? (
              <>
                <Clock className="h-3 w-3" /> Chờ phê duyệt
              </>
            ) : isRej ? (
              <>
                <X className="h-3 w-3" /> Đã từ chối
              </>
            ) : raw === 'UPCOMING' ? (
              <>
                <CheckCircle2 className="h-3 w-3" /> Sắp mở bán
              </>
            ) : (
              <>
                <Check className="h-3 w-3" /> {labelProjectStatus(project.status)}
              </>
            )}
          </span>
        </td>

        {/* Thao tác */}
        <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenInspector}
              className="rounded-xl flex items-center gap-1 text-xs font-bold"
            >
              <Eye className="h-3.5 w-3.5" />
              Chi tiết
            </Button>

            {isPend && (
              <>
                <Button
                  variant="accent"
                  size="sm"
                  disabled={busy}
                  onClick={() => setApproveOpen(true)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-xs font-bold shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  Duyệt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => setRejectOpen(true)}
                  className="rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                >
                  <X className="h-3.5 w-3.5" />
                  Từ chối
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Modal xác nhận phê duyệt */}
      <Modal
        open={approveOpen}
        onClose={() => (busy ? undefined : setApproveOpen(false))}
        title="Phê duyệt dự án nhà ở xã hội"
        description={`Xác nhận phê duyệt và công bố dự án "${project.projectName || project.name}"?`}
        size="md"
      >
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div className="space-y-1">
            <p className="font-bold">Quyết định chấp thuận chủ trương mở bán</p>
            <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
              Dự án sẽ chuyển sang trạng thái <strong>Sắp mở bán (UPCOMING)</strong> và được công khai minh bạch
              trên Cổng thông tin điện tử Sở Xây dựng theo đúng quy định Điều 38 Nghị định 100/2024/NĐ-CP.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setApproveOpen(false)}>
            Huỷ bỏ
          </Button>
          <Button
            variant="accent"
            size="sm"
            disabled={busy}
            onClick={() => void handleApprove()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
            Xác nhận phê duyệt
          </Button>
        </div>
      </Modal>

      {/* Modal từ chối dự án */}
      <Modal
        open={rejectOpen}
        onClose={() => (busy ? undefined : setRejectOpen(false))}
        title="Từ chối phê duyệt dự án"
        description={`Nhập lý do từ chối hồ sơ dự án "${project.projectName || project.name}".`}
        size="md"
      >
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Lý do từ chối / Yêu cầu bổ sung <span className="text-rose-500">*</span>
          </label>
          <textarea
            autoFocus
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="VD: Hồ sơ pháp lý chưa đầy đủ văn bản phê duyệt 1/500, vui lòng bổ sung quyết định giao đất..."
            className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-xs focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setRejectOpen(false)}>
            Huỷ bỏ
          </Button>
          <Button
            variant="accent"
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white"
            disabled={busy || !rejectReason.trim()}
            onClick={() => void handleReject()}
          >
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}
            Xác nhận từ chối
          </Button>
        </div>
      </Modal>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL THẨM ĐỊNH CHI TIẾT DỰ ÁN TOÀN DIỆN (ProjectInspectorModal)
// ═══════════════════════════════════════════════════════════════

function ProjectInspectorModal({
  projectId,
  open,
  onClose,
  onRefresh,
  onMsg,
}: {
  projectId: string
  open: boolean
  onClose: () => void
  onRefresh: () => void
  onMsg: (m: { type: 'success' | 'error'; text: string }) => void
}) {
  const [project, setProject] = useState<HousingProjectDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')

  const [apartments, setApartments] = useState<ApartmentDto[]>([])
  const [aptLoading, setAptLoading] = useState(false)

  const [evaluation, setEvaluation] = useState<ProjectApplicationEvaluationDto | null>(null)
  const [evalLoading, setEvalLoading] = useState(false)

  const [busy, setBusy] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (!open || !projectId) return
    setLoading(true)
    setError('')
    void housingProjectsApi
      .getById(projectId)
      .then((data) => {
        const p = extractSingleProject(data)
        setProject(p)
      })
      .catch((err) => setError(formatError(err)))
      .finally(() => setLoading(false))

    // Tải danh sách căn hộ
    setAptLoading(true)
    void housingProjectsApi
      .getApartments(projectId, { pageSize: 50 })
      .then((data) => {
        const o = data as Record<string, unknown>
        const raw = (o?.data ?? o?.Data ?? o?.items ?? o?.Items ?? data) as unknown
        if (Array.isArray(raw)) {
          setApartments(raw as ApartmentDto[])
        }
      })
      .catch(() => setApartments([]))
      .finally(() => setAptLoading(false))

    // Tải thống kê hồ sơ
    setEvalLoading(true)
    void housingProjectsApi
      .getEvaluation(projectId)
      .then((data) => {
        const ev = parseProjectEvaluation(data)
        setEvaluation(ev)
      })
      .catch(() => setEvaluation(null))
      .finally(() => setEvalLoading(false))
  }, [open, projectId])

  const isPend = project ? isPending(project) : false
  const isRej = project ? isRejected(project) : false
  const raw = project ? normalizeStatus(project.status) : ''

  const handleApprove = async () => {
    if (!project?.id || busy) return
    setApproveOpen(false)
    setBusy(true)
    try {
      await housingProjectsApi.sxdReviewProject(project.id, { action: 'APPROVE' })
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
      onMsg({ type: 'success', text: `Đã phê duyệt dự án "${project.projectName || project.name}".` })
      onRefresh()
      onClose()
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
    if (!project?.id || busy) return
    setBusy(true)
    try {
      await housingProjectsApi.sxdReviewProject(project.id, {
        action: 'REJECT',
        note: rejectReason.trim(),
      })
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
      onMsg({ type: 'success', text: `Đã từ chối dự án "${project.projectName || project.name}".` })
      setRejectOpen(false)
      setRejectReason('')
      onRefresh()
      onClose()
    } catch (err) {
      onMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy(false)
    }
  }

  const formatPrice = (v?: number) => {
    if (!v) return '—'
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ VNĐ`
    return `${(v / 1_000_000).toLocaleString('vi-VN')} triệu VNĐ`
  }

  const formatDate = (v?: string | null) => {
    if (!v) return '—'
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('vi-VN')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Hồ sơ Thẩm định & Chi tiết Dự án"
      description="Xem xét tính pháp lý, cơ cấu căn hộ và hồ sơ kỹ thuật trước khi phê duyệt"
      size="xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {loading && (
          <div className="space-y-3 py-6">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        )}

        {!loading && error && <Alert variant="error">{error}</Alert>}

        {!loading && project && (
          <>
            {/* Header Thẻ Dự Án */}
            <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-800/60 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  {project.thumbnailUrl ? (
                    <img
                      src={project.thumbnailUrl}
                      alt=""
                      className="h-16 w-16 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shadow-inner">
                      <Building2 className="h-8 w-8" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">
                      {project.projectName || project.name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      {[project.street, project.ward, project.district, project.province]
                        .filter(Boolean)
                        .join(', ') || project.address || '—'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {project.decisionNumber && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-200 shadow-2xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                          <FileText className="h-3.5 w-3.5 text-blue-600" />
                          QĐ: {project.decisionNumber}
                        </span>
                      )}
                      {project.decisionDocumentUrl && (
                        <a
                          href={project.decisionDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800 hover:bg-teal-200 transition-colors shadow-2xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Xem văn bản phê duyệt
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider ${isPend
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : isRej
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : raw === 'UPCOMING'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                  >
                    {isPend ? (
                      <>
                        <Clock className="h-3.5 w-3.5" /> Chờ phê duyệt
                      </>
                    ) : isRej ? (
                      <>
                        <X className="h-3.5 w-3.5" /> Đã từ chối
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" /> {labelProjectStatus(project.status)}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Lý do từ chối nếu có */}
            {isRej && project.rejectReason && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/30">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                      Lý do từ chối từ Sở Xây Dựng
                    </h4>
                    <p className="mt-1 text-sm text-rose-700 dark:text-rose-200 font-medium">
                      {project.rejectReason}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Lựa Chọn Chi Tiết */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <InfoRowIcon className="h-4 w-4" />
                Tổng quan &amp; Pháp lý
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('apartments')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${activeTab === 'apartments'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Layers className="h-4 w-4" />
                Cơ cấu Căn hộ ({project.availableUnits ?? project.totalUnits ?? 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${activeTab === 'timeline'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Calendar className="h-4 w-4" />
                Tiến độ Mốc thời gian
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gallery')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${activeTab === 'gallery'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <ImageIcon className="h-4 w-4" />
                Hình ảnh ({project.images?.length ?? 0})
              </button>

              {(raw === 'UPCOMING' || raw === 'OPEN' || evaluation) && (
                <button
                  type="button"
                  onClick={() => setActiveTab('evaluation')}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${activeTab === 'evaluation'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Thẩm định Hồ sơ
                </button>
              )}
            </div>

            {/* Nội Dung Theo Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Hồ sơ Pháp lý &amp; Dự án
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Mã định danh dự án:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {project.id?.slice(0, 13).toUpperCase() || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Số Quyết định phê duyệt:</span>
                        <span className="font-bold text-blue-600">
                          {project.decisionNumber || 'Chưa cập nhật'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Tỷ lệ Đợt 1 (tiền cọc, tối đa 30%):</span>
                        <span className="font-bold text-emerald-600">
                          {project.phase1Percentage ? `${project.phase1Percentage}%` : 'Theo Luật Nhà ở năm 2023 (tối đa 30%)'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Ngày tạo hồ sơ:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(project.createdAt)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Ngày công bố dự kiến:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(project.publicAnnounceAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Quy mô &amp; Khung giá
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Tổng số căn hộ:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {project.availableUnits ?? project.totalUnits ?? 0} căn
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Khung diện tích:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {project.minArea && project.maxArea
                            ? `${project.minArea} – ${project.maxArea} m²`
                            : project.minArea
                              ? `Từ ${project.minArea} m²`
                              : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Khung giá bán:</span>
                        <span className="font-bold text-emerald-600">
                          {project.minPrice || project.maxPrice
                            ? `${formatPrice(project.minPrice)} – ${formatPrice(project.maxPrice)}`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Địa bàn áp dụng:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {project.district ? `${project.district}, ${project.province}` : project.province || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Văn bản đính kèm:</span>
                        {project.decisionDocumentUrl ? (
                          <a
                            href={project.decisionDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Mở file đính kèm
                          </a>
                        ) : (
                          <span className="text-slate-400">Không có</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {project.description && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Mô tả &amp; Giới thiệu Dự án
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {project.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'apartments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Danh sách cơ cấu căn hộ ({apartments.length} căn hộ đã khởi tạo)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Tổng quy mô: <strong>{project.availableUnits ?? project.totalUnits ?? 0}</strong> căn
                  </span>
                </div>

                {aptLoading ? (
                  <div className="space-y-2 py-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : apartments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    Chủ đầu tư chưa import chi tiết danh sách từng mã căn hộ.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 sticky top-0 font-bold">
                        <tr>
                          <th className="px-3 py-2">Mã căn</th>
                          <th className="px-3 py-2">Block / Tầng</th>
                          <th className="px-3 py-2">Phòng ngủ</th>
                          <th className="px-3 py-2">Diện tích</th>
                          <th className="px-3 py-2">Giá bán</th>
                          <th className="px-3 py-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {apartments.slice(0, 50).map((a, idx) => (
                          <tr key={a.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100">
                              {a.unitName}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                              {a.buildingBlock ? `Block ${a.buildingBlock}` : ''} {a.floorNumber ? `(Tầng ${a.floorNumber})` : ''}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                              {a.numberOfBedrooms ? `${a.numberOfBedrooms} PN` : '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                              {a.area ? `${a.area} m²` : '—'}
                            </td>
                            <td className="px-3 py-2 font-semibold text-emerald-600">
                              {formatPrice(a.price)}
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                {a.status === 'AVAILABLE' ? 'Có sẵn' : a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Lộ trình Triển khai Dự án theo Nghị định 100/2024/NĐ-CP
                  </h3>

                  <div className="relative pl-6 space-y-4 border-l-2 border-blue-200 dark:border-blue-900 ml-2">
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        1. Khởi tạo &amp; Gửi duyệt hồ sơ
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Thời gian: {formatDate(project.createdAt)}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        2. Thẩm định &amp; Phê duyệt công bố (Sở Xây Dựng)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Thời gian duyệt: {formatDate(project.publicAnnounceAt) || 'Chờ Sở Xây Dựng phê duyệt'}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        3. Thời gian Tiếp nhận Hồ sơ Đăng ký Mua
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Từ: {formatDate(project.applicationOpenDate)} — Đến: {formatDate(project.applicationCloseDate)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="space-y-4">
                {project.images && project.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {project.images.map((img, i) => (
                      <div key={img.id || i} className="overflow-hidden rounded-2xl border border-slate-200 shadow-xs">
                        <img src={img.imageUrl} alt="" className="h-32 w-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-slate-200">
                    Chưa có hình ảnh phối cảnh đính kèm.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'evaluation' && (
              <div className="space-y-4">
                {evalLoading ? (
                  <Skeleton className="h-32 w-full rounded-2xl" />
                ) : evaluation ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-blue-50/70 border border-blue-200 p-4 text-center">
                      <div className="text-2xl font-black text-blue-700">
                        {evaluation.totalQualifiedApplications}
                      </div>
                      <div className="text-xs font-bold text-blue-900 mt-1">
                        Tổng hồ sơ đủ điều kiện
                      </div>
                    </div>
                    <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 text-center">
                      <div className="text-2xl font-black text-amber-700">
                        {evaluation.priorityCount}
                      </div>
                      <div className="text-xs font-bold text-amber-900 mt-1">
                        Hồ sơ diện ưu tiên
                      </div>
                    </div>
                    <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 text-center">
                      <div className="text-2xl font-black text-emerald-700">
                        {evaluation.availableUnits}
                      </div>
                      <div className="text-xs font-bold text-emerald-900 mt-1">
                        Suất căn hộ có sẵn
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Chưa có dữ liệu thẩm định hồ sơ nộp cho dự án này.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Thanh Hành Động Thẩm Định / Phê Duyệt Ở Chân Modal */}
      {project && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              sessionStorage.setItem('sxdProjectId', project.id!)
              navigate(`sxd-project-detail?id=${encodeURIComponent(project.id!)}`)
            }}
            className="text-xs text-slate-600 flex items-center gap-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Mở toàn trang (Full Page)
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
              Đóng
            </Button>

            {isPend && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => setRejectOpen(true)}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Từ chối phê duyệt
                </Button>

                <Button
                  variant="accent"
                  size="sm"
                  disabled={busy}
                  onClick={() => setApproveOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Phê duyệt dự án
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal xác nhận phê duyệt từ inspector */}
      <Modal
        open={approveOpen}
        onClose={() => (busy ? undefined : setApproveOpen(false))}
        title="Phê duyệt dự án nhà ở xã hội"
        description={`Xác nhận phê duyệt và công bố dự án "${project?.projectName || project?.name}"?`}
        size="md"
      >
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div className="space-y-1">
            <p className="font-bold">Quyết định chấp thuận chủ trương mở bán</p>
            <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
              Dự án sẽ chuyển sang trạng thái <strong>Sắp mở bán (UPCOMING)</strong> và được công khai minh bạch
              trên Cổng thông tin điện tử Sở Xây dựng theo đúng quy định Điều 38 Nghị định 100/2024/NĐ-CP.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setApproveOpen(false)}>
            Huỷ bỏ
          </Button>
          <Button
            variant="accent"
            size="sm"
            disabled={busy}
            onClick={() => void handleApprove()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
            Xác nhận phê duyệt
          </Button>
        </div>
      </Modal>

      {/* Modal từ chối từ inspector */}
      <Modal
        open={rejectOpen}
        onClose={() => (busy ? undefined : setRejectOpen(false))}
        title="Từ chối phê duyệt dự án"
        description={`Nhập lý do từ chối hồ sơ dự án "${project?.projectName || project?.name}".`}
        size="md"
      >
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Lý do từ chối / Yêu cầu bổ sung <span className="text-rose-500">*</span>
          </label>
          <textarea
            autoFocus
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="VD: Hồ sơ pháp lý chưa đầy đủ văn bản phê duyệt 1/500, vui lòng bổ sung quyết định giao đất..."
            className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-xs focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setRejectOpen(false)}>
            Huỷ bỏ
          </Button>
          <Button
            variant="accent"
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white"
            disabled={busy || !rejectReason.trim()}
            onClick={() => void handleReject()}
          >
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}
            Xác nhận từ chối
          </Button>
        </div>
      </Modal>
    </Modal>
  )
}

function InfoRowIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Building className="h-4 w-4" {...props} />
}

// ═══════════════════════════════════════════════════════════════
// TRANG CHI TIẾT TOÀN DIỆN DÀNH CHO SXD (SxdProjectDetailPage)
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

  const [apartments, setApartments] = useState<ApartmentDto[]>([])
  const [aptLoading, setAptLoading] = useState(false)

  // Đồng bộ projectId khi URL hash thay đổi
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
    if (!projectId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    void housingProjectsApi
      .getById(projectId)
      .then((data) => {
        const p = extractSingleProject(data)
        setProject(p)
      })
      .catch((err) => setError(formatError(err)))
      .finally(() => setLoading(false))

    // Căn hộ
    setAptLoading(true)
    void housingProjectsApi
      .getApartments(projectId, { pageSize: 100 })
      .then((data) => {
        const o = data as Record<string, unknown>
        const raw = (o?.data ?? o?.Data ?? o?.items ?? o?.Items ?? data) as unknown
        if (Array.isArray(raw)) {
          setApartments(raw as ApartmentDto[])
        }
      })
      .catch(() => setApartments([]))
      .finally(() => setAptLoading(false))
  }

  const loadEvaluation = () => {
    if (!projectId) return
    setEvalLoading(true)
    void housingProjectsApi
      .getEvaluation(projectId)
      .then((data) => {
        const ev = parseProjectEvaluation(data)
        setEvaluation(ev)
      })
      .catch(() => setEvaluation(null))
      .finally(() => setEvalLoading(false))
  }

  useEffect(() => {
    load()
  }, [projectId])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener('fecaps:project-status-changed', handler)
    return () => window.removeEventListener('fecaps:project-status-changed', handler)
  }, [])

  useEffect(() => {
    if (project) loadEvaluation()
  }, [project?.id])

  const raw = project ? normalizeStatus(project.status) : ''
  const isPend = project ? isPending(project) : false
  const isRej = project ? isRejected(project) : false

  const [busy, setBusy] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const handleApprove = async () => {
    if (!project?.id || busy) return
    setApproveOpen(false)
    setBusy(true)
    try {
      await housingProjectsApi.sxdReviewProject(project.id, { action: 'APPROVE' })
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
      setMsg({ type: 'success', text: 'Đã phê duyệt dự án thành công.' })
      load()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập lý do từ chối.' })
      return
    }
    if (!project?.id || busy) return
    setBusy(true)
    try {
      await housingProjectsApi.sxdReviewProject(project.id, {
        action: 'REJECT',
        note: rejectReason.trim(),
      })
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
      setMsg({ type: 'success', text: 'Đã từ chối dự án.' })
      setRejectOpen(false)
      setRejectReason('')
      load()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy(false)
    }
  }

  const formatPrice = (v?: number) => {
    if (!v) return '—'
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ VNĐ`
    return `${(v / 1_000_000).toLocaleString('vi-VN')} triệu VNĐ`
  }

  const formatDate = (v?: string | null) => {
    if (!v) return '—'
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('vi-VN')
  }

  return (
    <div className="space-y-6">
      <PageHeader routeId="sxd-project-detail" />
      <PageCard className="p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('sxd-projects')} className="rounded-xl flex items-center gap-1 text-sm font-semibold">
          ← Quay lại danh sách duyệt
        </Button>

        {msg && (
          <Alert variant={msg.type === 'error' ? 'error' : 'success'}>
            {msg.text}
          </Alert>
        )}

        {loading && <Skeleton className="h-64 w-full rounded-2xl" />}

        {error && <Alert variant="error">{error}</Alert>}

        {!loading && !error && !project && (
          <Alert variant="error">Không tìm thấy dự án.</Alert>
        )}

        {!loading && !error && project && (
          <>
            {/* Header Thẩm Định */}
            <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-blue-50/40 p-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-800/60 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {project.thumbnailUrl ? (
                    <img
                      src={project.thumbnailUrl}
                      alt=""
                      className="h-20 w-20 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shadow-inner">
                      <Building2 className="h-10 w-10" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50">
                      {project.projectName || project.name}
                    </h1>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                      <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                      {[project.street, project.ward, project.district, project.province]
                        .filter(Boolean)
                        .join(', ') || project.address || '—'}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      {project.decisionNumber && (
                        <span className="font-semibold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                          Quyết định: <strong>{project.decisionNumber}</strong>
                        </span>
                      )}
                      {project.decisionDocumentUrl && (
                        <a
                          href={project.decisionDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-100 px-3 py-1 font-bold text-teal-800 hover:bg-teal-200 transition-colors shadow-2xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Xem văn bản phê duyệt
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider ${isPend
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : isRej
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : raw === 'UPCOMING'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                  >
                    {isPend ? (
                      <>
                        <Clock className="h-4 w-4" /> Chờ phê duyệt
                      </>
                    ) : isRej ? (
                      <>
                        <X className="h-4 w-4" /> Đã từ chối
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" /> {labelProjectStatus(project.status)}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Khung Thao Tác Phê Duyệt / Từ Chối Nổi Bật Dành Cho Cán Bộ SXD */}
            {isPend && (
              <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/30 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                      Hồ Sơ Đang Chờ Sở Xây Dựng Phê Duyệt
                    </h3>
                    <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/90">
                      Vui lòng đối chiếu đầy đủ các văn bản pháp lý, cơ cấu căn hộ và bảng giá trước khi đưa ra quyết định.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setRejectOpen(true)}
                      className="rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      Từ chối phê duyệt
                    </Button>
                    <Button
                      variant="accent"
                      disabled={busy}
                      onClick={() => setApproveOpen(true)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md"
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      Phê duyệt dự án ngay
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Lý do từ chối nếu có */}
            {isRej && project.rejectReason && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-800 dark:bg-rose-950/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                      Lý do từ chối hồ sơ từ Sở Xây Dựng
                    </h4>
                    <p className="mt-1 text-xs text-rose-800 dark:text-rose-300 font-medium">
                      {project.rejectReason}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Thống kê hồ sơ */}
            {(raw === 'UPCOMING' || raw === 'OPEN' || evaluation) && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-800 dark:bg-blue-950/20">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-200">
                  Thống kê Hồ sơ Tham gia Dự án
                </h3>
                {evalLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : evaluation ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-white p-4 text-center shadow-xs dark:bg-slate-800">
                      <p className="text-2xl font-black text-blue-600">
                        {evaluation.totalQualifiedApplications}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Tổng hồ sơ đủ điều kiện
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-4 text-center shadow-xs dark:bg-slate-800">
                      <p className="text-2xl font-black text-emerald-600">
                        {evaluation.availableUnits}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Suất căn hộ mở bán
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-4 text-center shadow-xs dark:bg-slate-800">
                      <p className="text-2xl font-black text-amber-600">
                        {evaluation.priorityCount}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Hồ sơ diện ưu tiên
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Chưa có dữ liệu hồ sơ.</p>
                )}
              </div>
            )}

            {/* 2 Cột Chi Tiết */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Cột Trái: Thông tin chung & Pháp lý */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="border-b border-slate-100 pb-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Thông tin Pháp lý &amp; Quy mô
                </h3>
                <div className="space-y-2 text-xs">
                  <DetailRow label="Số căn hộ quy hoạch" value={`${project.availableUnits ?? project.totalUnits ?? 0} căn`} />
                  <DetailRow
                    label="Khung diện tích"
                    value={
                      project.minArea && project.maxArea
                        ? `${project.minArea} – ${project.maxArea} m²`
                        : project.minArea
                          ? `Từ ${project.minArea} m²`
                          : project.maxArea
                            ? `Đến ${project.maxArea} m²`
                            : '—'
                    }
                  />
                  <DetailRow
                    label="Khung giá bán"
                    value={
                      project.minPrice && project.maxPrice
                        ? `${formatPrice(project.minPrice)} – ${formatPrice(project.maxPrice)}`
                        : project.minPrice
                          ? `Từ ${formatPrice(project.minPrice)}`
                          : project.maxPrice
                            ? `Đến ${formatPrice(project.maxPrice)}`
                            : '—'
                    }
                  />
                  <DetailRow label="Tỷ lệ Đợt 1 (tiền cọc, tối đa 30%)" value={project.phase1Percentage ? `${project.phase1Percentage}%` : 'Luật Nhà ở năm 2023 (tối đa 30%)'} />
                  <DetailRow label="Ngày tạo hồ sơ" value={formatDate(project.createdAt)} />
                  <DetailRow label="Ngày phê duyệt công bố" value={formatDate(project.publicAnnounceAt)} />
                  <DetailRow label="Ngày mở nhận hồ sơ" value={formatDate(project.applicationOpenDate)} />
                  <DetailRow label="Ngày đóng nhận hồ sơ" value={formatDate(project.applicationCloseDate)} />
                </div>
              </div>

              {/* Cột Phải: Hình ảnh & Mô tả */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="border-b border-slate-100 pb-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Hình ảnh Phối cảnh &amp; Mô tả
                </h3>

                {project.thumbnailUrl && (
                  <img
                    src={project.thumbnailUrl}
                    alt="thumbnail"
                    className="w-full rounded-xl object-cover max-h-48 border border-slate-200"
                  />
                )}

                {project.images && project.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {project.images.map((img) => (
                      <img
                        key={img.id}
                        src={img.imageUrl}
                        alt=""
                        className="w-full rounded-lg object-cover h-20 border border-slate-200"
                      />
                    ))}
                  </div>
                )}

                {project.description && (
                  <div>
                    <p className="mb-1 text-xs font-bold text-slate-500">Mô tả dự án</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Danh Sách Căn Hộ */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Cơ cấu Danh mục Căn hộ ({apartments.length} căn hộ)
                </h3>
                <span className="text-xs text-slate-500">
                  Dữ liệu kỹ thuật do Chủ đầu tư đính kèm
                </span>
              </div>

              {aptLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : apartments.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Chưa có danh sách từng căn hộ chi tiết.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 sticky top-0 font-bold">
                      <tr>
                        <th className="px-3 py-2">Mã căn</th>
                        <th className="px-3 py-2">Block / Tầng</th>
                        <th className="px-3 py-2">Phòng ngủ</th>
                        <th className="px-3 py-2">Diện tích</th>
                        <th className="px-3 py-2">Giá bán</th>
                        <th className="px-3 py-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {apartments.slice(0, 100).map((a, idx) => (
                        <tr key={a.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100">
                            {a.unitName}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                            {a.buildingBlock ? `Block ${a.buildingBlock}` : ''} {a.floorNumber ? `(Tầng ${a.floorNumber})` : ''}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                            {a.numberOfBedrooms ? `${a.numberOfBedrooms} PN` : '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                            {a.area ? `${a.area} m²` : '—'}
                          </td>
                          <td className="px-3 py-2 font-semibold text-emerald-600">
                            {formatPrice(a.price)}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {a.status === 'AVAILABLE' ? 'Có sẵn' : a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </PageCard>

      {/* Modal phê duyệt từ full-page */}
      <Modal
        open={approveOpen}
        onClose={() => (busy ? undefined : setApproveOpen(false))}
        title="Phê duyệt dự án"
        description={`Xác nhận phê duyệt dự án "${project?.projectName || project?.name}"?`}
        size="md"
      >
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <p className="text-xs leading-relaxed">
            Dự án sẽ chuyển sang trạng thái <strong>Sắp mở bán (UPCOMING)</strong> và công khai trên Cổng thông tin điện tử Sở Xây dựng.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setApproveOpen(false)}>
            Huỷ bỏ
          </Button>
          <Button variant="accent" size="sm" disabled={busy} onClick={() => void handleApprove()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
            Xác nhận phê duyệt
          </Button>
        </div>
      </Modal>

      {/* Modal từ chối từ full-page */}
      <Modal
        open={rejectOpen}
        onClose={() => (busy ? undefined : setRejectOpen(false))}
        title="Từ chối dự án"
        description={`Nhập lý do từ chối dự án "${project?.projectName || project?.name}".`}
        size="md"
      >
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Lý do từ chối <span className="text-rose-500">*</span>
          </label>
          <textarea
            autoFocus
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="VD: Hồ sơ pháp lý chưa đầy đủ..."
            className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-xs focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setRejectOpen(false)}>
            Huỷ bỏ
          </Button>
          <Button
            variant="accent"
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white"
            disabled={busy || !rejectReason.trim()}
            onClick={() => void handleReject()}
          >
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}
            Xác nhận từ chối
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
      <span className="text-slate-500">{label}:</span>
      <span className="font-bold text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  )
}

