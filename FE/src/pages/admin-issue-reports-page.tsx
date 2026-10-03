import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  Search,
} from 'lucide-react'
import {
  ISSUE_REPORT_STATUSES,
  ISSUE_TYPES,
  issueReportsApi,
  issueTypeLabel,
  parseIssueReportDetail,
  statusLabel,
  statusTone,
  type IssueReportDetailResponseDto,
  type IssueReportListItemDto,
} from '@/api/issue-reports'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { formatError, formatSuccess } from '@/lib/format-error'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export function AdminIssueReportsPage() {
  const [items, setItems] = useState<IssueReportListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [issueType, setIssueType] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<IssueReportDetailResponseDto | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [nextStatus, setNextStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [detailMsg, setDetailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async (p = page) => {
    setLoading(true)
    setError('')
    try {
      const data = await issueReportsApi.getAllReports({
        pageIndex: p,
        pageSize: 12,
        search: appliedSearch || undefined,
        status: status || undefined,
        issueType: issueType || undefined,
      })
      setItems(data.items ?? [])
      setPage(data.pageIndex ?? p)
      setTotalPages(Math.max(1, data.totalPages || 1))
      setTotalCount(data.totalCount ?? 0)
    } catch (err) {
      setError(formatError(err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page, appliedSearch, status, issueType])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setAppliedSearch(search.trim())
    }, 400)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [appliedSearch, status, issueType])

  useEffect(() => {
    void load(page)
  }, [load, page])

  const openDetail = async (id: string) => {
    setSelectedId(id)
    setDetail(null)
    setDetailMsg(null)
    setDetailLoading(true)
    try {
      const raw = await issueReportsApi.getByIdAdmin(id)
      const parsed = parseIssueReportDetail(raw)
      setDetail(parsed)
      setNextStatus(parsed?.status || 'Open')
    } catch (err) {
      setDetailMsg({ type: 'error', text: formatError(err) })
    } finally {
      setDetailLoading(false)
    }
  }

  const saveStatus = async () => {
    if (!selectedId || !nextStatus) return
    setSaving(true)
    setDetailMsg(null)
    try {
      const raw = await issueReportsApi.updateStatus(selectedId, { status: nextStatus })
      const parsed = parseIssueReportDetail(raw)
      if (parsed) {
        setDetail(parsed)
        setNextStatus(parsed.status)
      }
      setDetailMsg({ type: 'success', text: formatSuccess(raw) || 'Đã cập nhật trạng thái.' })
      await load(page)
    } catch (err) {
      setDetailMsg({ type: 'error', text: formatError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner Header Quản trị (Không dùng ảnh nền) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-transparent p-6 shadow-sm dark:border-slate-800 dark:from-rose-950/30 dark:via-amber-950/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              <Flag className="h-3.5 w-3.5" />
              HỖ TRỢ NGƯỜI DÙNG · SYSTEM ADMINISTRATOR
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Báo cáo sự cố
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tiếp nhận ticket người dân gửi từ app hoặc cổng thông tin, cập nhật tiến độ xử lý.
            </p>
          </div>
        </div>
      </div>

      <div className="gov-card space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Tìm theo tiêu đề hoặc người gửi"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const next = search.trim()
                  setAppliedSearch(next)
                  setPage(1)
                }
              }}
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="lg:w-48"
          >
            <option value="">Mọi trạng thái</option>
            {ISSUE_REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </Select>
          <Select
            value={issueType}
            onChange={(e) => {
              setIssueType(e.target.value)
              setPage(1)
            }}
            className="lg:w-52"
          >
            <option value="">Mọi loại sự cố</option>
            {ISSUE_TYPES.map((t) => (
              <option key={t} value={t}>{issueTypeLabel(t)}</option>
            ))}
          </Select>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Chưa có báo cáo sự cố"
            description="Khi người dân gửi ticket từ app hoặc cổng thông tin, danh sách sẽ hiện ở đây."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="px-4 py-3">Người gửi</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="cursor-pointer bg-white transition hover:bg-sky-50/70 dark:bg-slate-900 dark:hover:bg-slate-800/80"
                    onClick={() => void openDetail(item.id)}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{item.title}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.reporterName || '—'}</td>
                    <td className="px-4 py-3">{issueTypeLabel(item.issueType)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{totalCount} báo cáo</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Trang {page}/{totalPages}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={!!selectedId}
        onClose={() => {
          setSelectedId(null)
          setDetail(null)
          setDetailMsg(null)
        }}
        title={detail?.title || 'Chi tiết báo cáo'}
        description={detail ? `Người gửi: ${detail.reporterName || '—'}` : undefined}
        size="lg"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Đang tải…
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusTone(detail.status)}>{statusLabel(detail.status)}</Badge>
              <Badge variant="secondary">{issueTypeLabel(detail.issueType)}</Badge>
              <span className="text-xs text-slate-500">{formatDate(detail.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
              {detail.description}
            </p>
            {detail.screenshotUrl ? (
              <a
                href={detail.screenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-sky-700 underline dark:text-sky-300"
              >
                Xem ảnh đính kèm
              </a>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Cập nhật trạng thái
                <Select
                  className="mt-1"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                >
                  {ISSUE_REPORT_STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </Select>
              </label>
              <Button type="button" disabled={saving || nextStatus === detail.status} onClick={() => void saveStatus()}>
                {saving ? 'Đang lưu…' : 'Lưu trạng thái'}
              </Button>
            </div>
            {detailMsg ? (
              <Alert variant={detailMsg.type === 'error' ? 'error' : 'success'}>{detailMsg.text}</Alert>
            ) : null}
          </div>
        ) : (
          <div>
            {detailMsg ? <Alert variant="error">{detailMsg.text}</Alert> : null}
          </div>
        )}
      </Modal>
    </div>
  )
}
