import { useEffect, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  housingProjectStatusesApi,
  type PriorityGroupPointItemDto,
  type PriorityPointsTableDto,
} from '@/api/housing-project-statuses'
import { adminApi } from '@/api/admin'
import { issueReportsApi } from '@/api/issue-reports'
import { formatError } from '@/lib/format-error'
import { formatPolicyValue, labelProjectStatus, POLICY_META_VI, policyTitle } from '@/lib/labels'


interface ProjectStatus {
  id: string
  statusName?: string
  statusCode?: string
  description?: string
  colorCode?: string
}

interface PolicyConfig {
  policyName: string
  policyValue: string
  description?: string
  unit?: string
  updatedAt?: string
}

/**
 * Phải trùng khóa với PolicyKeys ở backend, nếu không thì admin sửa mà rule engine không đổi.
 * Các khóa cũ MAX_MONTHLY_INCOME / MAX_AVG_HOUSE_AREA / SMALL_HOUSE_AREA_THRESHOLD / PRIORITY_GROUPS
 * không tồn tại ở backend nên đã bỏ.
 */
const POLICY_DEFAULT_VALUES: Record<string, string> = {
  MAX_AREA_PER_PERSON_M2: '15',
  INCOME_SINGLE_MAX_VND: '15000000',
  INCOME_MARRIED_MAX_VND: '30000000',
  INCOME_MILITARY_SINGLE_MAX_VND: '15000000',
  INCOME_MILITARY_MARRIED_MAX_VND: '30000000',
  INTAKE_MIN_DAYS: '30',
  PUBLIC_ANNOUNCE_MIN_DAYS: '30',
  WAITLIST_CONFIRM_HOURS: '48',
  TACIT_APPROVAL_DAYS: '20',
  SXD_CROSSCHECK_SILENCE_DAYS: '20',
  CONTRACT_SIGNING_DEADLINE_DAYS: '15',
  DEPOSIT_PAYMENT_HOURS: '168',
  ONE_APPLICATION_PER_APPLICANT: 'true',
  LATE_PAYMENT_PENALTY_DAILY_RATE: '0.0005',
}

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  Banknote,
  Bookmark,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Edit3,
  Eye,
  FileCheck,
  FileText,
  Info,
  Layers,
  Lock,
  Maximize2,
  Medal,
  Minus,
  Percent,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Scale,
  Search,
  Server,
  Settings2,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'

interface AuditLogItem {
  id: string
  action: string
  entityName: string
  entityId?: string
  userFullName?: string
  userEmail?: string
  ipAddress?: string
  actionTime?: string
  details?: unknown
}

function getActionMeta(action: string) {
  const act = (action || '').toUpperCase()
  if (act.includes('CREATE') || act.includes('INSERT') || act.includes('ADD')) {
    return {
      label: 'Tạo mới',
      tag: 'CREATE',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      dot: 'bg-emerald-500',
      Icon: Plus,
    }
  }
  if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('MODIFY') || act.includes('CHANGE')) {
    return {
      label: 'Cập nhật',
      tag: 'UPDATE',
      bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      dot: 'bg-blue-500',
      Icon: Edit3,
    }
  }
  if (act.includes('DELETE') || act.includes('REMOVE')) {
    return {
      label: 'Xóa',
      tag: 'DELETE',
      bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      dot: 'bg-rose-500',
      Icon: Trash2,
    }
  }
  if (act.includes('APPROVE') || act.includes('ACCEPT')) {
    return {
      label: 'Phê duyệt',
      tag: 'APPROVE',
      bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
      dot: 'bg-teal-500',
      Icon: CheckCircle2,
    }
  }
  if (act.includes('REJECT') || act.includes('DECLINE')) {
    return {
      label: 'Từ chối',
      tag: 'REJECT',
      bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
      dot: 'bg-red-500',
      Icon: XCircle,
    }
  }
  if (act.includes('AUTH') || act.includes('LOGIN') || act.includes('PASSWORD') || act.includes('PERMISSION')) {
    return {
      label: 'Bảo mật',
      tag: 'SECURITY',
      bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
      dot: 'bg-purple-500',
      Icon: Shield,
    }
  }
  if (act.includes('FLAG') || act.includes('LOCK') || act.includes('DEACTIVATE')) {
    return {
      label: 'Cảnh báo / Khóa',
      tag: 'WARNING',
      bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      dot: 'bg-amber-500',
      Icon: AlertTriangle,
    }
  }
  return {
    label: action || 'Thao tác',
    tag: action || 'ACTION',
    bg: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-500',
    Icon: Activity,
  }
}

function getEntityMeta(entityName: string) {
  const ent = (entityName || '').toLowerCase()
  if (ent.includes('user') || ent.includes('staff') || ent.includes('account')) {
    return {
      label: 'Tài khoản người dùng',
      name: entityName || 'User',
      Icon: Users,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    }
  }
  if (ent.includes('policy') || ent.includes('config') || ent.includes('setting')) {
    return {
      label: 'Chính sách hệ thống',
      name: entityName || 'PolicyConfig',
      Icon: Sliders,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    }
  }
  if (ent.includes('project') || ent.includes('housing')) {
    return {
      label: 'Dự án nhà ở',
      name: entityName || 'HousingProject',
      Icon: Building2,
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    }
  }
  if (ent.includes('application') || ent.includes('hoso')) {
    return {
      label: 'Hồ sơ đăng ký',
      name: entityName || 'HousingApplication',
      Icon: FileText,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    }
  }
  if (ent.includes('report') || ent.includes('issue')) {
    return {
      label: 'Báo cáo sự cố',
      name: entityName || 'IssueReport',
      Icon: ShieldAlert,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    }
  }
  return {
    label: entityName || 'Hệ thống',
    name: entityName || 'System',
    Icon: Server,
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  }
}

