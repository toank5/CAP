import { request } from './http'
import type { ApiResult, ApartmentDto, CreateApartmentDto, CreateHousingProjectRequestDto, MilestoneSetupItemDto } from '../types'

export interface HousingProjectFilter {
  pageIndex?: number
  pageSize?: number
  search?: string
  province?: string
  district?: string
  /** Phường/xã — API địa giới v2 */
  ward?: string
  minPrice?: number
  maxPrice?: number
  minArea?: number
  maxArea?: number
  statusId?: string
  /** e.g. OPEN, UPCOMING, Open_For_Registration */
  statusCode?: string
}

export type DeveloperDecisionType =
  | 'CLOSE_AND_SIGN'
  | 'KEEP_OPEN'
  | 'PROCESS_PRIORITY_AND_LOTTERY'

export interface DeveloperWorkflowDecisionRequestDto {
  decisionType: DeveloperDecisionType
  selectedPriorityApplicationIds?: string[]
  /** Gán căn khi chốt / duyệt ưu tiên — bắt buộc với CLOSE_AND_SIGN & PROCESS_PRIORITY_AND_LOTTERY */
  apartmentAssignments?: { applicationId: string; apartmentId: string }[]
  closeProject?: boolean
}

export interface ApplicationSummaryItemDto {
  applicationId: string
  fullName: string
  citizenId: string
  priorityGroup?: string | null
  priorityScore: number
  submittedAt: string
  applicationStatus: string
}

export interface ProjectApplicationEvaluationDto {
  projectId: string
  projectName: string
  availableUnits: number
  totalQualifiedApplications: number
  priorityCount: number
  nonPriorityCount: number
  /** LESS_OR_EQUAL_AVAILABLE | GREATER_THAN_AVAILABLE */
  recommendedScenario: string
  priorityApplications: ApplicationSummaryItemDto[]
  nonPriorityApplications: ApplicationSummaryItemDto[]
}

function buildQuery(params?: HousingProjectFilter): string {
  const qs = new URLSearchParams()
  qs.set('pageIndex', String(params?.pageIndex ?? 1))
  qs.set('pageSize', String(params?.pageSize ?? 100))
  if (params?.search) qs.set('search', params.search)
  if (params?.province) qs.set('province', params.province)
  if (params?.district) qs.set('district', params.district)
  if (params?.ward) qs.set('ward', params.ward)
  if (params?.minPrice != null) qs.set('minPrice', String(params.minPrice))
  if (params?.maxPrice != null) qs.set('maxPrice', String(params.maxPrice))
  if (params?.minArea != null) qs.set('minArea', String(params.minArea))
  if (params?.maxArea != null) qs.set('maxArea', String(params.maxArea))
  if (params?.statusId) qs.set('statusId', params.statusId)
  if (params?.statusCode) qs.set('statusCode', params.statusCode)
  return qs.toString()
}



export function parseApartments(data: unknown): ApartmentDto[] {
  const o = asRecord(data)
  const raw = (o?.apartments ?? o?.Apartments ?? o?.items ?? o?.Items ?? data) as unknown
  if (!Array.isArray(raw)) return []
  return raw.map((it) => {
    const x = (it ?? {}) as Record<string, unknown>
    return {
      id: String(x.id ?? x.Id ?? ''),
      projectId: String(x.projectId ?? x.ProjectId ?? ''),
      unitName: String(x.unitName ?? x.UnitName ?? ''),
      floorNumber: x.floorNumber != null ? Number(x.floorNumber ?? x.FloorNumber) : undefined,
      buildingBlock: (x.buildingBlock ?? x.BuildingBlock) as string | undefined,
      numberOfBedrooms: x.numberOfBedrooms != null ? Number(x.numberOfBedrooms ?? x.NumberOfBedrooms) : undefined,
      numberOfBathrooms: x.numberOfBathrooms != null ? Number(x.numberOfBathrooms ?? x.NumberOfBathrooms) : undefined,
      area: Number(x.area ?? x.Area ?? 0),
      grossArea: x.grossArea != null ? Number(x.grossArea ?? x.GrossArea) : undefined,
      mainDoorDirection: (x.mainDoorDirection ?? x.MainDoorDirection) as string | undefined,
      balconyDirection: (x.balconyDirection ?? x.BalconyDirection) as string | undefined,
      viewDescription: (x.viewDescription ?? x.ViewDescription) as string | undefined,
      maxOccupants: x.maxOccupants != null ? Number(x.maxOccupants ?? x.MaxOccupants) : undefined,
      unitGroup: (x.unitGroup ?? x.UnitGroup) as string | undefined,
      saleType: (x.saleType ?? x.SaleType) as string | undefined,
      coOwnershipRatio: x.coOwnershipRatio != null ? Number(x.coOwnershipRatio ?? x.CoOwnershipRatio) : undefined,
      price: Number(x.price ?? x.Price ?? 0),
      status: String(x.status ?? x.Status ?? 'AVAILABLE'),
      description: (x.description ?? x.Description) as string | null | undefined,
      model3DUrl: (x.model3DUrl ?? x.Model3DUrl) as string | undefined,
      virtualTourUrl: (x.virtualTourUrl ?? x.VirtualTourUrl) as string | undefined,
    } satisfies ApartmentDto
  })
}

