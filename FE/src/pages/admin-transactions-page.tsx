import { useEffect, useState, useMemo } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  FileDown,
  FileText,
  Filter,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import {
  adminApi,
  type AdminTransactionDetailDto,
  type AdminTransactionQueryParams,
} from '@/api/admin'
import { housingProjectsApi } from '@/api/housing-projects'
import { extractProjects } from '@/lib/parsers'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'
import { formatError } from '@/lib/format-error'
import type { HousingProjectDto } from '@/types'

/** Helper phân loại trạng thái giao dịch & màu sắc */
function getTransactionStatusMeta(status?: string | null) {
  const st = (status || '').toUpperCase()
  if (st === 'SUCCESS' || st === '00' || st === 'PAID' || st === 'COMPLETED') {
    return {
      label: 'Thành công',
      tag: 'SUCCESS',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      dotClass: 'bg-emerald-500',
      icon: CheckCircle2,
    }
  }
  if (st === 'PENDING' || st === 'PROCESSING' || st === 'WAITING') {
    return {
      label: 'Chờ thanh toán',
      tag: 'PENDING',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      dotClass: 'bg-amber-500',
      icon: Clock,
    }
  }
  if (st === 'FAILED' || st === 'ERROR' || st === 'REJECTED') {
    return {
      label: 'Thất bại',
      tag: 'FAILED',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      dotClass: 'bg-rose-500',
      icon: XCircle,
    }
  }
  if (st === 'CANCELLED' || st === 'CANCELED' || st === 'EXPIRED') {
    return {
      label: 'Đã hủy',
      tag: 'CANCELLED',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      dotClass: 'bg-slate-500',
      icon: AlertCircle,
    }
  }
  return {
    label: status || 'Không rõ',
    tag: status || 'UNKNOWN',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-400',
    icon: Clock,
  }
}

/** Giải thích mã phản hồi VNPay */
function explainVNPayResponseCode(code?: string | null): string {
  if (!code) return 'Không có mã phản hồi'
  switch (code) {
    case '00':
      return 'Giao dịch thành công (00)'
    case '07':
      return 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).'
    case '09':
      return 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.'
    case '10':
      return 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.'
    case '11':
      return 'Đã hết hạn chờ thanh toán.'
    case '12':
      return 'Thẻ/Tài khoản bị khóa.'
    case '13':
      return 'Quý khách nhập sai mật khẩu xác thực OTP.'
    case '24':
      return 'Khách hàng hủy giao dịch.'
    case '51':
      return 'Tài khoản không đủ số dư để thực hiện giao dịch.'
    case '65':
      return 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.'
    case '75':
      return 'Ngân hàng thanh toán đang bảo trì.'
    case '99':
      return 'Lỗi không xác định từ cổng thanh toán.'
    default:
      return `Mã phản hồi: ${code}`
  }
}

