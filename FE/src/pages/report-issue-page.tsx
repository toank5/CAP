import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Bug, CheckCircle2, FileWarning, Send } from 'lucide-react'
import {
  issueReportsApi,
  ISSUE_TYPES,
  issueTypeLabel,
  statusLabel,
  statusTone,
  type IssueReportListItemDto,
} from '@/api/issue-reports'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FormField } from '@/components/ui/label'
import { Input, Select, Textarea } from '@/components/ui/input'
import { GovHeroBanner } from '@/components/layout/gov-hero-banner'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import { formatError, formatSuccess } from '@/lib/format-error'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export function ReportIssuePage() {
  const [items, setItems] = useState<IssueReportListItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submittedMsg, setSubmittedMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async (p = page) => {
    setLoading(true)
    setError('')
    try {
      const data = await issueReportsApi.getMyReports(p, 10)
      const o = (data ?? {}) as Record<string, unknown>
      const inner = (o.data ?? o) as Record<string, unknown>
      const list = (inner.items ?? inner.Items) as IssueReportListItemDto[] | undefined
      setItems(Array.isArray(list) ? list : [])
      setTotalPages(Number(inner.totalPages ?? inner.TotalPages ?? 1))
      setPage(Number(inner.pageIndex ?? inner.PageIndex ?? p))
    } catch (err) {
      setError(formatError(err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load(page)
  }, [load, page])

  return (
    <div className="space-y-6">
      <GovHeroBanner
        badge="Hỗ trợ người dùng"
        title="Báo cáo sự cố"
        subtitle="Gửi phản ánh về lỗi kỹ thuật, dữ liệu hoặc tài khoản của bạn tới quản trị viên."
        compact
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="gov-card p-6"
        >
          <div className="mb-3 flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-600" />
            <h2 className="font-bold text-[#003D7A] dark:text-white">Tạo báo cáo mới</h2>
          </div>
          <p className="mb-4 text-sm text-slate-500">
            Mô tả chi tiết giúp quản trị viên xử lý nhanh hơn. Báo cáo của bạn sẽ xuất hiện trong danh sách bên dưới.
          </p>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setSubmitting(true)
              setSubmittedMsg(null)
              const fd = new FormData(e.currentTarget)
              const title = String(fd.get('title') || '').trim()
              const description = String(fd.get('description') || '').trim()
              const issueType = String(fd.get('issueType') || 'Other')
              const screenshotUrl = String(fd.get('screenshotUrl') || '').trim() || null
              if (title.length < 5) {
                setSubmittedMsg({ type: 'error', text: 'Tiêu đề tối thiểu 5 ký tự.' })
                setSubmitting(false)
                return
              }
              if (description.length < 10) {
                setSubmittedMsg({ type: 'error', text: 'Mô tả tối thiểu 10 ký tự.' })
                setSubmitting(false)
                return
              }
              try {
                const data = await issueReportsApi.create({
                  title,
                  description,
                  issueType,
                  screenshotUrl,
                })
                setSubmittedMsg({ type: 'success', text: formatSuccess(data) })
                e.currentTarget.reset()
                await load(1)
              } catch (err) {
                setSubmittedMsg({ type: 'error', text: formatError(err) })
              } finally {
                setSubmitting(false)
              }
            }}
          >
            <FormField label="Tiêu đề" htmlFor="title">
              <Input id="title" name="title" required minLength={5} placeholder="VD: Không tải được danh sách dự án" />
            </FormField>
            <FormField label="Loại sự cố" htmlFor="issueType">
              <Select id="issueType" name="issueType" defaultValue="Bug">
                {ISSUE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {issueTypeLabel(t)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Mô tả chi tiết" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                required
                rows={5}
                placeholder="Mô tả các bước gặp lỗi, thông báo nhận được, thời điểm xảy ra..."
              />
            </FormField>
            <FormField label="Ảnh minh chứng (URL, tuỳ chọn)" htmlFor="screenshotUrl">
              <Input id="screenshotUrl" name="screenshotUrl" type="url" placeholder="https://..." />
            </FormField>
            {submittedMsg && (
              <Alert variant={submittedMsg.type === 'error' ? 'error' : 'success'}>
                {submittedMsg.text}
              </Alert>
            )}
            <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
              <Send className="mr-1.5 h-4 w-4" />
              {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </Button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="gov-card overflow-hidden p-0"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-bold text-[#003D7A] dark:text-white">Báo cáo của tôi</h2>
                <p className="text-xs text-slate-500">
                  Theo dõi tiến độ xử lý từ quản trị viên.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="px-5 pt-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          {loading && items.length === 0 ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Bạn chưa gửi báo cáo nào"
                description="Các vấn đề về lỗi kỹ thuật hoặc dữ liệu sẽ được quản trị viên xử lý sớm nhất có thể."
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#003D7A] dark:text-white">{r.title}</p>
                    <Badge variant={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                    <Badge variant="secondary">{issueTypeLabel(r.issueType)}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Người gửi: {r.reporterName || '—'}</span>
                    <span>Tạo lúc: {formatDate(r.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">
              <span>Trang {page}/{totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>
                  Trước
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => void load(page + 1)}>
                  Sau
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" size="sm" onClick={() => navigate('home-user')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại trang chủ
        </Button>
      </div>

      {submittedMsg?.type === 'success' && (
        <div className="hidden">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}
