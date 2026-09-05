import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import {
  housingApplicationsApi,
  parseApplicationDetail,
} from '@/api/housing-applications'
import {
  publicPostCheckApi,
  parsePublicPostCheckItem,
  parsePublicPostCheckList,
  parsePublicPostCheckStats,
} from '@/api/public-post-check'
import { StatusTimeline } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/api/http'
import { labelApplicationStatus, labelReviewAction } from '@/lib/labels'
import { LOTTERY_RESULT_LABELS } from '@/lib/constants'
import { formatError } from '@/lib/format-error'
import { isLoggedIn, navigate } from '@/router'

type LookupMode = 'public' | 'auth'

export function LookupPage() {
  const [id, setId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<ReturnType<typeof parseApplicationDetail>>(null)
  const [publicList, setPublicList] = useState<ReturnType<typeof parsePublicPostCheckList>>([])
  const [stats, setStats] = useState<ReturnType<typeof parsePublicPostCheckStats>>(null)
  const [publicItem, setPublicItem] = useState<ReturnType<typeof parsePublicPostCheckItem>>(null)
  // LookupMode reserved for future "logged-in chi tiết" toggle.
  void (null as unknown as LookupMode)

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id.trim()) return
    setLoading(true)
    setError('')
    setDetail(null)
    setPublicItem(null)
    try {
      if (isLoggedIn()) {
        const raw = await housingApplicationsApi.getById(id.trim())
        setDetail(parseApplicationDetail(raw))
      } else {
        const raw = await publicPostCheckApi.getById(id.trim())
        const item = parsePublicPostCheckItem(raw)
        if (item) setPublicItem(item)
        else setError('Không tìm thấy hồ sơ trong danh sách công bố.')
      }
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

  const loadPublicList = async () => {
    setLoading(true)
    setError('')
    try {
      const [listData, statsData] = await Promise.all([
        publicPostCheckApi.list(),
        publicPostCheckApi.stats(),
      ])
      setPublicList(parsePublicPostCheckList(listData))
      setStats(parsePublicPostCheckStats(statsData))
    } catch (err) {
      setError(formatError(err))
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
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Tra cứu công khai hồ sơ nhà ở xã hội. Có thể xem danh sách đã công bố mà không cần đăng nhập.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tìm kiếm</CardTitle>
          <CardDescription>Nhập mã hồ sơ (UUID) để xem trạng thái công bố.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={search} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Nhập mã hồ sơ..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900/80 dark:placeholder:text-slate-500"
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

      {!loading && !detail && !publicItem && !error && (
        <EmptyState
          title="Chưa tra cứu"
          description="Nhập mã hồ sơ ở trên để xem tiến độ xử lý chi tiết."
          actionLabel="Xem danh sách công bố"
          onAction={() => void loadPublicList()}
        />
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
                <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có lịch sử xử lý.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {publicItem && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{publicItem.projectName ?? 'Dự án'}</CardTitle>
            <CardDescription>{publicItem.fullName ?? '—'} · {publicItem.citizenId ?? '—'}</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {publicItem.applicationStatus ?? '—'}
            </span>
            {publicItem.slotCode && (
              <p className="mt-2 text-sm">Mã căn: <strong>{publicItem.slotCode}</strong></p>
            )}
            {publicItem.lotteryResult && (
              <p className="mt-1 text-sm">Kết quả bốc thăm: <strong>{LOTTERY_RESULT_LABELS[publicItem.lotteryResult] ?? publicItem.lotteryResult}</strong></p>
            )}
          </CardContent>
        </Card>
      )}

      {publicList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Danh sách hồ sơ công bố ({publicList.length})</CardTitle>
            {stats && (
              <CardDescription>
                Tổng: {stats.totalApplications ?? '—'} · Đạt: {stats.approved ?? '—'} · Từ chối: {stats.rejected ?? '—'}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {publicList.slice(0, 50).map((it) => (
                <div key={it.applicationId} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{it.fullName ?? '—'}</span>
                    <span className="text-xs text-slate-500">{it.applicationStatus ?? ''}</span>
                  </div>
                  <p className="text-xs text-slate-500">{it.projectName ?? ''}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