export function AdminTransactionsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transactions, setTransactions] = useState<AdminTransactionDetailDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [projectIdFilter, setProjectIdFilter] = useState('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Projects list for dropdown
  const [projects, setProjects] = useState<HousingProjectDto[]>([])

  // Modal Detail
  const [selectedTx, setSelectedTx] = useState<AdminTransactionDetailDto | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Fetch projects for filter dropdown
  useEffect(() => {
    housingProjectsApi
      .list({ pageSize: 100 })
      .then((res) => {
        setProjects(extractProjects(res))
      })
      .catch(() => {})
  }, [])

  // Fetch transactions from API
  const fetchTransactions = async () => {
    setLoading(true)
    setError('')
    try {
      const query: AdminTransactionQueryParams = {
        page,
        pageSize,
      }
      if (searchKeyword.trim()) query.searchKeyword = searchKeyword.trim()
      if (statusFilter !== 'ALL') query.status = statusFilter
      if (projectIdFilter !== 'ALL') query.projectId = projectIdFilter
      if (fromDate) query.fromDate = new Date(fromDate).toISOString()
      if (toDate) {
        const d = new Date(toDate)
        d.setHours(23, 59, 59, 999)
        query.toDate = d.toISOString()
      }

      const res = await adminApi.getTransactions(query)
      const data = res && typeof res === 'object' ? (res as unknown as Record<string, unknown>) : {}
      const nested = (data.data ?? data.Data ?? data) as Record<string, unknown>

      const items = Array.isArray(nested)
        ? (nested as AdminTransactionDetailDto[])
        : Array.isArray(nested.items ?? nested.Items)
          ? ((nested.items ?? nested.Items) as AdminTransactionDetailDto[])
          : Array.isArray(data.items ?? data.Items)
            ? ((data.items ?? data.Items) as AdminTransactionDetailDto[])
            : []

      const count = typeof nested.totalCount === 'number'
        ? nested.totalCount
        : typeof nested.TotalCount === 'number'
          ? nested.TotalCount
          : typeof data.totalCount === 'number'
            ? data.totalCount
            : items.length

      setTransactions(items)
      setTotalCount(count)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    void fetchTransactions()
  }, [page, pageSize, statusFilter, projectIdFilter, fromDate, toDate])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    void fetchTransactions()
  }

  const handleResetFilters = () => {
    setSearchKeyword('')
    setStatusFilter('ALL')
    setProjectIdFilter('ALL')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  // Open detail with modal
  const handleOpenDetail = async (tx: AdminTransactionDetailDto) => {
    setSelectedTx(tx)
    if (tx.id) {
      setLoadingDetail(true)
      try {
        const detailRes = await adminApi.getTransactionDetail(tx.id)
        const d = detailRes && typeof detailRes === 'object' ? (detailRes as unknown as Record<string, unknown>) : {}
        const payload = (d.data ?? d.Data ?? d) as AdminTransactionDetailDto
        if (payload && payload.id) {
          setSelectedTx(payload)
        }
      } catch {
        // Fallback to existing tx object
      } finally {
        setLoadingDetail(false)
      }
    }
  }

  // Calculate quick stats from loaded / current data
  const stats = useMemo(() => {
    const successItems = transactions.filter((t) => {
      const s = (t.status || '').toUpperCase()
      return s === 'SUCCESS' || s === '00' || s === 'PAID' || s === 'COMPLETED'
    })
    const pendingItems = transactions.filter((t) => {
      const s = (t.status || '').toUpperCase()
      return s === 'PENDING' || s === 'PROCESSING' || s === 'WAITING'
    })
    const failedItems = transactions.filter((t) => {
      const s = (t.status || '').toUpperCase()
      return s === 'FAILED' || s === 'ERROR' || s === 'CANCELLED' || s === 'CANCELED'
    })

    const totalRevenue = successItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
    const uniqueUsers = new Set(transactions.map((t) => t.userId || t.userEmail || t.userFullName).filter(Boolean)).size

    return {
      totalRevenue,
      successCount: successItems.length,
      pendingCount: pendingItems.length,
      failedCount: failedItems.length,
      uniqueUsers,
    }
  }, [transactions])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Export CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return
    const headers = [
      'Mã giao dịch',
      'Mã đơn hàng',
      'Khách hàng',
      'Email',
      'Số điện thoại',
      'Dự án',
      'Mã căn (Slot)',
      'Số tiền (VNĐ)',
      'Trạng thái',
      'Ngân hàng',
      'Mã GD VNPay',
      'Thời gian tạo',
      'Thời gian thanh toán',
    ]
    const rows = transactions.map((t) => [
      `"${t.id || ''}"`,
      `"${t.orderId || ''}"`,
      `"${t.userFullName || ''}"`,
      `"${t.userEmail || ''}"`,
      `"${t.userPhoneNumber || ''}"`,
      `"${t.projectName || ''}"`,
      `"${t.slotCode || ''}"`,
      t.amount || 0,
      `"${t.status || ''}"`,
      `"${t.vnpBankCode || ''}"`,
      `"${t.vnpTransactionNo || ''}"`,
      `"${t.createdAt ? new Date(t.createdAt).toLocaleString('vi-VN') : ''}"`,
      `"${t.paidAt ? new Date(t.paidAt).toLocaleString('vi-VN') : ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Lich_Su_Thanh_Toan_He_Thong_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const hasActiveFilters =
    searchKeyword.trim() !== '' ||
    statusFilter !== 'ALL' ||
    projectIdFilter !== 'ALL' ||
    fromDate !== '' ||
    toDate !== ''

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl dark:border-slate-800">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Cổng thanh toán VNPay · Payment Gateway
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Lịch sử thanh toán toàn hệ thống
            </h1>
            <p className="max-w-2xl text-xs text-slate-300 md:text-sm">
              Giám sát dòng tiền, giao dịch đặt cọc và các đợt thanh toán theo tiến độ của người nộp hồ sơ qua VNPay.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleExportCSV}
              disabled={loading || transactions.length === 0}
              variant="outline"
              className="h-10 rounded-xl border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 hover:text-white"
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              Xuất CSV
            </Button>
            <Button
              onClick={() => void fetchTransactions()}
              disabled={loading}
              className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 hover:text-white"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Doanh thu thành công */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tổng tiền thu thành công
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Banknote className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {loading ? '—' : `${stats.totalRevenue.toLocaleString('vi-VN')} ₫`}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center text-emerald-600 font-semibold dark:text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {stats.successCount} GD
            </span>
            <span>thực hiện thành công</span>
          </div>
        </div>

        {/* Tổng GD & Tỉ lệ thành công */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tổng số giao dịch
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {loading ? '—' : totalCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {totalCount > 0 && stats.successCount > 0
              ? `Tỉ lệ thành công: ${Math.round((stats.successCount / (transactions.length || 1)) * 100)}% (theo trang)`
              : 'Giao dịch qua cổng thanh toán'}
          </p>
        </div>

        {/* Đang chờ xử lý */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Đang chờ / Xử lý
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {loading ? '—' : stats.pendingCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Giao dịch đang chờ khách thanh toán
          </p>
        </div>

        {/* Khách hàng thanh toán */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Người nộp / Khách hàng
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {loading ? '—' : stats.uniqueUsers}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tài khoản có phát sinh giao dịch
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Filters Toolbar */}
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-12">
              {/* Search input */}
              <div className="relative md:col-span-4">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Mã đơn hàng, mã VNPay, tên khách, email, SĐT, mã căn..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-8 text-xs font-medium text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchKeyword('')
                      setPage(1)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Status Select */}
              <div className="md:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Lọc theo trạng thái"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="SUCCESS">Thành công (SUCCESS)</option>
                  <option value="PENDING">Chờ thanh toán (PENDING)</option>
                  <option value="FAILED">Thất bại (FAILED)</option>
                  <option value="CANCELLED">Đã hủy (CANCELLED)</option>
                </select>
              </div>

              {/* Project Select */}
              <div className="md:col-span-3">
                <select
                  value={projectIdFilter}
                  onChange={(e) => {
                    setProjectIdFilter(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Lọc theo dự án"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">Tất cả dự án</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName || p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filters */}
              <div className="flex items-center gap-2 md:col-span-3">
                <div className="relative flex-1">
                  <input
                    type="date"
                    title="Từ ngày"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value)
                      setPage(1)
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
                <span className="text-xs text-slate-400">-</span>
                <div className="relative flex-1">
                  <input
                    type="date"
                    title="Đến ngày"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value)
                      setPage(1)
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Actions row under filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" className="h-8 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700">
                  <Filter className="mr-1 h-3.5 w-3.5" />
                  Tìm kiếm
                </Button>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Đặt lại bộ lọc
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Hiển thị mỗi trang:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  aria-label="Số lượng mỗi trang"
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </form>
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
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-2.5 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Receipt className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">
              Không tìm thấy giao dịch nào
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              {hasActiveFilters
                ? 'Không có giao dịch nào khớp với tiêu chí tìm kiếm. Hãy thử bỏ lọc hoặc đổi từ khóa.'
                : 'Chưa có giao dịch thanh toán nào được ghi nhận trên hệ thống.'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4 rounded-xl text-xs font-semibold"
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Mã đơn / VNPay</th>
                  <th className="px-4 py-3.5">Khách hàng</th>
                  <th className="px-4 py-3.5">Dự án &amp; Căn</th>
                  <th className="px-4 py-3.5 text-right">Số tiền (VNĐ)</th>
                  <th className="px-4 py-3.5">Ngân hàng / Cổng</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5">Thời gian</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {transactions.map((tx) => {
                  const statusMeta = getTransactionStatusMeta(tx.status)
                  const StatusIcon = statusMeta.icon
                  const isSuccess = statusMeta.tag === 'SUCCESS'

                  return (
                    <tr
                      key={tx.id || tx.orderId || Math.random()}
                      className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      {/* Mã đơn & VNPay */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {tx.orderId || '—'}
                          </p>
                          {tx.vnpTransactionNo && (
                            <p className="font-mono text-[11px] text-slate-400">
                              VNPay: {tx.vnpTransactionNo}
                            </p>
                          )}
                          {tx.orderInfo && (
                            <p className="max-w-[200px] truncate text-[11px] text-slate-500 dark:text-slate-400" title={tx.orderInfo}>
                              {tx.orderInfo}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Khách hàng */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {(tx.userFullName || tx.userEmail || 'U')[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800 dark:text-slate-200">
                              {tx.userFullName || 'Khách vãng lai'}
                            </p>
                            {tx.userEmail && (
                              <p className="truncate text-[10px] text-slate-400">{tx.userEmail}</p>
                            )}
                            {tx.userPhoneNumber && (
                              <p className="text-[10px] text-slate-400">{tx.userPhoneNumber}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Dự án & Căn */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="max-w-[180px] truncate font-medium text-slate-800 dark:text-slate-200" title={tx.projectName || ''}>
                            {tx.projectName || '—'}
                          </p>
                          {tx.slotCode && (
                            <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                              Mã căn: {tx.slotCode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Số tiền */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span
                          className={`font-mono text-sm font-black ${
                            isSuccess
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {Number(tx.amount || 0).toLocaleString('vi-VN')} ₫
                        </span>
                      </td>

                      {/* Ngân hàng & Cổng */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {tx.vnpBankCode ? (
                            <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {tx.vnpBankCode}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">VNPay Gateway</span>
                          )}
                          {tx.vnpCardType && (
                            <p className="text-[10px] text-slate-400">{tx.vnpCardType}</p>
                          )}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${statusMeta.badgeClass}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                          <StatusIcon className="h-3 w-3" />
                          <span>{statusMeta.label}</span>
                        </span>
                      </td>

                      {/* Thời gian */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('vi-VN') : ''}
                          </p>
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {tx.pdfUrl && (
                            <a
                              href={tx.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Tải biên lai PDF"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleOpenDetail(tx)}
                            className="h-8 rounded-lg px-2.5 text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
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
        )}

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hiển thị <strong className="font-semibold text-slate-800 dark:text-slate-200">{(page - 1) * pageSize + 1}</strong> - <strong className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(page * pageSize, totalCount)}</strong> trên tổng số <strong className="font-semibold text-slate-800 dark:text-slate-200">{totalCount}</strong> giao dịch
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 rounded-lg px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 rounded-lg px-2 text-xs"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Transaction Detail */}
      <Modal
        open={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title="Chi tiết giao dịch thanh toán"
        description={`Mã đơn hàng: ${selectedTx?.orderId || selectedTx?.id || '—'}`}
        size="lg"
      >
        {selectedTx && (
          <div className="space-y-5 text-xs">
            {loadingDetail && (
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 p-2.5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Đang đồng bộ chi tiết mới nhất từ máy chủ...</span>
              </div>
            )}

            {/* Header summary in modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Số tiền thanh toán
                </p>
                <p className="mt-0.5 font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {Number(selectedTx.amount || 0).toLocaleString('vi-VN')} ₫
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(() => {
                  const meta = getTransactionStatusMeta(selectedTx.status)
                  const Icon = meta.icon
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${meta.badgeClass}`}>
                      <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
                      <Icon className="h-3.5 w-3.5" />
                      <span>{meta.label}</span>
                    </span>
                  )
                })()}

                {selectedTx.pdfUrl && (
                  <a
                    href={selectedTx.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Biên lai PDF
                  </a>
                )}
              </div>
            </div>

            {/* Section 1: Thông tin khách hàng & Dự án */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Khách hàng */}
              <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 font-bold text-slate-800 dark:border-slate-800 dark:text-slate-200">
                  <User className="h-4 w-4 text-indigo-500" />
                  <span>Thông tin người thanh toán</span>
                </div>
                <div className="mt-2.5 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Họ và tên:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {selectedTx.userFullName || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Email:</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedTx.userEmail || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Số điện thoại:</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedTx.userPhoneNumber || '—'}
                    </p>
                  </div>
                  {selectedTx.userId && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">User ID:</span>
                      <p className="font-mono text-[11px] text-slate-500">{selectedTx.userId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dự án & Hồ sơ */}
              <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 font-bold text-slate-800 dark:border-slate-800 dark:text-slate-200">
                  <Building2 className="h-4 w-4 text-cyan-500" />
                  <span>Dự án &amp; Căn hộ</span>
                </div>
                <div className="mt-2.5 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Tên dự án:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {selectedTx.projectName || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Mã căn hộ (Slot):</span>
                    <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {selectedTx.slotCode || '—'}
                    </p>
                  </div>
                  {selectedTx.applicationId && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Mã hồ sơ:</span>
                      <p className="font-mono text-[11px] text-slate-500">{selectedTx.applicationId}</p>
                    </div>
                  )}
                  {selectedTx.housingProjectId && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Mã dự án (ID):</span>
                      <p className="font-mono text-[11px] text-slate-500">{selectedTx.housingProjectId}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Dữ liệu cổng VNPay */}
            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 font-bold text-slate-800 dark:border-slate-800 dark:text-slate-200">
                <CreditCard className="h-4 w-4 text-emerald-500" />
                <span>Chi tiết Cổng thanh toán VNPay</span>
              </div>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Mã GD VNPay (vnp_TransactionNo):</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    {selectedTx.vnpTransactionNo || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Ngân hàng (vnp_BankCode):</span>
                  <p className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                    {selectedTx.vnpBankCode || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Mã GD Ngân hàng (vnp_BankTranNo):</span>
                  <p className="font-mono text-slate-800 dark:text-slate-100">
                    {selectedTx.vnpBankTranNo || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Loại thẻ (vnp_CardType):</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {selectedTx.vnpCardType || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Thời gian VNPay (vnp_PayDate):</span>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {selectedTx.vnpPayDate || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Mã phản hồi (vnp_ResponseCode):</span>
                  <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {explainVNPayResponseCode(selectedTx.vnpResponseCode)}
                  </p>
                </div>
                <div className="col-span-full">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Nội dung thanh toán (OrderInfo):</span>
                  <p className="mt-0.5 rounded-lg bg-slate-50 p-2 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                    {selectedTx.orderInfo || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 text-[11px]">
              <div>
                <span className="font-bold uppercase text-slate-400 text-[10px]">Thời gian khởi tạo:</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedTx.createdAt ? new Date(selectedTx.createdAt).toLocaleString('vi-VN') : '—'}
                </p>
              </div>
              <div>
                <span className="font-bold uppercase text-slate-400 text-[10px]">Thời gian hoàn tất:</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedTx.paidAt ? new Date(selectedTx.paidAt).toLocaleString('vi-VN') : '—'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedTx(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
