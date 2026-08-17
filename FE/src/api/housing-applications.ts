import { request } from './http'
import type {
  ApiResult,
  ApplicationDetailDto,
  ApplicationFilterDto,
  CreateApplicationDto,
  PagedResultDto,
  ApplicationSummaryDto,
  ReviewRequestDto,
} from '../types'

function buildQuery(filter: ApplicationFilterDto = {}): string {
  const params = new URLSearchParams()
  if (filter.pageIndex != null) params.set('pageIndex', String(filter.pageIndex))
  if (filter.pageSize != null) params.set('pageSize', String(filter.pageSize))
  if (filter.status) params.set('status', filter.status)
  if (filter.projectId) params.set('projectId', filter.projectId)
  if (filter.search) params.set('search', filter.search)
  if (filter.submittedFrom) params.set('submittedFrom', filter.submittedFrom)
  if (filter.submittedTo) params.set('submittedTo', filter.submittedTo)
  const q = params.toString()
  return q ? `?${q}` : ''
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function pagedBody(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {}
  const o = data as Record<string, unknown>
  const nested = o.data ?? o.Data
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  return o
}

function extractApplicationItems(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) return data

  const o = data as Record<string, unknown>
  const direct = o.items ?? o.Items
  if (Array.isArray(direct)) return direct

  const nested = o.data ?? o.Data
  if (Array.isArray(nested)) return nested
  if (nested && typeof nested === 'object') {
    const inner = nested as Record<string, unknown>
    const innerItems = inner.items ?? inner.Items ?? inner.data ?? inner.Data
    if (Array.isArray(innerItems)) return innerItems
  }

  return []
}

/** Đọc totalCount / totalPages từ phản hồi phân trang (camelCase + PascalCase + wrapper data). */
export function parsePagedMeta(
  data: unknown,
  fallbackPageSize: number,
): { totalCount: number; totalPages: number; pageIndex: number; pageSize: number } {
  const body = pagedBody(data)
  const totalCount = Number(body.totalCount ?? body.TotalCount ?? extractApplicationItems(data).length)
  const pageSize = Math.max(1, Number(body.pageSize ?? body.PageSize ?? fallbackPageSize))
  const pageIndex = Math.max(1, Number(body.pageIndex ?? body.PageIndex ?? 1))
  const fromApi = Number(body.totalPages ?? body.TotalPages ?? 0)
  const totalPages =
    fromApi > 0 ? fromApi : totalCount > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1
  return { totalCount, totalPages, pageIndex, pageSize }
}

/** Normalize list/dashboard items so web always gets applicantFullName + citizenId. */
export function parsePagedApplications(data: unknown): ApplicationSummaryDto[] {
  return extractApplicationItems(data).map((raw) => {
    const x = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const fullName =
      str(x.applicantFullName) ||
      str(x.ApplicantFullName) ||
      str(x.applicantName) ||
      str(x.ApplicantName) ||
      str(x.fullName) ||
      str(x.FullName)
    return {
      ...(x as unknown as ApplicationSummaryDto),
      applicationId: str(x.applicationId ?? x.ApplicationId),
      projectId: str(x.projectId ?? x.ProjectId),
      projectName: str(x.projectName ?? x.ProjectName),
      applicantId: str(x.applicantId ?? x.ApplicantId),
      applicantFullName: fullName,
      citizenId: str(x.citizenId ?? x.CitizenId),
      applicationStatus: str(x.applicationStatus ?? x.ApplicationStatus),
      createdAt: str(x.createdAt ?? x.CreatedAt),
      submittedAt: str(x.submittedAt ?? x.SubmittedAt),
      updatedAt: (x.updatedAt ?? x.UpdatedAt) as string | null | undefined,
      housingStatus: str(x.housingStatus ?? x.HousingStatus),
      monthlyIncome: (() => {
        const v = x.monthlyIncome ?? x.MonthlyIncome ?? x.estimatedMonthlyIncome ?? x.EstimatedMonthlyIncome
        return v == null || v === '' ? null : Number(v)
      })(),
      estimatedMonthlyIncome: Number(
        x.monthlyIncome ?? x.MonthlyIncome ?? x.estimatedMonthlyIncome ?? x.EstimatedMonthlyIncome ?? 0,
      ),
      documentCount: Number(x.documentCount ?? x.DocumentCount ?? 0),
      receiptUrl: (x.receiptUrl ?? x.ReceiptUrl) as string | null | undefined,
      isViolation: Boolean(x.isViolation ?? x.IsViolation ?? false),
      violationReason: (x.violationReason ?? x.ViolationReason) as string | null | undefined,
    }
  })
}

