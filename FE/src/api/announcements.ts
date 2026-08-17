import { request } from './http'

export interface AnnouncementAttachment {
  id: string
  fileName: string
  fileUrl: string
  contentType: string
  fileSize: number
  uploadedAt: string
}

export interface AnnouncementDto {
  id: string
  title: string
  content: string
  announcementType: string
  legalDocumentNumber?: string | null
  effectiveDate?: string | null
  expirationDate?: string | null
  projectId?: string | null
  projectName?: string | null
  isPinned: boolean
  status: string
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt?: string | null
  attachments: AnnouncementAttachment[]
}

export interface PagedAnnouncements {
  items: AnnouncementDto[]
  totalCount: number
  page: number
  pageSize: number
}

function mapAttachment(raw: Record<string, unknown>): AnnouncementAttachment {
  return {
    id: String(raw.id ?? raw.Id ?? ''),
    fileName: String(raw.fileName ?? raw.FileName ?? ''),
    fileUrl: String(raw.fileUrl ?? raw.FileUrl ?? ''),
    contentType: String(raw.contentType ?? raw.ContentType ?? ''),
    fileSize: Number(raw.fileSize ?? raw.FileSize ?? 0),
    uploadedAt: String(raw.uploadedAt ?? raw.UploadedAt ?? ''),
  }
}

export function parseAnnouncement(data: unknown): AnnouncementDto | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const atts = (o.attachments ?? o.Attachments) as unknown
  return {
    id: String(o.id ?? o.Id ?? ''),
    title: String(o.title ?? o.Title ?? ''),
    content: String(o.content ?? o.Content ?? ''),
    announcementType: String(o.announcementType ?? o.AnnouncementType ?? ''),
    legalDocumentNumber: (o.legalDocumentNumber ?? o.LegalDocumentNumber) as string | null | undefined,
    effectiveDate: (o.effectiveDate ?? o.EffectiveDate) as string | null | undefined,
    expirationDate: (o.expirationDate ?? o.ExpirationDate) as string | null | undefined,
    projectId: (o.projectId ?? o.ProjectId) as string | null | undefined,
    projectName: (o.projectName ?? o.ProjectName) as string | null | undefined,
    isPinned: Boolean(o.isPinned ?? o.IsPinned),
    status: String(o.status ?? o.Status ?? ''),
    createdBy: String(o.createdBy ?? o.CreatedBy ?? ''),
    createdByName: String(o.createdByName ?? o.CreatedByName ?? ''),
    createdAt: String(o.createdAt ?? o.CreatedAt ?? ''),
    updatedAt: (o.updatedAt ?? o.UpdatedAt) as string | null | undefined,
    attachments: Array.isArray(atts)
      ? atts.map((a) => mapAttachment((a ?? {}) as Record<string, unknown>))
      : [],
  }
}

export function parsePagedAnnouncements(data: unknown): PagedAnnouncements {
  if (!data || typeof data !== 'object') {
    return { items: [], totalCount: 0, page: 1, pageSize: 10 }
  }
  const o = data as Record<string, unknown>
  const rawItems = (o.items ?? o.Items) as unknown
  const items = Array.isArray(rawItems)
    ? rawItems.map((x) => parseAnnouncement(x)).filter(Boolean) as AnnouncementDto[]
    : []
  return {
    items,
    totalCount: Number(o.totalCount ?? o.TotalCount ?? items.length),
    page: Number(o.page ?? o.Page ?? 1),
    pageSize: Number(o.pageSize ?? o.PageSize ?? 10),
  }
}

export const announcementsApi = {
  getPublished(params?: { page?: number; pageSize?: number; type?: string; search?: string }) {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 10))
    if (params?.type) qs.set('type', params.type)
    if (params?.search) qs.set('search', params.search)
    return request<unknown>(`/api/announcements?${qs}`)
  },

  getById(id: string) {
    return request<unknown>(`/api/announcements/${id}`)
  },

  /** Lấy tất cả thông báo (kể cả nháp) — cho SXD quản lý */
  getManagement(params?: { page?: number; pageSize?: number; type?: string; search?: string }) {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 20))
    if (params?.type) qs.set('type', params.type)
    if (params?.search) qs.set('search', params.search)
    return request<unknown>(`/api/announcements/management?${qs}`, { auth: true })
  },

  create(body: {
    title: string
    content: string
    announcementType?: string
    legalDocumentNumber?: string
    effectiveDate?: string
    expirationDate?: string
    projectId?: string
    isPinned?: boolean
  }) {
    return request<unknown>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    })
  },

  update(id: string, body: {
    title?: string
    content?: string
    announcementType?: string
    legalDocumentNumber?: string
    effectiveDate?: string
    expirationDate?: string
    isPinned?: boolean
  }) {
    return request<unknown>(`/api/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    })
  },

  delete(id: string) {
    return request<unknown>(`/api/announcements/${id}`, {
      method: 'DELETE',
      auth: true,
    })
  },
}