export function SystemLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [entityFilter, setEntityFilter] = useState('ALL')
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)
  const [copiedIp, setCopiedIp] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 15

  const fetchLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.getAuditLogs({ page: 1, pageSize: 200 })
      const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
      const nested = (root.data ?? root.Data ?? root) as Record<string, unknown>
      const items = Array.isArray(nested)
        ? nested
        : ((nested.items ?? nested.Items ?? []) as unknown[])
      const parsed: AuditLogItem[] = items.map((it) => {
        const row = it as Record<string, unknown>
        return {
          id: String(row.auditId ?? row.AuditId ?? row.id ?? row.Id ?? Math.random().toString(36).slice(2)),
          action: String(row.action ?? row.Action ?? ''),
          entityName: String(row.entityName ?? row.EntityName ?? ''),
          entityId: (row.entityId ?? row.EntityId ?? row.recordId ?? row.RecordId) as string | undefined,
          userFullName: (row.userFullName ?? row.UserFullName ?? row.userName ?? row.UserName) as string | undefined,
          userEmail: (row.userEmail ?? row.UserEmail ?? row.email ?? row.Email) as string | undefined,
          ipAddress: (row.ipAddress ?? row.IpAddress) as string | undefined,
          actionTime: (row.actionTime ?? row.ActionTime ?? row.createdAt ?? row.CreatedAt ?? row.timestamp ?? row.Timestamp) as string | undefined,
          details: (row.details ?? row.Details ?? row.description ?? row.Description ?? row.payload ?? row.Payload) as unknown,
        }
      }).filter((row) => row.id && (row.action || row.entityName))

      if (parsed.length > 0) {
        setLogs(parsed)
        return
      }

      const reports = await issueReportsApi.getAllReports({ pageIndex: 1, pageSize: 100 })
      const reportItems = (reports && typeof reports === 'object' && 'items' in (reports as object)
        ? ((reports as { items?: unknown[] }).items ?? [])
        : []
      ).map((it) => it as Record<string, unknown>)

      setLogs(reportItems.map((it) => ({
        id: String(it.id ?? it.Id ?? Math.random().toString(36).slice(2)),
        action: String(it.title ?? it.Title ?? it.description ?? 'Báo cáo sự cố'),
        entityName: String(it.category ?? it.Category ?? 'IssueReport'),
        userFullName: String(it.userFullName ?? it.status ?? it.Status ?? 'Người dùng'),
        userEmail: (it.userEmail ?? it.email) as string | undefined,
        ipAddress: 'Unknown',
        actionTime: (it.createdAt ?? it.CreatedAt) as string | undefined,
        details: it,
      })))
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLogs()
  }, [])

  const copyIp = (ip: string) => {
    if (!ip) return
    navigator.clipboard.writeText(ip)
    setCopiedIp(ip)
    setTimeout(() => setCopiedIp(null), 2000)
  }

  // Filter & Search
  const filteredLogs = logs.filter((l) => {
    if (actionFilter !== 'ALL') {
      const act = (l.action || '').toUpperCase()
      if (actionFilter === 'CREATE' && !act.includes('CREATE') && !act.includes('INSERT') && !act.includes('ADD')) return false
      if (actionFilter === 'UPDATE' && !act.includes('UPDATE') && !act.includes('EDIT') && !act.includes('MODIFY') && !act.includes('CHANGE')) return false
      if (actionFilter === 'DELETE' && !act.includes('DELETE') && !act.includes('REMOVE')) return false
      if (actionFilter === 'APPROVE' && !act.includes('APPROVE') && !act.includes('ACCEPT')) return false
      if (actionFilter === 'REJECT' && !act.includes('REJECT') && !act.includes('DECLINE')) return false
      if (actionFilter === 'SECURITY' && !act.includes('AUTH') && !act.includes('LOGIN') && !act.includes('PASSWORD')) return false
    }

    if (entityFilter !== 'ALL') {
      const ent = (l.entityName || '').toLowerCase()
      if (entityFilter === 'User' && !ent.includes('user') && !ent.includes('staff')) return false
      if (entityFilter === 'PolicyConfig' && !ent.includes('policy') && !ent.includes('config')) return false
      if (entityFilter === 'HousingProject' && !ent.includes('project') && !ent.includes('housing')) return false
      if (entityFilter === 'HousingApplication' && !ent.includes('application') && !ent.includes('hoso')) return false
      if (entityFilter === 'IssueReport' && !ent.includes('report') && !ent.includes('issue')) return false
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      const matchActor = (l.userFullName || '').toLowerCase().includes(q) || (l.userEmail || '').toLowerCase().includes(q)
      const matchAction = (l.action || '').toLowerCase().includes(q)
      const matchEntity = (l.entityName || '').toLowerCase().includes(q)
      const matchIp = (l.ipAddress || '').toLowerCase().includes(q)
      const matchId = l.id.toLowerCase().includes(q)
      if (!matchActor && !matchAction && !matchEntity && !matchIp && !matchId) return false
    }

    return true
  })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Stats
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCount = logs.filter((l) => l.actionTime && l.actionTime.startsWith(todayStr)).length
  const uniqueActors = new Set(logs.map((l) => l.userFullName || l.userEmail || 'System')).size
  const uniqueEntities = new Set(logs.map((l) => l.entityName || 'System')).size

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl dark:border-slate-800">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-cyan-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Nhật ký kiểm toán · Audit Trails
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Nhật ký hoạt động hệ thống
            </h1>
            <p className="max-w-2xl text-xs text-slate-300 md:text-sm">
              Lưu vết thời gian thực mọi thay đổi cấu hình chính sách, dữ liệu người dùng, hồ sơ và dự án trong hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => void fetchLogs()}
              disabled={loading}
              className="h-10 rounded-xl bg-white/10 px-4 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 hover:text-white"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Đang đồng bộ...' : 'Làm mới'}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tổng sự kiện</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{loading ? '—' : logs.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Bản ghi kiểm toán trong hệ thống</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hôm nay</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{loading ? '—' : todayCount}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Thao tác được ghi nhận trong ngày</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Người thực hiện</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{loading ? '—' : uniqueActors}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tài khoản quản trị &amp; cán bộ</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thực thể tác động</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400">
              <Server className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{loading ? '—' : uniqueEntities}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Loại đối tượng nghiệp vụ</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Filter Toolbar */}
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo người thực hiện, email, IP, hành động, đối tượng..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs font-medium text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Hành động:</span>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">Tất cả hành động</option>
                  <option value="UPDATE">Cập nhật (UPDATE)</option>
                  <option value="CREATE">Tạo mới (CREATE)</option>
                  <option value="DELETE">Xóa (DELETE)</option>
                  <option value="APPROVE">Phê duyệt (APPROVE)</option>
                  <option value="REJECT">Từ chối (REJECT)</option>
                  <option value="SECURITY">Bảo mật (AUTH/LOGIN)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đối tượng:</span>
                <select
                  value={entityFilter}
                  onChange={(e) => {
                    setEntityFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">Tất cả đối tượng</option>
                  <option value="PolicyConfig">Chính sách (PolicyConfig)</option>
                  <option value="User">Tài khoản (User/Staff)</option>
                  <option value="HousingProject">Dự án (HousingProject)</option>
                  <option value="HousingApplication">Hồ sơ (Application)</option>
                  <option value="IssueReport">Sự cố (IssueReport)</option>
                </select>
              </div>

              {(actionFilter !== 'ALL' || entityFilter !== 'ALL' || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActionFilter('ALL')
                    setEntityFilter('ALL')
                    setSearchTerm('')
                    setCurrentPage(1)
                  }}
                  className="h-10 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  Đặt lại lọc
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {/* Table Content */}
        {loading ? (
          <div className="divide-y divide-slate-100 p-4 dark:divide-slate-800">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-2.5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Search className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-bold text-slate-800 dark:text-slate-100">Không tìm thấy bản ghi nào</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc phía trên.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-4 py-3.5">Hành động</th>
                  <th className="px-4 py-3.5">Đối tượng tác động</th>
                  <th className="px-4 py-3.5">Người thực hiện</th>
                  <th className="px-4 py-3.5">Địa chỉ IP</th>
                  <th className="px-5 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedLogs.map((item) => {
                  const actionMeta = getActionMeta(item.action)
                  const entityMeta = getEntityMeta(item.entityName)
                  const ActionIcon = actionMeta.Icon
                  const EntityIcon = entityMeta.Icon

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      {/* Thời gian */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.actionTime ? new Date(item.actionTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {item.actionTime ? new Date(item.actionTime).toLocaleDateString('vi-VN') : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Hành động */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${actionMeta.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${actionMeta.dot}`} />
                          <ActionIcon className="h-3 w-3" />
                          <span>{actionMeta.tag}</span>
                        </span>
                      </td>

                      {/* Đối tượng */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold ${entityMeta.badgeColor}`}>
                            <EntityIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[150px]">{entityMeta.name}</span>
                          </span>
                        </div>
                      </td>

                      {/* Người thực hiện */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                            {(item.userFullName || item.userEmail || 'S')[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {item.userFullName || 'Hệ thống'}
                            </p>
                            {item.userEmail && (
                              <p className="truncate text-[10px] text-slate-400">{item.userEmail}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Địa chỉ IP */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.ipAddress && item.ipAddress !== 'Unknown' ? (
                          <button
                            type="button"
                            onClick={() => copyIp(item.ipAddress!)}
                            title="Bấm để sao chép IP"
                            className="group/ip inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500"
                          >
                            <span>{item.ipAddress}</span>
                            {copiedIp === item.ipAddress ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 opacity-0 transition group-hover/ip:opacity-100" />
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Nội bộ / System</span>
                        )}
                      </td>

                      {/* Chi tiết */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(item)}
                          className="h-8 rounded-lg px-2.5 text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Chi tiết
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredLogs.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hiển thị <strong className="font-semibold text-slate-800 dark:text-slate-200">{(currentPage - 1) * PAGE_SIZE + 1}</strong> - <strong className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(currentPage * PAGE_SIZE, filteredLogs.length)}</strong> trên tổng số <strong className="font-semibold text-slate-800 dark:text-slate-200">{filteredLogs.length}</strong> sự kiện
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 rounded-lg px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 rounded-lg px-2 text-xs"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Chi tiết Log */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Chi tiết sự kiện kiểm toán"
        description={`Mã bản ghi ID: ${selectedLog?.id}`}
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">Hành động</p>
                <p className="mt-0.5 font-bold text-slate-850 dark:text-slate-100">{selectedLog.action}</p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">Đối tượng tác động</p>
                <p className="mt-0.5 font-bold text-slate-850 dark:text-slate-100">{selectedLog.entityName || '—'}</p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">Người thực hiện</p>
                <p className="mt-0.5 font-semibold text-slate-850 dark:text-slate-100">{selectedLog.userFullName || 'Hệ thống'}</p>
                {selectedLog.userEmail && <p className="text-[10px] text-slate-500">{selectedLog.userEmail}</p>}
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px]">Địa chỉ IP</p>
                <p className="mt-0.5 font-mono font-semibold text-slate-850 dark:text-slate-100">{selectedLog.ipAddress || 'Unknown'}</p>
              </div>
              <div className="col-span-2">
                <p className="font-bold text-slate-400 uppercase text-[10px]">Thời gian ghi nhận</p>
                <p className="mt-0.5 text-slate-850 dark:text-slate-100">
                  {selectedLog.actionTime ? `${new Date(selectedLog.actionTime).toLocaleString('vi-VN')} (${selectedLog.actionTime})` : '—'}
                </p>
              </div>
            </div>

            {selectedLog.details != null && (
              <div>
                <p className="mb-1 font-bold text-slate-700 dark:text-slate-300">Dữ liệu chi tiết (Payload / Attributes):</p>
                <pre className="max-h-60 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-emerald-400">
                  {typeof selectedLog.details === 'object'
                    ? JSON.stringify(selectedLog.details, null, 2)
                    : String(selectedLog.details)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

const DEFAULT_PRIORITY_POINTS: PriorityGroupPointItemDto[] = [
  { groupCode: 'MERIT_PERSON', groupName: 'Người có công với cách mạng', points: 10, description: 'Điểm tối đa theo quy định tại Điều 76 Luật Nhà ở 2023' },
  { groupCode: 'URBAN_POOR', groupName: 'Hộ nghèo, cận nghèo đô thị', points: 8, description: 'Hộ nghèo, cận nghèo có giấy chứng nhận hợp lệ tại khu vực đô thị' },
  { groupCode: 'RURAL_POOR', groupName: 'Hộ nghèo, cận nghèo nông thôn', points: 7, description: 'Hộ nghèo, cận nghèo khu vực nông thôn có xác nhận địa phương' },
  { groupCode: 'DISABLED', groupName: 'Người khuyết tật / Thân nhân liệt sĩ', points: 8, description: 'Khuyết tật mức độ nặng hoặc đặc biệt nặng theo giám định y khoa' },
  { groupCode: 'WORKER', groupName: 'Công nhân, người lao động KCN/KCX', points: 6, description: 'Người lao động đang trực tiếp làm việc tại các doanh nghiệp trong KCN' },
  { groupCode: 'LOW_INCOME_URBAN', groupName: 'Người thu nhập thấp đô thị', points: 6, description: 'Thu nhập hàng tháng thuộc khung xét duyệt hưởng chính sách NOXH' },
  { groupCode: 'MILITARY_PERSONNEL', groupName: 'Lực lượng vũ trang / Công an / Quân đội', points: 6, description: 'Cán bộ, chiến sĩ, sĩ quan, quân nhân chuyên nghiệp trong LLVT' },
  { groupCode: 'CIVIL_SERVANT', groupName: 'Cán bộ, công chức, viên chức', points: 5, description: 'Cán bộ, công chức, viên chức hưởng lương ngân sách nhà nước' },
  { groupCode: 'LAND_RECOVERY_AFFECTED', groupName: 'Hộ bị thu hồi đất / giải tỏa', points: 5, description: 'Hộ gia đình bị thu hồi đất chưa được bồi thường bằng nhà ở hoặc đất ở' },
]

const POLICY_CATEGORIES: Record<string, { label: string; icon: typeof Banknote; keys: string[] }> = {
  INCOME_AREA: {
    label: 'Thu nhập & Diện tích',
    icon: Banknote,
    keys: [
      'INCOME_SINGLE_MAX_VND',
      'INCOME_MARRIED_MAX_VND',
      'INCOME_MILITARY_SINGLE_MAX_VND',
      'INCOME_MILITARY_MARRIED_MAX_VND',
      'MAX_AREA_PER_PERSON_M2',
      'ONE_APPLICATION_PER_APPLICANT',
    ],
  },
  TIMELINE_PROCESS: {
    label: 'Thời hạn & Thẩm định',
    icon: Calendar,
    keys: [
      'INTAKE_MIN_DAYS',
      'PUBLIC_ANNOUNCE_MIN_DAYS',
      'WAITLIST_CONFIRM_HOURS',
      'TACIT_APPROVAL_DAYS',
      'SXD_CROSSCHECK_SILENCE_DAYS',
    ],
  },
  FINANCIAL_CONTRACT: {
    label: 'Hợp đồng & Tài chính',
    icon: Wallet,
    keys: [
      'CONTRACT_SIGNING_DEADLINE_DAYS',
      'DEPOSIT_PAYMENT_HOURS',
      'LATE_PAYMENT_PENALTY_DAILY_RATE',
    ],
  },
}

function getPolicyIcon(name: string) {
  if (name.includes('INCOME')) return Banknote
  if (name.includes('AREA')) return Maximize2
  if (name.includes('DAYS')) return Calendar
  if (name.includes('HOURS')) return CalendarClock
  if (name.includes('PENALTY') || name.includes('RATE')) return Percent
  if (name.includes('APPLICATION') || name.includes('ONE')) return UserCheck
  if (name.includes('CONTRACT') || name.includes('DEPOSIT')) return FileCheck
  return Scale
}

function getPriorityGroupMeta(groupCode: string) {
  const code = (groupCode || '').toUpperCase()
  if (code.includes('MERIT')) {
    return {
      Icon: Trophy,
      badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
      barColor: 'bg-amber-500',
    }
  }
  if (code.includes('POOR')) {
    return {
      Icon: Users,
      badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700',
      barColor: 'bg-blue-500',
    }
  }
  if (code.includes('DISABLED')) {
    return {
      Icon: Medal,
      badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700',
      barColor: 'bg-rose-500',
    }
  }
  if (code.includes('WORKER')) {
    return {
      Icon: Building2,
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
      barColor: 'bg-emerald-500',
    }
  }
  if (code.includes('MILITARY')) {
    return {
      Icon: Shield,
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700',
      barColor: 'bg-indigo-500',
    }
  }
  if (code.includes('CIVIL')) {
    return {
      Icon: Award,
      badge: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700',
      barColor: 'bg-purple-500',
    }
  }
  return {
    Icon: Bookmark,
    badge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    barColor: 'bg-slate-500',
  }
}

function getProjectStatusMeta(status: ProjectStatus) {
  const code = (status.statusCode || status.statusName || '').toUpperCase()
  if (code.includes('OPEN') || code.includes('MO_DANG_KY') || code.includes('DANG_MO')) {
    return {
      label: 'Đang mở đăng ký',
      code: status.statusCode || 'OPEN',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      dot: 'bg-emerald-500',
      Icon: CheckCircle2,
      stage: 'Giai đoạn 3',
      desc: status.description || 'Dự án đang trong thời gian công khai tiếp nhận hồ sơ đăng ký từ công dân.',
    }
  }
  if (code.includes('PENDING') || code.includes('CHO_DUYET') || code.includes('CHO_PHE_DUYET')) {
    return {
      label: 'Chờ phê duyệt',
      code: status.statusCode || 'PENDING_APPROVAL',
      badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      dot: 'bg-amber-500',
      Icon: Clock,
      stage: 'Giai đoạn 2',
      desc: status.description || 'Hồ sơ dự án đang chờ Sở Xây dựng thẩm định và phê duyệt phương án kinh doanh.',
    }
  }
  if (code.includes('CLOSE') || code.includes('DONG_DANG_KY') || code.includes('DA_DONG')) {
    return {
      label: 'Đã đóng đăng ký',
      code: status.statusCode || 'CLOSED',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
      dot: 'bg-indigo-500',
      Icon: Lock,
      stage: 'Giai đoạn 4',
      desc: status.description || 'Hết thời hạn nhận hồ sơ, hệ thống chuyển sang bước chấm điểm xét duyệt và bốc thăm.',
    }
  }
  if (code.includes('OUT') || code.includes('HET_SUAT') || code.includes('SOLD')) {
    return {
      label: 'Đã hết suất',
      code: status.statusCode || 'SOLD_OUT',
      badge: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      dot: 'bg-slate-500',
      Icon: CheckCheck,
      stage: 'Giai đoạn 5',
      desc: status.description || 'Toàn bộ quỹ căn hộ của dự án đã được phân bổ và ký hợp đồng thành công.',
    }
  }
  if (code.includes('REJECT') || code.includes('TU_CHOI') || code.includes('BI_TU_CHOI')) {
    return {
      label: 'Bị từ chối',
      code: status.statusCode || 'REJECTED',
      badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      dot: 'bg-rose-500',
      Icon: XCircle,
      stage: 'Hủy bỏ',
      desc: status.description || 'Dự án không đạt tiêu chuẩn phê duyệt của Sở Xây dựng hoặc chủ đầu tư hủy dự án.',
    }
  }
  return {
    label: labelProjectStatus(status.statusCode || status.statusName),
    code: status.statusCode || 'STATUS',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500',
    Icon: Tag,
    stage: 'Quy trình',
    desc: status.description || 'Trạng thái nghiệp vụ dự án được cấu hình trong hệ thống.',
  }
}

export function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<'priority' | 'policy' | 'status'>('priority')
  const [statuses, setStatuses] = useState<ProjectStatus[]>([])
  const [policies, setPolicies] = useState<PolicyConfig[]>([])
  const [priorityPoints, setPriorityPoints] = useState<PriorityGroupPointItemDto[]>(DEFAULT_PRIORITY_POINTS)
  const [savedPriorityPoints, setSavedPriorityPoints] = useState<PriorityGroupPointItemDto[]>(DEFAULT_PRIORITY_POINTS)
  const [loading, setLoading] = useState(true)
  const [savingPoints, setSavingPoints] = useState(false)
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters & Search
  const [searchPriority, setSearchPriority] = useState('')
  const [searchPolicy, setSearchPolicy] = useState('')
  const [selectedPolicyCategory, setSelectedPolicyCategory] = useState('ALL')
  const [searchStatus, setSearchStatus] = useState('')

  // Edit Policy Modal State
  const [editingPolicy, setEditingPolicy] = useState<PolicyConfig | null>(null)
  const [editValue, setEditValue] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch Project Statuses
      const s = await housingProjectStatusesApi.list()
      const sl = Array.isArray(s) ? s : ((s as { items?: ProjectStatus[] }).items ?? [])
      setStatuses(sl as ProjectStatus[])

      // 2. Fetch Policies
      const policyNames = Object.keys(POLICY_DEFAULT_VALUES)
      const loaded: PolicyConfig[] = []
      for (const name of policyNames) {
        try {
          const p = await housingProjectStatusesApi.getPolicy(name)
          loaded.push({
            policyName: name,
            policyValue: String((p as { policyValue?: string }).policyValue ?? POLICY_DEFAULT_VALUES[name]),
            description: (p as { description?: string }).description,
            unit: (p as { unit?: string }).unit,
            updatedAt: (p as { updatedAt?: string }).updatedAt,
          })
        } catch {
          loaded.push({
            policyName: name,
            policyValue: POLICY_DEFAULT_VALUES[name],
          })
        }
      }
      setPolicies(loaded)

      // 3. Fetch Priority Points
      try {
        const ptRes = await housingProjectStatusesApi.getPriorityPoints()
        const ptData = (ptRes && typeof ptRes === 'object' && 'data' in ptRes ? (ptRes as any).data : ptRes) as PriorityPointsTableDto
        if (ptData?.pointsTable && Array.isArray(ptData.pointsTable) && ptData.pointsTable.length > 0) {
          setPriorityPoints(ptData.pointsTable)
          setSavedPriorityPoints(ptData.pointsTable)
        } else {
          setPriorityPoints(DEFAULT_PRIORITY_POINTS)
          setSavedPriorityPoints(DEFAULT_PRIORITY_POINTS)
        }
      } catch {
        setPriorityPoints(DEFAULT_PRIORITY_POINTS)
        setSavedPriorityPoints(DEFAULT_PRIORITY_POINTS)
      }
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  // Check if priority points were modified
  const isPriorityPointsDirty = JSON.stringify(priorityPoints) !== JSON.stringify(savedPriorityPoints)

  const handlePointChange = (idx: number, delta: number) => {
    setPriorityPoints((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p
        const nextVal = Math.max(0, Math.min(100, (p.points || 0) + delta))
        return { ...p, points: nextVal }
      }),
    )
  }

  const handleDirectPointInput = (idx: number, val: number) => {
    const clamped = Math.max(0, Math.min(100, val || 0))
    setPriorityPoints((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, points: clamped } : p)),
    )
  }

  const resetPriorityPointsToDefault = () => {
    setPriorityPoints(DEFAULT_PRIORITY_POINTS)
    setMsg({ type: 'success', text: 'Đã khôi phục ma trận điểm chuẩn theo Điều 76 Luật Nhà ở 2023. Hãy nhấn "Lưu bảng điểm" để cập nhật lên máy chủ.' })
  }

  const savePriorityPoints = async () => {
    setSavingPoints(true)
    setMsg(null)
    try {
      await housingProjectStatusesApi.updatePriorityPoints({ pointsTable: priorityPoints })
      setSavedPriorityPoints(priorityPoints)
      setMsg({ type: 'success', text: 'Đã lưu thành công ma trận điểm ưu tiên NOXH vào hệ thống.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setSavingPoints(false)
    }
  }

  const openEditPolicyModal = (p: PolicyConfig) => {
    setEditingPolicy(p)
    setEditValue(p.policyValue)
  }

  const savePolicyModal = async () => {
    if (!editingPolicy) return
    setSavingPolicy(true)
    setMsg(null)
    try {
      await housingProjectStatusesApi.updatePolicy(editingPolicy.policyName, { policyValue: editValue })
      setMsg({ type: 'success', text: `Đã cập nhật quy chuẩn: ${policyTitle(editingPolicy.policyName)} thành công.` })
      setEditingPolicy(null)
      await load()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setSavingPolicy(false)
    }
  }

  // Filtered Priority Items
  const filteredPriorityPoints = priorityPoints.filter((item) => {
    if (!searchPriority.trim()) return true
    const q = searchPriority.toLowerCase().trim()
    return item.groupName.toLowerCase().includes(q) || item.groupCode.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q)
  })

  // Filtered Policies
  const filteredPolicies = policies.filter((p) => {
    if (selectedPolicyCategory !== 'ALL') {
      const cat = POLICY_CATEGORIES[selectedPolicyCategory]
      if (cat && !cat.keys.includes(p.policyName)) return false
    }
    if (searchPolicy.trim()) {
      const q = searchPolicy.toLowerCase().trim()
      const title = policyTitle(p.policyName).toLowerCase()
      const hint = (POLICY_META_VI[p.policyName]?.hint || p.description || '').toLowerCase()
      const val = p.policyValue.toLowerCase()
      return title.includes(q) || hint.includes(q) || val.includes(q) || p.policyName.toLowerCase().includes(q)
    }
    return true
  })

  // Filtered Statuses
  const filteredStatuses = statuses.filter((s) => {
    if (!searchStatus.trim()) return true
    const q = searchStatus.toLowerCase().trim()
    const name = (s.statusName || '').toLowerCase()
    const code = (s.statusCode || '').toLowerCase()
    const desc = (s.description || '').toLowerCase()
    const label = labelProjectStatus(s.statusCode || s.statusName).toLowerCase()
    return name.includes(q) || code.includes(q) || desc.includes(q) || label.includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl dark:border-slate-800">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-cyan-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Cấu hình hệ thống · System Configuration
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Quản lý danh mục &amp; Cấu hình chính sách
            </h1>
            <p className="max-w-2xl text-xs text-slate-300 md:text-sm">
              Thiết lập ma trận điểm ưu tiên theo Điều 76 Luật Nhà ở 2023, tham số quy chuẩn xét duyệt tự động và từ điển vòng đời trạng thái dự án.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {activeTab === 'priority' && isPriorityPointsDirty && (
              <Button
                variant="accent"
                onClick={() => void savePriorityPoints()}
                disabled={savingPoints}
                className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500"
              >
                <Save className={`mr-1.5 h-3.5 w-3.5 ${savingPoints ? 'animate-spin' : ''}`} />
                {savingPoints ? 'Đang lưu...' : 'Lưu ma trận điểm'}
              </Button>
            )}

            <Button
              onClick={() => void load()}
              disabled={loading}
              className="h-10 rounded-xl bg-white/10 px-4 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 hover:text-white"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Đang đồng bộ...' : 'Làm mới'}
            </Button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {msg && (
        <Alert variant={msg.type === 'error' ? 'error' : 'success'} className="rounded-xl shadow-sm">
          {msg.text}
        </Alert>
      )}
      {error && (
        <Alert variant="error" className="rounded-xl shadow-sm">
          {error}
        </Alert>
      )}

      {/* Top KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nhóm ưu tiên</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{loading ? '—' : priorityPoints.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Đối tượng hưởng điểm cộng NOXH</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quy chuẩn chính sách</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Settings2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{loading ? '—' : policies.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tham số thẩm định hồ sơ tự động</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Trạng thái dự án</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{loading ? '—' : statuses.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Vòng đời quy trình dự án NOXH</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Khung pháp lý</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-base font-extrabold text-indigo-700 dark:text-indigo-400">Luật Nhà ở 2023</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Điều 76 &amp; Nghị định 100/2024</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('priority')}
            className={`group relative flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all ${
              activeTab === 'priority'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Ma trận điểm ưu tiên NOXH</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              activeTab === 'priority'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {priorityPoints.length}
            </span>
            {activeTab === 'priority' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`group relative flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all ${
              activeTab === 'policy'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Settings2 className="h-4 w-4" />
            <span>Quy chuẩn &amp; Chính sách</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              activeTab === 'policy'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {policies.length}
            </span>
            {activeTab === 'policy' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`group relative flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all ${
              activeTab === 'status'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Trạng thái dự án</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              activeTab === 'status'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {statuses.length}
            </span>
            {activeTab === 'status' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: MA TRẬN ĐIỂM ƯU TIÊN */}
      {activeTab === 'priority' && (
        <div className="space-y-4">
          {/* Legal Info Card */}
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <Info className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Cơ chế chấm điểm tự động theo Điều 76 Luật Nhà ở 2023
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Điểm ưu tiên được Rule Engine cộng dồn tự động vào hồ sơ dựa trên giấy tờ chứng minh đối tượng đã được cán bộ thẩm định xác thực.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={resetPriorityPointsToDefault}
                className="h-8 rounded-xl border-amber-300 bg-white/80 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Chuẩn mặc định
              </Button>

              <Button
                variant="accent"
                size="sm"
                disabled={savingPoints || !isPriorityPointsDirty}
                onClick={() => void savePriorityPoints()}
                className="h-8 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className={`mr-1 h-3.5 w-3.5 ${savingPoints ? 'animate-spin' : ''}`} />
                {savingPoints ? 'Đang lưu...' : 'Lưu bảng điểm'}
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Search toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm nhóm đối tượng hoặc mã quy định..."
                  value={searchPriority}
                  onChange={(e) => setSearchPriority(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs font-medium text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {searchPriority && (
                  <button
                    type="button"
                    onClick={() => setSearchPriority('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {isPriorityPointsDirty && (
                <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Có thay đổi chưa lưu</span>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Nhóm đối tượng ưu tiên</th>
                    <th className="px-4 py-3.5">Mã nhóm</th>
                    <th className="px-4 py-3.5">Căn cứ &amp; Mô tả quy định</th>
                    <th className="px-4 py-3.5 text-center">Thang điểm (0 - 10)</th>
                    <th className="px-5 py-3.5 text-right">Điểm thiết lập</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPriorityPoints.map((item) => {
                    const idx = priorityPoints.findIndex((p) => p.groupCode === item.groupCode)
                    const meta = getPriorityGroupMeta(item.groupCode)
                    const GroupIcon = meta.Icon
                    const percentage = Math.min(100, Math.max(0, (item.points / 10) * 100))

                    return (
                      <tr
                        key={item.groupCode || idx}
                        className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        {/* Nhóm đối tượng */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.badge}`}>
                              <GroupIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100">{item.groupName}</p>
                              <p className="text-[11px] text-slate-400">Hạng mục ưu tiên cấp nhà</p>
                            </div>
                          </div>
                        </td>

                        {/* Mã nhóm */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {item.groupCode}
                          </span>
                        </td>

                        {/* Mô tả */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                            {item.description || 'Quy định theo Luật Nhà ở 2023'}
                          </p>
                        </td>

                        {/* Gauge bar */}
                        <td className="px-4 py-3.5 w-36">
                          <div className="flex flex-col gap-1 items-center">
                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${meta.barColor}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {item.points} / 10 điểm chuẩn
                            </span>
                          </div>
                        </td>

                        {/* Điểm số & Bộ điều khiển */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => handlePointChange(idx, -1)}
                              disabled={item.points <= 0}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                              title="Giảm 1 điểm"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={item.points}
                              onChange={(e) => handleDirectPointInput(idx, Number(e.target.value))}
                              className="w-12 bg-transparent text-center font-mono text-sm font-extrabold text-indigo-600 focus:outline-none dark:text-indigo-400"
                            />

                            <button
                              type="button"
                              onClick={() => handlePointChange(idx, 1)}
                              disabled={item.points >= 100}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                              title="Tăng 1 điểm"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom action bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hiển thị <strong className="font-semibold text-slate-800 dark:text-slate-200">{filteredPriorityPoints.length}</strong> / {priorityPoints.length} nhóm đối tượng ưu tiên
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetPriorityPointsToDefault}
                  className="h-8 rounded-xl text-xs"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Khôi phục chuẩn
                </Button>

                <Button
                  variant="accent"
                  size="sm"
                  disabled={savingPoints || !isPriorityPointsDirty}
                  onClick={() => void savePriorityPoints()}
                  className="h-8 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className={`mr-1.5 h-3.5 w-3.5 ${savingPoints ? 'animate-spin' : ''}`} />
                  {savingPoints ? 'Đang lưu...' : 'Lưu bảng điểm ưu tiên'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUY CHUẨN & CHÍNH SÁCH */}
      {activeTab === 'policy' && (
        <div className="space-y-4">
          {/* Categories Filter Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedPolicyCategory('ALL')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedPolicyCategory === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Tất cả quy chuẩn ({policies.length})
              </button>

              {Object.entries(POLICY_CATEGORIES).map(([catKey, cat]) => {
                const CatIcon = cat.icon
                const count = policies.filter((p) => cat.keys.includes(p.policyName)).length
                const active = selectedPolicyCategory === catKey
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedPolicyCategory(catKey)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <CatIcon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm quy chuẩn, mức tiền, ngày..."
                value={searchPolicy}
                onChange={(e) => setSearchPolicy(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-medium text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {searchPolicy && (
                <button
                  type="button"
                  onClick={() => setSearchPolicy('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Policies Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPolicies.map((p) => {
              const meta = POLICY_META_VI[p.policyName]
              const PolicyIcon = getPolicyIcon(p.policyName)
              const formattedVal = formatPolicyValue(p.policyName, p.policyValue)

              return (
                <div
                  key={p.policyName}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <div>
                    {/* Top Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                        <PolicyIcon className="h-5 w-5" />
                      </div>

                      <span className="font-mono text-[10px] font-semibold text-slate-400 truncate max-w-[120px]">
                        {p.policyName}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div className="mt-3 space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {policyTitle(p.policyName)}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {meta?.hint || p.description || 'Tham số thẩm định chính sách NOXH.'}
                      </p>
                    </div>
                  </div>

                  {/* Value & Action */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Giá trị áp dụng</p>
                      <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                        {formattedVal}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditPolicyModal(p)}
                      className="h-8 rounded-xl border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-indigo-950/40"
                    >
                      <Edit3 className="mr-1 h-3.5 w-3.5" />
                      Điều chỉnh
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TRẠNG THÁI DỰ ÁN & VÒNG ĐỜI */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          {/* Lifecycle Pipeline Infographic */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Layers className="h-3.5 w-3.5" />
                Vòng đời dự án nhà ở xã hội
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Quy trình phân bổ &amp; kiểm soát trạng thái chuẩn
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Bước 1</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">Khởi tạo &amp; Dự thảo</p>
                <p className="mt-1 text-[11px] text-slate-500">Chủ đầu tư lập thông tin dự án, cấu hình quỹ căn và giá bán.</p>
              </div>

              <div className="relative rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400">Bước 2</span>
                <p className="mt-0.5 text-xs font-bold text-amber-900 dark:text-amber-200">Sở Xây dựng duyệt</p>
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">Thẩm định tính pháp lý và điều kiện nhận hồ sơ.</p>
              </div>

              <div className="relative rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">Bước 3</span>
                <p className="mt-0.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">Mở nhận hồ sơ</p>
                <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">Công khai nhận hồ sơ tối thiểu 30 ngày theo luật.</p>
              </div>

              <div className="relative rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400">Bước 4</span>
                <p className="mt-0.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">Đóng hồ sơ &amp; Bốc thăm</p>
                <p className="mt-1 text-[11px] text-indigo-700 dark:text-indigo-400">Chấm điểm tự động, đối soát và bốc thăm công khai.</p>
              </div>

              <div className="relative rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-800">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Bước 5</span>
                <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">Hết suất / Bàn giao</p>
                <p className="mt-1 text-[11px] text-slate-500">Ký hợp đồng mua bán và bàn giao căn hộ cho công dân.</p>
              </div>
            </div>
          </div>

          {/* Status List Cards */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Danh mục trạng thái trong cơ sở dữ liệu ({statuses.length})
              </h4>

              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm trạng thái..."
                  value={searchStatus}
                  onChange={(e) => setSearchStatus(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-medium text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStatuses.map((s) => {
                const meta = getProjectStatusMeta(s)
                const StatusIcon = meta.Icon

                return (
                  <div
                    key={s.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-800/60"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${meta.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          <StatusIcon className="h-3.5 w-3.5" />
                          <span>{meta.label}</span>
                        </span>

                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          {meta.code}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {meta.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Phân nhóm: <strong>{meta.stage}</strong></span>
                      <span className="font-mono text-[10px] text-slate-400">ID: {s.id.slice(0, 8)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Policy Modal */}
      <Modal
        open={!!editingPolicy}
        onClose={() => setEditingPolicy(null)}
        title="Điều chỉnh quy chuẩn chính sách"
        description={editingPolicy ? `Khóa cấu hình: ${editingPolicy.policyName}` : ''}
        size="md"
      >
        {editingPolicy && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {policyTitle(editingPolicy.policyName)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {POLICY_META_VI[editingPolicy.policyName]?.hint || editingPolicy.description || 'Quy chuẩn xét duyệt hệ thống.'}
              </p>
            </div>

            {/* Input Control */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Giá trị thiết lập mới:
              </label>

              {POLICY_META_VI[editingPolicy.policyName]?.kind === 'bool' ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditValue('true')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-bold transition-all ${
                      /^(true|1|yes)$/i.test(editValue)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Có (Cho phép / Bật)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditValue('false')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-bold transition-all ${
                      !/^(true|1|yes)$/i.test(editValue)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <XCircle className="h-4 w-4 text-rose-600" />
                    <span>Không (Vô hiệu / Tắt)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={POLICY_META_VI[editingPolicy.policyName]?.kind === 'rate' ? 'text' : 'number'}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm font-bold text-slate-900 transition focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    {POLICY_META_VI[editingPolicy.policyName]?.unit && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {POLICY_META_VI[editingPolicy.policyName]?.unit}
                      </span>
                    )}
                  </div>

                  {/* Preview Formatted */}
                  <div className="flex items-center justify-between rounded-lg bg-indigo-50/50 px-3 py-1.5 text-xs text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                    <span>Xem trước định dạng:</span>
                    <strong className="font-bold">{formatPolicyValue(editingPolicy.policyName, editValue)}</strong>
                  </div>

                  {/* Preset Quick Actions */}
                  {POLICY_META_VI[editingPolicy.policyName]?.kind === 'money' && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="self-center text-[10px] text-slate-400">Chọn nhanh:</span>
                      {['15000000', '20000000', '30000000', '40000000'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setEditValue(val)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {Number(val).toLocaleString('vi-VN')} đ
                        </button>
                      ))}
                    </div>
                  )}

                  {POLICY_META_VI[editingPolicy.policyName]?.kind === 'days' && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="self-center text-[10px] text-slate-400">Chọn nhanh:</span>
                      {['15', '20', '30', '45', '60'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setEditValue(val)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {val} ngày
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingPolicy(null)}
                disabled={savingPolicy}
                className="h-9 rounded-xl text-xs"
              >
                Hủy
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={() => void savePolicyModal()}
                disabled={savingPolicy}
                className="h-9 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
              >
                <Save className={`mr-1.5 h-3.5 w-3.5 ${savingPolicy ? 'animate-spin' : ''}`} />
                {savingPolicy ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

