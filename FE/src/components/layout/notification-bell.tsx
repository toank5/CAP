import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellRing, Check, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/providers/notifications-provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'

function timeAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const m = Math.round(diff / 60_000)
  if (m < 1) return 'Vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} giờ trước`
  const day = Math.round(h / 24)
  if (day < 7) return `${day} ngày trước`
  return d.toLocaleDateString('vi-VN')
}

function typeLabel(t: string): string {
  switch (t) {
    case 'ApplicationStatusChanged':
      return 'Cập nhật hồ sơ'
    case 'PaymentResult':
      return 'Thanh toán'
    case 'IssueReport':
      return 'Báo cáo sự cố'
    case 'System':
      return 'Hệ thống'
    default:
      return t || 'Thông báo'
  }
}

export function NotificationBell() {
  const { unreadCount, recent, loadingCount, refreshCount, markAllAsRead, markAsRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!open) return
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  useEffect(() => {
    if (open) void refreshCount()
  }, [open, refreshCount])

  const Icon = unreadCount > 0 ? BellRing : Bell

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-primary/20 bg-white text-[#003D7A] transition-colors hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        <Icon className="h-5 w-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#DA251D] px-1 text-[10px] font-bold text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-[360px] origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-primary/5 px-4 py-3 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold text-[#003D7A] dark:text-white">Thông báo</p>
                <p className="text-xs text-slate-500">
                  {unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Bạn đã xem hết'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={unreadCount === 0}
                  onClick={() => void markAllAsRead()}
                >
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  Đọc tất cả
                </Button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loadingCount && recent.length === 0 ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : recent.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  Hiện chưa có thông báo nào.
                </div>
              ) : (
                recent.map((n) => (
                  <button
                    key={n.notificationId}
                    type="button"
                    onClick={() => {
                      if (!n.isRead) void markAsRead(n.notificationId)
                    }}
                    className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                      !n.isRead ? 'bg-primary/[0.04]' : ''
                    }`}
                  >
                    <div
                      className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        !n.isRead ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                      }`}
                    >
                      {!n.isRead ? <Check className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`truncate text-sm ${!n.isRead ? 'font-bold text-[#003D7A] dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                          {n.title}
                        </p>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.content}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400">
                        <span>{typeLabel(n.notificationType)}</span>
                        <span>·</span>
                        <span>{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs"
                onClick={() => {
                  setOpen(false)
                  navigate('notifications')
                }}
              >
                Xem tất cả thông báo
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
