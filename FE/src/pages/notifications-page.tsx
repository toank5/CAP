import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, Check, CheckCheck, Filter, Inbox, RefreshCw } from 'lucide-react'
import { useNotifications } from '@/providers/notifications-provider'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { GovHeroBanner } from '@/components/layout/gov-hero-banner'
import { Skeleton } from '@/components/ui/skeleton'

type FilterTab = 'all' | 'unread'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

function describeType(t: string): { label: string; tone: 'default' | 'success' | 'warning' | 'danger' | 'secondary' } {
  switch (t) {
    case 'ApplicationStatusChanged':
      return { label: 'Cập nhật hồ sơ', tone: 'default' }
    case 'PaymentResult':
      return { label: 'Thanh toán', tone: 'success' }
    case 'IssueReport':
      return { label: 'Báo cáo sự cố', tone: 'warning' }
    case 'System':
      return { label: 'Hệ thống', tone: 'secondary' }
    default:
      return { label: t || 'Thông báo', tone: 'secondary' }
  }
}

export function NotificationsPage() {
  const {
    loaded,
    unreadCount,
    loadingList,
    refreshList,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useNotifications()
  const [tab, setTab] = useState<FilterTab>('all')
  const [refreshing, setRefreshing] = useState(false)

  const reload = useCallback(
    async (p = 1) => {
      setRefreshing(true)
      await refreshList(p, 20)
      setRefreshing(false)
    },
    [refreshList],
  )

  useEffect(() => {
    if (!loaded) void reload(1)
  }, [loaded, reload])

  const items = useMemo(() => loaded?.items ?? [], [loaded])
  const filtered = useMemo(
    () => (tab === 'unread' ? items.filter((n) => !n.isRead) : items),
    [items, tab],
  )

  return (
    <div className="space-y-6">
      <GovHeroBanner
        badge="Trung tâm thông báo"
        title="Thông báo của tôi"
        subtitle={`${unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã xem hết thông báo'}`}
        compact
      />

      <div className="gov-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <Button
              variant={tab === 'all' ? 'accent' : 'outline'}
              size="sm"
              onClick={() => setTab('all')}
            >
              <Inbox className="mr-1.5 h-4 w-4" /> Tất cả
            </Button>
            <Button
              variant={tab === 'unread' ? 'accent' : 'outline'}
              size="sm"
              onClick={() => setTab('unread')}
            >
              <Filter className="mr-1.5 h-4 w-4" /> Chưa đọc
              {unreadCount > 0 && (
                <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#DA251D] px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void reload(1)}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={unreadCount === 0}
              onClick={() => void markAllAsRead()}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Đánh dấu tất cả đã đọc
            </Button>
          </div>
        </div>

        {loadingList && items.length === 0 ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title={tab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
              description={
                tab === 'unread'
                  ? 'Bạn đã xem hết tất cả thông báo.'
                  : 'Các thông báo về hồ sơ, thanh toán và hệ thống sẽ xuất hiện tại đây.'
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((n, i) => {
              const meta = describeType(n.notificationType)
              return (
                <motion.li
                  key={n.notificationId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className={`flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start ${
                    !n.isRead ? 'bg-primary/[0.04]' : ''
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      !n.isRead ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                    }`}
                  >
                    {n.isRead ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-sm ${!n.isRead ? 'font-bold text-[#003D7A] dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}
                      >
                        {n.title}
                      </p>
                      <Badge variant={meta.tone}>{meta.label}</Badge>
                      {!n.isRead && <Badge variant="danger">Mới</Badge>}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                      {n.content}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => void markAsRead(n.notificationId)}
                    >
                      <Check className="mr-1 h-4 w-4" /> Đã đọc
                    </Button>
                  )}
                </motion.li>
              )
            })}
          </ul>
        )}

        {!loadingList && loaded && loaded.hasNextPage && (
          <div className="border-t border-slate-100 px-5 py-4 text-center dark:border-slate-800">
            <Button variant="outline" onClick={() => void loadMore()}>
              Tải thêm thông báo
            </Button>
          </div>
        )}

        {loaded && !loadingList && items.length === 0 && (
          <div className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-400 dark:border-slate-800">
            Đã hiển thị tất cả thông báo.
          </div>
        )}
      </div>

      {unreadCount === 0 && items.length > 0 && (
        <Alert variant="success">Bạn đã đọc tất cả thông báo.</Alert>
      )}
    </div>
  )
}
