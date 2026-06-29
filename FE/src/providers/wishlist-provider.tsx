import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { wishlistApi } from '@/api/wishlist'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { FEATURED_HOUSES, getFavorites, toggleFavorite } from '@/lib/featured-houses'
import { formatError } from '@/lib/format-error'
import { extractWishlistItems } from '@/lib/parsers'
import { isLoggedIn } from '@/router'
import type { WishlistItemDto } from '@/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isProjectUuid(id: string): boolean {
  return UUID_RE.test(id)
}

function localFeaturedItems(ids: string[]): WishlistItemDto[] {
  return FEATURED_HOUSES.filter((h) => ids.includes(h.id)).map((h) => ({
    wishlistId: `local-${h.id}`,
    projectId: h.id,
    projectName: h.name,
    description: h.description,
    province: undefined,
    district: undefined,
    address: h.address,
    minPrice: h.paymentAmount * 10,
    maxPrice: h.paymentAmount * 10,
    minArea: parseInt(h.area.replace(/\D/g, ''), 10) || 0,
    maxArea: parseInt(h.area.replace(/\D/g, ''), 10) || 0,
    availableUnits: parseInt(h.units.replace(/\D/g, ''), 10) || 0,
    thumbnailUrl: h.imageUrl,
    status: h.status,
  }))
}

function mergeWishlistItems(apiItems: WishlistItemDto[], localItems: WishlistItemDto[]): WishlistItemDto[] {
  const seen = new Set(apiItems.map((i) => i.projectId))
  return [...apiItems, ...localItems.filter((i) => !seen.has(i.projectId))]
}

interface WishlistContextValue {
  items: WishlistItemDto[]
  loading: boolean
  isWishlisted: (projectId: string) => boolean
  toggle: (projectId: string) => Promise<boolean>
  reload: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const route = useHashRoute()
  const [items, setItems] = useState<WishlistItemDto[]>([])
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    const localIds = getFavorites()
    const localItems = localFeaturedItems(localIds)

    if (!isLoggedIn()) {
      setItems(localItems)
      setWishlistedIds(new Set(localIds))
      return
    }

    setLoading(true)
    try {
      const data = await wishlistApi.list({ pageSize: 100 })
      const apiItems = extractWishlistItems(data)
      const merged = mergeWishlistItems(apiItems, localItems)
      setItems(merged)
      setWishlistedIds(new Set(merged.map((i) => i.projectId)))
    } catch {
      setItems(localItems)
      setWishlistedIds(new Set(localIds))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (route === 'quan-tam') void reload()
  }, [route, reload])

  const isWishlisted = useCallback((projectId: string) => wishlistedIds.has(projectId), [wishlistedIds])

  const toggle = useCallback(async (projectId: string): Promise<boolean> => {
    if (!isLoggedIn()) {
      navigate('login')
      return false
    }

    const wasOn = wishlistedIds.has(projectId)

    if (!isProjectUuid(projectId)) {
      const nowOn = toggleFavorite(projectId)
      await reload()
      return nowOn
    }

    try {
      if (wasOn) {
        await wishlistApi.remove(projectId)
      } else {
        await wishlistApi.add(projectId)
      }
      await reload()
      return !wasOn
    } catch (err) {
      alert(formatError(err))
      return wasOn
    }
  }, [wishlistedIds, reload])

  const value = useMemo(
    () => ({ items, loading, isWishlisted, toggle, reload }),
    [items, loading, isWishlisted, toggle, reload],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
