import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  FileCheck,
  Loader2,
  Search,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react'
import { paymentApi } from '@/api/payment'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatError } from '@/lib/format-error'

interface SxdPaymentItem {
  installmentId: string
  applicationId: string
  projectName: string
  developerName: string
  applicantName: string
  citizenId: string
  amount: number
  dueDate?: string
  status: string
  milestone: 'FINAL_INSTALLMENT' | 'RED_BOOK'
  apartmentUnitName?: string
}

export function SxdPaymentsPage() {
  const [tab, setTab] = useState<'final' | 'redbook'>('final')
  const [items, setItems] = useState<SxdPaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await paymentApi.getSxdPaymentDashboard()
      const raw = (data as Record<string, unknown>).data ?? (data as Record<string, unknown>)
      const arr = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as Record<string, unknown>).items)
        ? ((raw as Record<string, unknown>).items as unknown[])
        : Array.isArray((raw as Record<string, unknown>).installments)
        ? ((raw as Record<string, unknown>).installments as unknown[])
        : []
      setItems(parseItems(arr as Record<string, unknown>[]))
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = items.filter((item) => {
    const milestoneOk = tab === 'final'
      ? item.milestone === 'FINAL_INSTALLMENT'
      : item.milestone === 'RED_BOOK'
    if (!milestoneOk) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (item.projectName || '').toLowerCase().includes(q) ||
      (item.applicantName || '').toLowerCase().includes(q) ||
      (item.developerName || '').toLowerCase().includes(q)
    )
  })

  const counts = {
    final: items.filter((i) => i.milestone === 'FINAL_INSTALLMENT').length,
    redbook: items.filter((i) => i.milestone === 'RED_BOOK').length,
  }

  const handleApprove = async (item: SxdPaymentItem) => {
    if (!window.confirm(`Xác nhận đã thanh toán đợt cuối cho "${item.applicantName}"?`)) return
    setApprovingId(item.installmentId)
    setMsg(null)
    try {
      await paymentApi.sxdApproveInstallment(item.installmentId, { action: 'APPROVE' })
      setMsg({ type: 'success', text: `Đã xác nhận thanh toán cho "${item.applicantName}".` })
      await load()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setApprovingId(null)
    }
  }

  const formatMoney = (v?: number) => {
    if (!v) return '—'
    return `${v.toLocaleString('vi-VN')} VNĐ`
  }

  const formatDate = (v?: string) => {
    if (!v) return '—'
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('vi-VN')
  }

  return (
    <div>
      <PageHeader routeId="sxd-payments" />
      <PageCard className="p-6 space-y-6">
        {/* Tab filter */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
          <button
            type="button"
            onClick={() => setTab('final')}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === 'final'
                ? 'border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            <Wallet className="h-4 w-4" />
            Đợt cuối cùng
            <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">
              {counts.final}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('redbook')}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === 'redbook'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Sổ đỏ (Red Book)
            <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">
              {counts.redbook}
            </span>
          </button>
        </div>

        {/* Search */}
        <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); void load() }}>
          <div className="flex-1 space-y-0">
            <label htmlFor="sxd-pay-search" className="mb-0.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="sxd-pay-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo dự án, người mua, CĐT..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="outline">Tìm</Button>
            <Button type="button" variant="ghost" onClick={() => { setSearch(''); void load() }}>
              Tải lại
            </Button>
          </div>
        </form>

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
            <p className="mt-3 font-semibold text-slate-500">Không có hồ sơ nào</p>
            <p className="mt-1 text-sm text-slate-400">
              Không có đợt thanh toán nào cần xác nhận trong danh mục này.
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Dự án</th>
                  <th className="px-4 py-3">CĐT</th>
                  <th className="px-4 py-3">Người mua</th>
                  <th className="px-4 py-3">Căn hộ</th>
                  <th className="px-4 py-3">Số tiền</th>
                  <th className="px-4 py-3">Hạn</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.installmentId}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-medium">{item.projectName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{item.developerName || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.applicantName || '—'}</div>
                      <div className="text-xs text-slate-400">{item.citizenId}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{item.apartmentUnitName || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-300">
                      {formatMoney(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDate(item.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.status === 'PAID' || item.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : item.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {item.status === 'PAID' || item.status === 'CONFIRMED' ? (
                          <><CheckCircle2 className="h-3 w-3" /> Đã thanh toán</>
                        ) : item.status === 'PENDING' ? (
                          <><Wallet className="h-3 w-3" /> Chờ xác nhận</>
                        ) : (
                          <><XCircle className="h-3 w-3" /> {item.status}</>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(item.status === 'PAID' || item.status === 'PENDING') && (
                        <Button
                          variant="accent"
                          size="sm"
                          disabled={approvingId === item.installmentId}
                          onClick={() => void handleApprove(item)}
                        >
                          {approvingId === item.installmentId ? (
                            <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Đang xử lý...</>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              Xác nhận đã thanh toán
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>
    </div>
  )
}

function parseItems(raw: Record<string, unknown>[]): SxdPaymentItem[] {
  return raw.map((r) => ({
    installmentId: String(r.installmentId ?? r.installmentId ?? r.id ?? ''),
    applicationId: String(r.applicationId ?? ''),
    projectName: String(r.projectName ?? r.project?.projectName ?? r.projectName ?? ''),
    developerName: String(r.developerName ?? r.developerName ?? ''),
    applicantName: String(r.applicantName ?? r.applicant?.fullName ?? r.fullName ?? ''),
    citizenId: String(r.citizenId ?? r.applicant?.citizenId ?? ''),
    amount: Number(r.amount ?? r.paidAmount ?? 0),
    dueDate: r.dueDate as string | undefined,
    status: String(r.status ?? '').toUpperCase(),
    milestone: (r.milestone as 'FINAL_INSTALLMENT' | 'RED_BOOK') ?? 'FINAL_INSTALLMENT',
    apartmentUnitName: r.apartmentUnitName as string | undefined,
  }))
}
