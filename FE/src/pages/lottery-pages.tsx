import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar,
  Play,
  Send,
  Trophy,
  Users,
  Radio,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  MapPin,
  Copy,
  Check,
  BookOpen,
  Info,
  ShieldCheck,
  Eye,
  Edit3,
  LayoutGrid,
  ListFilter,
  Pause,
  KeyRound,
  FileText,
  ArrowUpCircle,
} from 'lucide-react'
import {
  lotteryApi,
  parseLotteryResult,
  parseLotterySchedule,
  parseEligibleList,
  parseWaitlist,
  type LotteryEligibleEntry,
  type LotteryResultDto,
  type LotteryScheduleDto,
  type WaitlistEntryDto,
} from '@/api/lottery'
import { connectLotteryHub, stopLotteryHub } from '@/api/lotteryHub'
import { housingProjectsApi, parseApartments } from '@/api/housing-projects'
import type { HousingProjectSummaryDto } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { LotteryStaffTabs } from '@/components/lottery/lottery-staff-tabs'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import {
  getLotteryPhase,
  LOTTERY_PHASE_STEPS,
  phaseChipLabel,
  phaseStepIndex,
  type LotteryPhase,
} from '@/lib/lottery-phase'
import { WAITLIST_CONFIRM_HOURS_DEFAULT, splitAvailableUnits } from '@/lib/lottery-allocation'
import { getRole } from '@/router'

interface ProjectLotteryRow {
  project: HousingProjectSummaryDto
  schedule: LotteryScheduleDto | null
}

function loadProjectIdFromStorage(): string {
  return sessionStorage.getItem('lotteryProjectId') ?? ''
}

function persistProjectId(id: string) {
  if (id) sessionStorage.setItem('lotteryProjectId', id)
  else sessionStorage.removeItem('lotteryProjectId')
}

function nextActionHint(schedule: LotteryScheduleDto | null, role: string, projectStatus?: string | null): string {
  const phase = getLotteryPhase(schedule, projectStatus)
  const isDev = role === 'Housing Developer'
  const isSxd = role === 'Department Of Construction'
  if (phase === 'project_pending') {
    if (isDev) return 'Dự án đang chờ Sở Xây dựng thẩm định & phê duyệt chủ trương mở bán trước khi được lên lịch bốc thăm'
    if (isSxd) return 'Dự án mới tạo gửi lên — Cần thẩm định và phê duyệt chủ trương dự án tại mục Quản lý Dự án trước khi bốc thăm'
    return 'Dự án chưa được phê duyệt mở bán'
  }
  if (isDev) {
    switch (phase) {
      case 'not_scheduled': return 'Dự án đã duyệt — Cần đề xuất lịch bốc thăm sau khi chốt danh sách hồ sơ'
      case 'awaiting_approval': return 'Đã gửi đề xuất lịch — Đang chờ Sở Xây dựng phê duyệt'
      case 'ready_open_lobby': return 'Sở đã duyệt lịch — Mở sảnh chờ để người dân vào bằng mã vào sảnh'
      case 'waiting_lobby': return 'Sảnh chờ đang mở — Chờ cán bộ Sở Xây dựng giám sát để bắt đầu quay số'
      case 'live': return 'Phiên đang quay số trực tiếp — Theo dõi và kết thúc khi quay xong'
      case 'paused': return 'Phiên đang tạm dừng — Bấm tiếp tục quay số để bốc tiếp'
      case 'finished': return 'Phiên đã kết thúc — Chờ Sở Xây dựng công bố kết quả'
      case 'published': return 'Đã công bố chính thức — Có thể tải biên bản pháp lý'
    }
  }
  if (isSxd) {
    switch (phase) {
      case 'not_scheduled': return 'Chờ Chủ đầu tư gửi hồ sơ đề xuất lịch bốc thăm'
      case 'awaiting_approval': return 'Có lịch bốc thăm mới gửi lên — Cần phê duyệt'
      case 'ready_open_lobby': return 'Đã duyệt lịch — Chờ chủ đầu tư mở sảnh chờ trực tuyến'
      case 'waiting_lobby':
      case 'live': return 'Giám sát trực tuyến — Giữ kết nối để đảm bảo tính pháp lý'
      case 'paused': return 'Phiên đang tạm dừng'
      case 'finished': return 'Phiên bốc xong — Cần thẩm tra và công bố kết quả công khai'
      case 'published': return 'Đã công bố kết quả chính thức — Có thể tải biên bản'
    }
  }
  return ''
}

function ModernStatusBadge({ phase }: { phase: LotteryPhase }) {
  switch (phase) {
    case 'project_pending':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          DỰ ÁN CHỜ SỞ DUYỆT
        </span>
      )
    case 'live':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-300 animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
          </span>
          <Radio className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          ĐANG QUAY SỐ
        </span>
      )
    case 'waiting_lobby':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          SẢNH CHỜ MỞ
        </span>
      )
    case 'ready_open_lobby':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/20 dark:text-blue-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          ĐÃ DUYỆT LỊCH
        </span>
      )
    case 'awaiting_approval':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-800 dark:border-yellow-400/40 dark:bg-yellow-500/20 dark:text-yellow-300">
          <Clock className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
          CHỜ SỞ DUYỆT LỊCH
        </span>
      )
    case 'not_scheduled':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          CHƯA LÊN LỊCH
        </span>
      )
    case 'paused':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-700 dark:border-orange-400/40 dark:bg-orange-500/20 dark:text-orange-300">
          <Pause className="h-3.5 w-3.5 text-orange-600" />
          TẠM DỪNG
        </span>
      )
    case 'finished':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-700 dark:border-purple-400/40 dark:bg-purple-500/20 dark:text-purple-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
          CHỜ CÔNG BỐ
        </span>
      )
    case 'published':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-300">
          <Trophy className="h-3.5 w-3.5 text-emerald-600" />
          ĐÃ CÔNG BỐ
        </span>
      )
  }
}