export function parseApplicationDetail(data: unknown): ApplicationDetailDto | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, unknown>
  const nested = root.data ?? root.Data
  const o =
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : root
  const app = o as unknown as ApplicationDetailDto
  // Normalize apartment / lottery fields (camelCase + PascalCase)
  const aptId = o.apartmentId ?? o.ApartmentId
  const aptName = o.apartmentUnitName ?? o.ApartmentUnitName
  const aptArea = o.apartmentArea ?? o.ApartmentArea
  const aptPrice = o.apartmentPrice ?? o.ApartmentPrice
  const aptStatus = o.apartmentStatus ?? o.ApartmentStatus
  const slot = o.slotCode ?? o.SlotCode
  const lottery = o.lotteryResult ?? o.LotteryResult
  const monthlyRaw = o.monthlyIncome ?? o.MonthlyIncome ?? o.estimatedMonthlyIncome ?? o.EstimatedMonthlyIncome
  const spouseRaw = o.spouseMonthlyIncome ?? o.SpouseMonthlyIncome
  const monthlyIncome = monthlyRaw == null || monthlyRaw === '' ? null : Number(monthlyRaw)
  const spouseMonthlyIncome = spouseRaw == null || spouseRaw === '' ? null : Number(spouseRaw)
  return {
    ...app,
    applicationId: String(o.applicationId ?? o.ApplicationId ?? app.applicationId ?? ''),
    projectId: String(o.projectId ?? o.ProjectId ?? app.projectId ?? ''),
    applicationStatus: String(o.applicationStatus ?? o.ApplicationStatus ?? app.applicationStatus ?? ''),
    maritalStatus: (o.maritalStatus ?? o.MaritalStatus ?? app.maritalStatus) as string | null | undefined,
    priorityGroup: (o.priorityGroup ?? o.PriorityGroup ?? app.priorityGroup) as string | null | undefined,
    monthlyIncome,
    spouseMonthlyIncome,
    estimatedMonthlyIncome: monthlyIncome ?? 0,
    averageHousingAreaPerPerson: (() => {
      const v = o.averageHousingAreaPerPerson ?? o.AverageHousingAreaPerPerson
      return v == null || v === '' ? null : Number(v)
    })(),
    slotCode: slot != null ? String(slot) : app.slotCode,
    lotteryResult: lottery != null ? String(lottery) : app.lotteryResult,
    apartmentId: aptId != null && String(aptId) ? String(aptId) : null,
    apartmentUnitName: aptName != null ? String(aptName) : null,
    apartmentArea: aptArea != null && aptArea !== '' ? Number(aptArea) : null,
    apartmentPrice: aptPrice != null && aptPrice !== '' ? Number(aptPrice) : null,
    apartmentStatus: aptStatus != null ? String(aptStatus) : null,
    householdMembers: (() => {
      const raw = o.householdMembers ?? o.HouseholdMembers
      if (!Array.isArray(raw)) return undefined
      return raw.map((m: Record<string, unknown>) => ({
        memberId: (m.memberId ?? m.MemberId) as string | null,
        fullName: String(m.fullName ?? m.FullName ?? ''),
        citizenId: m.citizenId != null ? String(m.citizenId) : null,
        dateOfBirth: m.dateOfBirth != null ? String(m.dateOfBirth) : null,
        relationship: String(m.relationship ?? m.Relationship ?? ''),
        note: (m.note ?? m.Note) as string | null | undefined,
      }))
    })(),
    eligibility: (() => {
      const raw = o.eligibility ?? o.Eligibility
      if (!raw || typeof raw !== 'object') return null
      const e = raw as Record<string, unknown>
      return {
        isEligible: Boolean(e.isEligible ?? e.IsEligible),
        isIncomeEligible: Boolean(e.isIncomeEligible ?? e.IsIncomeEligible),
        isHousingStatusEligible: Boolean(e.isHousingStatusEligible ?? e.IsHousingStatusEligible),
        isPriorityGroupEligible: Boolean(e.isPriorityGroupEligible ?? e.IsPriorityGroupEligible),
        totalScore: e.totalScore != null ? Number(e.totalScore) : null,
        verifiedAt: e.verifiedAt ? String(e.verifiedAt) : null,
      }
    })(),
  }
}

/** Một mục check do AI trả về khi audit hồ sơ (giúp CĐT duyệt nhanh). */
export interface AuditChecklistItem {
  field: string
  status: 'OK' | 'WARN' | 'FAIL' | string
  note?: string | null
  /** Tên tài liệu liên quan, nếu có */
  documentName?: string | null
}

