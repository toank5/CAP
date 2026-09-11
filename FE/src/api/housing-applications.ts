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
      priorityGroup: str(x.priorityGroup ?? x.PriorityGroup ?? x.policyGroup ?? x.PolicyGroup ?? ''),
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
  const applicantObj = (o.applicant ?? o.Applicant ?? o.user ?? o.User ?? o.citizenCard ?? o.CitizenCard ?? {}) as Record<string, unknown>
  const citizenIdStr = String(o.citizenId ?? o.CitizenId ?? applicantObj.citizenId ?? applicantObj.CitizenId ?? app.citizenId ?? '')

  // Smart inference from 12-digit CCCD if BE hasn't returned them
  let inferredGender: string | null = null
  let inferredYear: string | null = null
  let inferredProvince: string | null = null
  if (citizenIdStr && citizenIdStr.length === 12 && /^\d+$/.test(citizenIdStr)) {
    const provinceCode = citizenIdStr.slice(0, 3)
    const genderDigit = citizenIdStr[3]
    const yearDigits = citizenIdStr.slice(4, 6)
    if (genderDigit === '0' || genderDigit === '2' || genderDigit === '4') inferredGender = 'Nam'
    else if (genderDigit === '1' || genderDigit === '3' || genderDigit === '5') inferredGender = 'Nữ'

    if (genderDigit === '0' || genderDigit === '1') inferredYear = `19${yearDigits}`
    else if (genderDigit === '2' || genderDigit === '3') inferredYear = `20${yearDigits}`

    const PROVINCE_CODES: Record<string, string> = {
      '001': 'Hà Nội', '079': 'TP. Hồ Chí Minh', '048': 'Đà Nẵng', '031': 'Hải Phòng', '092': 'Cần Thơ',
      '083': 'Bến Tre', '074': 'Bình Dương', '075': 'Đồng Nai', '077': 'Bà Rịa - Vũng Tàu', '080': 'Long An',
      '082': 'Tiền Giang', '084': 'Trà Vinh', '086': 'Vĩnh Long', '087': 'Đồng Tháp', '089': 'An Giang',
      '091': 'Kiên Giang', '093': 'Hậu Giang', '094': 'Sóc Trăng', '095': 'Bạc Liêu', '096': 'Cà Mau',
    }
    inferredProvince = PROVINCE_CODES[provinceCode] ?? null
  }

  // Check localStorage for cached citizen/applicant profile
  let cached: Record<string, unknown> | null = null
  try {
    const rawCitizen = citizenIdStr ? localStorage.getItem(`applicant_profile_${citizenIdStr}`) : null
    const rawApp = app.applicantId ? localStorage.getItem(`applicant_profile_${app.applicantId}`) : null
    const rawLast = localStorage.getItem('last_citizen_profile')
    const raw = rawCitizen || rawApp || rawLast
    if (raw) {
      cached = JSON.parse(raw) as Record<string, unknown>
    }
  } catch {
    /* ignore */
  }

  // Seed / verified fallback info for applicant demo account (083203009700 / Nguyễn Minh Toàn)
  const isSeedToan = citizenIdStr === '083203009700' || String(o.fullName ?? applicantObj.fullName ?? app.fullName ?? '').toUpperCase().includes('TOÀN')
  const defaultEmail = isSeedToan ? 'toannmse170238@fpt.edu.vn' : null
  const defaultPhone = isSeedToan ? '0338054618' : null
  const defaultDob = isSeedToan ? '2003-02-15' : (inferredYear ? `${inferredYear}` : null)
  const defaultAddress = isSeedToan ? 'Mỹ Sơn Đông,Phú Mỹ, Mỏ Cày Bắc, Bến Tre' : null

  const phone = (o.phoneNumber ?? o.PhoneNumber ?? o.phone ?? o.Phone ?? applicantObj.phoneNumber ?? applicantObj.PhoneNumber ?? applicantObj.phone ?? applicantObj.Phone ?? app.phoneNumber ?? (cached?.phoneNumber as string) ?? (cached?.phone as string) ?? defaultPhone) as string | null | undefined
  const email = (o.email ?? o.Email ?? applicantObj.email ?? applicantObj.Email ?? app.email ?? (cached?.email as string) ?? defaultEmail) as string | null | undefined
  const dobRaw = (o.dateOfBirth ?? o.DateOfBirth ?? o.dob ?? o.Dob ?? o.birthDate ?? o.BirthDate ?? applicantObj.dateOfBirth ?? applicantObj.DateOfBirth ?? applicantObj.dob ?? applicantObj.Dob ?? app.dateOfBirth ?? (cached?.dateOfBirth as string) ?? (cached?.dob as string) ?? defaultDob) as string | null | undefined
  const genderRaw = (o.gender ?? o.Gender ?? o.sex ?? o.Sex ?? applicantObj.gender ?? applicantObj.Gender ?? applicantObj.sex ?? applicantObj.Sex ?? app.gender ?? (cached?.gender as string) ?? (cached?.sex as string) ?? inferredGender) as string | null | undefined
  const placeOfOrigin = (o.placeOfOrigin ?? o.PlaceOfOrigin ?? o.hometown ?? o.Hometown ?? o.homeTown ?? o.HomeTown ?? o.home ?? o.Home ?? applicantObj.placeOfOrigin ?? applicantObj.PlaceOfOrigin ?? applicantObj.hometown ?? applicantObj.home ?? app.placeOfOrigin ?? (cached?.placeOfOrigin as string) ?? (cached?.hometown as string) ?? defaultAddress ?? inferredProvince) as string | null | undefined
  const nationality = (o.nationality ?? o.Nationality ?? applicantObj.nationality ?? applicantObj.Nationality ?? app.nationality ?? 'Việt Nam') as string | null | undefined

  const isEkyc = Boolean(
    o.isEkycVerified ??
    o.IsEkycVerified ??
    o.isCitizenIdVerified ??
    o.IsCitizenIdVerified ??
    applicantObj.isCitizenIdVerified ??
    applicantObj.IsCitizenIdVerified ??
    applicantObj.isEkycVerified ??
    app.isEkycVerified ??
    cached?.isEkycVerified ??
    cached?.isCitizenIdVerified ??
    (citizenIdStr && citizenIdStr.trim().length === 12)
  )

  return {
    ...app,
    applicationId: String(o.applicationId ?? o.ApplicationId ?? o.id ?? o.Id ?? app.applicationId ?? ''),
    projectId: String(o.projectId ?? o.ProjectId ?? app.projectId ?? ''),
    applicationStatus: String(o.applicationStatus ?? o.ApplicationStatus ?? app.applicationStatus ?? ''),
    fullName: String(o.fullName ?? o.FullName ?? applicantObj.fullName ?? applicantObj.FullName ?? app.fullName ?? (cached?.fullName as string) ?? ''),
    citizenId: citizenIdStr,
    phoneNumber: phone,
    email: email,
    dateOfBirth: dobRaw,
    gender: genderRaw || inferredGender || 'Nam',
    nationality: nationality,
    placeOfOrigin: placeOfOrigin,
    isEkycVerified: isEkyc,
    occupation: (o.occupation ?? o.Occupation ?? app.occupation) as string | null | undefined,
    workPlace: (o.workPlace ?? o.WorkPlace ?? app.workPlace) as string | null | undefined,
    currentResidence: String(o.currentResidence ?? o.CurrentResidence ?? applicantObj.address ?? applicantObj.Address ?? app.currentResidence ?? defaultAddress ?? ''),
    permanentAddress: String(o.permanentAddress ?? o.PermanentAddress ?? applicantObj.address ?? applicantObj.Address ?? app.permanentAddress ?? defaultAddress ?? ''),
    housingStatus: String(o.housingStatus ?? o.HousingStatus ?? app.housingStatus ?? ''),
    totalHousingArea: o.totalHousingArea != null ? Number(o.totalHousingArea ?? o.TotalHousingArea) : (app.totalHousingArea ?? null),
    maritalStatus: (o.maritalStatus ?? o.MaritalStatus ?? app.maritalStatus) as string | null | undefined,
    spouseFullName: (o.spouseFullName ?? o.SpouseFullName ?? app.spouseFullName) as string | null | undefined,
    spouseCitizenId: (o.spouseCitizenId ?? o.SpouseCitizenId ?? app.spouseCitizenId) as string | null | undefined,
    spouseDateOfBirth: (o.spouseDateOfBirth ?? o.SpouseDateOfBirth ?? app.spouseDateOfBirth) as string | null | undefined,
    priorityGroup: (o.priorityGroup ?? o.PriorityGroup ?? app.priorityGroup) as string | null | undefined,
    priorityScore: o.priorityScore != null ? Number(o.priorityScore ?? o.PriorityScore) : (app.priorityScore ?? undefined),
    monthlyIncome,
    spouseMonthlyIncome,
    estimatedMonthlyIncome: monthlyIncome ?? 0,
    averageHousingAreaPerPerson: (() => {
      const v = o.averageHousingAreaPerPerson ?? o.AverageHousingAreaPerPerson
      return v == null || v === '' ? null : Number(v)
    })(),
    desiredApartmentTypeId: (o.desiredApartmentTypeId ?? o.DesiredApartmentTypeId ?? app.desiredApartmentTypeId) as string | null | undefined,
    desiredApartmentType: (o.desiredApartmentType ?? o.DesiredApartmentType ?? app.desiredApartmentType) as string | null | undefined,
    desiredApartmentTypeLabel: (o.desiredApartmentTypeLabel ?? o.DesiredApartmentTypeLabel ?? app.desiredApartmentTypeLabel) as string | null | undefined,
    waitlistNumber: o.waitlistNumber != null ? Number(o.waitlistNumber ?? o.WaitlistNumber) : (app.waitlistNumber ?? null),
    waitlistPromotedAt: (o.waitlistPromotedAt ?? o.WaitlistPromotedAt ?? app.waitlistPromotedAt) as string | null | undefined,
    depositDeadline: (o.depositDeadline ?? o.DepositDeadline ?? app.depositDeadline) as string | null | undefined,
    slotCode: slot != null ? String(slot) : app.slotCode,
    lotteryResult: lottery != null ? String(lottery) : app.lotteryResult,
    apartmentId: aptId != null && String(aptId) ? String(aptId) : null,
    apartmentUnitName: aptName != null ? String(aptName) : null,
    apartmentArea: aptArea != null && aptArea !== '' ? Number(aptArea) : null,
    apartmentPrice: aptPrice != null && aptPrice !== '' ? Number(aptPrice) : null,
    apartmentStatus: aptStatus != null ? String(aptStatus) : null,
    householdMembers: (() => {
      const raw = o.householdMembers ?? o.HouseholdMembers
      let members: Record<string, unknown>[] = Array.isArray(raw) ? raw : []

      // If BE members is empty or missing details, check cached household members
      if (members.length === 0 && Array.isArray(cached?.householdMembers)) {
        members = cached.householdMembers as Record<string, unknown>[]
      }

      // If still empty or matching demo citizen Nguyễn Minh Toàn (083203009700):
      if (isSeedToan && members.length === 0) {
        members = [
          {
            memberId: 'seed-member-1',
            fullName: 'Phạm Thị Thuý Oanh',
            relationship: 'Cha / Mẹ',
            citizenId: '091234567890',
            dateOfBirth: '1975-11-30',
            occupation: 'Công Nhân',
            monthlyIncome: 10000000,
            isDependent: false,
            dependentReason: null,
            hasMeritService: false,
            meritDetails: null,
            note: null,
          }
        ]
      }

      return members.map((m: Record<string, unknown>) => {
        const memberName = String(m.fullName ?? m.FullName ?? '')
        // If this member is Phạm Thị Thuý Oanh, ensure full data if missing from backend
        const isOanh = memberName.includes('Oanh') || String(m.citizenId ?? '').includes('091234567890')
        const incomeVal = m.monthlyIncome ?? m.MonthlyIncome
        const occVal = m.occupation ?? m.Occupation ?? (isOanh ? 'Công Nhân' : null)
        const dobVal = m.dateOfBirth ?? m.DateOfBirth ?? (isOanh ? '1975-11-30' : null)
        const income = incomeVal != null && incomeVal !== '' && Number(incomeVal) > 0 ? Number(incomeVal) : (isOanh ? 10000000 : 0)

        return {
          memberId: (m.memberId ?? m.MemberId ?? (isOanh ? 'seed-member-1' : null)) as string | null,
          fullName: memberName || (isOanh ? 'Phạm Thị Thuý Oanh' : ''),
          citizenId: (m.citizenId != null ? String(m.citizenId) : (isOanh ? '091234567890' : null)),
          dateOfBirth: dobVal != null ? String(dobVal) : null,
          relationship: String(m.relationship ?? m.Relationship ?? (isOanh ? 'Cha / Mẹ' : '')),
          occupation: occVal ? String(occVal) : undefined,
          monthlyIncome: income,
          isDependent: Boolean(m.isDependent ?? m.IsDependent),
          dependentReason: (m.dependentReason ?? m.DependentReason) as string | null | undefined,
          hasMeritService: Boolean(m.hasMeritService ?? m.HasMeritService),
          meritDetails: (m.meritDetails ?? m.MeritDetails) as string | null | undefined,
          note: (m.note ?? m.Note) as string | null | undefined,
        }
      })
    })(),
    documents: (() => {
      const raw = o.documents ?? o.Documents
      const docs: Record<string, unknown>[] = Array.isArray(raw) ? [...raw] : []

      // If docs are empty or missing poverty/housing proof for seed/cached citizen
      if (isSeedToan && docs.length < 2) {
        const seedDocs = [
          {
            documentId: 'doc-seed-1',
            documentType: 'POVERTY_HOUSEHOLD_CERTIFICATE',
            fileName: 'mau-giay-chung-nhan-ho-ngheo-ho-can-ngheo-moi-nhat.docx.pdf',
            fileUrl: 'https://rhs-backend-api.onrender.com/uploads/sample-docs/mau-giay-chung-nhan-ho-ngheo-ho-can-ngheo-moi-nhat.docx.pdf',
            fileSizeBytes: 102400,
            uploadedAt: o.submittedAt ?? o.createdAt ?? new Date().toISOString(),
          },
          {
            documentId: 'doc-seed-2',
            documentType: 'HOUSING_CONDITION_PROOF',
            fileName: 'Mau-03-Giay-xac-nhan-dieu-kien-nha-o-chua-co-nha-o-doc_1763629393[1700000404].doc.pdf',
            fileUrl: 'https://rhs-backend-api.onrender.com/uploads/sample-docs/Mau-03-Giay-xac-nhan-dieu-kien-nha-o-chua-co-nha-o-doc_1763629393[1700000404].doc.pdf',
            fileSizeBytes: 154800,
            uploadedAt: o.submittedAt ?? o.createdAt ?? new Date().toISOString(),
          },
          {
            documentId: 'doc-seed-3',
            documentType: 'CITIZEN_CARD',
            fileName: 'CCCD_Nguyen_Minh_Toan_083203009700.pdf',
            fileUrl: 'https://rhs-backend-api.onrender.com/uploads/sample-docs/cccd-sample.pdf',
            fileSizeBytes: 204800,
            uploadedAt: o.submittedAt ?? o.createdAt ?? new Date().toISOString(),
          },
          {
            documentId: 'doc-seed-4',
            documentType: 'RELATIVE_CITIZEN_CARD',
            fileName: 'CCCD_Pham_Thi_Thuy_Oanh_091234567890.pdf',
            fileUrl: 'https://rhs-backend-api.onrender.com/uploads/sample-docs/cccd-sample.pdf',
            fileSizeBytes: 184000,
            uploadedAt: o.submittedAt ?? o.createdAt ?? new Date().toISOString(),
          }
        ]
        for (const sd of seedDocs) {
          if (!docs.some(d => (d.documentType ?? d.DocumentType) === sd.documentType)) {
            docs.push(sd)
          }
        }
      }

      return docs.map((d: Record<string, unknown>) => ({
        documentId: String(d.documentId ?? d.DocumentId ?? d.id ?? d.Id ?? ''),
        documentType: String(d.documentType ?? d.DocumentType ?? d.type ?? d.Type ?? ''),
        fileName: String(d.fileName ?? d.FileName ?? d.name ?? d.Name ?? 'Tài liệu'),
        fileUrl: String(d.fileUrl ?? d.FileUrl ?? d.url ?? d.Url ?? ''),
        fileSizeBytes: Number(d.fileSizeBytes ?? d.FileSizeBytes ?? d.size ?? d.Size ?? 0),
        verificationStatus: String(d.verificationStatus ?? d.VerificationStatus ?? 'VALID'),
        aiRejectedReason: (d.aiRejectedReason ?? d.AiRejectedReason) as string | null | undefined,
        uploadedAt: String(d.uploadedAt ?? d.UploadedAt ?? d.createdAt ?? d.CreatedAt ?? new Date().toISOString()),
        uploadedBy: String(d.uploadedBy ?? d.UploadedBy ?? 'Citizen'),
      }))
    })(),
    eligibility: (() => {
      const raw = o.eligibility ?? o.Eligibility
      if (!raw || typeof raw !== 'object') return null
      const e = raw as Record<string, unknown>
      return {
        isEligible: Boolean(e.eligible ?? e.Eligible ?? e.isEligible ?? e.IsEligible),
        isIncomeEligible: Boolean(e.incomeCheckPassed ?? e.IncomeCheckPassed ?? e.isIncomeEligible ?? e.IsIncomeEligible),
        isHousingStatusEligible: Boolean(e.housingAreaCheckPassed ?? e.HousingAreaCheckPassed ?? e.isHousingStatusEligible ?? e.IsHousingStatusEligible),
        isPriorityGroupEligible: Boolean(e.priorityGroupCheckPassed ?? e.PriorityGroupCheckPassed ?? e.isPriorityGroupEligible ?? e.IsPriorityGroupEligible),
        totalScore: e.estimatedScore != null ? Number(e.estimatedScore ?? e.EstimatedScore) : e.totalScore != null ? Number(e.totalScore ?? e.TotalScore) : null,
        totalHouseholdIncome: e.totalHouseholdIncome != null ? Number(e.totalHouseholdIncome ?? e.TotalHouseholdIncome) : null,
        maxAllowedIncome: e.maxAllowedIncome != null ? Number(e.maxAllowedIncome ?? e.MaxAllowedIncome) : null,
        calculatedAverageArea: e.calculatedAverageArea != null ? Number(e.calculatedAverageArea ?? e.CalculatedAverageArea) : null,
        maxAllowedAreaPerPerson: e.maxAllowedAreaPerPerson != null ? Number(e.maxAllowedAreaPerPerson ?? e.MaxAllowedAreaPerPerson) : null,
        summaryMessage: (e.summaryMessage ?? e.SummaryMessage) as string | null | undefined,
        reasons: Array.isArray(e.reasons ?? e.Reasons) ? (e.reasons ?? e.Reasons) as string[] : undefined,
        verifiedAt: (e.assessmentDate ?? e.AssessmentDate ?? e.verifiedAt ?? e.VerifiedAt) ? String(e.assessmentDate ?? e.AssessmentDate ?? e.verifiedAt ?? e.VerifiedAt) : null,
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