export function LotterySessionsPage() {
  const role = getRole()
  const isDev = role === 'Housing Developer'
  const isSxd = role === 'Department Of Construction'

  const [rows, setRows] = useState<ProjectLotteryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [tab, setTab] = useState<'all' | 'live_group' | 'awaiting_approval' | 'not_scheduled' | 'project_pending' | 'finished_group'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Modals state
  const [guideModalOpen, setGuideModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string; schedule: LotteryScheduleDto | null } | null>(null)
  const [schedForm, setSchedForm] = useState({
    lotteryDate: '',
    lotteryLocation: 'Hội trường trực tuyến & Cổng dịch vụ công',
    totalUnits: '0',
    notes: '',
  })
  const [schedFund, setSchedFund] = useState({ priorityCount: 0, standardCount: 0, available: 0 })
  const [schedModalError, setSchedModalError] = useState('')
  const [schedSaving, setSchedSaving] = useState(false)

  // Action status toast / message
  const [busyAction, setBusyAction] = useState('')
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await housingProjectsApi.list({ pageIndex: 1, pageSize: 50 })
      const raw = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
      const list = (raw.items ?? raw.Items ?? []) as HousingProjectSummaryDto[]
      // Giữ cả dự án CLOSED (đã khóa nhận hồ sơ khi lên lịch). Chỉ ẩn dự án SXD từ chối.
      const items = list.filter((p) => {
        const s = String(p.status ?? '').toUpperCase()
        return !/REJECTED|TỪ CHỐI/.test(s)
      })
      const enriched: ProjectLotteryRow[] = await Promise.all(
        items.map(async (p) => {
          try {
            const scheduleData = await lotteryApi.getSchedule(p.id)
            return { project: p, schedule: parseLotterySchedule(scheduleData) }
          } catch {
            return { project: p, schedule: null }
          }
        }),
      )
      setRows(enriched)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedCode(text)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleAction = async (label: string, projectId: string, fn: () => Promise<unknown>) => {
    setBusyAction(`${projectId}-${label}`)
    setActionToast(null)
    try {
      await fn()
      setActionToast({ type: 'success', text: `${label} thành công.` })
      await load()
    } catch (err) {
      setActionToast({ type: 'error', text: formatError(err) })
    } finally {
      setBusyAction('')
    }
  }

  const handleDownloadMinutes = async (projectId: string, projectName?: string) => {
    const token = sessionStorage.getItem('accessToken')
    try {
      const res = await fetch(lotteryApi.minutesUrl(projectId), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `BienBan_BocTham_${projectName ? projectName.replace(/\s+/g, '_') : projectId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setActionToast({ type: 'success', text: 'Tải biên bản bốc thăm thành công.' })
    } catch (e) {
      setActionToast({ type: 'error', text: formatError(e) })
    }
  }

  const openScheduleModal = async (project: HousingProjectSummaryDto, schedule: LotteryScheduleDto | null) => {
    const pPhase = getLotteryPhase(schedule, project.status)
    if (pPhase === 'project_pending') {
      setActionToast({
        type: 'error',
        text: 'Dự án này chưa được Sở Xây dựng phê duyệt chủ trương mở bán. Vui lòng chờ Sở phê duyệt dự án trước khi lập lịch bốc thăm.',
      })
      return
    }

    setSelectedProject({ id: project.id, name: project.projectName, schedule })
    setSchedModalError('')
    const defaultDate = schedule?.scheduledAt || schedule?.lotteryDate
    let localDateStr = ''
    if (defaultDate) {
      const d = new Date(defaultDate)
      localDateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    } else {
      const next = new Date(Date.now() + 86400000)
      localDateStr = new Date(next.getTime() - next.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    setSchedForm({
      lotteryDate: localDateStr,
      lotteryLocation: schedule?.lotteryLocation || 'Hội trường trực tuyến và Cổng dịch vụ công',
      totalUnits: String(schedule?.totalUnits || project.availableUnits || 0),
      notes: schedule?.notes || '',
    })
    try {
      const data = await housingProjectsApi.getById(project.id)
      const dataAvailable = Number((data as Record<string, unknown>)?.availableUnits ?? project.availableUnits ?? 0)
      const apts = parseApartments(data).filter((a) => String(a.status).toUpperCase() === 'AVAILABLE')
      const fund = splitAvailableUnits(apts)

      // Số căn tối đa cho phép chính là availableUnits của dự án trong hệ thống
      const maxLimit = dataAvailable > 0 ? dataAvailable : (Number(project.availableUnits) || (apts.length > 0 ? apts.length : 0))
      const available = maxLimit > 0 ? maxLimit : apts.length
      const priorityCount = Math.min(fund.priorityCount, available)
      const standardCount = Math.max(0, available - priorityCount)

      setSchedFund({
        priorityCount,
        standardCount,
        available,
      })
      setSchedForm((f) => ({ ...f, totalUnits: String(available) }))
    } catch {
      const fallback = Math.max(
        Number(project.availableUnits) || 0,
        Number(schedule?.availableUnits ?? schedule?.totalUnits) || 0,
      )
      setSchedFund({ priorityCount: 0, standardCount: fallback, available: fallback })
      setSchedForm((f) => ({ ...f, totalUnits: String(fallback) }))
    }
    setScheduleModalOpen(true)
  }

  const handleSaveSchedule = async () => {
    if (!selectedProject || schedSaving) return
    setSchedModalError('')
    if (!schedForm.lotteryDate || !schedForm.lotteryLocation.trim()) {
      setSchedModalError('Vui lòng nhập đủ ngày giờ và địa điểm mở sảnh.')
      return
    }
    const parsed = new Date(schedForm.lotteryDate)
    if (Number.isNaN(parsed.getTime())) {
      setSchedModalError('Ngày giờ không hợp lệ.')
      return
    }
    if (parsed.getTime() < Date.now() - 60_000) {
      setSchedModalError('Thời gian bốc thăm phải ở tương lai.')
      return
    }
    const numUnits = Number(schedForm.totalUnits)
    if (!numUnits || numUnits <= 0) {
      setSchedModalError('Số căn hộ bốc thăm phải lớn hơn 0.')
      return
    }
    if (schedFund.available > 0 && numUnits > schedFund.available) {
      setSchedModalError(`Số căn mở bốc thăm không được vượt số căn còn lại của dự án (${schedFund.available} căn).`)
      return
    }
    const iso = parsed.toISOString()
    setSchedSaving(true)
    try {
      await lotteryApi.schedule(selectedProject.id, {
        lotteryDate: iso,
        lotteryLocation: schedForm.lotteryLocation.trim(),
        lotteryType: 'ONLINE',
        totalUnits: numUnits,
        lotteryDescription: schedForm.notes.trim() || undefined,
        notes: schedForm.notes.trim() || undefined,
      })
      setScheduleModalOpen(false)
      setActionToast({ type: 'success', text: 'Lưu lịch bốc thăm thành công.' })
      await load()
    } catch (err) {
      setSchedModalError(formatError(err))
    } finally {
      setSchedSaving(false)
    }
  }

  // Aggregate metrics
  const stats = useMemo(() => {
    let liveCount = 0
    let awaitingCount = 0
    let notScheduledCount = 0
    let projectPendingCount = 0
    let finishedCount = 0
    let totalUnits = 0

    rows.forEach((r) => {
      const phase = getLotteryPhase(r.schedule, r.project.status)
      if (['live', 'waiting_lobby', 'paused', 'ready_open_lobby'].includes(phase)) liveCount++
      else if (phase === 'awaiting_approval') awaitingCount++
      else if (phase === 'not_scheduled') notScheduledCount++
      else if (phase === 'project_pending') projectPendingCount++
      else if (['finished', 'published'].includes(phase)) finishedCount++

      if (r.schedule?.totalUnits) {
        totalUnits += r.schedule.totalUnits
      }
    })

    return { liveCount, awaitingCount, notScheduledCount, projectPendingCount, finishedCount, totalUnits }
  }, [rows])

  // Filtered and sorted rows
  const visibleRows = useMemo(() => {
    return rows
      .filter((r) => {
        const phase = getLotteryPhase(r.schedule, r.project.status)
        if (tab === 'live_group') {
          if (!['live', 'waiting_lobby', 'paused', 'ready_open_lobby'].includes(phase)) return false
        } else if (tab === 'awaiting_approval') {
          if (phase !== 'awaiting_approval') return false
        } else if (tab === 'not_scheduled') {
          if (phase !== 'not_scheduled') return false
        } else if (tab === 'project_pending') {
          if (phase !== 'project_pending') return false
        } else if (tab === 'finished_group') {
          if (!['finished', 'published'].includes(phase)) return false
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const name = (r.project.projectName || '').toLowerCase()
          const location = `${r.project.district || ''} ${r.project.province || ''} ${r.project.address || ''} ${r.project.street || ''}`.toLowerCase()
          const code = (r.schedule?.joinCode || '').toLowerCase()
          const loc = (r.schedule?.lotteryLocation || '').toLowerCase()
          if (!name.includes(q) && !location.includes(q) && !code.includes(q) && !loc.includes(q)) return false
        }

        return true
      })
      .sort((a, b) => {
        const phaseA = getLotteryPhase(a.schedule, a.project.status)
        const phaseB = getLotteryPhase(b.schedule, b.project.status)
        const order: Record<string, number> = {
          live: 1,
          waiting_lobby: 2,
          paused: 3,
          ready_open_lobby: 4,
          awaiting_approval: 5,
          not_scheduled: 6,
          finished: 7,
          published: 8,
          project_pending: 9,
        }
        const diff = (order[phaseA] ?? 99) - (order[phaseB] ?? 99)
        if (diff !== 0) return diff
        const sa = a.schedule?.scheduledAt ?? ''
        const sb = b.schedule?.scheduledAt ?? ''
        return sb.localeCompare(sa)
      })
  }, [rows, tab, searchQuery])

  return (
    <div className="space-y-6">
      <PageHeader routeId="lottery-sessions" />
      <LotteryStaffTabs current="sessions" />

      {/* Hero Command Bar */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl dark:border-slate-800">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>TRUNG TÂM ĐIỀU HÀNH BỐC THĂM QUYỀN MUA NHÀ Ở XÃ HỘI</span>
              <span className="text-blue-300/60">·</span>
              <span className="text-blue-300">{isDev ? 'Dành cho Chủ đầu tư' : isSxd ? 'Dành cho Sở Xây dựng' : 'Hệ thống công khai'}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Quản lý & Điều hành Phiên Bốc Thăm Công Khai
            </h1>
            <p className="text-sm leading-relaxed text-slate-300/90">
              Phân bổ quyền mua: căn ưu tiên cấp trực tiếp cho hồ sơ điểm cao nhất; hồ sơ hợp lệ vượt quỹ căn thì bốc thăm công khai. Không trúng được xếp danh sách chờ theo hạng — suất trả lại (hủy hợp đồng / không cọc) đôn người đứng đầu, hạn xác nhận {WAITLIST_CONFIRM_HOURS_DEFAULT} giờ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
              onClick={() => setGuideModalOpen(true)}
            >
              <BookOpen className="mr-1.5 h-4 w-4 text-indigo-400" />
              Quy chế & Quy trình
            </Button>
            <Button
              variant="accent"
              size="sm"
              disabled={loading}
              onClick={() => void load()}
              className="shadow-lg shadow-blue-600/30"
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới dữ liệu
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Live / Lobby */}
        <button
          type="button"
          onClick={() => setTab('live_group')}
          className={`group flex items-center justify-between rounded-xl border p-4 text-left transition shadow-xs ${tab === 'live_group'
            ? 'border-rose-400 bg-rose-50/80 ring-2 ring-rose-400/30 dark:border-rose-700 dark:bg-rose-950/40'
            : 'border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
            }`}
        >
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              Đang quay số / Mở sảnh
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.liveCount}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Phát trực tuyến công khai</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300 group-hover:scale-105 transition-transform">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
        </button>

        {/* Card 2: Awaiting Approval */}
        <button
          type="button"
          onClick={() => setTab('awaiting_approval')}
          className={`group flex items-center justify-between rounded-xl border p-4 text-left transition shadow-xs ${tab === 'awaiting_approval'
            ? 'border-yellow-400 bg-yellow-50/80 ring-2 ring-yellow-400/30 dark:border-yellow-700 dark:bg-yellow-950/40'
            : 'border-slate-200 bg-white hover:border-yellow-300 hover:bg-yellow-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
            }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">
              ⏳ Chờ Sở duyệt lịch
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.awaitingCount}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Đã gửi đề xuất lên Sở Xây dựng</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 group-hover:scale-105 transition-transform">
            <Clock className="h-6 w-6" />
          </div>
        </button>

        {/* Card 3: Not Scheduled (Approved Projects) */}
        <button
          type="button"
          onClick={() => setTab('not_scheduled')}
          className={`group flex items-center justify-between rounded-xl border p-4 text-left transition shadow-xs ${tab === 'not_scheduled'
            ? 'border-blue-400 bg-blue-50/80 ring-2 ring-blue-400/30 dark:border-blue-700 dark:bg-blue-950/40'
            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
            }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              📅 Chưa lên lịch (Đã duyệt)
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.notScheduledCount}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Dự án đã đủ điều kiện lên lịch</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 group-hover:scale-105 transition-transform">
            <Calendar className="h-6 w-6" />
          </div>
        </button>

        {/* Card 4: Finished / Published */}
        <button
          type="button"
          onClick={() => setTab('finished_group')}
          className={`group flex items-center justify-between rounded-xl border p-4 text-left transition shadow-xs ${tab === 'finished_group'
            ? 'border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-400/30 dark:border-emerald-700 dark:bg-emerald-950/40'
            : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
            }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              🏆 Đã công bố / Hoàn tất
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.finishedCount}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Đã có kết quả & Danh sách dự bị</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 group-hover:scale-105 transition-transform">
            <Trophy className="h-6 w-6" />
          </div>
        </button>
      </div>

      {/* Global Alerts / Toasts */}
      {actionToast && (
        <Alert variant={actionToast.type === 'error' ? 'error' : 'success'}>
          {actionToast.text}
        </Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Search, Filter Tabs & View Mode Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên dự án, vị trí, mã vào sảnh..."
            className="pl-9 text-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            Tất cả ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('live_group')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === 'live_group'
              ? 'bg-rose-600 text-white'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            Đang quay số ({stats.liveCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('awaiting_approval')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === 'awaiting_approval'
              ? 'bg-yellow-600 text-white'
              : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300'
              }`}
          >
            Chờ duyệt lịch ({stats.awaitingCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('not_scheduled')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === 'not_scheduled'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300'
              }`}
          >
            Đã duyệt ({stats.notScheduledCount})
          </button>
          {stats.projectPendingCount > 0 && (
            <button
              type="button"
              onClick={() => setTab('project_pending')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === 'project_pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
            >
              Dự án chờ duyệt ({stats.projectPendingCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('finished_group')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === 'finished_group'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
          >
            Đã công bố ({stats.finishedCount})
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 border-l pl-3 border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded-lg p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : ''
              }`}
            title="Lưới thẻ"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`rounded-lg p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white ${viewMode === 'table' ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : ''
              }`}
            title="Bảng danh sách"
          >
            <ListFilter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            Đang tải dữ liệu phiên bốc thăm và đồng bộ trạng thái...
          </p>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Info className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            Không tìm thấy dự án bốc thăm nào
          </h3>
          <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
            {searchQuery
              ? 'Không có dự án nào khớp với từ khóa tìm kiếm. Vui lòng thử lại.'
              : tab !== 'all'
                ? 'Không có dự án nào ở bộ lọc trạng thái này.'
                : 'Chưa có dự án nào mở bốc thăm. Hãy chọn dự án ở trang Quản lý Dự án và bấm Lên lịch bốc thăm.'}
          </p>
          {(searchQuery || tab !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchQuery('')
                setTab('all')
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleRows.map(({ project, schedule }) => {
            const phase = getLotteryPhase(schedule, project.status)
            const isLive = phase === 'live' || phase === 'waiting_lobby'
            const sxdCount = schedule?.sxdOnlineCount ?? 0
            const joinOtp = schedule?.joinCode
            const isActionBusy = busyAction.startsWith(project.id)

            return (
              <div
                key={project.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 transition duration-200 shadow-sm hover:shadow-md dark:bg-slate-900 ${isLive
                  ? 'border-rose-400/80 ring-1 ring-rose-400/40 dark:border-rose-700'
                  : phase === 'ready_open_lobby'
                    ? 'border-blue-300 dark:border-blue-800'
                    : phase === 'published'
                      ? 'border-emerald-200 dark:border-emerald-800'
                      : phase === 'project_pending'
                        ? 'border-amber-200/80 bg-amber-50/10 dark:border-amber-900/40'
                        : 'border-slate-200 dark:border-slate-800'
                  }`}
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <ModernStatusBadge phase={phase} />
                    <span className="text-[11px] font-semibold text-slate-400">
                      Mã: {project.id ? project.id.slice(0, 8).toUpperCase() : '—'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition dark:text-white line-clamp-1">
                      {project.projectName}
                    </h3>
                    <p className="mt-0.5 flex items-center text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      <MapPin className="mr-1 h-3 w-3 shrink-0 text-slate-400" />
                      {project.address || (project.district ? `${project.district}, ${project.province || 'Hà Nội'}` : 'Địa bàn đô thị')}
                    </p>
                  </div>

                  {/* Metadata Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Tổng căn khả dụng:</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {project.availableUnits ? `${project.availableUnits} căn` : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Số căn bốc thăm:</span>
                      <p className="font-bold text-indigo-600 dark:text-indigo-400">
                        {schedule?.totalUnits ? `${schedule.totalUnits} căn` : 'Chưa cấu hình'}
                      </p>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200/70 dark:border-slate-700/70">
                      <span className="text-slate-500 dark:text-slate-400">Thời gian mở sảnh:</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {schedule?.scheduledAt
                          ? new Date(schedule.scheduledAt).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          : 'Chưa có lịch'}
                      </p>
                    </div>
                  </div>

                  {/* Realtime Badges (OTP & SXD Supervision) */}
                  {(joinOtp || (schedule?.isLotteryApproved && sxdCount >= 0)) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {joinOtp && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-xs text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
                          <KeyRound className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                          <span>Mã vào sảnh: <strong>{joinOtp}</strong></span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(joinOtp)}
                            className="ml-1 rounded p-0.5 hover:bg-indigo-200/60 dark:hover:bg-indigo-800"
                            title="Sao chép mã vào sảnh"
                          >
                            {copiedCode === joinOtp ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-indigo-500" />
                            )}
                          </button>
                        </div>
                      )}

                      {schedule?.isLotteryApproved && (
                        <div className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${sxdCount > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Sở đang giám sát: <strong>{sxdCount}</strong></span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Context Guidance Box */}
                  <div className="rounded-lg bg-blue-50/60 p-2.5 text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                    <p className="font-semibold text-blue-950 dark:text-blue-100">📌 Hướng dẫn bước tiếp theo:</p>
                    <p className="mt-0.5 leading-relaxed">{nextActionHint(schedule, role, project.status)}</p>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Role / Phase Primary Action CTA */}
                    {isLive && (
                      <Button
                        variant="accent"
                        size="sm"
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/30"
                        onClick={() => {
                          persistProjectId(project.id)
                          navigate('lottery-live')
                        }}
                      >
                        <Radio className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                        Vào sảnh quay số
                      </Button>
                    )}

                    {phase === 'project_pending' && isDev && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="flex-1 border-dashed border-amber-300 bg-amber-50/60 text-amber-800 cursor-not-allowed dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                        title="Dự án phải được Sở Xây dựng thẩm định và phê duyệt trước khi lên lịch bốc thăm"
                      >
                        <Clock className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                        Chờ Sở duyệt dự án
                      </Button>
                    )}

                    {phase === 'project_pending' && isSxd && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        onClick={() => navigate('sxd-projects')}
                        title="Chuyển đến trang xét duyệt hồ sơ dự án của Sở Xây dựng"
                      >
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                        Duyệt hồ sơ dự án
                      </Button>
                    )}

                    {phase === 'ready_open_lobby' && isDev && (
                      <Button
                        variant="accent"
                        size="sm"
                        className="flex-1"
                        disabled={isActionBusy}
                        onClick={() =>
                          void handleAction('Mở sảnh chờ', project.id, () => lotteryApi.openLobby(project.id))
                        }
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Mở sảnh chờ ngay
                      </Button>
                    )}

                    {phase === 'not_scheduled' && isDev && (
                      <Button
                        variant="accent"
                        size="sm"
                        className="flex-1"
                        onClick={() => void openScheduleModal(project, schedule)}
                      >
                        <Calendar className="mr-1.5 h-3.5 w-3.5" />
                        Lên lịch bốc thăm
                      </Button>
                    )}

                    {phase === 'awaiting_approval' && isDev && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => void openScheduleModal(project, schedule)}
                      >
                        <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                        Sửa đề xuất lịch
                      </Button>
                    )}

                    {phase === 'awaiting_approval' && isSxd && (
                      <Button
                        variant="accent"
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isActionBusy}
                        onClick={() =>
                          void handleAction('Phê duyệt lịch', project.id, () => lotteryApi.approveSchedule(project.id))
                        }
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Phê duyệt lịch
                      </Button>
                    )}

                    {phase === 'finished' && isSxd && (
                      <Button
                        variant="accent"
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isActionBusy}
                        onClick={() =>
                          void handleAction('Công bố kết quả', project.id, () => lotteryApi.publishSession(project.id))
                        }
                      >
                        <Trophy className="mr-1.5 h-3.5 w-3.5" />
                        Công bố kết quả
                      </Button>
                    )}

                    {phase === 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700"
                        onClick={() => void handleDownloadMinutes(project.id, project.projectName)}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Tải biên bản
                      </Button>
                    )}

                    {/* Secondary Navigation to Detail */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        persistProjectId(project.id)
                        navigate('lottery-detail')
                      }}
                      title="Chi tiết phiên & Danh sách dự bị"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Dự án & Địa điểm</th>
                  <th className="px-4 py-3">Quy mô & Suất bốc</th>
                  <th className="px-4 py-3">Lịch mở sảnh và mã vào sảnh</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Hướng dẫn tiếp theo</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleRows.map(({ project, schedule }) => {
                  const phase = getLotteryPhase(schedule, project.status)
                  const isLive = phase === 'live' || phase === 'waiting_lobby'
                  const joinOtp = schedule?.joinCode
                  const isActionBusy = busyAction.startsWith(project.id)

                  return (
                    <tr key={project.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {project.projectName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {project.address || (project.district ? `${project.district}, ${project.province || 'Hà Nội'}` : 'Địa bàn đô thị')}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <span className="text-slate-500">Tổng căn: </span>
                          <strong>{project.availableUnits ?? '—'}</strong>
                        </div>
                        <div className="text-xs text-indigo-600 dark:text-indigo-400">
                          <span>Suất bốc: </span>
                          <strong>{schedule?.totalUnits ? `${schedule.totalUnits} căn` : 'Chưa cấu hình'}</strong>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {schedule?.scheduledAt
                            ? new Date(schedule.scheduledAt).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                            : 'Chưa có lịch'}
                        </div>
                        {joinOtp && (
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                            <span>Mã vào sảnh: <strong>{joinOtp}</strong></span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(joinOtp)}
                              className="p-0.5 hover:text-indigo-900"
                            >
                              {copiedCode === joinOtp ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <ModernStatusBadge phase={phase} />
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {nextActionHint(schedule, role, project.status)}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLive ? (
                            <Button
                              variant="accent"
                              size="sm"
                              className="bg-rose-600 hover:bg-rose-700 text-white"
                              onClick={() => {
                                persistProjectId(project.id)
                                navigate('lottery-live')
                              }}
                            >
                              <Radio className="mr-1 h-3 w-3" />
                              Quay số
                            </Button>
                          ) : phase === 'project_pending' && isDev ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="border-dashed border-amber-300 text-amber-800 cursor-not-allowed dark:border-amber-800 dark:text-amber-300"
                              title="Dự án chưa được Sở Xây dựng phê duyệt"
                            >
                              <Clock className="mr-1 h-3 w-3 text-amber-600" />
                              Chờ duyệt
                            </Button>
                          ) : phase === 'project_pending' && isSxd ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-800 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-700"
                              onClick={() => navigate('sxd-projects')}
                            >
                              Duyệt dự án
                            </Button>
                          ) : phase === 'not_scheduled' && isDev ? (
                            <Button
                              variant="accent"
                              size="sm"
                              onClick={() => void openScheduleModal(project, schedule)}
                            >
                              Lên lịch
                            </Button>
                          ) : phase === 'ready_open_lobby' && isDev ? (
                            <Button
                              variant="accent"
                              size="sm"
                              disabled={isActionBusy}
                              onClick={() =>
                                void handleAction('Mở sảnh', project.id, () => lotteryApi.openLobby(project.id))
                              }
                            >
                              Mở sảnh
                            </Button>
                          ) : phase === 'awaiting_approval' && isSxd ? (
                            <Button
                              variant="accent"
                              size="sm"
                              disabled={isActionBusy}
                              onClick={() =>
                                void handleAction('Duyệt', project.id, () => lotteryApi.approveSchedule(project.id))
                              }
                            >
                              Duyệt lịch
                            </Button>
                          ) : phase === 'published' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleDownloadMinutes(project.id, project.projectName)}
                            >
                              Biên bản
                            </Button>
                          ) : null}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              persistProjectId(project.id)
                              navigate('lottery-detail')
                            }}
                          >
                            Chi tiết
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Schedule / Edit Schedule Modal */}
      <Modal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={`Thiết lập lịch bốc thăm: ${selectedProject?.name ?? ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <FormField label="Ngày & giờ mở sảnh bốc thăm trực tuyến *" htmlFor="lotteryDate">
            <Input
              id="lotteryDate"
              type="datetime-local"
              value={schedForm.lotteryDate}
              onChange={(e) => setSchedForm((f) => ({ ...f, lotteryDate: e.target.value }))}
            />
          </FormField>

          <FormField label="Địa điểm / Đường link phòng trực tuyến *" htmlFor="lotteryLocation">
            <Input
              id="lotteryLocation"
              value={schedForm.lotteryLocation}
              placeholder="VD: Hội trường trực tuyến và Trung tâm hành chính công"
              onChange={(e) => setSchedForm((f) => ({ ...f, lotteryLocation: e.target.value }))}
            />
          </FormField>

          <FormField label="Số căn hộ đưa vào bốc thăm *" htmlFor="totalUnits">
            <Input
              id="totalUnits"
              type="number"
              min={1}
              max={schedFund.available > 0 ? schedFund.available : undefined}
              value={schedForm.totalUnits}
              onChange={(e) => setSchedForm((f) => ({ ...f, totalUnits: e.target.value }))}
              placeholder={`Tối đa ${schedFund.available} căn`}
            />
          </FormField>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
            <p>
              Căn ưu tiên: <strong>{schedFund.priorityCount}</strong>
              {' · '}
              Căn thường: <strong>{schedFund.standardCount}</strong>
              {' · '}
              Tổng căn khả dụng của dự án: <strong>{schedFund.available}</strong>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Quỹ căn mở bốc thăm tối đa là <strong>{schedFund.available} căn</strong> theo số lượng căn còn lại của dự án.
            </p>
          </div>

          <FormField label="Ghi chú thêm về phiên bốc thăm" htmlFor="notes">
            <Input
              id="notes"
              value={schedForm.notes}
              placeholder="Ghi chú về thành phần hội đồng giám sát, livestream..."
              onChange={(e) => setSchedForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </FormField>

          {schedModalError && <Alert variant="error">{schedModalError}</Alert>}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)} disabled={schedSaving}>
              Hủy bỏ
            </Button>
            <Button variant="accent" onClick={() => void handleSaveSchedule()} disabled={schedSaving}>
              {schedSaving ? 'Đang gửi…' : 'Xác nhận & Gửi đề xuất'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Regulations & Workflow Guide Modal */}
      <Modal
        open={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        title="Quy trình bốc thăm quyền mua nhà ở xã hội (Nghị định 100/2024/NĐ-CP)"
        description="Sơ đồ quy trình tổ chức bốc thăm và quản lý danh sách dự bị"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs dark:border-blue-900 dark:bg-blue-950/40">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold">1</div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Bước 1: Chốt danh sách hồ sơ hợp lệ vượt số căn</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Khi tổng số hồ sơ đạt chuẩn (đã phê duyệt) vượt quá tổng số căn hộ mở bán của dự án, hệ thống chuyển sang giai đoạn bốc thăm công khai bắt buộc.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white font-bold">2</div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Bước 2: Chủ đầu tư đề xuất lịch bốc thăm</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Căn ưu tiên đã cấp cho hồ sơ điểm cao nhất. Khi số hồ sơ hợp lệ còn lại vượt quỹ căn thường, chủ đầu tư đề xuất ngày giờ bốc thăm công khai.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/40">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white font-bold">3</div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Bước 3: Sở Xây dựng thẩm tra và phê duyệt lịch</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Sở Xây dựng kiểm tra phương án bốc thăm. Khi phê duyệt, hệ thống tự động sinh mã vào sảnh 6 số để gửi đến người dân đủ điều kiện.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs dark:border-indigo-900 dark:bg-indigo-950/40">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold">4</div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Bước 4: Mở sảnh chờ và giám sát trực tuyến</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Chủ đầu tư mở sảnh chờ. Người dân đăng nhập bằng mã vào sảnh. Cán bộ Sở Xây dựng vào trực tuyến để giám sát (cần ít nhất một người).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs dark:border-rose-900 dark:bg-rose-950/40">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold">5</div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Bước 5: Bắt đầu quay số ngẫu nhiên</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Quay số ngẫu nhiên công khai. Hồ sơ không trúng được xếp danh sách chờ theo thứ hạng (thứ 1, 2, 3…), không hủy hồ sơ.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs dark:border-emerald-900 dark:bg-emerald-950/40">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold">6</div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Bước 6: Công bố kết quả và quản lý danh sách dự bị</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Công bố kết quả. Không trúng xếp danh sách dự bị thứ 1, 2, 3… Khi căn trả lại (hủy hợp đồng / không nộp cọc), đôn người đứng đầu — hạn xác nhận {WAITLIST_CONFIRM_HOURS_DEFAULT} giờ, không mở lại đợt bốc thăm.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="accent" onClick={() => setGuideModalOpen(false)}>
              Đã hiểu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export function LotteryCreatePage() {
  return (
    <div className="space-y-4">
      <PageHeader routeId="lottery-create" />
      <LotteryStaffTabs current="sessions" />
      <PageCard className="p-6">
        <Alert variant="info">
          <p className="font-semibold">Lên lịch bốc thăm theo dự án</p>
          <p className="mt-1 text-sm">
            Mở Trung tâm bốc thăm rồi bấm <strong>Lên lịch bốc thăm</strong>, hoặc vào chi tiết dự án và bấm nút <strong>Bốc thăm</strong>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="accent" onClick={() => navigate('lottery-sessions')}>
              Trung tâm bốc thăm
            </Button>
            <Button variant="outline" onClick={() => navigate('projects')}>
              Danh sách dự án
            </Button>
          </div>
        </Alert>
      </PageCard>
    </div>
  )
}

export function LotteryDetailPage() {
  const [projectId, setProjectId] = useState<string>(() => loadProjectIdFromStorage())
  const [projectList, setProjectList] = useState<HousingProjectSummaryDto[]>([])
  const role = getRole()
  const isDev = role === 'Housing Developer'
  const isSxd = role === 'Department Of Construction'
  const [schedule, setSchedule] = useState<LotteryScheduleDto | null>(null)
  const [eligible, setEligible] = useState<LotteryEligibleEntry[]>([])
  const [result, setResult] = useState<LotteryResultDto | null>(null)
  const [waitlist, setWaitlist] = useState<WaitlistEntryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hubError, setHubError] = useState('')
  const [hubConnected, setHubConnected] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [schedForm, setSchedForm] = useState({
    lotteryDate: '',
    lotteryLocation: 'Hội trường trực tuyến & Cổng dịch vụ công',
    totalUnits: '0',
  })
  const [schedFund, setSchedFund] = useState({ priorityCount: 0, standardCount: 0, available: 0 })
  const [schedModalError, setSchedModalError] = useState('')
  const connectionRef = useRef<import('@microsoft/signalr').HubConnection | null>(null)

  // Tải danh sách tất cả các dự án hợp lệ để hỗ trợ chuyển đổi nhanh
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await housingProjectsApi.list({ pageIndex: 1, pageSize: 50 })
        const raw = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
        const list = (raw.items ?? raw.Items ?? []) as HousingProjectSummaryDto[]
        const valid = list.filter((p) => !/REJECTED|TỪ CHỐI/.test(String(p.status ?? '').toUpperCase()))
        if (!cancelled) {
          setProjectList(valid)
          if (!projectId && valid.length > 0) {
            setProjectId(valid[0].id)
            persistProjectId(valid[0].id)
          }
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const reload = async (opts?: { quiet?: boolean }) => {
    if (!projectId) return
    if (!opts?.quiet) {
      setLoading(true)
      setError('')
    }
    try {
      const sched = parseLotterySchedule(await lotteryApi.getSchedule(projectId))
      setSchedule(sched)
      try {
        setEligible(parseEligibleList(await lotteryApi.getEligibleParticipants(projectId)))
      } catch {
        setEligible([])
      }
      try {
        const res = parseLotteryResult(await lotteryApi.getResult(projectId))
        if (res) setResult(res)
      } catch {
        setResult(null)
      }
      try {
        const wl = await lotteryApi.getWaitlist(projectId)
        setWaitlist(parseWaitlist(wl))
      } catch {
        setWaitlist([])
      }
      try {
        const projectData = await housingProjectsApi.getById(projectId)
        const dataAvailable = Number((projectData as Record<string, unknown>)?.availableUnits ?? 0)
        const apts = parseApartments(projectData).filter((a) => String(a.status).toUpperCase() === 'AVAILABLE')
        const fund = splitAvailableUnits(apts)
        const maxLimit = dataAvailable > 0 ? dataAvailable : (apts.length > 0 ? apts.length : Number(sched?.totalUnits || 0))
        const available = maxLimit > 0 ? maxLimit : apts.length
        const priorityCount = Math.min(fund.priorityCount, available)
        const standardCount = Math.max(0, available - priorityCount)

        setSchedFund({
          priorityCount,
          standardCount,
          available,
        })
      } catch {
        const fallback = Number(sched?.availableUnits ?? sched?.totalUnits) || 0
        setSchedFund({ priorityCount: 0, standardCount: fallback, available: fallback })
      }
    } catch (err) {
      if (!opts?.quiet) setError(formatError(err))
    } finally {
      if (!opts?.quiet) setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [projectId])

  // Staff: join SignalR để SXD được đếm online + CĐT nhận realtime sxdOnlineCount
  useEffect(() => {
    if (!projectId || (!isDev && !isSxd)) return
    if (!schedule?.isLotteryApproved) return

    let cancelled = false
    void (async () => {
      try {
        await stopLotteryHub(connectionRef.current)
        const conn = await connectLotteryHub(projectId, undefined, {
          onSxdSupervisorCount: (n) => {
            setSchedule((prev) => (prev ? { ...prev, sxdOnlineCount: n } : prev))
          },
          onStatus: (s) => {
            setSchedule((prev) => (prev ? { ...prev, sessionStatus: s } : prev))
          },
        })
        if (cancelled) {
          await stopLotteryHub(conn)
          return
        }
        connectionRef.current = conn
        setHubConnected(true)
        setHubError('')
        // Đồng bộ lại count từ API sau khi join
        await reload({ quiet: true })
      } catch (err) {
        if (!cancelled) {
          setHubConnected(false)
          setHubError(formatError(err))
        }
      }
    })()

    const poll = window.setInterval(() => {
      void reload({ quiet: true })
    }, 4000)

    return () => {
      cancelled = true
      window.clearInterval(poll)
      void stopLotteryHub(connectionRef.current)
      connectionRef.current = null
      setHubConnected(false)
    }
  }, [projectId, isDev, isSxd, schedule?.isLotteryApproved])

  const action = async (label: string, fn: () => Promise<unknown>) => {
    if (!projectId || busy) return
    setBusy(label)
    setMsg(null)
    try {
      await fn()
      await reload()
      setMsg({ type: 'success', text: `${label} thành công.` })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy('')
    }
  }

  if (!projectId) {
    return (
      <div className="space-y-4">
        <PageHeader routeId="lottery-detail" />
        <LotteryStaffTabs current="steps" />
        <PageCard className="p-6">
          <Alert variant="error">Không tìm thấy dự án. Vui lòng chọn lại từ trang Bốc thăm.</Alert>
          <Button className="mt-3" variant="outline" onClick={() => navigate('lottery-sessions')}>
            ← Danh sách dự án bốc thăm
          </Button>
        </PageCard>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader routeId="lottery-detail" />
        <LotteryStaffTabs current="steps" />
        <PageCard className="p-6"><p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p></PageCard>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader routeId="lottery-detail" />
        <LotteryStaffTabs current="steps" />
        <PageCard className="p-6"><Alert variant="error">{error}</Alert></PageCard>
      </div>
    )
  }

  const phase = getLotteryPhase(schedule)
  const stepIdx = phaseStepIndex(phase)
  const sxdOnline = schedule?.sxdOnlineCount ?? 0
  const effectiveTotalUnits = Number(schedFund.available || schedule?.totalUnits || result?.totalUnits || 2)
  const rawWinners = result?.winners ?? []
  const winners = rawWinners.slice(0, effectiveTotalUnits > 0 ? effectiveTotalUnits : 2)
  const totalUnits = effectiveTotalUnits

  const computeDisplayWaitlist = (): WaitlistEntryDto[] => {
    const map = new Map<string, WaitlistEntryDto>()
    const winnerIds = new Set(winners.map((w) => w.applicationId))

    // 1. Nguồn từ API waitlist
    waitlist.forEach((w) => {
      if (!winnerIds.has(w.applicationId)) {
        map.set(w.applicationId || w.citizenId, w)
      }
    })

    // 2. Nguồn từ các hồ sơ trong rawWinners vượt quá số căn
    rawWinners.slice(effectiveTotalUnits).forEach((w) => {
      const key = w.applicationId || w.citizenId
      if (!winnerIds.has(w.applicationId) && !map.has(key)) {
        map.set(key, {
          applicationId: w.applicationId,
          applicantName: w.applicantName,
          citizenId: w.citizenId,
          waitlistRank: map.size + 1,
          status: 'WAITLIST',
        })
      }
    })

      // 3. Nguồn từ losers trong kết quả
      ; (result?.losers ?? []).forEach((w) => {
        const key = w.applicationId || w.citizenId
        if (!winnerIds.has(w.applicationId) && !map.has(key)) {
          map.set(key, {
            applicationId: w.applicationId,
            applicantName: w.applicantName,
            citizenId: w.citizenId,
            waitlistRank: map.size + 1,
            status: 'WAITLIST',
          })
        }
      })

    // 4. Nguồn từ eligible chưa trúng
    eligible.forEach((e) => {
      const key = e.applicationId || e.citizenId
      if (!winnerIds.has(e.applicationId) && !map.has(key)) {
        map.set(key, {
          applicationId: e.applicationId,
          applicantName: e.applicantName,
          citizenId: e.citizenId,
          score: e.priorityScore,
          waitlistRank: map.size + 1,
          status: 'WAITLIST',
        })
      }
    })

    const arr = Array.from(map.values())
    return arr.map((item, idx) => ({
      ...item,
      waitlistRank: idx + 1,
    }))
  }

  const displayWaitlist = computeDisplayWaitlist()

  const openScheduleModal = () => {
    const next = new Date(Date.now() + 86400000)
    const local = new Date(next.getTime() - next.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setSchedModalError('')
    setSchedForm({
      lotteryDate: local,
      lotteryLocation: schedule?.lotteryLocation || 'Hội trường trực tuyến & Cổng dịch vụ công',
      totalUnits: String(schedFund.available),
    })
    setScheduleOpen(true)
  }

  const saveDetailSchedule = async () => {
    if (!projectId || busy) return
    setSchedModalError('')
    if (!schedForm.lotteryDate || !schedForm.lotteryLocation.trim()) {
      setSchedModalError('Vui lòng nhập đủ ngày giờ và địa điểm.')
      return
    }
    const parsed = new Date(schedForm.lotteryDate)
    if (Number.isNaN(parsed.getTime())) {
      setSchedModalError('Ngày giờ không hợp lệ.')
      return
    }
    if (parsed.getTime() < Date.now() - 60_000) {
      setSchedModalError('Thời gian bốc thăm phải ở tương lai.')
      return
    }
    const numUnits = Number(schedForm.totalUnits)
    if (!numUnits || numUnits <= 0) {
      setSchedModalError('Số căn hộ bốc thăm phải lớn hơn 0.')
      return
    }
    if (schedFund.available > 0 && numUnits > schedFund.available) {
      setSchedModalError(`Số căn mở bốc thăm không được vượt số căn còn lại của dự án (${schedFund.available} căn).`)
      return
    }
    setBusy('Lên lịch')
    try {
      await lotteryApi.schedule(projectId, {
        lotteryDate: parsed.toISOString(),
        lotteryLocation: schedForm.lotteryLocation.trim(),
        lotteryType: 'ONLINE',
        totalUnits: numUnits,
      })
      setScheduleOpen(false)
      setMsg({ type: 'success', text: 'Lên lịch thành công.' })
      await reload()
    } catch (err) {
      setSchedModalError(formatError(err))
    } finally {
      setBusy('')
    }
  }

  const downloadMinutes = () => {
    const token = sessionStorage.getItem('accessToken')
    void (async () => {
      try {
        const res = await fetch(lotteryApi.minutesUrl(projectId), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error(await res.text())
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `BienBan_${projectId}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } catch (e) {
        setMsg({ type: 'error', text: formatError(e) })
      }
    })()
  }

  return (
    <div className="space-y-4">
      <PageHeader routeId="lottery-detail" />
      <LotteryStaffTabs current="steps" />
      <PageCard className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <Button variant="ghost" size="sm" onClick={() => navigate('lottery-sessions')}>
            ← Danh sách dự án
          </Button>

          {projectList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                🏢 Dự án đang thao tác:
              </span>
              <select
                value={projectId}
                onChange={(e) => {
                  const newId = e.target.value
                  setProjectId(newId)
                  persistProjectId(newId)
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-indigo-900 shadow-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-200"
              >
                {projectList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName} ({p.id.slice(0, 8).toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{schedule?.projectName ?? 'Dự án'}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              <Calendar className="mr-1 inline h-4 w-4" />
              {schedule?.scheduledAt
                ? `Lịch: ${new Date(schedule.scheduledAt).toLocaleString('vi-VN')}`
                : 'Chưa có lịch'}
              {totalUnits ? ` · Căn: ${totalUnits}` : ''}
            </p>
          </div>
          <Badge variant={phase === 'live' ? 'warning' : phase === 'published' || phase === 'finished' ? 'success' : 'default'}>
            {phaseChipLabel(phase)}
          </Badge>
        </div>

        {/* Stepper — người chấm nhìn 1 mạch rõ ràng */}
        <ol className="grid gap-2 sm:grid-cols-7">
          {LOTTERY_PHASE_STEPS.map((s, i) => {
            const done = i < stepIdx
            const current = i === stepIdx
            return (
              <li
                key={s.id}
                className={`rounded-lg border px-2 py-2 text-center text-[11px] font-semibold leading-tight ${current
                  ? 'border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                  : done
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-slate-200 text-slate-400 dark:border-slate-700'
                  }`}
              >
                {s.label}
              </li>
            )
          })}
        </ol>

        {hubError && (
          <Alert variant="error">
            Không thể kết nối sảnh trực tuyến: {hubError}. Vui lòng kiểm tra lại mạng hoặc tải lại trang.
          </Alert>
        )}
        {schedule?.isLotteryApproved && !hubError && (
          <Alert variant={hubConnected ? 'success' : 'info'}>
            {hubConnected
              ? `Đã kết nối trực tuyến · Sở đang giám sát: ${sxdOnline}${isSxd ? ' (bạn đang giám sát — giữ trang này mở)' : ''}`
              : 'Đang kết nối sảnh trực tuyến…'}
          </Alert>
        )}

        {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}

        {/* ── CĐT: chỉ nút hợp lệ theo phase ── */}
        {isDev && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác Chủ đầu tư</p>

            {phase === 'not_scheduled' && (
              <>
                <Alert variant="info">
                  Chỉ đề xuất lịch <strong>sau khi chủ đầu tư chốt vượt số căn</strong>. Nhập ngày giờ trực tuyến cụ thể;
                  Sở phê duyệt rồi hệ thống mới thông báo cho người dân.
                </Alert>
                <Button variant="accent" disabled={!!busy} onClick={openScheduleModal}>
                  <Calendar className="mr-1.5 h-4 w-4" /> Đề xuất lịch bốc thăm
                </Button>
              </>
            )}

            {phase === 'awaiting_approval' && (
              <>
                <Alert variant="warning">
                  Đã đề xuất lịch — đang chờ <strong>Sở phê duyệt</strong>. Có thể chỉnh lại trước khi Sở duyệt.
                </Alert>
                <Button variant="outline" disabled={!!busy} onClick={openScheduleModal}>
                  <Calendar className="mr-1.5 h-4 w-4" /> Sửa đề xuất lịch
                </Button>
              </>
            )}

            {phase === 'ready_open_lobby' && (
              <>
                <Alert variant="info">
                  Sở đã duyệt. Bước tiếp theo: <strong>Mở sảnh chờ</strong> để người dân vào bằng mã vào sảnh.
                  {schedule?.joinCode ? <> Mã vào sảnh: <strong>{schedule.joinCode}</strong></> : null}
                </Alert>
                <div className="flex flex-wrap gap-2">
                  <Button variant="accent" disabled={!!busy} onClick={() => action('Mở sảnh', () => lotteryApi.openLobby(projectId))}>
                    Mở sảnh chờ
                  </Button>
                  <Button variant="outline" onClick={() => navigate('lottery-live')}>Xem màn giám sát</Button>
                </div>
              </>
            )}

            {phase === 'waiting_lobby' && (
              <>
                <Alert variant={sxdOnline < 1 ? 'warning' : 'success'}>
                  {sxdOnline < 1
                    ? 'Sảnh đã mở. Cần Sở vào trang này (hoặc màn quay số) để có ít nhất một cán bộ giám sát trước khi bắt đầu quay số (khoản 2 Điều 36 Nghị định 100/2024).'
                    : `Sở đang giám sát (${sxdOnline}). Có thể bắt đầu quay số.`}
                  {schedule?.joinCode ? <> · Mã người dân: <strong>{schedule.joinCode}</strong></> : null}
                </Alert>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="accent"
                    disabled={!!busy || sxdOnline < 1}
                    onClick={() => action('Bắt đầu quay số', () => lotteryApi.startLive(projectId))}
                  >
                    <Play className="mr-1.5 h-4 w-4" /> Bắt đầu quay số
                  </Button>
                  <Button variant="outline" onClick={() => navigate('lottery-live')}>Màn quay số trực tiếp</Button>
                </div>
              </>
            )}

            {phase === 'live' && (
              <>
                <Alert variant="warning">
                  Phiên đang quay số — người dân theo dõi trên ứng dụng. Kết thúc khi đủ căn / hết thời gian.
                  {sxdOnline < 1 ? ' Cảnh báo: Sở chưa giám sát — không nên kết thúc phiên.' : ` Sở đang giám sát: ${sxdOnline}.`}
                </Alert>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate('lottery-live')}
                  >
                    🎯 Mở sảnh quay số
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => action('Tạm dừng', () => lotteryApi.pauseSession(projectId))}
                  >
                    ⏸ Tạm dừng
                  </Button>
                  <Button
                    variant="accent"
                    disabled={!!busy || sxdOnline < 1}
                    onClick={() => action('Kết thúc phiên', () => lotteryApi.finishSession(projectId))}
                  >
                    Kết thúc phiên
                  </Button>
                </div>
              </>
            )}

            {phase === 'paused' && (
              <>
                <Alert variant="info">
                  Phiên đang tạm dừng — bấm <strong>Tiếp tục quay số</strong> để bốc tiếp.
                </Alert>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate('lottery-live')}
                  >
                    🎯 Mở sảnh quay số
                  </Button>
                  <Button
                    variant="accent"
                    disabled={!!busy || sxdOnline < 1}
                    onClick={() => action('Tiếp tục quay số', () => lotteryApi.resumeSession(projectId))}
                  >
                    ▶ Tiếp tục quay số
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!!busy || sxdOnline < 1}
                    onClick={() => action('Kết thúc phiên', () => lotteryApi.finishSession(projectId))}
                  >
                    Kết thúc phiên
                  </Button>
                </div>
              </>
            )}

            {phase === 'finished' && (
              <Alert variant="info">
                Phiên đã kết thúc. Chờ <strong>Sở Xây dựng công bố</strong> kết quả / biên bản. Chủ đầu tư không công bố được.
              </Alert>
            )}

            {phase === 'published' && (
              <>
                <Alert variant="success">Đã công bố. Có thể tải biên bản.</Alert>
                <div className="flex flex-wrap gap-2">
                  <Button variant="accent" onClick={downloadMinutes}>Tải biên bản</Button>
                  <Button variant="outline" onClick={() => navigate('projects')}>Về dự án</Button>
                </div>
              </>
            )}

            {/* Batch Đ38.2 đã khóa khỏi UI demo — chỉ dùng luồng Live sau khi Sở duyệt lịch. */}
          </div>
        )}

        {/* ── SXD: phê duyệt → giám sát → công bố ── */}
        {isSxd && (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              Thao tác Sở Xây dựng
            </p>

            {phase === 'not_scheduled' && (
              <Alert variant="info">Chưa có lịch — chờ chủ đầu tư đề xuất lịch trực tuyến sau khi chốt vượt số căn.</Alert>
            )}

            {phase === 'awaiting_approval' && (
              <>
                <Alert variant="warning">Có lịch chờ phê duyệt. Sau khi duyệt, hệ thống sinh mã vào sảnh.</Alert>
                <Button variant="accent" disabled={!!busy} onClick={() => action('Phê duyệt lịch', () => lotteryApi.approveSchedule(projectId))}>
                  <Send className="mr-1.5 h-4 w-4" /> Phê duyệt lịch bốc thăm
                </Button>
              </>
            )}

            {(phase === 'ready_open_lobby' || phase === 'waiting_lobby' || phase === 'live') && (
              <>
                <Alert variant={hubConnected ? 'success' : 'warning'}>
                  {hubConnected
                    ? `Bạn đang giám sát trực tuyến (Sở đang kết nối: ${sxdOnline}). Giữ trang này hoặc mở trường quay — đừng đóng tab.`
                    : 'Chưa kết nối sảnh trực tuyến — Vui lòng tải lại trang hoặc mở «Màn quay số trực tiếp». Không giám sát thì chủ đầu tư không bắt đầu bốc thăm được.'}
                  {schedule?.joinCode ? <> · Mã vào sảnh người dân: <strong>{schedule.joinCode}</strong></> : null}
                </Alert>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => navigate('lottery-live')}>Màn giám sát trực tiếp</Button>
                </div>
              </>
            )}

            {phase === 'finished' && (
              <>
                <Alert variant="info">
                  Phiên bốc thăm đã kết thúc — chỉ Sở Xây dựng có thẩm quyền <strong>Công bố</strong> kết quả / biên bản.
                </Alert>
                <div className="flex flex-wrap gap-2">
                  <Button variant="accent" disabled={!!busy} onClick={() => action('Công bố', () => lotteryApi.publishSession(projectId))}>
                    Công bố kết quả
                  </Button>
                  <Button variant="outline" onClick={() => navigate('lottery-live')}>Xem nhật ký quay số</Button>
                </div>
              </>
            )}

            {phase === 'published' && (
              <>
                <Alert variant="success">Đã công bố.</Alert>
                <Button variant="accent" onClick={downloadMinutes}>Tải biên bản</Button>
              </>
            )}
          </div>
        )}

        {result && (
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Tổng tham gia" value={result.allEntries?.length ?? eligible.length ?? (winners.length + displayWaitlist.length)} icon={<Users className="h-4 w-4" />} />
            <Stat label="Trúng quyền mua" value={winners.length} tone="success" icon={<Trophy className="h-4 w-4" />} />
            <Stat label="Danh sách dự bị" value={displayWaitlist.length} tone="warning" icon={<Clock className="h-4 w-4" />} />
            {totalUnits > 0 && <Stat label="Quỹ căn" value={totalUnits} />}
          </div>
        )}

        {result && winners.length > 0 && (
          <div>
            <h3 className="mb-3 font-semibold flex items-center gap-2">
              🏆 Danh sách trúng ({winners.length})
              <span className="text-xs font-normal text-slate-500">({totalUnits} căn hộ theo quyết định phê duyệt)</span>
            </h3>
            <div className="grid gap-2">
              {winners.map((w, i) => {
                const isPriority = w.lotteryResult === 'PRIORITY_WON' || (w.priorityGroup && w.priorityGroup !== 'None') || (i === 0 && schedFund.priorityCount > 0)
                return (
                  <div key={w.applicationId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : `#${i + 1}`}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{w.applicantName}</p>
                          {isPriority ? (
                            <Badge variant="warning" className="text-[10px]">⭐ Cấp ưu tiên</Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">🎲 Bốc thăm trúng</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          CCCD: {w.citizenId} {w.slotCode ? `· Suất căn: ${w.slotCode}` : `· Căn hộ #${i + 1}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="success">Trúng #{i + 1}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Danh sách dự bị (Waitlist) */}
        {displayWaitlist.length > 0 && (
          <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-indigo-950 dark:text-indigo-100">
                  📋 Danh sách dự bị ({displayWaitlist.length} ứng viên)
                </h3>
                <p className="text-xs text-indigo-800 dark:text-indigo-300">
                  Không trúng không bị hủy. Xếp hạng #1, #2, #3… Khi căn trả lại do hủy hợp đồng hoặc không nộp cọc, hệ thống đôn người đứng đầu — hạn xác nhận {WAITLIST_CONFIRM_HOURS_DEFAULT} giờ, không mở lại đợt bốc thăm.
                </p>
              </div>

              {(isDev || isSxd) && (
                <Button
                  variant="accent"
                  size="sm"
                  disabled={!!busy || displayWaitlist.length === 0}
                  onClick={() => {
                    void action('Đôn ứng viên danh sách dự bị', () => lotteryApi.promoteWaitlist(projectId))
                  }}
                >
                  <ArrowUpCircle className="mr-1.5 h-4 w-4" />
                  Đôn thủ công người #1 (Hệ thống tự động đôn khi có người trả căn)
                </Button>
              )}
            </div>

            <div className="grid gap-2 pt-2">
              {displayWaitlist.map((w, i) => (
                <div
                  key={w.applicationId || i}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-white p-3 text-sm shadow-xs dark:border-indigo-900 dark:bg-slate-900/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                      #{w.waitlistRank || i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {w.applicantName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        CCCD: {w.citizenId} {w.phoneNumber ? `· SĐT: ${w.phoneNumber}` : ''} {w.apartmentTypeName ? `· Loại căn: ${w.apartmentTypeName}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {w.score != null && (
                      <span className="text-xs text-slate-500">
                        Điểm: <strong>{w.score}</strong>
                      </span>
                    )}
                    {w.depositDeadline && (
                      <span className="text-xs text-amber-600 font-medium">
                        Hạn xác nhận: {new Date(w.depositDeadline).toLocaleString('vi-VN')}
                      </span>
                    )}
                    <Badge variant={w.status === 'PROMOTED' ? 'success' : 'warning'}>
                      {w.status === 'PROMOTED' ? 'Đã đôn suất' : `Dự bị #${w.waitlistRank || i + 1}`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {!result && eligible.length > 0 && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Danh sách đủ điều kiện ({eligible.length})</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động tổng hợp từ hồ sơ Đã duyệt / Duyệt tự động (quá hạn thẩm định) — không cần xác nhận tay.
              </p>
            </div>
            <div className="grid gap-2">
              {eligible.map((e) => (
                <div key={e.applicationId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div>
                    <p className="font-medium">{e.applicantName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">CCCD: {e.citizenId}</p>
                  </div>
                  <Badge variant="secondary">Đang chờ</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </PageCard>

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Thiết lập phiên bốc thăm trực tuyến"
        size="lg"
      >
        <div className="space-y-3">
          <FormField label="Ngày/giờ mở sảnh *" htmlFor="lotteryDate">
            <Input
              id="lotteryDate"
              type="datetime-local"
              value={schedForm.lotteryDate}
              onChange={(e) => setSchedForm((f) => ({ ...f, lotteryDate: e.target.value }))}
            />
          </FormField>
          <FormField label="Địa điểm / link *" htmlFor="lotteryLocation">
            <Input
              id="lotteryLocation"
              value={schedForm.lotteryLocation}
              onChange={(e) => setSchedForm((f) => ({ ...f, lotteryLocation: e.target.value }))}
            />
          </FormField>
          <FormField label="Số căn hộ đưa vào bốc thăm *" htmlFor="detailTotalUnits">
            <Input
              id="detailTotalUnits"
              type="number"
              min={1}
              max={schedFund.available > 0 ? schedFund.available : undefined}
              value={schedForm.totalUnits}
              onChange={(e) => setSchedForm((f) => ({ ...f, totalUnits: e.target.value }))}
              placeholder={`Tối đa ${schedFund.available} căn`}
            />
          </FormField>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
            <p>
              Căn ưu tiên: <strong>{schedFund.priorityCount}</strong>
              {' · '}Căn thường: <strong>{schedFund.standardCount}</strong>
              {' · '}Tổng căn khả dụng của dự án: <strong>{schedFund.available}</strong>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Quỹ căn mở bốc thăm tối đa là <strong>{schedFund.available} căn</strong> theo số lượng căn còn lại của dự án.
            </p>
          </div>
          {schedModalError && <Alert variant="error">{schedModalError}</Alert>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={!!busy}>Huỷ</Button>
            <Button
              variant="accent"
              disabled={!!busy}
              onClick={() => void saveDetailSchedule()}
            >
              {busy === 'Lên lịch' ? 'Đang gửi…' : 'Lưu lịch bốc thăm'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Stat({ label, value, tone, icon }: { label: string; value: number; tone?: 'success' | 'danger' | 'warning'; icon?: React.ReactNode }) {
  const toneClass = tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-rose-600' : tone === 'warning' ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 flex items-center gap-2 text-2xl font-bold ${toneClass}`}>{icon}{value}</p>
    </div>
  )
}

export function LotteryLobbyPage() {
  const projectId = loadProjectIdFromStorage()
  const role = getRole()
  const isApplicant = role === 'Applicant'
  const [otp, setOtp] = useState('')
  const [joined, setJoined] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const connectionRef = useRef<import('@microsoft/signalr').HubConnection | null>(null)

  useEffect(() => {
    return () => {
      void stopLotteryHub(connectionRef.current)
      connectionRef.current = null
    }
  }, [])

  const join = async () => {
    if (!projectId || busy) return
    setBusy(true)
    setMsg(null)
    try {
      if (isApplicant) {
        if (otp.length < 6) {
          setMsg({ type: 'error', text: 'Vui lòng nhập đủ 6 chữ số mã vào sảnh.' })
          setBusy(false)
          return
        }
        await lotteryApi.verifyOtp(projectId, otp)
        sessionStorage.setItem(`lotteryLobbyOtp:${projectId}`, otp)
      }
      await stopLotteryHub(connectionRef.current)
      await connectLotteryHub(projectId, isApplicant ? otp : undefined, {})
      connectionRef.current = null
      setJoined(true)
      setMsg({ type: 'success', text: 'Xác thực thành công. Đang chuyển vào trường quay…' })
      setTimeout(() => navigate('lottery-live'), 400)
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy(false)
    }
  }

  if (!projectId) {
    return (
      <div>
        <PageHeader routeId="lottery-lobby" />
        <PageCard className="p-6">
          <Alert variant="info">Vui lòng chọn dự án bốc thăm trước.</Alert>
          <Button className="mt-3" variant="outline" onClick={() => navigate(isApplicant ? 'my-lottery' : 'lottery-sessions')}>
            ← {isApplicant ? 'Danh sách bốc thăm của tôi' : 'Danh sách dự án bốc thăm'}
          </Button>
        </PageCard>
      </div>
    )
  }

  return (
    <div>
      <PageHeader routeId="lottery-lobby" />
      <PageCard className="space-y-4 p-6">
        <Alert variant="info">
          Nhập <strong>mã vào sảnh gồm 6 chữ số</strong> từ thông báo sau khi Sở Xây dựng phê duyệt lịch để vào theo dõi.
          Cán bộ Chủ đầu tư / Sở Xây dựng vào trực tiếp không cần mã.
          Người dân tham gia theo dõi tiến trình quay số trực tiếp.
        </Alert>
        {msg && (
          <Alert variant={msg.type === 'error' ? 'error' : msg.type === 'info' ? 'info' : 'success'}>
            {msg.text}
          </Alert>
        )}
        {!joined && (
          <div className="flex flex-wrap items-end gap-3">
            {isApplicant && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Mã vào sảnh 6 chữ số (xem trong thông báo hoặc phiếu hẹn)
                </label>
                <input
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-lg tracking-widest text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  value={otp}
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                />
              </div>
            )}
            <Button variant="accent" disabled={busy || (isApplicant && otp.length < 6)} onClick={() => void join()}>
              {busy ? 'Đang xác thực…' : isApplicant ? 'Xác nhận và vào trường quay' : 'Vào sảnh giám sát'}
            </Button>
          </div>
        )}
        {joined && (
          <div className="space-y-3">
            <Alert variant="success">
              Xác thực thành công. Đang kết nối trực tiếp với trường quay…
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button variant="accent" onClick={() => navigate('lottery-live')}>
                🎯 Vào trường quay — theo dõi trực tiếp
              </Button>
              <Button variant="outline" onClick={() => {
                setJoined(false)
                setOtp('')
              }}>
                Xác thực lại
              </Button>
            </div>
          </div>
        )}
      </PageCard>
    </div>
  )
}

// Re-export new component-based pages from the lottery components folder
export { LotteryLivePage } from '@/components/lottery/LotteryLivePage'