function asRecord(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const nested = o.data ?? o.Data
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  return o
}

function mapAppItem(x: Record<string, unknown>): ApplicationSummaryItemDto {
  return {
    applicationId: String(x.applicationId ?? x.ApplicationId ?? ''),
    fullName: String(x.fullName ?? x.FullName ?? ''),
    citizenId: String(x.citizenId ?? x.CitizenId ?? ''),
    priorityGroup: (x.priorityGroup ?? x.PriorityGroup) as string | null | undefined,
    priorityScore: Number(x.priorityScore ?? x.PriorityScore ?? 0),
    submittedAt: String(x.submittedAt ?? x.SubmittedAt ?? ''),
    applicationStatus: String(x.applicationStatus ?? x.ApplicationStatus ?? ''),
  }
}

export function parseProjectEvaluation(data: unknown): ProjectApplicationEvaluationDto | null {
  const o = asRecord(data)
  if (!o) return null
  const priorityRaw = (o.priorityApplications ?? o.PriorityApplications) as unknown
  const nonPriorityRaw = (o.nonPriorityApplications ?? o.NonPriorityApplications) as unknown
  return {
    projectId: String(o.projectId ?? o.ProjectId ?? ''),
    projectName: String(o.projectName ?? o.ProjectName ?? ''),
    availableUnits: Number(o.availableUnits ?? o.AvailableUnits ?? 0),
    totalQualifiedApplications: Number(o.totalQualifiedApplications ?? o.TotalQualifiedApplications ?? 0),
    priorityCount: Number(o.priorityCount ?? o.PriorityCount ?? 0),
    nonPriorityCount: Number(o.nonPriorityCount ?? o.NonPriorityCount ?? 0),
    recommendedScenario: String(o.recommendedScenario ?? o.RecommendedScenario ?? ''),
    priorityApplications: Array.isArray(priorityRaw)
      ? priorityRaw.map((it) => mapAppItem((it ?? {}) as Record<string, unknown>))
      : [],
    nonPriorityApplications: Array.isArray(nonPriorityRaw)
      ? nonPriorityRaw.map((it) => mapAppItem((it ?? {}) as Record<string, unknown>))
      : [],
  }
}

