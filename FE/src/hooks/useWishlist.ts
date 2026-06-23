import { useCallback, useEffect, useState } from 'react'
import { wishlistApi } from '@/api/wishlist'
import { navigate } from '@/hooks/useHashRoute'
import { extractWishlistItems } from '@/lib/parsers'
import { isLoggedIn } from '@/router'
import { formatError } from '@/lib/format-error'

export function useWishlist() {
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isLoggedIn()) {
      setIds(new Set())
      return
    }
    setLoading(true)
    try {
      const data = await wishlistApi.list({ pageSize: 100 })
      const items = extractWishlistItems(data)
      setIds(new Set(items.map((i) => i.projectId)))
    } catch {
      setIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const isWishlisted = useCallback((projectId: string) => ids.has(projectId), [ids])

  const toggle = useCallback(async (projectId: string): Promise<boolean> => {
    if (!isLoggedIn()) {
      navigate('login')
      return false
    }
    const wasOn = ids.has(projectId)
    try {
      if (wasOn) {
        await wishlistApi.remove(projectId)
        setIds((prev) => {
          const next = new Set(prev)
          next.delete(projectId)
          return next
        })
        return false
      }
      await wishlistApi.add(projectId)
      setIds((prev) => new Set(prev).add(projectId))
      return true
    } catch (err) {
      alert(formatError(err))
      return wasOn
    }
  }, [ids])

  return { ids, loading, isWishlisted, toggle, reload: load }
}
