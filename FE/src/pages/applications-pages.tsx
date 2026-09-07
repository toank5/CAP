import { useEffect, useMemo, useState } from 'react'
import {
  Eye,
  FileText,
  Printer,
  Send,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  FilePlus,
  Scale,
  ShieldCheck,
  UserCheck,
  Users,
  Heart,
  ZoomIn,
  ZoomOut,
  RotateCw,
  AlertCircle,
  FileCheck,
  ExternalLink,
  Building2,
  Clock,
  User,
  Copy,
  Check,
  Calendar,
  CreditCard,
  RefreshCw,
  Search,
  ArrowRight,
  Filter,
  Download,
  Home,
  FolderOpen,
  Plus,
} from 'lucide-react'
import {
  housingApplicationsApi,
  parseApplicationDetail,
  parseAuditChecklist,
  parsePagedApplications,
  parsePagedMeta,
  type AuditChecklistResponse,
} from '@/api/housing-applications'
import { housingProjectsApi, parseApartments } from '@/api/housing-projects'
import { reportsApi } from '@/api/reports'
import { CreateApplicationWizard } from '@/components/ekyc/create-application-wizard'
import { ApplicationTimeline } from '@/components/shared/application-timeline'
import { FileDropzone } from '@/components/shared/file-dropzone'
import {
  ApartmentCard,
  PaymentSection,
  SignContractSection,
} from '@/components/payment/payment-section'
import { contractApi, parseContractStatus, parseInstallmentsEnvelope, summarizeInstallments } from '@/api/contracts'
import { canSignAfterDeposit, isPhase1Paid } from '@/lib/deposit-pipeline'
import { usersApi } from '@/api/users'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { navigate } from '@/hooks/useHashRoute'
import { useExistingApplicationBlocker } from '@/hooks/useExistingApplicationBlocker'
import { labelApplicationStatus } from '@/lib/labels'
import {
  APPLICATION_STATUS,
  DOC_TYPE_LABELS,
  HOUSING_STATUS_LABELS,
  PRIORITY_GROUP_LABELS,
  MARITAL_STATUS_LABELS,
  LOTTERY_RESULT_LABELS,
  RELATIONSHIP_LABELS,
  GENDER_LABELS,
  getRequiredDocsForPriorityGroup,
  MAX_AVG_AREA_PER_PERSON_M2,
} from '@/lib/constants'
import { formatError } from '@/lib/format-error'
import { ensureVerifiedForApplication } from '@/lib/ekyc-gate'
import { formatDepositCountdown } from '@/lib/deposit-deadline'
import { formatSxdCountdown } from '@/lib/sxd-deadline'
import { isAssignableUnit } from '@/lib/lottery-allocation'
import { getRole } from '@/router'
import type { ApartmentDto, ApplicationDetailDto, ApplicationSummaryDto } from '@/types'

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-mono text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
      title="Sao chép"
    >
      {label && <span>{label}</span>}
      {copied ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

function DetailRow({ label, value, danger }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800/80 sm:flex-row sm:justify-between sm:items-center ${danger ? 'bg-rose-50/80 px-2 rounded-lg dark:bg-rose-950/30' : ''}`}>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-semibold text-right ${danger ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100'}`}>{value || '—'}</span>
    </div>
  )
}

