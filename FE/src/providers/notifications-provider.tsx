import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  notificationApi,
  parsePagedNotifications,
  parseUnreadCount,
  type NotificationDto,
  type PagedNotificationResultDto,
} from '@/api/notification'
import { isLoggedIn } from '@/router'

interface NotificationsContextValue {
  unreadCount: number
  recent: NotificationDto[]
  loaded: PagedNotificationResultDto | null
  loadingList: boolean
  loadingCount: boolean
  refreshCount: () => Promise<void>
  refreshList: (page?: number, pageSize?: number) => Promise<void>
  loadMore: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

const POLL_INTERVAL_MS = 60_000

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loaded, setLoaded] = useState<PagedNotificationResultDto | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingCount, setLoadingCount] = useState(false)
  const logged = isLoggedIn()
  const timerRef = useRef<number | null>(null)

  const refreshCount = useCallback(async () => {
    if (!isLoggedIn()) {
      setUnreadCount(0)
      return
    }
    setLoadingCount(true)
    try {
      const data = await notificationApi.getUnreadCount()
      setUnreadCount(parseUnreadCount(data))
    } catch {
      // silently ignore — badge stays at last known value
    } finally {
      setLoadingCount(false)
    }
  }, [])

  const refreshList = useCallback(async (page = 1, pageSize = 20) => {
    if (!isLoggedIn()) {
      setLoaded(null)
      return
    }
    setLoadingList(true)
    try {
      const data = await notificationApi.getMy(page, pageSize)
      setLoaded(parsePagedNotifications(data))
    } catch {
      setLoaded({ items: [], totalCount: 0, page, pageSize, totalPages: 0, hasNextPage: false, hasPreviousPage: false })
    } finally {
      setLoadingList(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!loaded || !loaded.hasNextPage || loadingList) return
    const nextPage = loaded.page + 1
    setLoadingList(true)
    try {
      const data = await notificationApi.getMy(nextPage, loaded.pageSize)
      const more = parsePagedNotifications(data)
      setLoaded({
        ...more,
        items: [...loaded.items, ...more.items],
      })
    } catch {
      // ignore — pagination just stops here
    } finally {
      setLoadingList(false)
    }
  }, [loaded, loadingList])

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await notificationApi.markAsRead(id)
      } finally {
        setLoaded((prev) => {
          if (!prev) return prev
          let touched = false
          const items = prev.items.map((it) => {
            if (it.notificationId === id && !it.isRead) {
              touched = true
              return { ...it, isRead: true }
            }
            return it
          })
          return touched ? { ...prev, items } : prev
        })
        setUnreadCount((c) => (c > 0 ? c - 1 : 0))
      }
    },
    [],
  )

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead()
    } finally {
      setLoaded((prev) => {
        if (!prev) return prev
        const items = prev.items.map((it) => ({ ...it, isRead: true }))
        return { ...prev, items }
      })
      setUnreadCount(0)
    }
  }, [])

  useEffect(() => {
    if (!logged) {
      setUnreadCount(0)
      setLoaded(null)
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }
    void refreshCount()
    timerRef.current = window.setInterval(() => {
      void refreshCount()
    }, POLL_INTERVAL_MS)
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [logged, refreshCount])

  const recent = useMemo(() => (loaded?.items ?? []).slice(0, 5), [loaded])

  const value = useMemo<NotificationsContextValue>(
    () => ({
      unreadCount,
      recent,
      loaded,
      loadingList,
      loadingCount,
      refreshCount,
      refreshList,
      loadMore,
      markAsRead,
      markAllAsRead,
    }),
    [unreadCount, recent, loaded, loadingList, loadingCount, refreshCount, refreshList, loadMore, markAsRead, markAllAsRead],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