/** Response từ BE khi gọi API audit tài liệu hồ sơ. */
export interface AuditChecklistResponse {
  applicationId?: string
  overallScore?: number
  summary?: string
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | string
  checks?: AuditChecklistItem[]
  rawText?: string
}

function pickAuditBody(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  return (o.data ?? o.Data ?? o) as Record<string, unknown>
}

/** Parse response trả về từ API POST /documents/audit (linh hoạt camelCase + PascalCase). */
export function parseAuditChecklist(data: unknown): AuditChecklistResponse | null {
  const o = pickAuditBody(data)
  if (!o) return null
  const checksRaw = (o.checks ?? o.Checks) as unknown
  const checks: AuditChecklistItem[] = Array.isArray(checksRaw)
    ? (checksRaw as Array<Record<string, unknown>>).map((c) => ({
        field: String(c.field ?? c.Field ?? ''),
        status: String(c.status ?? c.Status ?? 'OK').toUpperCase(),
        note: (c.note ?? c.Note) as string | null | undefined,
        documentName: (c.documentName ?? c.DocumentName) as string | null | undefined,
      }))
    : []
  return {
    applicationId: (o.applicationId ?? o.ApplicationId) as string | undefined,
    overallScore: o.overallScore != null ? Number(o.overallScore) : o.OverallScore != null ? Number(o.OverallScore) : undefined,
    summary: (o.summary ?? o.Summary) as string | undefined,
    riskLevel: (o.riskLevel ?? o.RiskLevel) as string | undefined,
    checks,
    rawText: (o.rawText ?? o.RawText) as string | undefined,
  }
}

