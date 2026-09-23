import { useEffect, useState } from 'react'
import { PageCard } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
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
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Edit3,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trash2,
  Users,
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

  { groupCode: 'MERIT_PERSON', groupName: 'Người có công với cách mạng', points: 10, description: 'Điểm tối đa theo Luật Nhà ở 2023' },
  { groupCode: 'URBAN_POOR', groupName: 'Hộ nghèo đô thị', points: 9, description: 'Hộ nghèo có xác nhận' },
  { groupCode: 'RURAL_POOR', groupName: 'Hộ nghèo nông thôn', points: 8, description: 'Hộ nghèo khu vực nông thôn' },
  { groupCode: 'DISABLED', groupName: 'Người khuyết tật', points: 8, description: 'Khuyết tật mức độ nặng hoặc đặc biệt nặng' },
  { groupCode: 'WORKER', groupName: 'Công nhân KCN/KCX', points: 7, description: 'Người lao động trực tiếp trong khu công nghiệp' },
  { groupCode: 'LOW_INCOME_URBAN', groupName: 'Người thu nhập thấp tại đô thị', points: 6, description: 'Thu nhập <= 15M/tháng' },
  { groupCode: 'MILITARY_PERSONNEL', groupName: 'Lực lượng vũ trang / Công an / Quân đội', points: 6, description: 'Cán bộ chiến sĩ LLVT' },
  { groupCode: 'CIVIL_SERVANT', groupName: 'Cán bộ, công chức, viên chức', points: 5, description: 'Công chức nhà nước' },
  { groupCode: 'LAND_RECOVERY_AFFECTED', groupName: 'Hộ bị thu hồi đất / giải tỏa', points: 5, description: 'Bị thu hồi đất chưa được bồi thường bằng nhà' },
]

export function CategoriesPage() {
  const [statuses, setStatuses] = useState<ProjectStatus[]>([])
  const [policies, setPolicies] = useState<PolicyConfig[]>([])
  const [priorityPoints, setPriorityPoints] = useState<PriorityGroupPointItemDto[]>(DEFAULT_PRIORITY_POINTS)
  const [loading, setLoading] = useState(true)
  const [savingPoints, setSavingPoints] = useState(false)
  const [error, setError] = useState('')
  const [editPolicyName, setEditPolicyName] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const s = await housingProjectStatusesApi.list()
      const sl = Array.isArray(s) ? s : ((s as { items?: ProjectStatus[] }).items ?? [])
      setStatuses(sl as ProjectStatus[])

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

      try {
        const ptRes = await housingProjectStatusesApi.getPriorityPoints()
        const ptData = (ptRes && typeof ptRes === 'object' && 'data' in ptRes ? (ptRes as any).data : ptRes) as PriorityPointsTableDto
        if (ptData?.pointsTable && Array.isArray(ptData.pointsTable) && ptData.pointsTable.length > 0) {
          setPriorityPoints(ptData.pointsTable)
        }
      } catch {
        // use default fallback
      }
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const savePolicy = async (name: string) => {
    setMsg(null)
    try {
      await housingProjectStatusesApi.updatePolicy(name, { policyValue: editValue })
      setMsg({ type: 'success', text: `Đã cập nhật: ${policyTitle(name)}.` })
      setEditPolicyName(null)
      await load()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    }
  }

  const savePriorityPoints = async () => {
    setSavingPoints(true)
    setMsg(null)
    try {
      await housingProjectStatusesApi.updatePriorityPoints({ pointsTable: priorityPoints })
      setMsg({ type: 'success', text: 'Đã cập nhật bảng điểm ưu tiên NOXH thành công.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setSavingPoints(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageCard className="p-6">
        {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'} className="mb-3">{msg.text}</Alert>}
        {error && <Alert variant="error" className="mb-3">{error}</Alert>}
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>
        ) : (
          <>
            {/* Bảng điểm ưu tiên NOXH */}
            <div className="mb-8">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    🏆 Ma trận điểm ưu tiên NOXH (Điều 76 Luật Nhà ở 2023)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cấu hình trọng số điểm ưu tiên chấm tự động khi xét duyệt hồ sơ đăng ký.
                  </p>
                </div>
                <Button variant="accent" size="sm" disabled={savingPoints} onClick={() => void savePriorityPoints()}>
                  {savingPoints ? 'Đang lưu...' : '💾 Lưu bảng điểm ưu tiên'}
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Nhóm đối tượng ưu tiên</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Mô tả quy định</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300">Điểm số</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {priorityPoints.map((item, idx) => (
                      <tr key={item.groupCode || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{item.groupName}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{item.description || '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.points}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0
                              setPriorityPoints((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, points: val } : p)),
                              )
                            }}
                            className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-xs font-bold text-indigo-600 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <h3 className="mb-2 font-semibold">Trạng thái dự án</h3>
            <div className="mb-6 space-y-2">
              {statuses.map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <p className="font-medium">{labelProjectStatus(s.statusCode || s.statusName)}</p>
                  {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
                </div>
              ))}
            </div>

            <h3 className="mb-2 font-semibold">Cấu hình chính sách nhà ở xã hội</h3>
            <div className="space-y-2">
              {policies.map((p) => {
                const meta = POLICY_META_VI[p.policyName]
                const kind = meta?.kind ?? 'number'
                return (
                  <div key={p.policyName} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{policyTitle(p.policyName)}</p>
                        <p className="text-xs text-slate-500">{meta?.hint || p.description || ''}</p>
                      </div>
                      {editPolicyName === p.policyName ? (
                        <div className="flex gap-2">
                          {kind === 'bool' ? (
                            <Select
                              value={/^(true|1|yes)$/i.test(editValue) ? 'true' : 'false'}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="text-sm"
                            >
                              <option value="true">Có</option>
                              <option value="false">Không</option>
                            </Select>
                          ) : (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="text-sm"
                            />
                          )}
                          <Button variant="accent" size="sm" onClick={() => void savePolicy(p.policyName)}>Lưu</Button>
                          <Button variant="outline" size="sm" onClick={() => setEditPolicyName(null)}>Huỷ</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                            {formatPolicyValue(p.policyName, p.policyValue)}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => { setEditPolicyName(p.policyName); setEditValue(p.policyValue) }}>
                            Sửa
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </PageCard>
    </div>
  )
}

