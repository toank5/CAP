const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = sessionStorage.getItem('accessToken')
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${baseUrl}${path}`, { ...init, headers })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function asDownload(res: Response, fallbackName: string) {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Tải báo cáo thất bại (${res.status})`)
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition)
  const name = match?.[1]?.replace(/['"]/g, '') || fallbackName
  downloadBlob(blob, name)
}

export const reportsApi = {
  async exportApplicationsExcel(filter: {
    projectId?: string
    status?: string
    search?: string
  } = {}) {
    const res = await authFetch('/api/reports/applications/excel', {
      method: 'POST',
      body: JSON.stringify(filter),
    })
    await asDownload(res, 'danh-sach-ho-so.xlsx')
  },

  async exportPostCheckExcel(projectId?: string) {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
    const res = await authFetch(`/api/reports/post-check/excel${qs}`)
    await asDownload(res, 'hau-kiem.xlsx')
  },

  async exportLotteryResultsExcel(projectId: string) {
    const res = await authFetch(`/api/reports/lottery-results/${projectId}/excel`)
    await asDownload(res, 'ket-qua-boc-tham.xlsx')
  },
}