export const housingApplicationsApi = {
  activeCheck: () =>
    request<{ hasActiveApplication?: boolean; HasActiveApplication?: boolean; message?: string }>(
      '/api/housing-applications/active-check',
      { auth: true },
    ),

  update: (id: string, body: Omit<CreateApplicationDto, 'projectId'>) =>
    request<ApiResult>(`/api/housing-applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    }),

  create: (body: CreateApplicationDto) =>
    request<ApiResult>('/api/housing-applications', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  getMy: (filter?: ApplicationFilterDto) =>
    request<PagedResultDto<ApplicationSummaryDto>>(
      `/api/housing-applications/my${buildQuery(filter)}`,
      { auth: true },
    ),

  getAll: (filter?: ApplicationFilterDto) =>
    request<PagedResultDto<ApplicationSummaryDto>>(
      `/api/housing-applications${buildQuery(filter)}`,
      { auth: true },
    ),

  getSxdDashboard: (filter?: ApplicationFilterDto) =>
    request<PagedResultDto<ApplicationSummaryDto>>(
      `/api/housing-applications/dashboard/sxd${buildQuery(filter)}`,
      { auth: true },
    ),

  getDeveloperDashboard: (filter?: ApplicationFilterDto) =>
    request<PagedResultDto<ApplicationSummaryDto>>(
      `/api/housing-applications/dashboard/developer${buildQuery(filter)}`,
      { auth: true },
    ),

  submitToDepartment: (applicationIds: string[]) =>
    request<ApiResult>('/api/housing-developer/submit-to-department', {
      method: 'POST',
      body: JSON.stringify({ applicationIds }),
      auth: true,
    }),

  developerReview: (id: string, body: ReviewRequestDto) =>
    request<ApiResult>(`/api/housing-applications/${id}/developer-review`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      auth: true,
    }),

  sxdReview: (id: string, body: ReviewRequestDto) =>
    request<ApiResult>(`/api/housing-applications/${id}/sxd-review`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      auth: true,
    }),

  /** SXD bulk approve nhiều PENDING_SXD_REVIEW cùng lúc */
  bulkSxdApprove: (ids: string[]) =>
    request<ApiResult>('/api/housing-applications/bulk-sxd-approve', {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
      auth: true,
    }),

  /** SXD bulk reject nhiều PENDING_SXD_REVIEW cùng lúc */
  bulkSxdReject: (ids: string[], note: string) =>
    request<ApiResult>('/api/housing-applications/bulk-sxd-reject', {
      method: 'PATCH',
      body: JSON.stringify({ ids, note }),
      auth: true,
    }),

  /** SXD yêu cầu CĐT bổ sung giấy tờ → application quay về NEED_MORE_DOCUMENTS */
  sxdRequestDocs: (id: string, note: string) =>
    request<ApiResult>(`/api/housing-applications/${id}/sxd-request-docs`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
      auth: true,
    }),

  cancel: (id: string, reason?: string) =>
    request<ApiResult>(`/api/housing-applications/${id}/cancel`, {
      method: 'PATCH',
      // BE: CancelApplicationRequestDto.CancelReason (bắt buộc)
      body: JSON.stringify({ cancelReason: reason?.trim() ?? '' }),
      auth: true,
    }),

  getById: (id: string) =>
    request<ApplicationDetailDto>(`/api/housing-applications/${id}`, { auth: true }),

  submit: (id: string) =>
    request<ApiResult>(`/api/housing-applications/${id}/submit`, {
      method: 'POST',
      auth: true,
    }),

  assign: (id: string) =>
    request<ApiResult>(`/api/housing-applications/${id}/assign`, {
      method: 'PATCH',
      auth: true,
    }),

  /** Gắn cờ vi phạm (gian lận đất đai) */
  flagViolation: (id: string, reason: string) =>
    request<ApiResult>(`/api/housing-applications/${id}/flag-violation`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      auth: true,
    }),

  /** Gỡ cờ vi phạm */
  unflagViolation: (id: string) =>
    request<ApiResult>(`/api/housing-applications/${id}/unflag-violation`, {
      method: 'POST',
      auth: true,
    }),

  /** CĐT/SXD bàn giao căn cụ thể → sinh lịch thanh toán đợt */
  assignApartment: (id: string, apartmentId: string) =>
    request<ApiResult>(`/api/housing-applications/${id}/assign-apartment`, {
      method: 'POST',
      body: JSON.stringify({ apartmentId }),
      auth: true,
    }),

  voReview: (id: string, body: ReviewRequestDto) =>
    request<ApiResult>(`/api/housing-applications/${id}/vo-review`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  wmReview: (id: string, body: ReviewRequestDto) =>
    request<ApiResult>(`/api/housing-applications/${id}/wm-review`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  uploadDocument: (applicationId: string, documentType: string, file: File) => {
    const fd = new FormData()
    fd.append('DocumentType', documentType)
    fd.append('File', file)
    return request<ApiResult>(`/api/housing-applications/${applicationId}/documents`, {
      method: 'POST',
      body: fd,
      auth: true,
    })
  },

  deleteDocument: (applicationId: string, documentId: string) =>
    request<ApiResult>(`/api/housing-applications/${applicationId}/documents/${documentId}`, {
      method: 'DELETE',
      auth: true,
    }),

  /**
   * Gửi yêu cầu AI kiểm tra/audit toàn bộ tài liệu hồ sơ.
   * BE sẽ đọc các file PDF/ảnh CCCD, hộ khẩu, xác nhận thu nhập... rồi
   * trả về checklist trắc ẩn/rủi ro để CĐT duyệt nhanh hơn.
   *
   * Body gửi đi gồm 2 phần để AI đối chiếu chéo:
   *  - `context`: thông tin đăng ký (họ tên, CCCD, thu nhập, nơi ở...) do FE gửi kèm
   *  - `documentIds`: danh sách ID tài liệu đính kèm (BE tự map sang URL file)
   *
   * Nếu FE không gửi body, BE vẫn chạy được (chỉ dựa trên documents + DB).
   *
   * - Endpoint: POST /api/housing-applications/{applicationId}/documents/audit
   * - Trả về: ApiResult chứa AuditChecklistResponse (xem kiểu ở trên)
   */
  auditDocuments: (
    applicationId: string,
    context?: {
      applicationInfo?: ApplicationDetailDto
      documentIds?: string[]
    },
  ) =>
    request<ApiResult>(`/api/housing-applications/${applicationId}/documents/audit`, {
      method: 'POST',
      body: JSON.stringify({
              context: context?.applicationInfo
          ? {
              fullName: context.applicationInfo.fullName,
              citizenId: context.applicationInfo.citizenId,
              occupation: context.applicationInfo.occupation,
              workPlace: context.applicationInfo.workPlace,
              currentResidence: context.applicationInfo.currentResidence,
              permanentAddress: context.applicationInfo.permanentAddress,
              housingStatus: context.applicationInfo.housingStatus,
              estimatedMonthlyIncome:
                context.applicationInfo.monthlyIncome ??
                context.applicationInfo.estimatedMonthlyIncome,
              monthlyIncome: context.applicationInfo.monthlyIncome,
              spouseMonthlyIncome: context.applicationInfo.spouseMonthlyIncome,
              isViolation: context.applicationInfo.isViolation,
              violationReason: context.applicationInfo.violationReason,
              projectId: context.applicationInfo.projectId,
              projectName: context.applicationInfo.projectName,
            }
          : undefined,
        documentIds: context?.documentIds,
      }),
      auth: true,
    }),
}
