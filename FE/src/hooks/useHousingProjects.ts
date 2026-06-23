import { useCallback, useEffect, useState } from 'react'
import { housingProjectsApi } from '@/api/housing-projects'
import { extractProjects } from '@/lib/parsers'
import { mapProjectToCard, type ProjectCard } from '@/lib/projects'
import { FEATURED_HOUSES } from '@/lib/featured-houses'

function fallbackCards(): ProjectCard[] {
  return FEATURED_HOUSES.map((h) => ({
    id: h.id,
    name: h.name,
    location: h.location,
    address: h.address,
    price: h.price,
    units: h.units,
    type: h.type,
    area: h.area,
    status: h.status,
    description: h.description,
    paymentAmount: h.paymentAmount,
    imageUrl: h.imageUrl,
    minPrice: h.paymentAmount * 10,
    maxPrice: h.paymentAmount * 10,
    availableUnits: parseInt(h.units.replace(/\D/g, ''), 10) || 0,
  }))
}

export function useHousingProjects(pageSize = 12) {
  const [projects, setProjects] = useState<ProjectCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await housingProjectsApi.list({ pageIndex: 1, pageSize })
      const items = extractProjects(data).map(mapProjectToCard)
      setProjects(items.length > 0 ? items : fallbackCards())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách dự án')
      setProjects(fallbackCards())
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    void load()
  }, [load])

  return { projects, loading, error, reload: load }
}