export const housingProjectsApi = {
  list: (params?: HousingProjectFilter) =>
    request<ApiResult>(`/api/HousingProjects?${buildQuery(params)}`, { auth: true }),

  create: (body: CreateHousingProjectRequestDto) =>
    request<ApiResult>('/api/HousingProjects', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
      timeoutMs: 90_000,
    }),

  getById: (id: string) =>
    request<ApiResult>(`/api/HousingProjects/${id}`, { auth: true }),

  update: (id: string, body: CreateHousingProjectRequestDto) =>
    request<ApiResult>(`/api/HousingProjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
      timeoutMs: 90_000,
    }),

  uploadImage: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<ApiResult>('/api/HousingProjects/upload-image', {
      method: 'POST',
      body: fd,
      auth: true,
      timeoutMs: 90_000,
    })
  },

  uploadDocument: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<ApiResult>('/api/HousingProjects/upload-document', {
      method: 'POST',
      body: fd,
      auth: true,
      timeoutMs: 90_000,
    })
  },

  upload3DModel: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<ApiResult>('/api/HousingProjects/upload-3d-model', {
      method: 'POST',
      body: fd,
      auth: true,
      timeoutMs: 90_000,
    })
  },

  createApartmentsBatch: (projectId: string, apartments: CreateApartmentDto[]) =>
    request<ApiResult>(`/api/housing-projects/${projectId}/apartments/batch`, {
      method: 'POST',
      body: JSON.stringify({ apartments }),
      auth: true,
      timeoutMs: 90_000,
    }),

  createApartment: (projectId: string, body: CreateApartmentDto) =>
    request<ApiResult>(`/api/housing-projects/${projectId}/apartments`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  updateApartment: (projectId: string, apartmentId: string, body: Partial<CreateApartmentDto>) =>
    request<ApiResult>(`/api/housing-projects/${projectId}/apartments/${apartmentId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    }),

  deleteApartment: (projectId: string, apartmentId: string) =>
    request<ApiResult>(`/api/housing-projects/${projectId}/apartments/${apartmentId}`, {
      method: 'DELETE',
      auth: true,
    }),

  updateMilestones: (projectId: string, milestones: MilestoneSetupItemDto[]) =>
    request<ApiResult>(`/api/housing-projects/${projectId}/milestones`, {
      method: 'PUT',
      body: JSON.stringify({ milestones }),
      auth: true,
    }),

  importApartmentsExcel: (projectId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<ApiResult>(`/api/housing-projects/${projectId}/apartments/import-excel`, {
      method: 'POST',
      body: fd,
      auth: true,
      timeoutMs: 120_000,
    })
  },

  getApartmentStatistics: (projectId: string) =>
    request<ApiResult>(`/api/housing-projects/${projectId}/apartment-statistics`, { auth: true }),

  getApartments: (projectId: string, params?: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') qs.set(k, String(v))
      })
    }
    const qStr = qs.toString()
    return request<ApiResult>(`/api/housing-projects/${projectId}/apartments${qStr ? `?${qStr}` : ''}`, {
      auth: true,
    })
  },

  delete: (id: string) =>
    request<ApiResult>(`/api/HousingProjects/${id}`, {
      method: 'DELETE',
      auth: true,
    }),

  getEvaluation: (id: string) =>
    request<ApiResult>(`/api/HousingProjects/${id}/application-evaluation`, { auth: true }),

  /**
   * SXD chuyển trạng thái dự án:
   *  - action='approve' : PENDING → UPCOMING (BE set publicAnnounceAt = now)
   *  - action='open'    : UPCOMING → OPEN (mở đăng ký sớm, không cần đợi 30 ngày)
   *  - action='reject'  : PENDING → REJECTED (cần truyền rejectReason)
   *
   * Sau khi gọi, refetch project để có status + publicAnnounceAt mới nhất.
   */
  patchStatus: (id: string, opts: PatchStatusOptions) => {
    const qs = new URLSearchParams()
    qs.set('action', opts.action)
    if (opts.rejectReason) qs.set('rejectReason', opts.rejectReason)
    return request<ApiResult>(`/api/HousingProjects/${id}/status?${qs.toString()}`, {
      method: 'PATCH',
      auth: true,
    })
  },

  executeDeveloperDecision: (id: string, body: DeveloperWorkflowDecisionRequestDto) =>
    request<ApiResult>(`/api/HousingProjects/${id}/developer-decision`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  /** CĐT/SXD/Admin: UPCOMING → OPEN (mở bán / mở đăng ký). */
  changeLifecycleStatus: (id: string, statusCode: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'FULL', note?: string) =>
    request<ApiResult>(`/api/HousingProjects/${id}/lifecycle-status`, {
      method: 'PATCH',
      body: JSON.stringify({ statusCode, note }),
      auth: true,
    }),

  /**
   * SXD phê duyệt hoặc từ chối dự án mới.
   * Dùng chung BE endpoint với patchStatus nhưng mang action 'approve'/'reject'.
   */
  sxdReviewProject: (id: string, body: { action: 'APPROVE' | 'REJECT'; note?: string }) => {
    const action = body.action === 'APPROVE' ? 'APPROVE' : 'REJECT'
    const qs = new URLSearchParams({ action })
    if (body.note) qs.set('rejectReason', body.note)
    return request<ApiResult>(`/api/HousingProjects/${id}/status?${qs.toString()}`, {
      method: 'PATCH',
      auth: true,
    })
  },

  /** Lấy danh sách dự án chờ SXD duyệt (PENDING) */
  listSxdPendingProjects: () =>
    request<ApiResult>('/api/HousingProjects/sxd-pending', { auth: true }),

  /** Lấy cấu trúc mặt bằng 3D toàn dự án (Block -> Tầng -> Căn hộ) */
  getFloorPlan: (projectId: string) =>
    request<ApiResult>(`/api/housing-projects/${projectId}/floor-plan`, { auth: false }),
}

/** Action SXD dùng để chuyển trạng thái dự án. Match với BE controller. */
export type ProjectStatusAction = 'approve' | 'open' | 'reject'

export interface PatchStatusOptions {
  action: ProjectStatusAction
  /** Bắt buộc nếu action='reject' */
  rejectReason?: string
}