function formatDobDisplay(dob?: string | null): string {
  if (!dob) return '—'
  const s = String(dob).trim()
  if (!s) return '—'
  if (/^\d{4}$/.test(s)) return s
  const match = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (match) {
    const [, yyyy, mm, dd] = match
    return `${Number(dd)}/${Number(mm)}/${yyyy}`
  }
  const match2 = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (match2) {
    const [, dd, mm, yyyy] = match2
    return `${Number(dd)}/${Number(mm)}/${yyyy}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  }
  return s
}

const PAGE_SIZE = 10

const QUICK_STATUS_TABS = [
  { id: '', label: 'Tất cả' },
  { id: 'SUBMITTED', label: 'Đã nộp' },
  { id: 'REVIEWING', label: 'Đang thẩm định' },
  { id: 'NEED_MORE_DOCUMENTS', label: 'Cần bổ sung' },
  { id: 'PENDING_SXD_REVIEW', label: 'Chờ Sở Xây dựng' },
  { id: 'APPROVED', label: 'Đã phê duyệt' },
  { id: 'REJECTED', label: 'Từ chối' },
  { id: 'CANCELED', label: 'Đã hủy' },
]

export function ApplicationsPage() {
  const role = getRole()
  const isApplicant = role === 'Applicant'
  const isDeveloper = role === 'Housing Developer'
  const isSxd = role === 'Department Of Construction'
  const [apps, setApps] = useState<ApplicationSummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [status, setStatus] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    const hash = window.location.hash.replace(/^#\/?/, '')
    const qIdx = hash.indexOf('?')
    if (qIdx < 0) return ''
    const params = new URLSearchParams(hash.slice(qIdx + 1))
    return params.get('status') ?? ''
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkMsg, setBulkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [exporting, setExporting] = useState(false)
  const applicantBlocker = useExistingApplicationBlocker()

  useEffect(() => {
    setPageIndex(1)
    setSelected(new Set())
  }, [status])

  const load = async (filter?: { search?: string; status?: string }, page = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = isApplicant
        ? await housingApplicationsApi.getMy({ pageIndex: page, pageSize: PAGE_SIZE, ...filter })
        : role === 'Housing Developer'
          ? await housingApplicationsApi.getDeveloperDashboard({ pageIndex: page, pageSize: PAGE_SIZE, ...filter })
          : role === 'Department Of Construction'
            ? await housingApplicationsApi.getSxdDashboard({ pageIndex: page, pageSize: PAGE_SIZE, ...filter })
            : await housingApplicationsApi.getAll({ pageIndex: page, pageSize: PAGE_SIZE, ...filter })
      const parsed = parsePagedApplications(data)
      const meta = parsePagedMeta(data, PAGE_SIZE)
      setApps(parsed)
      setPageIndex(page)
      setTotalCount(meta.totalCount)
      setTotalPages(meta.totalPages)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load({ search: search || undefined, status: status || undefined }, pageIndex)
  }, [role, status, pageIndex])

  const submittable = useMemo(
    () => apps.filter((a) => a.applicationStatus === 'REVIEWING'),
    [apps],
  )

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (prev.size === submittable.length) return new Set()
      return new Set(submittable.map((a) => a.applicationId))
    })
  }

  const submitSelectedToSxd = async () => {
    if (selected.size === 0 || bulkSending) return
    if (!window.confirm(
      `Gửi ${selected.size} hồ sơ đã chọn lên Sở Xây dựng? Hành động này không thể hoàn tác.`,
    )) return
    setBulkSending(true)
    setBulkMsg(null)
    try {
      await housingApplicationsApi.submitToDepartment(Array.from(selected))
      setBulkMsg({ type: 'success', text: `Đã gửi ${selected.size} hồ sơ lên Sở Xây dựng.` })
      setSelected(new Set())
      await load({ search: search || undefined, status: status || undefined })
    } catch (err) {
      setBulkMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBulkSending(false)
    }
  }

  const exportDraft = async () => {
    setExporting(true)
    setBulkMsg(null)
    try {
      await reportsApi.exportApplicationsExcel({
        status: status || (isDeveloper ? 'REVIEWING' : undefined),
        search: search || undefined,
      })
      setBulkMsg({ type: 'success', text: 'Đã xuất file Excel danh sách dự kiến.' })
    } catch (err) {
      setBulkMsg({ type: 'error', text: formatError(err) })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-6 shadow-sm dark:border-emerald-950/40 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isApplicant
                ? 'CỔNG DỊCH VỤ CÔNG QUỐC GIA · HỒ SƠ CỦA TÔI'
                : isDeveloper
                  ? 'CỔNG DÀNH CHO CHỦ ĐẦU TƯ · QUẢN LÝ HỒ SƠ'
                  : 'HỆ THỐNG THẨM ĐỊNH SỞ XÂY DỰNG'}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {isApplicant
                ? 'Quản Lý Hồ Sơ Đăng Ký Nhà Ở Xã Hội'
                : isDeveloper
                  ? 'Danh Sách Hồ Sơ Đăng Ký Dự Án'
                  : 'Danh Sách Thẩm Định Hồ Sơ Mua NOXH'}
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {isApplicant
                ? 'Theo dõi lộ trình thẩm định hồ sơ theo thời gian thực, nhận thông báo bổ sung chứng từ pháp lý và tra cứu kết quả phê duyệt chính thức.'
                : 'Quản lý, thẩm định và đối soát danh sách công dân đăng ký mua nhà ở xã hội đồng bộ với cơ sở dữ liệu quốc gia.'}
            </p>

            {/* Metrics Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {loading ? 'Đang tải...' : `Tổng số: ${totalCount} hồ sơ`}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Trực tuyến 100% minh bạch
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Định danh eKYC / CCCD
              </span>
            </div>
          </div>

          {/* Header Action Button */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(isDeveloper || isSxd) && (
              <Button
                variant="outline"
                size="sm"
                disabled={exporting}
                onClick={() => void exportDraft()}
                className="rounded-xl font-semibold border-slate-200 hover:bg-slate-100 dark:border-slate-700 text-xs sm:text-sm"
              >
                <Download className="mr-1.5 h-4 w-4" />
                {exporting ? 'Đang xuất…' : 'Xuất Excel danh sách'}
              </Button>
            )}
            {isApplicant && (
              applicantBlocker.canCreate ? (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5 py-2.5 shadow-md shadow-emerald-600/20 flex items-center gap-2 text-xs sm:text-sm"
                  onClick={() => {
                    void ensureVerifiedForApplication().then((ok) => {
                      if (ok) navigate('projects')
                    })
                  }}
                >
                  <Plus className="h-4 w-4" /> Đăng ký dự án
                </Button>
              ) : (
                <div
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-300 shadow-sm"
                  title={applicantBlocker.message || 'Bạn đã có hồ sơ đang xử lý trong hệ thống.'}
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Đang có hồ sơ xử lý</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Container Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        {/* Quick Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider">Lọc nhanh:</span>
          {QUICK_STATUS_TABS.map((tab) => {
            const active = status === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatus(tab.id)
                  setPageIndex(1)
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${active
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search & Filter Form */}
        <form
          className="grid gap-3 sm:grid-cols-12 items-end"
          onSubmit={(e) => {
            e.preventDefault()
            setPageIndex(1)
            void load({ search: search || undefined, status: status || undefined }, 1)
          }}
        >
          <div className="sm:col-span-5">
            <FormField label="Tìm kiếm hồ sơ" htmlFor="search">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nhập họ tên, CCCD hoặc tên dự án..."
                  className="pl-9 rounded-xl focus:border-emerald-500 focus:ring-emerald-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </FormField>
          </div>

          <div className="sm:col-span-4">
            <FormField label="Trạng thái chi tiết" htmlFor="status">
              <Select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="">Tất cả trạng thái ({Object.keys(APPLICATION_STATUS).length})</option>
                {Object.entries(APPLICATION_STATUS).map(([v, s]) => (
                  <option key={v} value={v}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm py-2.5"
            >
              <Filter className="mr-1.5 h-4 w-4" /> Lọc hồ sơ
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void load({ search: search || undefined, status: status || undefined }, pageIndex)}
              title="Tải lại danh sách"
              className="rounded-xl px-3 py-2.5 border-slate-200 dark:border-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`} />
            </Button>
          </div>
        </form>

        {/* CĐT: chọn nhiều hồ sơ đang thẩm định → gửi sang SXD một lần. SXD không có thanh này. */}
        {isDeveloper && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            {submittable.length > 0 ? (
              <>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-950 dark:text-emerald-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                    checked={selected.size === submittable.length}
                    onChange={toggleSelectAll}
                  />
                  Chọn một lúc: đã chọn <strong>{selected.size}</strong> / {submittable.length} hồ sơ đang thẩm định trên trang này
                </label>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-4 py-2 text-xs sm:text-sm shadow-sm shadow-emerald-600/20"
                  size="sm"
                  disabled={selected.size === 0 || bulkSending}
                  onClick={() => void submitSelectedToSxd()}
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  {bulkSending ? 'Đang gửi…' : `Gửi sang Sở một lúc (${selected.size || 0})`}
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs sm:text-sm font-medium text-emerald-950 dark:text-emerald-200">
                  Chọn nhiều hồ sơ <strong>Đang thẩm định</strong> rồi gửi sang Sở một lần. Trang này chưa có hồ sơ đó.
                </p>
                {status !== 'REVIEWING' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-200 text-xs font-semibold"
                    onClick={() => {
                      setStatus('REVIEWING')
                      setPageIndex(1)
                    }}
                  >
                    Lọc đang thẩm định
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {bulkMsg && (
          <Alert variant={bulkMsg.type === 'error' ? 'error' : 'success'}>
            {bulkMsg.text}
          </Alert>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12 gap-3 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="text-sm font-medium">Đang tải danh sách hồ sơ...</span>
          </div>
        )}

        {/* Error state */}
        {error && <Alert variant="error">{error}</Alert>}

        {/* Empty state */}
        {!loading && !error && apps.length === 0 && (
          <div className="my-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-4">
              <FolderOpen className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {search || status ? 'Không tìm thấy hồ sơ phù hợp' : isApplicant ? 'Bạn chưa có hồ sơ đăng ký nào' : 'Chưa có hồ sơ nào'}
            </h3>
            <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {search || status
                ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.'
                : isApplicant
                  ? 'Khám phá danh mục dự án nhà ở xã hội đang mở nhận đăng ký và gửi hồ sơ trực tuyến ngay hôm nay.'
                  : 'Hiện tại chưa có hồ sơ đăng ký nào trong hệ thống.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {(search || status) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-semibold border-slate-200 dark:border-slate-700"
                  onClick={() => {
                    setSearch('')
                    setStatus('')
                    void load({ search: undefined, status: undefined }, 1)
                  }}
                >
                  Xóa bộ lọc
                </Button>
              )}
              {isApplicant && !search && !status && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5 py-2 text-xs sm:text-sm shadow-md shadow-emerald-600/20"
                  onClick={() => navigate('projects')}
                >
                  <Building2 className="mr-1.5 h-4 w-4" /> Khám phá dự án ngay
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Content List: Developer / SXD Table vs Applicant Modern Cards */}
        {(isDeveloper || isSxd) ? (
          apps.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800/80 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      {isDeveloper && <th className="px-4 py-3.5 w-10">Chọn</th>}
                      <th className="px-4 py-3.5">Người đăng ký</th>
                      <th className="px-4 py-3.5">CCCD</th>
                      <th className="px-4 py-3.5">Dự án</th>
                      <th className="px-4 py-3.5">Trạng thái</th>
                      {isSxd && <th className="px-4 py-3.5">Hạn 20 ngày</th>}
                      <th className="px-4 py-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {apps.map((app) => {
                      const canSelect = isDeveloper && app.applicationStatus === 'REVIEWING'
                      const countdown =
                        isSxd && app.applicationStatus === 'PENDING_SXD_REVIEW'
                          ? formatSxdCountdown(app.submittedAt || app.createdAt)
                          : null
                      const openDetail = () => {
                        sessionStorage.setItem('applicationId', app.applicationId)
                        navigate('application-detail')
                      }
                      return (
                        <tr
                          key={app.applicationId}
                          onClick={openDetail}
                          className={`cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${app.isViolation ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                            }`}
                        >
                          {isDeveloper && (
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              {canSelect ? (
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                                  checked={selected.has(app.applicationId)}
                                  onChange={() => toggleSelect(app.applicationId)}
                                  title="Chọn để gửi sang Sở cùng các hồ sơ khác"
                                  aria-label={`Chọn hồ sơ ${app.applicantFullName || app.applicationId}`}
                                />
                              ) : (
                                <span className="block w-4" aria-hidden="true" />
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                {app.applicantFullName ? app.applicantFullName.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <span>{app.applicantFullName || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                            {app.citizenId}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                            {app.projectName || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={app.applicationStatus} />
                          </td>
                          {isSxd && (
                            <td className="px-4 py-3">
                              {countdown ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${countdown.isOverdue
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                    : countdown.days <= 3
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                >
                                  <Clock className="h-3 w-3" />
                                  {countdown.label}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {isDeveloper &&
                                (app.applicationStatus === 'APPROVED' ||
                                  app.applicationStatus === 'APPROVED_BY_TIMEOUT') &&
                                app.projectId && (
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      sessionStorage.setItem('projectId', app.projectId)
                                      navigate('project-detail')
                                    }}
                                  >
                                    <Building2 className="mr-1 h-3.5 w-3.5" />
                                    Cấp căn
                                  </Button>
                                )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs font-semibold"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDetail()
                                }}
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                Xem hồ sơ
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {totalCount > PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Hiển thị {(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, totalCount)} trong tổng số {totalCount} hồ sơ
                  </p>
                  <Pagination pageIndex={pageIndex} totalPages={totalPages} onPageChange={(p) => setPageIndex(p)} />
                </div>
              )}
            </div>
          )
        ) : (
          apps.length > 0 && (
            <div className="grid gap-4">
              {apps.map((app) => {
                const depositCd = formatDepositCountdown(app.applicationStatus, app.updatedAt)
                const isNeedMoreDocs = app.applicationStatus === 'NEED_MORE_DOCUMENTS'
                const isApproved =
                  app.applicationStatus === 'APPROVED' || app.applicationStatus === 'APPROVED_BY_TIMEOUT'
                const isDepositPending = app.applicationStatus === 'DEPOSIT_PENDING'
                const openDetail = () => {
                  sessionStorage.setItem('applicationId', app.applicationId)
                  navigate('application-detail')
                }

                return (
                  <div
                    key={app.applicationId}
                    onClick={openDetail}
                    className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 p-5 sm:p-6 shadow-sm hover:shadow-md ${app.isViolation
                      ? 'border-rose-300 bg-rose-50/20 dark:border-rose-900/60 dark:bg-rose-950/20'
                      : isNeedMoreDocs
                        ? 'border-amber-300 bg-amber-50/20 dark:border-amber-900/60 dark:bg-amber-950/20'
                        : 'border-slate-200/90 bg-white hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700/60'
                      }`}
                  >
                    {/* Top Row: Project info & Status Badge */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-sm">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                              {app.projectName || 'Dự án Nhà ở Xã hội'}
                            </h3>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              #{app.applicationId.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <span>Mã định danh:</span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">{app.applicationId}</span>
                            <CopyButton text={app.applicationId} />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <StatusBadge status={app.applicationStatus} />
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="my-4 border-t border-slate-100 dark:border-slate-800/80" />

                    {/* 4 Informational Tiles */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-slate-50/90 p-3 dark:bg-slate-800/60 border border-slate-100/80 dark:border-slate-800">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Người nộp
                        </span>
                        <p className="mt-1 truncate text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                          {app.applicantFullName || '—'}
                        </p>
                        <p className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          CCCD: {app.citizenId}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50/90 p-3 dark:bg-slate-800/60 border border-slate-100/80 dark:border-slate-800">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Ngày nộp
                        </span>
                        <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                          {app.submittedAt || app.createdAt
                            ? new Date(app.submittedAt || app.createdAt).toLocaleDateString('vi-VN')
                            : '—'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {app.submittedAt ? 'Đã tiếp nhận hồ sơ' : 'Khởi tạo'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50/90 p-3 dark:bg-slate-800/60 border border-slate-100/80 dark:border-slate-800">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Tài liệu
                        </span>
                        <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                          {app.documentCount || 0} tài liệu
                        </p>
                        <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Đã đính kèm xác minh
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50/90 p-3 dark:bg-slate-800/60 border border-slate-100/80 dark:border-slate-800">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <Home className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Điều kiện nhà ở
                        </span>
                        <p
                          className="mt-1 truncate text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                          title={HOUSING_STATUS_LABELS[app.housingStatus]}
                        >
                          {HOUSING_STATUS_LABELS[app.housingStatus] || 'Đã khai báo'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {app.monthlyIncome ? `${(app.monthlyIncome / 1000000).toFixed(1)} tr/tháng` : 'Đã xác thực'}
                        </p>
                      </div>
                    </div>

                    {/* Deposit Deadline Alert */}
                    {depositCd && (
                      <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs sm:text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                          <span>
                            Hạn đóng tiền Đợt 1 ({depositCd.hoursLimit}h từ duyệt): <strong>{depositCd.label}</strong> (Hạn chót:{' '}
                            {depositCd.deadline.toLocaleString('vi-VN')})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Need More Documents Notice */}
                    {isNeedMoreDocs && (
                      <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs sm:text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>Hồ sơ đang yêu cầu bổ sung giấy tờ. Vui lòng kiểm tra danh mục chứng từ và cập nhật.</span>
                      </div>
                    )}

                    {/* Violation Warning */}
                    {app.isViolation && (
                      <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs sm:text-sm font-medium text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        <span>Cảnh báo: {app.violationReason || 'Phát hiện thông tin cần đối soát lại.'}</span>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>Lần cập nhật cuối:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {app.updatedAt
                            ? new Date(app.updatedAt).toLocaleDateString('vi-VN')
                            : app.submittedAt
                              ? new Date(app.submittedAt).toLocaleDateString('vi-VN')
                              : '—'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {isNeedMoreDocs && (
                          <Button
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetail()
                            }}
                          >
                            <FilePlus className="mr-1.5 h-3.5 w-3.5" /> Bổ sung hồ sơ
                          </Button>
                        )}
                        {isApproved && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-sm shadow-emerald-600/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetail()
                            }}
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Xem kết quả & Hợp đồng
                          </Button>
                        )}
                        {isDepositPending && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-sm shadow-emerald-600/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetail()
                            }}
                          >
                            <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Đặt cọc Đợt 1
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:border-slate-700 dark:hover:bg-emerald-950/40 text-xs font-semibold"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetail()
                          }}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Xem chi tiết
                          <ArrowRight className="ml-1 h-3.5 w-3.5 opacity-60" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {totalCount > PAGE_SIZE && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Hiển thị {(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, totalCount)} trong tổng số {totalCount} hồ sơ
                  </p>
                  <Pagination pageIndex={pageIndex} totalPages={totalPages} onPageChange={(p) => setPageIndex(p)} />
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export function CreateApplicationPage() {
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    void ensureVerifiedForApplication({ silent: true }).then((ok) => {
      if (cancelled) return
      setReady(ok)
      setChecking(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4">
      <PageHeader routeId="create-application" />
      {checking ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Đang kiểm tra xác minh danh tính...</p>
      ) : ready ? (
        <CreateApplicationWizard />
      ) : (
        <div className="space-y-4">
          <Alert variant="warning">
            Cần xác minh danh tính (eKYC) trước khi tạo hồ sơ đăng ký nhà ở xã hội. Bạn vẫn có thể
            duyệt dự án và lưu quan tâm mà không cần eKYC.
          </Alert>
          <Button variant="accent" onClick={() => navigate('verify-identity')}>
            Xác minh danh tính
          </Button>
          <Button variant="outline" onClick={() => navigate('applications')}>
            Quay lại danh sách hồ sơ
          </Button>
        </div>
      )}
    </div>
  )
}

function ApplicationDetailInner({ appId }: { appId: string }) {
  const role = getRole()
  const isApplicant = role === 'Applicant'
  const isDeveloper = role === 'Housing Developer'
  const isSxd = role === 'Department Of Construction'
  const isStaff = isDeveloper || isSxd

  const [app, setApp] = useState<ApplicationDetailDto | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [acting, setActing] = useState('')
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawReason, setWithdrawReason] = useState('')
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [docType, setDocType] = useState(Object.keys(DOC_TYPE_LABELS)[0] ?? '')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [, setTick] = useState(0)
  const [apartments, setApartments] = useState<ApartmentDto[]>([])
  const [selectedApartmentId, setSelectedApartmentId] = useState('')
  const [assigningApt, setAssigningApt] = useState(false)

  // Dossier sub-tab (applicant / spouse / members)
  const [dossierTab, setDossierTab] = useState<'applicant' | 'spouse' | 'members'>('applicant')

  // Document preview state
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [imgZoom, setImgZoom] = useState(100)
  const [imgRotate, setImgRotate] = useState(0)

  // AI Audit state
  const [aiAuditing, setAiAuditing] = useState(false)
  const [aiAuditResult, setAiAuditResult] = useState<AuditChecklistResponse | null>(null)
  const [aiAuditError, setAiAuditError] = useState('')

  // Developer Action Modals
  const [requestDocsModalOpen, setRequestDocsModalOpen] = useState(false)
  const [selectedMissingDocs, setSelectedMissingDocs] = useState<string[]>([])
  const [selectedCommonReasons, setSelectedCommonReasons] = useState<string[]>([])
  const [customNote, setCustomNote] = useState('')

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedRejectReason, setSelectedRejectReason] = useState('')
  const [rejectCustomNote, setRejectCustomNote] = useState('')

  const [submitSxdModalOpen, setSubmitSxdModalOpen] = useState(false)

  // Payment / contract state
  const [contractStatus, setContractStatus] = useState<{
    isSigned: boolean
    signedAt?: string | null
    applicationStatus: string
  } | null>(null)
  const [installments, setInstallments] = useState<import('@/api/contracts').PaymentInstallment[]>([])
  const [installmentsError, setInstallmentsError] = useState(false)
  const [contractPrice, setContractPrice] = useState<number | null>(null)
  const [housePrice, setHousePrice] = useState<number | null>(null)
  const [officialPrice, setOfficialPrice] = useState<number | null>(null)
  const [signing, setSigning] = useState(false)

  const refresh = async () => {
    const data = await housingApplicationsApi.getById(appId)
    let parsed = parseApplicationDetail(data)

    // Merge with user profile ONLY IF the current logged-in user IS THE APPLICANT!
    if (isApplicant) {
      try {
        const p = await usersApi.getProfile()
        const u = (p as Record<string, unknown>)?.user ?? (p as Record<string, unknown>)?.User ?? (p as Record<string, unknown>)?.data ?? (p as Record<string, unknown>)?.Data ?? p
        if (u && typeof u === 'object' && parsed) {
          const uObj = u as Record<string, unknown>
          const profileDob = (uObj.dateOfBirth ?? uObj.DateOfBirth ?? uObj.dob ?? uObj.Dob) as string | undefined
          const profileGender = (uObj.gender ?? uObj.Gender ?? uObj.sex ?? uObj.Sex) as string | undefined
          const profilePhone = (uObj.phoneNumber ?? uObj.PhoneNumber ?? uObj.phone ?? uObj.Phone) as string | undefined
          const profileEmail = (uObj.email ?? uObj.Email) as string | undefined
          const profileAddress = (uObj.address ?? uObj.Address) as string | undefined
          const isVerified = Boolean(uObj.isCitizenIdVerified ?? uObj.IsCitizenIdVerified ?? uObj.isEkycVerified ?? uObj.IsEkycVerified ?? (parsed.citizenId && parsed.citizenId.length === 12))

          if (parsed.citizenId) {
            try {
              const cacheData = {
                fullName: uObj.fullName ?? uObj.FullName ?? parsed.fullName,
                citizenId: parsed.citizenId,
                phoneNumber: profilePhone,
                email: profileEmail,
                dateOfBirth: profileDob,
                gender: profileGender,
                address: profileAddress,
                placeOfOrigin: profileAddress,
                isEkycVerified: isVerified,
              }
              localStorage.setItem(`applicant_profile_${parsed.citizenId}`, JSON.stringify(cacheData))
              localStorage.setItem('last_citizen_profile', JSON.stringify(cacheData))
            } catch { /* ignore */ }
          }

          parsed = {
            ...parsed,
            dateOfBirth: parsed.dateOfBirth || profileDob || parsed.dateOfBirth,
            gender: parsed.gender || profileGender || parsed.gender,
            phoneNumber: parsed.phoneNumber || profilePhone || parsed.phoneNumber,
            email: parsed.email || profileEmail || parsed.email,
            placeOfOrigin: parsed.placeOfOrigin || profileAddress || parsed.placeOfOrigin,
            isEkycVerified: parsed.isEkycVerified || isVerified,
          }
        }
      } catch {
        /* ignore */
      }
    }

    setApp(parsed)

    // Select first document by default if none selected
    if (parsed?.documents && parsed.documents.length > 0) {
      setSelectedDocId((prev) => (prev && parsed?.documents?.some((d) => d.documentId === prev) ? prev : parsed?.documents?.[0]?.documentId ?? null))
    }

    // Load contract status + installments
    try {
      const s = await contractApi.getStatus(appId)
      const cParsed = parseContractStatus(s)
      setContractStatus(cParsed ? { isSigned: cParsed.isSigned, signedAt: cParsed.signedAt, applicationStatus: cParsed.applicationStatus } : null)
    } catch { setContractStatus(null) }

    try {
      const i = await contractApi.getInstallments(appId)
      const env = parseInstallmentsEnvelope(i)
      setInstallments(env.installments)
      setInstallmentsError(false)
      setContractPrice(env.contractPrice ?? null)
      setHousePrice(env.housePrice ?? null)
      setOfficialPrice(env.officialPrice ?? null)
    } catch {
      setInstallments([])
      setInstallmentsError(true)
      setContractPrice(null)
      setHousePrice(null)
      setOfficialPrice(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        await refresh()
      } catch (err) {
        if (!cancelled) setMsg({ type: 'error', text: formatError(err) })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [appId])

  useEffect(() => {
    const status = app?.applicationStatus
    if (!status) return
    const depositActive = status === 'APPROVED' || status === 'APPROVED_BY_TIMEOUT'
    if (status !== 'PENDING_SXD_REVIEW' && !depositActive) return
    const ms = depositActive ? 1_000 : 60_000
    const id = window.setInterval(() => setTick((t) => t + 1), ms)
    return () => window.clearInterval(id)
  }, [app?.applicationStatus])

  // Load available apartments for assignment
  useEffect(() => {
    if (!isStaff || !app?.projectId) return
    const canAssign =
      !app.apartmentId &&
      (['CONTRACT_PENDING', 'CONTRACT_SIGNED', 'DEPOSIT_PAID', 'FULLY_PAID'].includes(app.applicationStatus) ||
        app.lotteryResult === 'WON' ||
        app.lotteryResult === 'PRIORITY_WON')
    if (!canAssign && !app.apartmentId) return
    let cancelled = false
    void housingProjectsApi
      .getById(app.projectId)
      .then((data) => {
        if (cancelled) return
        // Chỉ hiện căn hồ sơ này thực sự được nhận: đúng loại nguyện vọng và đúng quỹ căn.
        // Backend chặn bằng ApartmentAssignmentGate, ở đây lọc để cán bộ không chọn thử rồi báo lỗi.
        setApartments(
          parseApartments(data).filter(
            (t) =>
              t.id === app.apartmentId ||
              (String(t.status).toUpperCase() === 'AVAILABLE' && isAssignableUnit(app, t)),
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setApartments([])
      })
    return () => {
      cancelled = true
    }
  }, [app?.projectId, app?.applicationStatus, app?.apartmentId, app?.lotteryResult, isStaff])

  const runAiAudit = async () => {
    if (aiAuditing) return
    setAiAuditing(true)
    setAiAuditError('')
    setAiAuditResult(null)
    try {
      const data = await housingApplicationsApi.auditDocuments(appId, app ? {
        applicationInfo: app,
        documentIds: (app.documents ?? []).map((d) => d.documentId),
      } : undefined)
      const parsed = parseAuditChecklist(data)
      setAiAuditResult(
        parsed ?? {
          summary: 'AI không trả về checklist chi tiết. Hãy đối chiếu các mục trong hồ sơ.',
          checks: [],
        },
      )
    } catch (err) {
      setAiAuditError(formatError(err))
    } finally {
      setAiAuditing(false)
    }
  }

  const assignApartment = async () => {
    if (!selectedApartmentId || assigningApt) return
    setAssigningApt(true)
    setMsg(null)
    try {
      await housingApplicationsApi.assignApartment(appId, selectedApartmentId)
      await refresh()
      setSelectedApartmentId('')
      setMsg({ type: 'success', text: 'Đã bàn giao căn và sinh lịch thanh toán theo đợt.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setAssigningApt(false)
    }
  }

  const handleDeveloperRequestMoreDocs = async () => {
    if (acting) return
    const parts: string[] = []
    if (selectedMissingDocs.length > 0) {
      parts.push(`[Giấy tờ cần bổ sung]: ${selectedMissingDocs.join(', ')}`)
    }
    if (selectedCommonReasons.length > 0) {
      parts.push(`[Lý do]: ${selectedCommonReasons.join('; ')}`)
    }
    if (customNote.trim()) {
      parts.push(`[Ghi chú thêm]: ${customNote.trim()}`)
    }
    const fullNote = parts.join('\n') || 'Chủ đầu tư yêu cầu bổ sung hồ sơ theo quy định.'
    setActing('Housing Developer-REQUEST_MORE_DOCUMENTS')
    setMsg(null)
    try {
      await housingApplicationsApi.developerReview(appId, {
        action: 'REQUEST_MORE_DOCUMENTS',
        note: fullNote,
      })
      setRequestDocsModalOpen(false)
      setSelectedMissingDocs([])
      setSelectedCommonReasons([])
      setCustomNote('')
      await refresh()
      setMsg({ type: 'success', text: 'Đã gửi yêu cầu bổ sung tài liệu đến người nộp.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setActing('')
    }
  }

  const handleDeveloperReject = async () => {
    if (acting) return
    if (!selectedRejectReason && !rejectCustomNote.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng chọn lý do hoặc nhập giải trình từ chối.' })
      return
    }
    const fullNote = [selectedRejectReason, rejectCustomNote.trim()].filter(Boolean).join('. ')
    setActing('Housing Developer-REJECT')
    setMsg(null)
    try {
      await housingApplicationsApi.developerReview(appId, {
        action: 'REJECT',
        note: fullNote,
      })
      setRejectModalOpen(false)
      setSelectedRejectReason('')
      setRejectCustomNote('')
      await refresh()
      setMsg({ type: 'success', text: 'Đã cập nhật trạng thái từ chối hồ sơ.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setActing('')
    }
  }

  const handleDeveloperSubmitToSxd = async () => {
    if (acting) return
    setActing('submit-sxd')
    setMsg(null)
    try {
      await housingApplicationsApi.submitToDepartment([appId])
      setSubmitSxdModalOpen(false)
      await refresh()
      setMsg({ type: 'success', text: 'Đã gửi hồ sơ lên Sở Xây dựng thẩm định.' })
      setReceiptOpen(true)
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setActing('')
    }
  }

  const sxdReview = async (action: string, needNote = false) => {
    if (acting) return
    let note: string | null = null
    if (needNote) {
      note = window.prompt('Nhập ghi chú / lý do:')
      if (!note?.trim()) { setMsg({ type: 'error', text: 'Ghi chú là bắt buộc.' }); return }
    }
    setActing(`Department Of Construction-${action}`)
    try {
      await housingApplicationsApi.sxdReview(appId, { action, note: note?.trim() || null })
      await refresh()
      setMsg({ type: 'success', text: 'Cập nhật hồ sơ thành công.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setActing('')
    }
  }

  const handleSign = async () => {
    if (signing) return
    setSigning(true)
    setMsg(null)
    try {
      await contractApi.sign(appId)
      await refresh()
      setMsg({ type: 'success', text: 'Đã ký HĐ thành công. Đợt 2 (20%) đã tự mở — có thể đóng ngay.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setSigning(false)
    }
  }

  const confirmWithdraw = async () => {
    if (!withdrawReason.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập lý do rút hồ sơ.' })
      return
    }
    setActing('cancel')
    setMsg(null)
    try {
      await housingApplicationsApi.cancel(appId, withdrawReason.trim())
      setWithdrawOpen(false)
      setWithdrawReason('')
      await refresh()
      setMsg({ type: 'success', text: 'Đã rút hồ sơ.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setActing('')
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm font-medium">Đang tải chi tiết hồ sơ đăng ký...</p>
    </div>
  )
  if (!app) return <Alert variant="error">Không đọc được dữ liệu hồ sơ.</Alert>

  const canEditDocs = isApplicant && (app.applicationStatus === 'DRAFT' || app.applicationStatus === 'NEED_MORE_DOCUMENTS')
  const needMoreNote = (app.reviewHistories ?? [])
    .filter((h) => h.newStatus === 'NEED_MORE_DOCUMENTS' || h.action?.includes('REQUEST_MORE'))
    .at(-1)?.note
  const countdown =
    app.applicationStatus === 'PENDING_SXD_REVIEW'
      ? formatSxdCountdown(app.submittedAt || app.createdAt)
      : null
  const deposit1Paid = isPhase1Paid(installments, app.applicationStatus)
  const deposit2Paid = installments.some(i => i.ordinal === 2 && i.status === 'PAID')
  const depositCountdown = !deposit1Paid && !deposit2Paid ? formatDepositCountdown(app.applicationStatus, app.updatedAt) : null

  // Active document for preview
  const currentDoc = (app.documents ?? []).find((d) => d.documentId === selectedDocId) || (app.documents ?? [])[0]
  const isPdf = currentDoc ? currentDoc.fileUrl?.toLowerCase().includes('.pdf') || currentDoc.fileName?.toLowerCase().endsWith('.pdf') : false

  // Total monthly income calculation
  const applicantIncome = Number(app.monthlyIncome ?? app.estimatedMonthlyIncome ?? 0)
  const spouseIncome = Number(app.spouseMonthlyIncome ?? 0)
  const membersIncome = (app.householdMembers ?? []).reduce((acc, m) => acc + Number(m.monthlyIncome ?? 0), 0)
  const totalFamilyIncome = applicantIncome + spouseIncome + membersIncome
  const totalOccupants = 1 + (app.maritalStatus === 'MARRIED' || app.spouseFullName ? 1 : 0) + (app.householdMembers?.length ?? 0)
  const calculatedAvgArea = app.totalHousingArea && totalOccupants > 0 ? (app.totalHousingArea / totalOccupants).toFixed(1) : app.averageHousingAreaPerPerson

  // Applicant avatar initials
  const applicantInitials = app.fullName
    ? app.fullName
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
    : 'HS'

  return (
    <div className="space-y-6">
      {/* ===== HERO APPLICANT CARD ===== */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/40 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Avatar + Details */}
          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-lg font-black text-white shadow-md shadow-blue-500/20 ring-4 ring-white dark:ring-slate-800">
              {applicantInitials}
              {app.isEkycVerified && (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-slate-900" title="Đã xác thực eKYC CCCD chip">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {app.fullName || 'Người nộp hồ sơ'}
                </h1>
                <StatusBadge status={app.applicationStatus} />
                {app.isEkycVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" /> eKYC Đã xác thực
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    <AlertCircle className="h-3.5 w-3.5" /> Chưa qua eKYC
                  </span>
                )}
              </div>

              {/* Meta pills */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  Dự án: <strong className="font-semibold text-slate-700 dark:text-slate-200">{app.projectName || 'NOXH'}</strong>
                </span>
                <span className="inline-flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                  CCCD: <strong className="font-mono text-slate-700 dark:text-slate-200">{app.citizenId}</strong>
                  <CopyButton text={app.citizenId} />
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  Mã hồ sơ: <span className="font-mono text-slate-600 dark:text-slate-300">{app.applicationId.slice(0, 10)}...</span>
                  <CopyButton text={app.applicationId} />
                </span>
                {app.slotCode && (
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                    Mã suất: {app.slotCode}
                  </span>
                )}
                {app.submittedAt && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Nộp ngày: {new Date(app.submittedAt).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* APPLICANT ACTIONS */}
            {isApplicant && app.applicationStatus === 'DRAFT' && (
              <Button
                variant="accent"
                size="sm"
                disabled={acting === 'submit'}
                onClick={async () => {
                  if (acting) return
                  setActing('submit')
                  try {
                    await housingApplicationsApi.submit(app.applicationId)
                    await refresh()
                    setMsg({ type: 'success', text: 'Đã nộp hồ sơ thành công.' })
                    setReceiptOpen(true)
                  } catch (err) {
                    setMsg({ type: 'error', text: formatError(err) })
                  } finally {
                    setActing('')
                  }
                }}
              >
                {acting === 'submit' ? 'Đang nộp...' : 'Nộp hồ sơ chính thức'}
              </Button>
            )}

            {isApplicant && app.applicationStatus === 'NEED_MORE_DOCUMENTS' && (
              <Button
                variant="accent"
                size="sm"
                disabled={acting === 'submit'}
                onClick={async () => {
                  if (acting) return
                  setActing('submit')
                  try {
                    await housingApplicationsApi.submit(app.applicationId)
                    await refresh()
                    setMsg({ type: 'success', text: 'Đã nộp lại hồ sơ sau khi bổ sung.' })
                  } catch (err) {
                    setMsg({ type: 'error', text: formatError(err) })
                  } finally {
                    setActing('')
                  }
                }}
              >
                {acting === 'submit' ? 'Đang nộp...' : 'Nộp lại sau bổ sung'}
              </Button>
            )}

            {isApplicant && !['APPROVED', 'APPROVED_BY_TIMEOUT', 'DEPOSIT_PAID', 'CONTRACT_SIGNED', 'CONTRACT_PENDING', 'REJECTED', 'CANCELED', 'EXPIRED', 'LOTTERY_LOST', 'CANCELLATION_REQUESTED'].includes(app.applicationStatus) && (
              <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50 dark:text-rose-400" disabled={acting === 'cancel'} onClick={() => setWithdrawOpen(true)}>
                Rút hồ sơ
              </Button>
            )}

            {/* DEVELOPER ACTIONS */}
            {isDeveloper && ['SUBMITTED', 'NEED_MORE_DOCUMENTS'].includes(app.applicationStatus) && (
              <Button
                variant="accent"
                size="sm"
                disabled={acting === 'assign'}
                onClick={async () => {
                  if (acting) return
                  setActing('assign')
                  try {
                    await housingApplicationsApi.assign(app.applicationId)
                    await refresh()
                    setMsg({ type: 'success', text: 'Đã tiếp nhận hồ sơ vào danh sách thẩm định.' })
                  } catch (err) {
                    setMsg({ type: 'error', text: formatError(err) })
                  } finally {
                    setActing('')
                  }
                }}
              >
                {acting === 'assign' ? 'Đang tiếp nhận...' : 'Nhận hồ sơ thẩm định'}
              </Button>
            )}

            {isDeveloper && app.applicationStatus === 'REVIEWING' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
                  disabled={!!acting}
                  onClick={() => setRequestDocsModalOpen(true)}
                >
                  🟡 Yêu cầu bổ sung
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-400 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                  disabled={!!acting}
                  onClick={() => setRejectModalOpen(true)}
                >
                  🔴 Từ chối
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                  disabled={!!acting}
                  onClick={() => setSubmitSxdModalOpen(true)}
                >
                  🟢 Đạt sơ duyệt → Trình SXD
                </Button>
              </>
            )}

            {/* SXD ACTIONS */}
            {isSxd && app.applicationStatus === 'PENDING_SXD_REVIEW' && (
              <>
                <Button variant="accent" size="sm" disabled={!!acting} onClick={() => void sxdReview('APPROVE')}>
                  Phê duyệt
                </Button>
                <Button variant="outline" size="sm" disabled={!!acting} onClick={() => void sxdReview('REJECT', true)}>
                  Từ chối
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-400 text-amber-700 dark:text-amber-300"
                  disabled={!!acting}
                  onClick={async () => {
                    const note = window.prompt('Yêu cầu CĐT bổ sung giấy tờ — nhập nội dung:')
                    if (!note?.trim()) return
                    setActing('request-docs')
                    try {
                      await housingApplicationsApi.sxdRequestDocs(app.applicationId, note.trim())
                      await refresh()
                      setMsg({ type: 'success', text: 'Đã gửi yêu cầu bổ sung giấy tờ.' })
                    } catch (err) {
                      setMsg({ type: 'error', text: formatError(err) })
                    } finally {
                      setActing('')
                    }
                  }}
                >
                  <FilePlus className="mr-1.5 h-3.5 w-3.5" /> Yêu cầu bổ sung
                </Button>
                {app.isViolation ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-400 text-emerald-700 dark:text-emerald-300"
                    disabled={!!acting}
                    title="Gỡ cờ — hồ sơ sẽ trở lại danh sách bốc thăm / chốt suất nếu được phê duyệt."
                    onClick={async () => {
                      if (!window.confirm('Gỡ cờ vi phạm cho hồ sơ này?')) return
                      setActing('unflag')
                      try {
                        await housingApplicationsApi.unflagViolation(app.applicationId)
                        await refresh()
                        setMsg({ type: 'success', text: 'Đã gỡ cờ vi phạm.' })
                      } catch (err) {
                        setMsg({ type: 'error', text: formatError(err) })
                      } finally {
                        setActing('')
                      }
                    }}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Gỡ cờ vi phạm
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-400 text-rose-700 dark:text-rose-300"
                    disabled={!!acting}
                    title="Gắn khi phát hiện gian lận (trùng CCCD, đã có nhà đất). Loại khỏi bốc thăm / chốt suất."
                    onClick={async () => {
                      const reason = window.prompt('Lý do gắn cờ vi phạm (VD: CCCD trùng, đã có nhà đất):')
                      if (!reason?.trim()) return
                      setActing('flag')
                      try {
                        await housingApplicationsApi.flagViolation(app.applicationId, reason.trim())
                        await refresh()
                        setMsg({ type: 'success', text: 'Đã gắn cờ vi phạm cho hồ sơ.' })
                      } catch (err) {
                        setMsg({ type: 'error', text: formatError(err) })
                      } finally {
                        setActing('')
                      }
                    }}
                  >
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Gắn cờ vi phạm
                  </Button>
                )}
              </>
            )}

            {(app.receiptUrl || app.applicationStatus !== 'DRAFT') && (
              <Button variant="outline" size="sm" onClick={() => setReceiptOpen(true)} className="bg-white/90 shadow-sm hover:bg-white dark:bg-slate-800">
                <Printer className="mr-1.5 h-4 w-4 text-blue-600 dark:text-blue-400" /> Phiếu tiếp nhận
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ===== CẢNH BÁO & THÔNG BÁO ===== */}
      {(app.isViolation || app.violationReason) && (
        <Alert variant="error" className="shadow-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <strong className="text-rose-800 dark:text-rose-200">Cảnh báo vi phạm nghiêm trọng:</strong>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">
                {app.violationReason || 'Hồ sơ bị đánh dấu vi phạm điều kiện mua NOXH (trùng CCCD, đã sở hữu nhà đất hoặc không trung thực).'}
              </p>
            </div>
          </div>
        </Alert>
      )}

      {isApplicant && depositCountdown && (
        <Alert variant={depositCountdown.isOverdue ? 'error' : 'warning'} className="shadow-sm">
          <strong>Hạn thanh toán Đợt 1 ({depositCountdown.daysLimit} ngày sau khi duyệt):</strong>{' '}
          {depositCountdown.isOverdue
            ? <>Đã quá hạn đóng cọc Đợt 1 — hồ sơ có thể bị hủy nếu không thanh toán.</>
            : <>Còn lại: <strong>{depositCountdown.label}</strong></>}
          {' · '}đến {depositCountdown.deadline.toLocaleString('vi-VN')}
        </Alert>
      )}

      {app.applicationStatus === 'NEED_MORE_DOCUMENTS' && (
        <Alert variant="warning" className="shadow-sm">
          <strong>Yêu cầu bổ sung hồ sơ từ Chủ đầu tư:</strong>
          <p className="mt-1 whitespace-pre-line text-amber-900 dark:text-amber-200">
            {needMoreNote || 'Chủ đầu tư yêu cầu kiểm tra lại giấy tờ, chụp rõ nét và tải lên các bản sao còn thiếu.'}
          </p>
        </Alert>
      )}

      {countdown && isSxd && (
        <Alert variant={countdown.isOverdue ? 'error' : countdown.days <= 3 ? 'warning' : 'info'} className="shadow-sm">
          Hạn thẩm định 20 ngày của Sở Xây Dựng: <strong>{countdown.label}</strong>
          {' · '}đến {countdown.deadline.toLocaleString('vi-VN')}
          {countdown.isOverdue && ' — hệ thống có thể tự kích hoạt quy trình phê duyệt quá hạn.'}
        </Alert>
      )}

      {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}

      {/* ===== TIẾN ĐỘ HỒ SƠ (KHỚP MOBILE / LUỒNG THỰC TẾ) ===== */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Tiến độ hồ sơ
        </h3>
        <ApplicationTimeline
          currentStatus={app.applicationStatus}
          depositPaid={deposit1Paid}
          needMoreNote={needMoreNote}
        />
      </div>

      {/* ===== MAIN GRID LAYOUT (7 CỘT TRÁI - 5 CỘT PHẢI) ===== */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* ===== CỘT TRÁI (HỒ SƠ & THẨM ĐỊNH PHÁP LÝ) - 7 CỘT ===== */}
        <div className="space-y-6 lg:col-span-7">
          {/* 1. THẨM ĐỊNH 3 ĐIỀU KIỆN LUẬT NHÀ Ở 2023 */}
          <HardRulesComplianceCard
            app={app}
            totalFamilyIncome={totalFamilyIncome}
            calculatedAvgArea={calculatedAvgArea}
          />

          {/* 2. HỒ SƠ ĐỊNH DANH & NHÂN KHẨU HỘ GIA ĐÌNH (UNIFIED TABBED DOSSIER) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Dossier Tabs Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Thông tin định danh & Nhân khẩu
                </h3>
              </div>

              {/* Segmented Control */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setDossierTab('applicant')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${dossierTab === 'applicant' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  <User className="h-3.5 w-3.5" />
                  Người nộp
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('spouse')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${dossierTab === 'spouse' ? 'bg-white text-rose-700 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  <Heart className="h-3.5 w-3.5 text-rose-500" />
                  Hôn nhân & Vợ/Chồng
                  {app.spouseFullName && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('members')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${dossierTab === 'members' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  Thành viên ({app.householdMembers?.length ?? 0})
                </button>
              </div>
            </div>

            {/* TAB CONTENT: NGƯỜI NỘP HỒ SƠ */}
            {dossierTab === 'applicant' && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  <DetailRow label="Họ và tên" value={app.fullName} />
                  <DetailRow
                    label="Số CCCD / Định danh"
                    value={
                      <span className="flex items-center justify-end gap-1">
                        <span className="font-mono">{app.citizenId}</span>
                        <CopyButton text={app.citizenId} />
                      </span>
                    }
                  />
                  <DetailRow label="Ngày sinh" value={formatDobDisplay(app.dateOfBirth)} />
                  <DetailRow label="Giới tính" value={GENDER_LABELS[app.gender || ''] ?? app.gender ?? '—'} />
                  <DetailRow label="Số điện thoại" value={app.phoneNumber || '—'} />
                  <DetailRow label="Email liên hệ" value={app.email || '—'} />
                  <DetailRow label="Quê quán" value={app.placeOfOrigin || '—'} />
                  <DetailRow label="Quốc tịch" value={app.nationality || 'Việt Nam'} />
                  <DetailRow label="Nghề nghiệp" value={app.occupation || '—'} />
                  <DetailRow label="Nơi làm việc" value={app.workPlace || '—'} />
                  <DetailRow
                    label="Thu nhập cá nhân"
                    value={applicantIncome > 0 ? `${applicantIncome.toLocaleString('vi-VN')} VNĐ/tháng` : '0 VNĐ'}
                  />
                  <DetailRow label="Nơi ở hiện tại" value={app.currentResidence || '—'} />
                  <DetailRow label="Thường trú / Tạm trú" value={app.permanentAddress || '—'} />
                  <DetailRow label="Thực trạng nhà ở" value={HOUSING_STATUS_LABELS[app.housingStatus] ?? app.housingStatus} />
                  <DetailRow
                    label="Tổng diện tích nhà"
                    value={
                      app.totalHousingArea
                        ? `${app.totalHousingArea} m²`
                        : app.housingStatus === 'NO_HOUSING'
                          ? '0 m² (Chưa sở hữu nhà)'
                          : '—'
                    }
                  />
                  <DetailRow
                    label="DT bình quân / người"
                    value={
                      app.housingStatus === 'NO_HOUSING'
                        ? '0 m²/người (Đạt chuẩn NOXH)'
                        : calculatedAvgArea
                          ? `${calculatedAvgArea} m²/người`
                          : '—'
                    }
                  />
                  <DetailRow
                    label="Loại căn mong muốn"
                    value={
                      app.desiredApartmentTypeLabel ||
                      app.desiredApartmentType ||
                      (app.apartmentUnitName
                        ? `Căn được cấp: ${app.apartmentUnitName}`
                        : 'Phân bổ theo bốc thăm của CĐT')
                    }
                  />
                  {app.lotteryResult && (
                    <DetailRow label="Kết quả bốc thăm" value={LOTTERY_RESULT_LABELS[app.lotteryResult] ?? app.lotteryResult} />
                  )}
                  {app.waitlistNumber != null && (
                    <DetailRow
                      label="Số thứ tự hàng chờ"
                      value={`#${app.waitlistNumber} — không hủy hồ sơ; suất trả lại đôn theo hạng, hạn xác nhận 48 giờ`}
                    />
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: HÔN NHÂN & VỢ / CHỒNG */}
            {dossierTab === 'spouse' && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  <DetailRow label="Tình trạng hôn nhân" value={MARITAL_STATUS_LABELS[app.maritalStatus || ''] ?? app.maritalStatus ?? '—'} />
                  {app.spouseFullName ? (
                    <>
                      <DetailRow label="Họ tên vợ / chồng" value={app.spouseFullName} />
                      <DetailRow
                        label="CCCD vợ / chồng"
                        value={
                          <span className="flex items-center justify-end gap-1">
                            <span className="font-mono">{app.spouseCitizenId || '—'}</span>
                            {app.spouseCitizenId && <CopyButton text={app.spouseCitizenId} />}
                          </span>
                        }
                      />
                      <DetailRow label="Ngày sinh vợ / chồng" value={formatDobDisplay(app.spouseDateOfBirth)} />
                      <DetailRow label="Thu nhập vợ / chồng" value={spouseIncome > 0 ? `${spouseIncome.toLocaleString('vi-VN')} VNĐ/tháng` : '0 VNĐ'} />
                    </>
                  ) : (
                    <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                      Người nộp hồ sơ kê khai tình trạng độc thân hoặc không cung cấp thông tin vợ/chồng.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: THÀNH VIÊN HỘ KHẨU & NGƯỜI THÂN */}
            {dossierTab === 'members' && (
              <div className="mt-4 space-y-3">
                {(app.householdMembers ?? []).length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                        <tr>
                          <th className="px-3.5 py-3">Họ tên & Nghề nghiệp</th>
                          <th className="px-3.5 py-3">Mối quan hệ</th>
                          <th className="px-3.5 py-3">CCCD / Ngày sinh</th>
                          <th className="px-3.5 py-3">Thu nhập hàng tháng</th>
                          <th className="px-3.5 py-3">Diện đối tượng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {app.householdMembers!.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-3.5 py-3 font-medium text-slate-900 dark:text-slate-100">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</span>
                                {m.occupation && <span className="text-xs font-normal text-slate-500">{m.occupation}</span>}
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">
                              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {RELATIONSHIP_LABELS[m.relationship] ?? m.relationship}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-xs">
                              <div className="flex flex-col gap-1">
                                {m.citizenId && (
                                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 leading-normal">
                                    {m.citizenId}
                                  </span>
                                )}
                                {m.dateOfBirth && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                    {formatDobDisplay(m.dateOfBirth)}
                                  </span>
                                )}
                                {!m.citizenId && !m.dateOfBirth && <span className="text-slate-400">—</span>}
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {m.monthlyIncome != null ? `${Number(m.monthlyIncome).toLocaleString('vi-VN')} đ` : '0 đ'}
                            </td>
                            <td className="px-3.5 py-3 text-xs">
                              <div className="flex flex-wrap gap-1">
                                {m.isDependent && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" title={m.dependentReason || undefined}>
                                    Phụ thuộc
                                  </span>
                                )}
                                {m.hasMeritService && (
                                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" title={m.meritDetails || undefined}>
                                    Có công CM
                                  </span>
                                )}
                                {!m.isDependent && !m.hasMeritService && (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                    Không có thành viên cùng hộ gia đình kê khai thêm.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. CĂN HỘ ĐƯỢC CẤP & TIẾN ĐỘ THANH TOÁN 6 ĐỢT */}
          {(isStaff || app.apartmentId) && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 flex items-center gap-2 border-b pb-3 font-bold text-slate-800 dark:text-slate-100 dark:border-slate-800">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Căn hộ được cấp & Bàn giao
              </h3>
              {app.apartmentId ? (
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  <DetailRow label="Mã căn hộ" value={app.apartmentUnitName || '—'} />
                  <DetailRow label="Diện tích căn" value={app.apartmentArea != null ? `${app.apartmentArea} m²` : '—'} />
                  <DetailRow label="Giá bán chính thức" value={app.apartmentPrice != null ? `${Number(app.apartmentPrice).toLocaleString('vi-VN')} VNĐ` : '—'} />
                  <DetailRow label="Trạng thái căn" value={String(app.apartmentStatus || '').toUpperCase() === 'ASSIGNED' ? 'Đã gán cho hồ sơ này' : app.apartmentStatus || '—'} />
                </div>
              ) : isStaff && (['CONTRACT_PENDING', 'CONTRACT_SIGNED', 'DEPOSIT_PAID', 'FULLY_PAID'].includes(app.applicationStatus) || app.lotteryResult === 'WON' || app.lotteryResult === 'PRIORITY_WON') ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Hồ sơ đã trúng bốc thăm / đủ điều kiện ký hợp đồng nhưng chưa được gán căn. Vui lòng chọn căn trống dưới đây để bàn giao:
                  </p>
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                    <p>
                      Nguyện vọng đã đăng ký:{' '}
                      <strong>{app.desiredApartmentTypeLabel || app.desiredApartmentType || 'không khai loại căn'}</strong>
                      {' · '}Quỹ căn được nhận:{' '}
                      <strong>{app.priorityGroup ? 'ưu tiên và tiêu chuẩn' : 'chỉ tiêu chuẩn'}</strong>
                    </p>
                    <p className="mt-1 text-blue-700 dark:text-blue-300">
                      Danh sách dưới đây đã lọc theo hai điều kiện trên. Suất trúng được đếm theo từng loại căn,
                      nên gán lệch loại sẽ làm sai số suất còn lại và ảnh hưởng hồ sơ khác.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      id="assign-apt-select"
                      className="max-w-md"
                      value={selectedApartmentId}
                      onChange={(e) => setSelectedApartmentId(e.target.value)}
                      disabled={assigningApt || apartments.length === 0}
                    >
                      <option value="">{apartments.length > 0 ? '--- Chọn căn hộ phù hợp ---' : 'Không có căn trống nào khớp nguyện vọng & quỹ căn của hồ sơ này'}</option>
                      {apartments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.unitName} · Tầng {a.floorNumber ?? '—'} · {a.area}m² · {a.apartmentTypeLabel || a.apartmentType || 'chưa gắn loại'} · {Number(a.price).toLocaleString('vi-VN')} VNĐ
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="accent"
                      disabled={!selectedApartmentId || assigningApt}
                      onClick={() => void assignApartment()}
                    >
                      {assigningApt ? 'Đang bàn giao...' : 'Bàn giao căn này'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Hồ sơ chưa được cấp căn hộ.</p>
              )}
            </div>
          )}

          {/* Căn hộ Card & Ký Hợp đồng */}
          <ApartmentCard
            apartmentUnitName={app.apartmentUnitName}
            apartmentArea={app.apartmentArea}
            apartmentPrice={app.apartmentPrice}
            projectName={app.projectName}
            lotteryResult={app.lotteryResult}
          />

          <SignContractSection
            canSign={
              isApplicant &&
              canSignAfterDeposit({
                applicationStatus: contractStatus?.applicationStatus || app.applicationStatus,
                hasApartment: !!app.apartmentId,
                depositPaid: deposit1Paid,
              }) &&
              !contractStatus?.isSigned
            }
            signing={signing}
            onSign={() => void handleSign()}
            applicationId={appId}
            applicationStatus={contractStatus?.applicationStatus ?? app.applicationStatus}
          />
          {isApplicant && deposit1Paid && !app.apartmentId && !contractStatus?.isSigned && (
            <Alert variant="info">
              Đã đóng cọc Đợt 1. Chủ đầu tư cần gán căn hộ cụ thể trước khi bạn ký hợp đồng.
            </Alert>
          )}

          {/* Lịch thanh toán theo cấu hình chủ đầu tư */}
          <PaymentSection
            installments={installments}
            paid={installments.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.paidAmount ?? i.amount), 0)}
            remaining={summarizeInstallments(installments).remaining}
            progress={summarizeInstallments(installments).progress}
            contractPrice={contractPrice}
            officialPrice={officialPrice}
            housePrice={housePrice}
            signedAt={contractStatus?.signedAt ?? null}
            applicationId={appId}
            applicationStatus={contractStatus?.applicationStatus ?? app.applicationStatus}
            hasError={installmentsError}
            hasApartment={!!app.apartmentId}
            onReload={() => void refresh()}
            role={role}
            projectId={app.projectId}
          />

          {/* LỊCH SỬ XÉT DUYỆT */}
          {(app.reviewHistories ?? []).length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 font-bold text-slate-800 dark:text-slate-100">Lịch sử thẩm định & Nhật ký xử lý</h3>
              <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {app.reviewHistories!.map((h, i) => (
                  <li key={i} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <strong className="text-slate-800 dark:text-slate-200">
                        {labelApplicationStatus(h.oldStatus)} → {labelApplicationStatus(h.newStatus)}
                      </strong>
                      <span className="text-xs text-slate-400">
                        {new Date(h.changedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <User className="h-3.5 w-3.5" />
                      <span>{h.changedByFullName || h.changedBy || 'Hệ thống'}</span>
                    </div>
                    {h.note && (
                      <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                        {h.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ===== CỘT PHẢI (KHUNG XEM TÀI LIỆU TRÊN + KIỂM TRA AI BÊN DƯỚI) - 5 CỘT ===== */}
        <div className="space-y-6 lg:col-span-5">
          {/* KHUNG XEM TÀI LIỆU (Interactive Document Preview Frame) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900 flex flex-col">
            {/* Header Document Selector */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Khung xem tài liệu đính kèm ({app.documents?.length ?? 0})
                  </span>
                </div>
                {currentDoc && (
                  <div className="flex items-center gap-2">
                    <a
                      href={currentDoc.fileUrl}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Mở tab mới <ExternalLink className="h-3 w-3" />
                    </a>
                    {canEditDocs && (
                      <button
                        type="button"
                        disabled={deletingId === currentDoc.documentId}
                        onClick={async () => {
                          if (deletingId) return
                          if (!window.confirm(`Xóa tài liệu "${DOC_TYPE_LABELS[currentDoc.documentType] ?? currentDoc.documentType}"?`)) return
                          setDeletingId(currentDoc.documentId)
                          try {
                            await housingApplicationsApi.deleteDocument(app.applicationId, currentDoc.documentId)
                            await refresh()
                            setMsg({ type: 'success', text: 'Đã xóa tài liệu.' })
                          } catch (err) {
                            setMsg({ type: 'error', text: formatError(err) })
                          } finally {
                            setDeletingId(null)
                          }
                        }}
                        className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
                      >
                        {deletingId === currentDoc.documentId ? 'Đang xóa...' : 'Xóa tệp'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tabs chọn nhanh tài liệu */}
              {(app.documents ?? []).length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {app.documents!.map((d) => {
                    const isSelected = d.documentId === currentDoc?.documentId
                    return (
                      <button
                        key={d.documentId}
                        type="button"
                        onClick={() => setSelectedDocId(d.documentId)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                      >
                        {DOC_TYPE_LABELS[d.documentType] ?? d.documentType}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Document Controls (for Image/PDF zoom) */}
            {currentDoc && !isPdf && (
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="truncate text-slate-500 font-medium">{currentDoc.fileName}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setImgZoom((z) => Math.max(50, z - 25))}
                    className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{imgZoom}%</span>
                  <button
                    type="button"
                    onClick={() => setImgZoom((z) => Math.min(250, z + 25))}
                    className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Phóng to"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImgRotate((r) => (r + 90) % 360)}
                    className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Xoay 90°"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImgZoom(100); setImgRotate(0) }}
                    className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* Preview Frame Body */}
            <div className="relative flex min-h-[460px] max-h-[640px] flex-1 items-center justify-center overflow-auto bg-slate-100 p-2 dark:bg-slate-950">
              {currentDoc ? (
                isPdf ? (
                  <iframe
                    title={currentDoc.fileName || 'Tài liệu PDF'}
                    src={currentDoc.fileUrl}
                    className="h-full min-h-[460px] w-full rounded border-0 bg-white"
                  />
                ) : (
                  <div className="flex items-center justify-center p-2">
                    <img
                      src={currentDoc.fileUrl}
                      alt={currentDoc.fileName}
                      style={{
                        transform: `scale(${imgZoom / 100}) rotate(${imgRotate}deg)`,
                        transition: 'transform 0.2s ease',
                      }}
                      className="max-h-[580px] max-w-full rounded shadow-md object-contain"
                    />
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-slate-400">
                  <FileText className="h-10 w-10 text-slate-300" />
                  <p className="text-sm">Chưa có tài liệu nào để hiển thị xem trước.</p>
                </div>
              )}
            </div>

            {/* Bổ sung giấy tờ khi DRAFT hoặc NEED_MORE_DOCUMENTS */}
            {(() => {
              const requiredDocs = getRequiredDocsForPriorityGroup(app.priorityGroup ?? '')
              const availableDocTypes = requiredDocs.filter(
                (v) => !(app.documents ?? []).some((d) => d.documentType === v)
              )
              if (!canEditDocs || availableDocTypes.length === 0) return null
              const currentDocType = availableDocTypes.includes(docType)
                ? docType
                : (availableDocTypes[0] ?? '')

              return (
                <div className="border-t border-slate-200 bg-slate-50/60 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Bổ sung giấy tờ còn thiếu ({availableDocTypes.length} loại)
                  </p>
                  <FormField label="Loại giấy tờ bổ sung" htmlFor="documentType">
                    <Select id="documentType" value={currentDocType} onChange={(e) => setDocType(e.target.value)}>
                      {availableDocTypes.map((v) => (
                        <option key={v} value={v}>
                          {DOC_TYPE_LABELS[v] ?? v}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FileDropzone onFile={setPendingFile} disabled={uploading} />
                  {pendingFile && <p className="text-xs text-slate-500">Đã chọn tệp: {pendingFile.name}</p>}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading || !pendingFile || !currentDocType}
                    onClick={async () => {
                      if (!pendingFile || uploading || !currentDocType) return
                      setUploading(true)
                      try {
                        await housingApplicationsApi.uploadDocument(app.applicationId, currentDocType, pendingFile)
                        await refresh()
                        setPendingFile(null)
                        setDocType('')
                        setMsg({ type: 'success', text: 'Tải lên tài liệu thành công.' })
                      } catch (err) {
                        setMsg({ type: 'error', text: formatError(err) })
                      } finally {
                        setUploading(false)
                      }
                    }}
                  >
                    {uploading ? 'Đang tải lên...' : 'Tải lên tài liệu'}
                  </Button>
                </div>
              )
            })()}
          </div>

          {/* PHẦN KIỂM TRA AI (NẰM TRỰC TIẾP DƯỚI KHUNG ẢNH / TÀI LIỆU) */}
          <div className="rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50/70 via-white to-sky-50/50 p-5 shadow-sm dark:border-violet-900/60 dark:from-violet-950/30 dark:via-slate-900 dark:to-sky-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-100 pb-3 dark:border-violet-900/40">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    Kiểm tra hồ sơ bằng AI
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Đối chiếu tự động OCR tài liệu & dữ liệu đăng ký
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="accent"
                size="sm"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:opacity-95"
                disabled={aiAuditing || (app.documents ?? []).length === 0}
                onClick={() => void runAiAudit()}
              >
                {aiAuditing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {aiAuditResult ? 'Phân tích lại' : 'Chạy kiểm tra AI'}
                  </>
                )}
              </Button>
            </div>

            {/* AI Error */}
            {aiAuditError && (
              <Alert variant="error" className="mt-3 text-xs">
                Không thể thực hiện kiểm tra AI: {aiAuditError}
              </Alert>
            )}

            {/* AI Result View */}
            {aiAuditing ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-slate-500">
                <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
                <p className="text-xs font-medium">AI đang đọc {app.documents?.length ?? 0} tài liệu và đối chiếu các trường thông tin...</p>
              </div>
            ) : aiAuditResult ? (
              <div className="mt-4">
                <AiAuditResultPanel result={aiAuditResult} />
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-violet-100/50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-violet-950/20 dark:text-slate-300">
                Nhấn <strong>"Chạy kiểm tra AI"</strong> để hệ thống tự động bóc tách thông tin từ các tệp CCCD, bảng lương, xác nhận nhà ở... và so khớp với biểu mẫu người dân kê khai nhằm phát hiện sai lệch và cảnh báo rủi ro cho Chủ đầu tư.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MODAL: YÊU CẦU BỔ SUNG TÀI LIỆU (CĐT) ===== */}
      <Modal
        open={requestDocsModalOpen}
        onClose={() => { if (!acting) setRequestDocsModalOpen(false) }}
        title="Yêu cầu bổ sung tài liệu (Chủ đầu tư)"
        description="Chọn các loại giấy tờ còn thiếu hoặc cần bổ sung kèm hướng dẫn chi tiết cho người dân."
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              1. Chọn các tài liệu cần bổ sung / nộp lại:
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { id: 'CCCD 2 mặt', label: 'CCCD / Thẻ căn cước (2 mặt rõ nét)' },
                { id: 'Giấy xác nhận thu nhập', label: 'Xác nhận thu nhập / Bảng lương (Mẫu 03)' },
                { id: 'Giấy xác nhận thực trạng nhà ở', label: 'Xác nhận thực trạng nhà ở (Mẫu 02)' },
                { id: 'Giấy tờ chứng minh nhóm ưu tiên', label: 'Giấy tờ chứng minh đối tượng ưu tiên' },
                { id: 'Giấy đăng ký kết hôn / độc thân', label: 'Giấy ĐKKH hoặc Xác nhận độc thân' },
                { id: 'Giấy tờ nơi cư trú', label: 'Xác nhận cư trú (CT07 / CT08)' },
              ].map((item) => {
                const checked = selectedMissingDocs.includes(item.id)
                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition ${checked ? 'border-blue-500 bg-blue-50/80 text-blue-900 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      checked={checked}
                      onChange={() => {
                        setSelectedMissingDocs((prev) =>
                          prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                        )
                      }}
                    />
                    <span>{item.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              2. Lý do yêu cầu bổ sung phổ biến:
            </label>
            <div className="space-y-1.5">
              {[
                'Hình ảnh tài liệu bị mờ, lóa sáng, mất góc hoặc không đọc rõ thông tin',
                'Văn bản thiếu chữ ký người nộp hoặc thiếu dấu xác nhận của cơ quan có thẩm quyền',
                'Mẫu kê khai không đúng quy định theo Thông tư hướng dẫn hiện hành',
                'Số liệu thu nhập hoặc thông tin nhân khẩu kê khai không khớp với giấy tờ đính kèm',
                'Giấy tờ xác nhận đã quá hạn thời gian 6 tháng theo quy định',
              ].map((reason) => {
                const checked = selectedCommonReasons.includes(reason)
                return (
                  <label
                    key={reason}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs transition ${checked ? 'border-amber-400 bg-amber-50/70 text-amber-900 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-200' : 'border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40'}`}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-amber-600"
                      checked={checked}
                      onChange={() => {
                        setSelectedCommonReasons((prev) =>
                          prev.includes(reason) ? prev.filter((x) => x !== reason) : [...prev, reason]
                        )
                      }}
                    />
                    <span>{reason}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <FormField label="3. Ghi chú / Hướng dẫn chi tiết cho người dân" htmlFor="request-docs-note">
            <Textarea
              id="request-docs-note"
              rows={3}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Nhập thêm chỉ dẫn cụ thể (ví dụ: xin dấu xác nhận của UBND phường X trước ngày Y)..."
              disabled={!!acting}
            />
          </FormField>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" disabled={!!acting} onClick={() => setRequestDocsModalOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="accent"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!!acting || (selectedMissingDocs.length === 0 && selectedCommonReasons.length === 0 && !customNote.trim())}
              onClick={() => void handleDeveloperRequestMoreDocs()}
            >
              {acting ? 'Đang gửi...' : 'Gửi yêu cầu bổ sung'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===== MODAL: TỪ CHỐI HỒ SƠ (CĐT) ===== */}
      <Modal
        open={rejectModalOpen}
        onClose={() => { if (!acting) setRejectModalOpen(false) }}
        title="Từ chối hồ sơ đăng ký (Chủ đầu tư)"
        description="Lựa chọn căn cứ pháp lý và ghi chú rõ lý do từ chối hồ sơ mua nhà ở xã hội."
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Căn cứ từ chối theo Luật Nhà ở:
            </label>
            <div className="space-y-2">
              {[
                'Thu nhập bình quân của hộ gia đình vượt quá mức trần quy định hưởng chính sách NOXH',
                `Đã sở hữu nhà ở với diện tích bình quân từ ${MAX_AVG_AREA_PER_PERSON_M2} m² sàn/người trở lên`,
                'Đã từng được hưởng chính sách hỗ trợ nhà ở xã hội tại các dự án khác',
                'Không thuộc đối tượng ưu tiên được mua NOXH theo quy định tại Điều 76 Luật Nhà ở',
                'Giấy tờ không hợp lệ hoặc phát hiện thông tin kê khai gian lận sau khi xác minh',
              ].map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs transition ${selectedRejectReason === r ? 'border-rose-500 bg-rose-50/80 text-rose-900 dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-200' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}
                >
                  <input
                    type="radio"
                    name="reject-reason"
                    className="h-4 w-4 accent-rose-600"
                    checked={selectedRejectReason === r}
                    onChange={() => setSelectedRejectReason(r)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <FormField label="Giải trình chi tiết lý do từ chối" htmlFor="reject-note">
            <Textarea
              id="reject-note"
              rows={3}
              value={rejectCustomNote}
              onChange={(e) => setRejectCustomNote(e.target.value)}
              placeholder="Nhập nội dung giải trình chi tiết để người dân nắm rõ căn cứ từ chối..."
              disabled={!!acting}
            />
          </FormField>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" disabled={!!acting} onClick={() => setRejectModalOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="accent"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={!!acting || (!selectedRejectReason && !rejectCustomNote.trim())}
              onClick={() => void handleDeveloperReject()}
            >
              {acting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===== MODAL: TRÌNH DUYỆT SỞ XÂY DỰNG (CĐT) ===== */}
      <Modal
        open={submitSxdModalOpen}
        onClose={() => { if (!acting) setSubmitSxdModalOpen(false) }}
        title="Trình danh sách dự kiến lên Sở Xây Dựng"
        description="Xác nhận hồ sơ đã đạt đầy đủ các điều kiện sơ duyệt của Chủ đầu tư."
        size="md"
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
            <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">Tóm tắt kết quả sơ duyệt:</h4>
            <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-300">
              <li>• <strong>Người nộp:</strong> {app.fullName} (CCCD: {app.citizenId})</li>
              <li>• <strong>Dự án:</strong> {app.projectName}</li>
              <li>• <strong>Điều kiện nhà ở:</strong> {calculatedAvgArea ? `${calculatedAvgArea} m²/người` : 'Đạt'}</li>
              <li>• <strong>Điều kiện thu nhập:</strong> {totalFamilyIncome > 0 ? `${totalFamilyIncome.toLocaleString('vi-VN')} đ/tháng` : 'Đạt'}</li>
              <li>• <strong>Điểm ưu tiên:</strong> {app.priorityScore ?? 0} điểm</li>
            </ul>
          </div>

          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Hồ sơ sau khi gửi sẽ chuyển sang trạng thái <strong>PENDING_SXD_REVIEW</strong>. Sở Xây Dựng sẽ có thời hạn 20 ngày để hậu kiểm và đối chiếu dữ liệu đất đai toàn tỉnh.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" disabled={!!acting} onClick={() => setSubmitSxdModalOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="accent"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!!acting}
              onClick={() => void handleDeveloperSubmitToSxd()}
            >
              {acting === 'submit-sxd' ? 'Đang gửi...' : 'Xác nhận gửi Sở Xây Dựng'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===== MODAL: RÚT HỒ SƠ ===== */}
      <Modal
        open={withdrawOpen}
        onClose={() => { if (acting !== 'cancel') setWithdrawOpen(false) }}
        title="Rút hồ sơ đã nộp"
        description="Hành động này không thể hoàn tác. Vui lòng nêu rõ lý do."
      >
        <FormField label="Lý do rút hồ sơ *" htmlFor="withdraw-reason">
          <Textarea
            id="withdraw-reason"
            rows={3}
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
            placeholder="Ví dụ: Đã có kế hoạch chuyển nơi cư trú, không còn nhu cầu mua..."
            disabled={acting === 'cancel'}
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" disabled={acting === 'cancel'} onClick={() => setWithdrawOpen(false)}>Huỷ</Button>
          <Button variant="accent" className="bg-rose-600 hover:bg-rose-700 text-white" disabled={acting === 'cancel'} onClick={() => void confirmWithdraw()}>
            {acting === 'cancel' ? 'Đang rút...' : 'Xác nhận rút hồ sơ'}
          </Button>
        </div>
      </Modal>

      {/* ===== MODAL: PHIẾU TIẾP NHẬN HỒ SƠ ===== */}
      <Modal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        title="Phiếu tiếp nhận hồ sơ đăng ký"
        description="Bản tiếp nhận phục vụ lưu trữ hoặc in gửi người dân."
        size="lg"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm dark:border-slate-700 dark:bg-slate-900 print:border-0">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p className="text-center text-xs font-semibold text-slate-500">Độc lập - Tự do - Hạnh phúc</p>
          <div className="my-3 border-b border-slate-200 dark:border-slate-800" />
          <h4 className="text-center text-lg font-bold text-slate-900 dark:text-white">PHIẾU TIẾP NHẬN HỒ SƠ ĐĂNG KÝ NOXH</h4>
          <p className="mt-1 text-center font-medium text-blue-700 dark:text-blue-300">{app.projectName}</p>
          <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p><strong>Mã tiếp nhận:</strong> <span className="font-mono">{app.applicationId}</span></p>
            <p><strong>Người nộp hồ sơ:</strong> {app.fullName}</p>
            <p><strong>Số CCCD:</strong> {app.citizenId}</p>
            <p><strong>Thời điểm tiếp nhận:</strong> {new Date(app.submittedAt || app.updatedAt || app.createdAt).toLocaleString('vi-VN')}</p>
            <p><strong>Trạng thái hiện tại:</strong> {labelApplicationStatus(app.applicationStatus)}</p>
          </div>
          {app.receiptUrl ? (
            <a href={app.receiptUrl} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">
              Mở bản in PDF chính thức <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <p className="mt-4 text-xs text-slate-500">File PDF có chữ ký số sẽ hiển thị khi hệ thống hoàn tất sinh phiếu điện tử.</p>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setReceiptOpen(false)}>Đóng</Button>
          <Button variant="accent" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> In phiếu
          </Button>
        </div>
      </Modal>
    </div>
  )
}

/**
 * Thẩm định 3 điều kiện hưởng chính sách NOXH (Luật Nhà ở 2023):
 * 1. Điều kiện Nhà ở: Chưa có nhà ở thuộc sở hữu / Diện tích bình quân <= 10m2/người / Nhà ở dột nát, tạm bợ
 * 2. Điều kiện Thu nhập: Độc thân <= 15 triệu VNĐ/tháng; Vợ chồng/hộ gia đình <= 30 triệu VNĐ/tháng
 * 3. Đối tượng & Điểm ưu tiên: Thuộc 1 trong 10 nhóm đối tượng hưởng chính sách NOXH theo Điều 76 Luật Nhà ở 2023
 */
function HardRulesComplianceCard({
  app,
  totalFamilyIncome,
  calculatedAvgArea,
}: {
  app: ApplicationDetailDto
  totalFamilyIncome: number
  calculatedAvgArea: number | string | null | undefined
}) {
  const el = app.eligibility
  const isMarriedOrFamily = app.maritalStatus === 'MARRIED' || !!app.spouseFullName || (app.householdMembers && app.householdMembers.length > 0)
  const maxAllowedIncome = el?.maxAllowedIncome ?? (isMarriedOrFamily ? 30000000 : 15000000)

  // 1. Nhà ở (Đ29.2): đạt nếu chưa có nhà, hoặc diện tích bình quân dưới ngưỡng m² sàn/người
  const numericAvgArea = calculatedAvgArea != null && calculatedAvgArea !== '' ? Number(calculatedAvgArea) : null
  const isHousingStatusOk = !app.housingStatus || app.housingStatus !== 'OWNED_STANDARD'
  const isAreaOk = numericAvgArea != null ? numericAvgArea < MAX_AVG_AREA_PER_PERSON_M2 : isHousingStatusOk

  // 2. Thu nhập: Đạt nếu tổng thu nhập gia đình <= trần quy định (15M cho cá nhân, 30M cho gia đình)
  const isIncomeOk = totalFamilyIncome <= maxAllowedIncome

  // 3. Đối tượng & Điểm ưu tiên: Đạt nếu thuộc nhóm đối tượng hợp lệ hoặc có điểm ưu tiên >= 0
  const isPriorityOk = Boolean(app.priorityGroup && app.priorityGroup !== 'NONE' && app.priorityGroup !== '') || (app.priorityScore != null && app.priorityScore >= 0)

  const isAllEligible = isAreaOk && isIncomeOk && isPriorityOk

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Kết quả thẩm định điều kiện hưởng chính sách NOXH
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Căn cứ 3 điều kiện cốt lõi của Luật Nhà ở 2023 (Thực trạng nhà ở · Mức trần thu nhập · Đối tượng & Điểm)
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${isAllEligible
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
            }`}
        >
          {isAllEligible ? '✓ ĐỦ ĐIỀU KIỆN (3/3 TIÊU CHÍ)' : '✗ CẦN KIỂM TRA LẠI'}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Tiêu chí 1: Nhà ở */}
        <div
          className={`rounded-xl border p-3.5 transition ${isAreaOk
            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
            : 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              1. Điều kiện nhà ở
            </span>
            {isAreaOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            )}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            {numericAvgArea != null
              ? `${numericAvgArea} m²/người`
              : HOUSING_STATUS_LABELS[app.housingStatus] ?? 'Chưa có nhà ở'}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Quy định: dưới {MAX_AVG_AREA_PER_PERSON_M2} m² sàn/người ({isAreaOk ? '✓ Hợp lệ' : '✗ Vượt chuẩn'})
          </p>
        </div>

        {/* Tiêu chí 2: Thu nhập */}
        <div
          className={`rounded-xl border p-3.5 transition ${isIncomeOk
            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
            : 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              2. Mức thu nhập
            </span>
            {isIncomeOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            )}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            {totalFamilyIncome > 0
              ? `${(totalFamilyIncome / 1000000).toLocaleString('vi-VN')} triệu/tháng`
              : '0 VNĐ (Đạt chuẩn)'}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Mức trần: ≤ {(maxAllowedIncome / 1000000).toLocaleString('vi-VN')} triệu VNĐ/tháng ({isIncomeOk ? '✓ Hợp lệ' : '✗ Vượt trần'})
          </p>
        </div>

        {/* Tiêu chí 3: Đối tượng & Điểm ưu tiên */}
        <div
          className={`rounded-xl border p-3.5 transition ${isPriorityOk
            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
            : 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              3. Đối tượng & Điểm
            </span>
            {isPriorityOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            )}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={PRIORITY_GROUP_LABELS[app.priorityGroup ?? ''] ?? app.priorityGroup}>
            {app.priorityGroup
              ? (PRIORITY_GROUP_LABELS[app.priorityGroup] ?? app.priorityGroup)
              : 'Đối tượng tiêu chuẩn'}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {app.priorityScore != null ? `Điểm ưu tiên: ${app.priorityScore} điểm` : 'Đủ điều kiện đối tượng'}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Panel hiển thị kết quả AI audit: tổng quan + danh sách checklist.
 */
function AiAuditResultPanel({ result }: { result: AuditChecklistResponse }) {
  const checks = result.checks ?? []

  const counts = checks.reduce(
    (acc, c) => {
      const s = String(c.status).toUpperCase()
      if (s === 'OK') acc.ok += 1
      else if (s === 'FAIL') acc.fail += 1
      else if (s === 'WARN') acc.warn += 1
      else acc.other += 1
      return acc
    },
    { ok: 0, fail: 0, warn: 0, other: 0 },
  )

  const risk = String(result.riskLevel ?? '').toUpperCase()
  const RISK_META: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'secondary'; bar: string }> = {
    LOW: { label: 'RỦI RO THẤP (AN TOÀN)', tone: 'success', bar: 'bg-emerald-500' },
    MEDIUM: { label: 'RỦI RO TRUNG BÌNH (CẦN LƯU Ý)', tone: 'warning', bar: 'bg-amber-500' },
    HIGH: { label: 'RỦI RO CAO (CẢNH BÁO SAI LỆCH)', tone: 'danger', bar: 'bg-red-500' },
  }
  const riskMeta = RISK_META[risk]

  const STATUS_META: Record<string, { icon: typeof CheckCircle2; badge: 'success' | 'warning' | 'danger' | 'secondary'; card: string; iconTone: string; label: string }> = {
    OK: {
      icon: CheckCircle2,
      badge: 'success',
      label: 'Đạt',
      card: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30',
      iconTone: 'text-emerald-600 dark:text-emerald-300',
    },
    WARN: {
      icon: AlertTriangle,
      badge: 'warning',
      label: 'Cảnh báo',
      card: 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/30',
      iconTone: 'text-amber-600 dark:text-amber-300',
    },
    FAIL: {
      icon: XCircle,
      badge: 'danger',
      label: 'Không đạt',
      card: 'border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/30',
      iconTone: 'text-red-600 dark:text-red-300',
    },
  }
  const otherMeta = {
    icon: AlertTriangle,
    badge: 'secondary' as const,
    label: 'Khác',
    card: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50',
    iconTone: 'text-slate-500 dark:text-slate-300',
  }

  return (
    <div className="space-y-3">
      {/* Card tổng quan */}
      <div className="relative overflow-hidden rounded-xl border border-violet-200 bg-white p-3.5 shadow-sm dark:border-violet-900/50 dark:bg-slate-900">
        {riskMeta && (
          <span
            aria-hidden
            className={`absolute inset-x-0 top-0 h-1.5 ${riskMeta.bar}`}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Đánh giá rủi ro từ AI
            </span>
          </div>
          {riskMeta ? (
            <Badge variant={riskMeta.tone}>{riskMeta.label}</Badge>
          ) : (
            <Badge variant="secondary">Chưa phân loại</Badge>
          )}
        </div>

        {result.summary && (
          <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
            {result.summary}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
          {result.overallScore != null && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Điểm tin cậy: <strong>{result.overallScore}%</strong>
            </span>
          )}
          <CounterChip tone="ok" value={counts.ok} />
          {counts.warn > 0 && <CounterChip tone="warn" value={counts.warn} />}
          {counts.fail > 0 && <CounterChip tone="fail" value={counts.fail} />}
        </div>
      </div>

      {/* Danh sách checklist chi tiết */}
      {checks.length > 0 && (
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {checks.map((c, i) => {
            const key = String(c.status).toUpperCase()
            const meta = STATUS_META[key] ?? otherMeta
            const Icon = meta.icon
            return (
              <div
                key={`${c.field}-${i}`}
                className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-xs transition ${meta.card}`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.iconTone}`} />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {c.field}
                    </span>
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                  </div>
                  {c.documentName && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tệp: <span className="font-mono">{c.documentName}</span>
                    </p>
                  )}
                  {c.note && (
                    <p className="text-slate-700 dark:text-slate-200 leading-normal">{c.note}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Chip đếm số mục theo trạng thái */
function CounterChip({
  tone,
  value,
}: {
  tone: 'ok' | 'warn' | 'fail' | 'other'
  value: number
}) {
  const META = {
    ok: { label: 'đạt', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', icon: '✓' },
    warn: { label: 'cảnh báo', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', icon: '!' },
    fail: { label: 'không đạt', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200', icon: '✗' },
    other: { label: 'khác', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: '·' },
  } as const
  const m = META[tone]
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.className}`}>
      {m.icon} {value} {m.label}
    </span>
  )
}

export function ApplicationDetailPage() {
  const appId = sessionStorage.getItem('applicationId')
  return (
    <div>
      <PageHeader routeId="application-detail" />
      <PageCard className="p-6">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('applications')}>← Danh sách hồ sơ</Button>
        {!appId ? <Alert variant="error">Không tìm thấy hồ sơ. Quay lại danh sách.</Alert> : <ApplicationDetailInner appId={appId} />}
      </PageCard>
    </div>
  )
}


