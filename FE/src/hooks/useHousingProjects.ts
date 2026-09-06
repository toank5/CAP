import { useCallback, useEffect, useState } from 'react'
import { housingProjectsApi } from '@/api/housing-projects'
import { HCM_PROVINCE } from '@/lib/housing-search'
import { extractProjects } from '@/lib/parsers'
import { mapProjectToCard, type ProjectCard } from '@/lib/projects'
import { effectiveProjectStatus } from '@/lib/project-status-flow'

const PUBLIC_STATUSES = new Set(['OPEN', 'UPCOMING', 'CLOSED', 'FULL'])

export function useHousingProjects(pageSize = 12) {
  const [projects, setProjects] = useState<ProjectCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await housingProjectsApi.list({
        pageIndex: 1,
        pageSize,
        province: HCM_PROVINCE,
      })
      const items = extractProjects(data)
        .filter((p) => PUBLIC_STATUSES.has(effectiveProjectStatus(p)))
        .filter((p) => (p.availableUnits ?? 0) > 0)
        .map(mapProjectToCard)
      setProjects(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách dự án')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    void load()
  }, [load])

  return { projects, loading, error, reload: load }
}
