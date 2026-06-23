import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import {
  housingApplicationsApi,
  parseApplicationDetail,
} from '@/api/housing-applications'
import { StatusTimeline } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/api/http'
import { labelApplicationStatus, labelReviewAction } from '@/lib/labels'
import { formatError } from '@/lib/format-error'
import { isLoggedIn, navigate } from '@/router'

export function LookupPage() {
  const [id, setId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<ReturnType<typeof parseApplicationDetail>>(null)

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id.trim()) return
    setLoading(true)
    setError('')
    setDetail(null)
    try {
      const raw = await housingApplicationsApi.getById(id.trim())
      setDetail(parseApplicationDetail(raw))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Vui lòng đăng nhập để tra cứu hồ sơ này.')
      } else {
        setError(formatError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  const timeline =
    detail?.reviewHistories?.map((h, i) => ({
      title: labelReviewAction(h.action),
      time: new Date(h.changedAt).toLocaleString('vi-VN'),
      note: h.note ?? undefined,
      active: i === (detail.reviewHistories?.length ?? 0) - 1,
    })) ?? []

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Tra cứu công khai</p>
        <h1 className="mt-1 text-3xl font-bold">Tra cứu hồ sơ</h1>
        <p className="mt-2 text-slate-500">Nhập mã hồ sơ (UUID) để xem trạng thái. Cần đăng nhập nếu hồ sơ thuộc tài khoản của bạn.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tìm kiếm</CardTitle>
          <CardDescription>Mã UUID được cấp khi nộp hồ sơ thành công</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={search} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Nhập mã hồ sơ..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 pl-10 pr-4 text-sm outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900/80"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang tìm...' : 'Tra cứu'}
            </Button>
          </form>
          {error && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-red-500">{error}</p>
              {!isLoggedIn() && (
                <Button type="button" variant="outline" size="sm" onClick={() => navigate('login')}>
                  Đăng nhập
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!loading && !detail && !error && (
        <EmptyState title="Chưa tra cứu" description="Nhập mã hồ sơ ở trên để xem tiến độ xử lý chi tiết." />
      )}

      {detail && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{detail.projectName}</CardTitle>
              <CardDescription>{detail.fullName} · {detail.citizenId}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {labelApplicationStatus(detail.applicationStatus)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch sử xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <StatusTimeline items={timeline} />
              ) : (
                <p className="text-sm text-slate-500">Chưa có lịch sử xử lý.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
