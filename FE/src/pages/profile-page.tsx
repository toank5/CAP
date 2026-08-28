import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, Loader2, Trash2, Upload } from 'lucide-react'
import { authApi } from '@/api/auth'
import { usersApi, type UserDocumentDto, type UserHouseholdMemberDto, type UserHouseholdMemberRequestDto } from '@/api/users'
import { lookupApi, parseDocumentTypes, type DocumentTypeDto } from '@/api/lookup'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input, Textarea } from '@/components/ui/input'
import { navigate } from '@/hooks/useHashRoute'
import { clearRole, getRole } from '@/router'
import { formatError, formatSuccess } from '@/lib/format-error'
import { labelRole } from '@/lib/labels'
import { extractProfileImageUrl } from '@/lib/user-display'
import { validateDocumentFile } from '@/lib/ekyc-helpers'
import { useUserProfile } from '@/providers/user-profile-provider'

const MARITAL_STATUS_OPTIONS = [
  { value: 'SINGLE', label: 'Độc thân' },
  { value: 'MARRIED', label: 'Đã kết hôn' },
  { value: 'DIVORCED', label: 'Đã ly hôn' },
  { value: 'WIDOWED', label: 'Góa' },
]

const HOUSING_STATUS_OPTIONS = [
  { value: 'NO_HOUSE', label: 'Chưa có nhà ở' },
  { value: 'SMALL_HOUSE', label: 'Nhà diện tích dưới 15m²' },
]

const PRIORITY_GROUP_OPTIONS = [
  { value: 'MERIT_PERSON', label: 'Người có công với cách mạng', requiredDocuments: ['Giấy xác nhận người có công', 'Giấy chứng minh hiện trạng nhà ở'] },
  { value: 'RURAL_POOR', label: 'Hộ nghèo nông thôn', requiredDocuments: ['Giấy chứng nhận hộ nghèo/cận nghèo', 'Giấy chứng minh hiện trạng nhà ở'] },
  { value: 'RURAL_NEAR_POOR', label: 'Hộ cận nghèo nông thôn', requiredDocuments: ['Giấy chứng nhận hộ nghèo/cận nghèo', 'Giấy chứng minh hiện trạng nhà ở'] },
  { value: 'URBAN_POOR', label: 'Hộ nghèo đô thị', requiredDocuments: ['Giấy chứng nhận hộ nghèo/cận nghèo', 'Giấy chứng minh hiện trạng nhà ở'] },
  { value: 'URBAN_NEAR_POOR', label: 'Hộ cận nghèo đô thị', requiredDocuments: ['Giấy chứng nhận hộ nghèo/cận nghèo', 'Giấy chứng minh hiện trạng nhà ở'] },
  { value: 'LOW_INCOME_URBAN', label: 'Người thu nhập thấp tại đô thị', requiredDocuments: ['Giấy xác nhận thu nhập thấp', 'Giấy xác nhận thu nhập', 'Giấy chứng minh hiện trạng nhà ở'] },
  { value: 'WORKER', label: 'Công nhân, người lao động tại DN/HTX/KCN', requiredDocuments: ['Giấy xác nhận đang làm việc', 'Giấy xác nhận thu nhập', 'Giấy chứng minh hiện trạng nhà ở'] },
  { value: 'MILITARY_PERSONNEL', label: 'Lực lượng vũ trang, cơ yếu', requiredDocuments: ['Giấy xác nhận phục vụ lực lượng vũ trang/cơ yếu', 'Giấy xác nhận thu nhập', 'Giấy chứng minh hiện trạng nhà ở'] },
  { value: 'CIVIL_SERVANT', label: 'Cán bộ, công chức, viên chức', requiredDocuments: ['Giấy xác nhận cán bộ/công chức/viên chức', 'Giấy xác nhận thu nhập', 'Giấy chứng minh hiện trạng nhà ở'] },
  { value: 'PUBLIC_HOUSING_RETURN', label: 'Đối tượng trả lại nhà công vụ', requiredDocuments: ['Văn bản trả lại nhà ở công vụ', 'Giấy xác nhận thu nhập', 'Giấy chứng minh hiện trạng nhà ở'] },
  { value: 'LAND_RECOVERY_AFFECTED', label: 'Bị thu hồi đất / giải tỏa nhà ở', requiredDocuments: ['Quyết định thu hồi đất/giải tỏa nhà ở', 'Giấy xác nhận thu nhập', 'Giấy chứng minh hiện trạng nhà ở'] },
]

const PRIORITY_DOCUMENT_CODES: Record<string, string[]> = {
  MERIT_PERSON: ['MERIT_PERSON_CERTIFICATE'],
  RURAL_POOR: ['POVERTY_HOUSEHOLD_CERTIFICATE'],
  RURAL_NEAR_POOR: ['POVERTY_HOUSEHOLD_CERTIFICATE'],
  URBAN_POOR: ['POVERTY_HOUSEHOLD_CERTIFICATE'],
  URBAN_NEAR_POOR: ['POVERTY_HOUSEHOLD_CERTIFICATE'],
  LOW_INCOME_URBAN: ['LOW_INCOME_CERTIFICATE'],
  WORKER: ['EMPLOYMENT_CERTIFICATE'],
  MILITARY_PERSONNEL: ['MILITARY_SERVICE_CERTIFICATE'],
  CIVIL_SERVANT: ['CIVIL_SERVANT_CERTIFICATE'],
  PUBLIC_HOUSING_RETURN: ['PUBLIC_HOUSING_RETURN_CERTIFICATE'],
  LAND_RECOVERY_AFFECTED: ['LAND_RECOVERY_DECISION'],
}

const DEPENDENT_REASON_OPTIONS = [
  { value: 'UNDER_18', label: 'Con dưới 18 tuổi, chưa đến tuổi lao động' },
  { value: 'STUDENT', label: 'Đang theo học đại học' },
  { value: 'INCAPACITATED', label: 'Mất sức lao động' },
]

const RELATIONSHIP_OPTIONS = [
  { value: 'SPOUSE', label: 'Vợ / Chồng' },
  { value: 'CHILD', label: 'Con' },
  { value: 'PARENT', label: 'Cha / Mẹ' },
  { value: 'SIBLING', label: 'Anh / Chị / Em' },
  { value: 'GRANDPARENT', label: 'Ông / Bà' },
  { value: 'GRANDCHILD', label: 'Cháu' },
  { value: 'OTHER', label: 'Khác' },
]

interface HouseholdMemberDraft {
  memberId?: string
  fullName: string
  citizenId: string
  dateOfBirth: string
  relationship: string
  occupation: string
  monthlyIncome: string
  isDependent: boolean
  dependentReason: string
  note: string
}

interface CitizenDeclarationState {
  maritalStatus: string
  spouseFullName: string
  spouseMonthlyIncome: string
  occupation: string
  workPlace: string
  currentResidence: string
  permanentAddress: string
  monthlyIncome: string
  housingStatus: string
  averageHousingAreaPerPerson: string
  priorityGroup: string
}

function toHouseholdDraft(member: UserHouseholdMemberDto): HouseholdMemberDraft {
  return {
    memberId: member.memberId,
    fullName: member.fullName ?? '',
    citizenId: member.citizenId ?? '',
    dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().slice(0, 10) : '',
    relationship: member.relationship ?? '',
    occupation: member.occupation ?? '',
    monthlyIncome: member.monthlyIncome == null ? '' : String(member.monthlyIncome),
    isDependent: member.isDependent,
    dependentReason: member.dependentReason ?? '',
    note: member.note ?? '',
  }
}

function parseHouseholdMembers(data: unknown): UserHouseholdMemberDto[] {
  const findItems = (value: unknown, depth = 0): unknown[] => {
    if (Array.isArray(value)) return value
    if (!value || typeof value !== 'object' || depth > 4) return []
    const object = value as Record<string, unknown>
    for (const key of ['value', 'Value', 'items', 'Items', 'data', 'Data', 'result', 'Result']) {
      const items = findItems(object[key], depth + 1)
      if (items.length > 0 || Array.isArray(object[key])) return items
    }
    return []
  }
  const items = findItems(data)
  return items.map((item) => {
    const value = item as Record<string, unknown>
    return {
      memberId: String(value.memberId ?? value.MemberId ?? value.id ?? value.Id ?? ''),
      fullName: String(value.fullName ?? value.FullName ?? ''),
      citizenId: (value.citizenId ?? value.CitizenId) as string | null | undefined,
      dateOfBirth: (value.dateOfBirth ?? value.DateOfBirth) as string | null | undefined,
      relationship: String(value.relationship ?? value.Relationship ?? ''),
      occupation: (value.occupation ?? value.Occupation) as string | null | undefined,
      monthlyIncome: value.monthlyIncome == null && value.MonthlyIncome == null ? null : Number(value.monthlyIncome ?? value.MonthlyIncome),
      isDependent: Boolean(value.isDependent ?? value.IsDependent),
      dependentReason: (value.dependentReason ?? value.DependentReason) as string | null | undefined,
      dependentReasonLabel: (value.dependentReasonLabel ?? value.DependentReasonLabel) as string | null | undefined,
      note: (value.note ?? value.Note) as string | null | undefined,
    }
  }).filter((member) => member.memberId && member.fullName)
}

function parseUserDocuments(data: unknown): UserDocumentDto[] {
  const root = data as Record<string, unknown> | null
  const items = Array.isArray(data)
    ? data
    : Array.isArray(root?.value)
      ? root.value
      : Array.isArray(root?.items)
        ? root.items
        : Array.isArray(root?.data)
          ? root.data
          : []
  return items.map((item) => {
    const value = item as Record<string, unknown>
    return {
      id: String(value.id ?? value.Id ?? value.documentId ?? value.DocumentId ?? ''),
      documentType: String(value.documentType ?? value.DocumentType ?? value.type ?? value.Type ?? ''),
      fileName: String(value.fileName ?? value.FileName ?? value.name ?? value.Name ?? 'Tài liệu'),
      fileUrl: (value.fileUrl ?? value.FileUrl ?? value.url ?? value.Url) as string | null | undefined,
      status: (value.status ?? value.Status) as string | null | undefined,
    }
  }).filter((item) => item.id && item.documentType)
}

function unwrapProfile(data: unknown): Record<string, unknown> | null {
  let current: unknown = data
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null
    const object = current as Record<string, unknown>
    const nested = object.user ?? object.User ?? object.data ?? object.Data ?? object.value ?? object.Value
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return object
    current = nested
  }
  return current && typeof current === 'object' && !Array.isArray(current) ? current as Record<string, unknown> : null
}

export function ProfilePage() {
  const { fullName, email, avatarUrl, roleLabel, initials, updateProfile, refreshProfile } = useUserProfile()
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneSaved, setPhoneSaved] = useState('')
  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [citizenId, setCitizenId] = useState('')
  const [address, setAddress] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')
  const [activeTab, setActiveTab] = useState<'account' | 'policy'>('account')
  const [citizenInfo, setCitizenInfo] = useState<CitizenDeclarationState>({
    maritalStatus: '',
    spouseFullName: '',
    spouseMonthlyIncome: '',
    occupation: '',
    workPlace: '',
    currentResidence: '',
    permanentAddress: '',
    monthlyIncome: '',
    housingStatus: '',
    averageHousingAreaPerPerson: '',
    priorityGroup: '',
  })
  const [savingCitizenInfo, setSavingCitizenInfo] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isPolicyEditing, setIsPolicyEditing] = useState(true)
  const policyViewInitialized = useRef(false)
  const [profileDocumentTypes, setProfileDocumentTypes] = useState<DocumentTypeDto[]>([])
  const [requiredDocumentTypes, setRequiredDocumentTypes] = useState<DocumentTypeDto[]>([])
  const [userDocuments, setUserDocuments] = useState<UserDocumentDto[]>([])
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null)
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMemberDraft[]>([])
  const [householdRelationships, setHouseholdRelationships] = useState<DocumentTypeDto[]>([])

  const fileRef = useRef<HTMLInputElement>(null)

  const readProfileData = (data: unknown) => {
    const u = unwrapProfile(data)
    if (!u || typeof u !== 'object') return

    const phone = String(u.phoneNumber ?? u.PhoneNumber ?? '')
    setPhoneNumber(phone)
    setPhoneSaved(phone)
    setPhoneDraft(phone)
    setCitizenId(String(u.citizenId ?? u.CitizenId ?? ''))
    setAddress(String(u.address ?? u.Address ?? u.permanentAddress ?? u.PermanentAddress ?? ''))

    const dobRaw = u.dateOfBirth ?? u.DateOfBirth
    if (dobRaw) {
      const d = new Date(String(dobRaw))
      setDateOfBirth(Number.isNaN(d.getTime()) ? String(dobRaw) : d.toLocaleDateString('vi-VN'))
    } else {
      setDateOfBirth('')
    }

    setCitizenInfo((prev) => ({
      ...prev,
      maritalStatus: String(u.maritalStatus ?? u.MaritalStatus ?? prev.maritalStatus ?? ''),
      spouseFullName: String(u.spouseFullName ?? u.SpouseFullName ?? prev.spouseFullName ?? ''),
      spouseMonthlyIncome: (() => {
        const value = u.spouseMonthlyIncome ?? u.SpouseMonthlyIncome
        return value == null || value === '' ? prev.spouseMonthlyIncome ?? '' : String(value)
      })(),
      occupation: String(u.occupation ?? u.Occupation ?? prev.occupation ?? ''),
      workPlace: String(u.workPlace ?? u.WorkPlace ?? prev.workPlace ?? ''),
      currentResidence: String(u.currentResidence ?? u.CurrentResidence ?? prev.currentResidence ?? ''),
      permanentAddress: String(u.permanentAddress ?? u.PermanentAddress ?? prev.permanentAddress ?? (address || '')),
      monthlyIncome: (() => {
        const value = u.monthlyIncome ?? u.MonthlyIncome
        return value == null || value === '' ? prev.monthlyIncome ?? '' : String(value)
      })(),
      housingStatus: String(u.housingStatus ?? u.HousingStatus ?? prev.housingStatus ?? ''),
      averageHousingAreaPerPerson: (() => {
        const value = u.averageHousingAreaPerPerson ?? u.AverageHousingAreaPerPerson
        return value == null || value === '' ? prev.averageHousingAreaPerPerson ?? '' : String(value)
      })(),
      priorityGroup: String(u.priorityGroup ?? u.PriorityGroup ?? prev.priorityGroup ?? ''),
    }))

    const hasSavedDeclaration = Boolean(
      u.maritalStatus ?? u.MaritalStatus,
    ) && Boolean(
      String(u.occupation ?? u.Occupation ?? '').trim(),
    ) && Boolean(
      String(u.workPlace ?? u.WorkPlace ?? '').trim(),
    ) && Boolean(
      String(u.currentResidence ?? u.CurrentResidence ?? '').trim(),
    ) && Boolean(
      String(u.permanentAddress ?? u.PermanentAddress ?? '').trim(),
    ) && (u.monthlyIncome ?? u.MonthlyIncome) != null && Boolean(
      u.housingStatus ?? u.HousingStatus,
    ) && (u.averageHousingAreaPerPerson ?? u.AverageHousingAreaPerPerson) != null && Boolean(
      u.priorityGroup ?? u.PriorityGroup,
    )
    if (hasSavedDeclaration && !policyViewInitialized.current) {
      policyViewInitialized.current = true
      setIsPolicyEditing(false)
    }
  }

  useEffect(() => {
    void refreshProfile().then(() => {
      void usersApi.getProfile().then((data) => readProfileData(data)).catch(() => undefined)
      void usersApi.getFullProfile().then((data) => readProfileData(data)).catch(() => undefined)
    })
  }, [refreshProfile])

  useEffect(() => {
    void Promise.all([
      lookupApi.profileDocumentTypes().then((data) => setProfileDocumentTypes(parseDocumentTypes(data))),
      usersApi.getDocuments().then((data) => setUserDocuments(parseUserDocuments(data))),
      usersApi.getHouseholdMembers().then((data) => setHouseholdMembers(parseHouseholdMembers(data).map(toHouseholdDraft))),
      lookupApi.householdRelationships().then((data) => setHouseholdRelationships(parseDocumentTypes(data))),
    ]).catch(() => undefined)
  }, [])

  useEffect(() => {
    void lookupApi.requiredProfileDocumentTypes({
      maritalStatus: citizenInfo.maritalStatus || undefined,
      housingStatus: citizenInfo.housingStatus || undefined,
      hasDependentMembers: householdMembers.some((member) => member.isDependent),
    }).then((data) => setRequiredDocumentTypes(parseDocumentTypes(data))).catch(() => setRequiredDocumentTypes([]))
  }, [citizenInfo.maritalStatus, citizenInfo.housingStatus, householdMembers])

  const hasPhoneChanged = phoneDraft !== phoneSaved
  const requiredDocumentCodes = Array.from(new Set([
    'INCOME_CERTIFICATE',
    'RESIDENCE_CONFIRMATION',
    ...requiredDocumentTypes.map((document) => document.code),
    ...(PRIORITY_DOCUMENT_CODES[citizenInfo.priorityGroup] ?? []),
    ...(householdMembers.some((member) => member.isDependent) ? ['DEPENDENT_PROOF', 'RESIDENCE_CONFIRMATION'] : []),
  ]))
  const getDocumentLabel = (code: string) => code === 'RESIDENCE_CONFIRMATION'
    ? 'Hộ khẩu / Giấy xác nhận thông tin cư trú'
    : profileDocumentTypes.find((document) => document.code === code)?.label ?? code
  const uploadedDocumentTypes = new Set(userDocuments.map((document) => document.documentType))

  const validateCitizenDeclaration = () => {
    const nextErrors: Record<string, string> = {}

    if (!citizenInfo.maritalStatus) nextErrors.maritalStatus = 'Vui lòng chọn tình trạng hôn nhân.'
    if (!citizenInfo.occupation?.trim()) nextErrors.occupation = 'Vui lòng nhập nghề nghiệp.'
    if (!citizenInfo.workPlace?.trim()) nextErrors.workPlace = 'Vui lòng nhập nơi làm việc.'
    if (!citizenInfo.currentResidence?.trim()) nextErrors.currentResidence = 'Vui lòng nhập chỗ ở hiện tại.'
    if (!citizenInfo.permanentAddress?.trim()) nextErrors.permanentAddress = 'Vui lòng nhập địa chỉ thường trú.'
    if (!citizenInfo.monthlyIncome && citizenInfo.monthlyIncome !== '0') nextErrors.monthlyIncome = 'Vui lòng nhập thu nhập hàng tháng.'
    else if (Number(citizenInfo.monthlyIncome) < 0) nextErrors.monthlyIncome = 'Thu nhập không được âm.'
    else if (Number(citizenInfo.monthlyIncome) > 15000000) nextErrors.monthlyIncome = 'Thu nhập hàng tháng không được vượt quá 15.000.000 VNĐ theo quy chuẩn NOXH.'

    if (!citizenInfo.housingStatus) nextErrors.housingStatus = 'Vui lòng chọn tình trạng nhà ở.'
    if (!citizenInfo.averageHousingAreaPerPerson && citizenInfo.averageHousingAreaPerPerson !== '0') nextErrors.averageHousingAreaPerPerson = 'Vui lòng nhập diện tích bình quân/người.'
    else if (Number(citizenInfo.averageHousingAreaPerPerson) < 0 || Number(citizenInfo.averageHousingAreaPerPerson) > 1000) nextErrors.averageHousingAreaPerPerson = 'Diện tích bình quân/người phải từ 0 đến 1000 m².'
    if (!citizenInfo.priorityGroup) nextErrors.priorityGroup = 'Vui lòng chọn nhóm ưu tiên.'
    const missingDocuments = requiredDocumentCodes.filter((code) => !uploadedDocumentTypes.has(code))
    if (missingDocuments.length > 0) nextErrors.documents = `Vui lòng tải đủ giấy tờ: ${missingDocuments.map(getDocumentLabel).join(', ')}.`

    if (citizenInfo.maritalStatus === 'MARRIED') {
      const spouseMember = householdMembers.find((member) => member.relationship === 'SPOUSE')
      if (!spouseMember) nextErrors.householdMembers = 'Tình trạng đã kết hôn yêu cầu khai báo vợ/chồng trong danh sách hộ gia đình.'
    }

    if (citizenInfo.monthlyIncome && Number(citizenInfo.monthlyIncome) > 0 && citizenInfo.priorityGroup) {
      const isPriority = PRIORITY_GROUP_OPTIONS.find((g) => g.value === citizenInfo.priorityGroup)
      const requiresProof = isPriority?.requiredDocuments ?? []
      if (requiresProof.length > 0 && !citizenInfo.permanentAddress?.trim()) {
        nextErrors.permanentAddress = 'Thông tin cần có giấy tờ chứng minh; vui lòng điền địa chỉ thường trú.'
      }
    }

    return nextErrors
  }

  const saveCitizenDeclaration = async () => {
    const invalidMember = householdMembers.find((member) =>
      !member.fullName.trim() || !member.relationship ||
      (member.citizenId.trim() && !/^\d{9}(\d{3})?$/.test(member.citizenId.trim())) ||
      (member.isDependent && !member.dependentReason),
    )
    if (invalidMember) {
      setMsg({ type: 'error', text: 'Vui lòng nhập đủ họ tên, quan hệ; CCCD phải có 9 hoặc 12 số và người phụ thuộc phải có lý do.' })
      return
    }

    const nextErrors = validateCitizenDeclaration()
    setValidationErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setMsg({ type: 'error', text: 'Vui lòng sửa các trường sai hoặc thiếu thông tin trước khi lưu.' })
      return
    }

    try {
      setSavingCitizenInfo(true)
      const isMarried = citizenInfo.maritalStatus === 'MARRIED'
      const spouseMember = isMarried ? householdMembers.find(m => m.relationship === 'SPOUSE') : null
      const payload = {
        phoneNumber: phoneDraft || null,
        maritalStatus: citizenInfo.maritalStatus || null,
        spouseFullName: spouseMember ? spouseMember.fullName.trim() : null,
        spouseMonthlyIncome: spouseMember && spouseMember.monthlyIncome !== '' ? Number(spouseMember.monthlyIncome) : null,
        occupation: citizenInfo.occupation || null,
        workPlace: citizenInfo.workPlace || null,
        currentResidence: citizenInfo.currentResidence || null,
        permanentAddress: citizenInfo.permanentAddress || address || null,
        monthlyIncome: citizenInfo.monthlyIncome ? Number(citizenInfo.monthlyIncome) : null,
        housingStatus: citizenInfo.housingStatus || null,
        averageHousingAreaPerPerson: citizenInfo.averageHousingAreaPerPerson ? Number(citizenInfo.averageHousingAreaPerPerson) : null,
        priorityGroup: citizenInfo.priorityGroup || null,
      }
      await usersApi.updateCitizenProfile(payload)

      for (const member of householdMembers) {
        const body: UserHouseholdMemberRequestDto = {
          fullName: member.fullName.trim(),
          citizenId: member.citizenId.trim() || null,
          dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString() : null,
          relationship: member.relationship,
          occupation: member.occupation.trim() || null,
          monthlyIncome: member.monthlyIncome === '' ? null : Number(member.monthlyIncome),
          isDependent: member.isDependent,
          dependentReason: member.isDependent ? member.dependentReason : null,
          hasMeritService: false,
          note: member.note.trim() || null,
        }
        if (member.memberId) await usersApi.updateHouseholdMember(member.memberId, body)
        else await usersApi.createHouseholdMember(body)
      }

      const [freshHousehold] = await Promise.all([
        usersApi.getHouseholdMembers(),
        refreshProfile(),
      ])
      setHouseholdMembers(parseHouseholdMembers(freshHousehold).map(toHouseholdDraft))
      setMsg({ type: 'success', text: 'Đã lưu khai báo thông tin và hộ gia đình thành công.' })
      setIsPolicyEditing(false)
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setSavingCitizenInfo(false)
    }
  }

  const uploadProfileDocument = async (documentType: string, file: File) => {
    const fileError = validateDocumentFile(file)
    if (fileError) {
      setMsg({ type: 'error', text: fileError })
      return
    }
    setUploadingDocument(documentType)
    try {
      await usersApi.uploadDocument(documentType, file)
      const data = await usersApi.getDocuments()
      setUserDocuments(parseUserDocuments(data))
      setMsg({ type: 'success', text: `Đã tải lên ${getDocumentLabel(documentType)}.` })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setUploadingDocument(null)
    }
  }

  const deleteProfileDocument = async (document: UserDocumentDto) => {
    try {
      await usersApi.deleteDocument(document.id)
      setUserDocuments((current) => current.filter((item) => item.id !== document.id))
      setMsg({ type: 'success', text: 'Đã xóa tài liệu.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    }
  }


  const removeHouseholdMember = async (member: HouseholdMemberDraft, index: number) => {
    try {
      if (member.memberId) await usersApi.deleteHouseholdMember(member.memberId)
      setHouseholdMembers((current) => current.filter((_, currentIndex) => currentIndex !== index))
      setMsg({ type: 'success', text: 'Đã xóa thành viên khỏi hồ sơ.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    }
  }

  const savePhone = async () => {
    try {
      const data = await usersApi.updateProfile({
        fullName,
        phoneNumber: phoneDraft || null,
      })
      setPhoneNumber(phoneDraft)
      setPhoneSaved(phoneDraft)
      setIsEditingPhone(false)
      setMsg({ type: 'success', text: formatSuccess(data) || 'Cập nhật số điện thoại thành công.' })
    } catch (err) { setMsg({ type: 'error', text: formatError(err) }) }
  }

  const logout = async () => {
    const refresh = sessionStorage.getItem('refreshToken') ?? ''
    try { await authApi.logout({ refreshToken: refresh }) } catch { /* ignore */ }
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    clearRole()
    updateProfile({ fullName: '', avatarUrl: null })
    navigate('login')
  }

  const displayRole = roleLabel || labelRole(getRole())
  const hasEkyc = !!citizenId.trim()
  // eKYC chỉ dành cho công dân (Applicant). Chủ đầu tư & Sở Xây dựng không có dữ liệu eKYC.
  const showEkyc = getRole() === 'Applicant'

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-slate-200/80 p-6 dark:border-slate-800">
        <h2 className="text-2xl font-bold">Hồ sơ cá nhân</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {showEkyc
            ? 'Thông tin định danh lấy từ eKYC (chỉ đọc). Bạn chỉ có thể cập nhật số điện thoại và ảnh đại diện.'
            : 'Thông tin tài khoản cán bộ. Bạn có thể cập nhật số điện thoại và ảnh đại diện.'}
        </p>
      </div>
      <div className="mb-6 flex border-b border-slate-200 px-6 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`px-4 py-2 text-sm font-semibold transition ${activeTab === 'account' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 dark:text-slate-400'}`}
        >
          Thông tin tài khoản
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('policy')}
          className={`px-4 py-2 text-sm font-semibold transition ${activeTab === 'policy' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 dark:text-slate-400'}`}
        >
          Kê khai chính sách
        </button>
      </div>
      <div className="grid gap-8 p-6 lg:grid-cols-[220px_1fr]">
        <aside className="text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {avatarUrl ? <img src={avatarUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" /> : initials}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const preview = URL.createObjectURL(file)
            updateProfile({ avatarUrl: preview })
            try {
              const data = await usersApi.uploadProfileImage(file)
              setMsg({ type: 'success', text: formatSuccess(data) })
              const url = extractProfileImageUrl(data)
              updateProfile({ avatarUrl: url })
            } catch (err) {
              void refreshProfile()
              setMsg({ type: 'error', text: formatError(err) })
            } finally {
              URL.revokeObjectURL(preview)
            }
          }} />
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Chọn ảnh</Button>
            {avatarUrl && (
              <Button variant="ghost" size="sm" className="text-red-600" onClick={async () => {
                if (!confirm('Xóa ảnh đại diện?')) return
                try {
                  await usersApi.deleteProfileImage()
                  updateProfile({ avatarUrl: null })
                  setMsg({ type: 'success', text: 'Đã xóa ảnh.' })
                } catch (err) { setMsg({ type: 'error', text: formatError(err) }) }
              }}>Xóa ảnh</Button>
            )}
          </div>
        </aside>
        <div className="space-y-6">
          {activeTab === 'account' && (
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault()
              // Các trường eKYC chỉ đọc, không cần submit form
            }}>
              <FormField label="Địa chỉ email đăng ký" htmlFor="email">
                <Input id="email" name="email" readOnly className="opacity-70" value={email} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Vai trò" htmlFor="role">
                  <Input id="role" name="role" readOnly className="opacity-70" value={displayRole} />
                </FormField>
              </div>
              {showEkyc && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Họ và tên (eKYC)" htmlFor="fullName">
                      <Input
                        id="fullName"
                        name="fullName"
                        readOnly
                        className="opacity-70"
                        title="Họ tên lấy từ CCCD / eKYC — không thể thay đổi tại đây"
                        value={fullName}
                      />
                    </FormField>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Số CCCD (eKYC)" htmlFor="citizenId">
                      <Input
                        id="citizenId"
                        readOnly
                        className="font-mono opacity-70"
                        value={citizenId || 'Chưa xác minh'}
                        title="Lấy từ eKYC"
                      />
                    </FormField>
                    <FormField label="Ngày sinh (eKYC)" htmlFor="dateOfBirth">
                      <Input
                        id="dateOfBirth"
                        readOnly
                        className="opacity-70"
                        value={dateOfBirth || '—'}
                      />
                    </FormField>
                  </div>
                  <FormField label="Địa chỉ thường trú (eKYC)" htmlFor="address">
                    <Input
                      id="address"
                      readOnly
                      className="opacity-70"
                      value={address || '—'}
                      title="Lấy từ eKYC"
                    />
                  </FormField>
                  {!hasEkyc && (
                    <Alert variant="warning">
                      Chưa có dữ liệu eKYC.{' '}
                      <button type="button" className="font-semibold underline" onClick={() => navigate('verify-identity')}>
                        Xác minh danh tính
                      </button>
                    </Alert>
                  )}
                </>
              )}

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Số điện thoại
                  </span>
                  {!isEditingPhone && (
                    <button
                      type="button"
                      onClick={() => { setIsEditingPhone(true); setPhoneDraft(phoneNumber) }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Chỉnh sửa
                    </button>
                  )}
                  {isEditingPhone && (
                    <button
                      type="button"
                      onClick={() => { setIsEditingPhone(false); setPhoneDraft(phoneNumber) }}
                      className="text-xs font-semibold text-slate-500 hover:underline"
                    >
                      Hủy
                    </button>
                  )}
                </div>
                {isEditingPhone ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        value={phoneDraft}
                        onChange={(e) => setPhoneDraft(e.target.value)}
                        placeholder="Nhập số điện thoại"
                      />
                    </div>
                    <Button
                      variant="accent"
                      size="sm"
                      disabled={!hasPhoneChanged}
                      onClick={() => void savePhone()}
                    >
                      Lưu thay đổi
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    {phoneNumber || <span className="italic font-normal text-slate-400">Chưa cập nhật</span>}
                  </p>
                )}
              </div>
              {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
            </form>
          )}

          {activeTab === 'policy' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Kê khai chính sách
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Mọi thông tin khai báo phải đi kèm giấy tờ chứng minh hợp lệ theo quy định của NOXH.
                    </p>
                  </div>
                  {!isPolicyEditing && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsPolicyEditing(true)}>
                      Chỉnh sửa
                    </Button>
                  )}
                </div>

                {!isPolicyEditing ? (
                  <PolicySummary
                    citizenInfo={citizenInfo}
                    householdMembers={householdMembers}
                    userDocuments={userDocuments}
                    profileDocumentTypes={profileDocumentTypes}
                  />
                ) : (
                  <>

                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                      <div className="font-semibold">Giấy tờ chứng minh</div>
                      <p className="mt-1 text-xs">Mỗi loại thông tin kê khai phải có tài liệu tương ứng. Chấp nhận PDF hoặc ảnh, tối đa 10 MB mỗi file.</p>
                      <div className="mt-3 space-y-2">
                        {requiredDocumentCodes.map((code) => {
                          const document = userDocuments.find((item) => item.documentType === code)
                          const isUploading = uploadingDocument === code
                          return (
                            <div key={code} className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-white/60 p-3 dark:border-amber-900/50 dark:bg-slate-900/30 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="font-medium">{getDocumentLabel(code)}</div>
                                {document ? (
                                  <div className="mt-1 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    {document.fileUrl ? (
                                      <a href={document.fileUrl} target="_blank" rel="noreferrer" className="truncate underline">{document.fileName}</a>
                                    ) : <span className="truncate">{document.fileName}</span>}
                                  </div>
                                ) : (
                                  <div className="mt-1 text-xs text-red-700 dark:text-red-400">Chưa tải lên</div>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                  {isUploading ? 'Đang tải...' : document ? 'Thay thế' : 'Chọn file'}
                                  <input
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    disabled={isUploading}
                                    onChange={(event) => {
                                      const file = event.target.files?.[0]
                                      event.target.value = ''
                                      if (file) void uploadProfileDocument(code, file)
                                    }}
                                  />
                                </label>
                                {document && (
                                  <button
                                    type="button"
                                    title="Xóa tài liệu"
                                    aria-label={`Xóa ${getDocumentLabel(code)}`}
                                    className="rounded-lg p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40"
                                    onClick={() => void deleteProfileDocument(document)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {validationErrors.documents && <div className="mt-3 text-xs font-medium text-red-700 dark:text-red-400">{validationErrors.documents}</div>}
                    </div>

                    <div className="mb-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Hộ gia đình và người phụ thuộc</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Khai báo cha mẹ, vợ/chồng, con và người sống cùng. Người phụ thuộc được tính vào nhân khẩu để xét diện tích, không tính thu nhập.</p>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setHouseholdMembers((current) => [...current, { fullName: '', citizenId: '', dateOfBirth: '', relationship: '', occupation: '', monthlyIncome: '', isDependent: false, dependentReason: '', note: '' }])}>Thêm thành viên</Button>
                        </div>
                      </div>
                      {householdMembers.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Chưa khai báo thành viên sống cùng.</p>}
                      <div className="space-y-3">
                        {householdMembers.map((member, index) => (
                          <div key={member.memberId ?? `new-${index}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Thành viên {index + 1}</span>
                              <button type="button" title="Xóa thành viên" aria-label={`Xóa thành viên ${index + 1}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => void removeHouseholdMember(member, index)}><Trash2 className="h-4 w-4" /></button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <FormField label="Họ và tên *" htmlFor={`member-name-${index}`}><Input id={`member-name-${index}`} value={member.fullName} onChange={(event) => setHouseholdMembers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, fullName: event.target.value } : item))} /></FormField>
                              <FormField label="Quan hệ *" htmlFor={`member-relation-${index}`}>
                                <select id={`member-relation-${index}`} value={member.relationship} onChange={(event) => setHouseholdMembers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, relationship: event.target.value } : item))} className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-4 text-sm dark:border-slate-700 dark:bg-slate-900/80">
                                  <option value="">-- Chọn --</option>
                                  {(householdRelationships.length > 0 ? householdRelationships : [{ code: 'SPOUSE', label: 'Vợ / Chồng' }, { code: 'CHILD', label: 'Con' }, { code: 'PARENT', label: 'Cha / Mẹ' }, { code: 'SIBLING', label: 'Anh / Chị / Em' }, { code: 'GRANDPARENT', label: 'Ông / Bà' }, { code: 'GRANDCHILD', label: 'Cháu' }, { code: 'OTHER', label: 'Khác' }]).map((relation) => <option key={relation.code} value={relation.code}>{relation.label}</option>)}
                                </select>
                              </FormField>
                              <FormField label="CCCD" htmlFor={`member-citizen-id-${index}`}>
                                <Input id={`member-citizen-id-${index}`} inputMode="numeric" placeholder="9 hoặc 12 chữ số" value={member.citizenId} onChange={(event) => setHouseholdMembers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, citizenId: event.target.value } : item))} />
                                {member.citizenId.trim() && !/^\d{9}(\d{3})?$/.test(member.citizenId.trim()) && (
                                  <span className="mt-1 block text-xs text-red-600">CCCD phải có đúng 9 hoặc 12 chữ số.</span>
                                )}
                              </FormField>
                              <FormField label="Ngày sinh" htmlFor={`member-dob-${index}`}><Input id={`member-dob-${index}`} type="date" value={member.dateOfBirth} onChange={(event) => setHouseholdMembers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, dateOfBirth: event.target.value } : item))} /></FormField>
                              <FormField label="Nghề nghiệp" htmlFor={`member-occupation-${index}`}><Input id={`member-occupation-${index}`} value={member.occupation} onChange={(event) => setHouseholdMembers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, occupation: event.target.value } : item))} /></FormField>
                              <FormField label="Thu nhập hàng tháng (VNĐ)" htmlFor={`member-income-${index}`}><Input id={`member-income-${index}`} type="number" min={0} value={member.monthlyIncome} onChange={(event) => setHouseholdMembers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, monthlyIncome: event.target.value } : item))} /></FormField>
                            </div>
                            <label className="mt-3 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={member.isDependent} onChange={(event) => setHouseholdMembers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, isDependent: event.target.checked, dependentReason: event.target.checked ? item.dependentReason : '' } : item))} />Là người phụ thuộc</label>
                            {member.isDependent && <div className="mt-3 max-w-xl"><FormField label="Lý do phụ thuộc *" htmlFor={`member-dependent-reason-${index}`}><select id={`member-dependent-reason-${index}`} value={member.dependentReason} onChange={(event) => setHouseholdMembers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, dependentReason: event.target.value } : item))} className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-4 text-sm dark:border-slate-700 dark:bg-slate-900/80"><option value="">-- Chọn lý do --</option>{DEPENDENT_REASON_OPTIONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></FormField><p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Bắt buộc đính kèm giấy tờ chứng minh người phụ thuộc và giấy xác nhận thông tin cư trú/hộ khẩu.</p></div>}
                          </div>
                        ))}
                      </div>
                      {validationErrors.householdMembers && <p className="mt-3 text-xs font-medium text-red-600">{validationErrors.householdMembers}</p>}
                      <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900/60 dark:bg-violet-950/20">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-violet-950 dark:text-violet-100">Giấy tờ hộ gia đình</p>
                            <p className="mt-1 text-xs text-violet-800 dark:text-violet-200">Bắt buộc tải hộ khẩu hoặc giấy xác nhận thông tin cư trú để chứng minh các thành viên trong hộ.</p>
                            {(() => {
                              const residenceDocument = userDocuments.find((document) => document.documentType === 'RESIDENCE_CONFIRMATION')
                              return residenceDocument ? (
                                <div className="mt-2 flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {residenceDocument.fileUrl ? <a href={residenceDocument.fileUrl} target="_blank" rel="noreferrer" className="underline">{residenceDocument.fileName}</a> : residenceDocument.fileName}
                                </div>
                              ) : <p className="mt-2 text-xs font-medium text-red-700 dark:text-red-400">Chưa tải lên</p>
                            })()}
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200 dark:hover:bg-violet-900/40">
                            {uploadingDocument === 'RESIDENCE_CONFIRMATION' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            {uploadingDocument === 'RESIDENCE_CONFIRMATION' ? 'Đang tải...' : userDocuments.some((document) => document.documentType === 'RESIDENCE_CONFIRMATION') ? 'Thay thế' : 'Tải hộ khẩu'}
                            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingDocument === 'RESIDENCE_CONFIRMATION'} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadProfileDocument('RESIDENCE_CONFIRMATION', file) }} />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Tình trạng hôn nhân" htmlFor="maritalStatus">
                        <select
                          id="maritalStatus"
                          value={citizenInfo.maritalStatus}
                          onChange={(e) => setCitizenInfo((prev) => ({ ...prev, maritalStatus: e.target.value }))}
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900/80"
                        >
                          <option value="">-- Chọn --</option>
                          {MARITAL_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        {validationErrors.maritalStatus && <span className="mt-1 block text-xs text-red-600">{validationErrors.maritalStatus}</span>}
                      </FormField>



                      <FormField label="Nghề nghiệp" htmlFor="occupation">
                        <Input id="occupation" value={citizenInfo.occupation} onChange={(e) => setCitizenInfo((prev) => ({ ...prev, occupation: e.target.value }))} />
                        {validationErrors.occupation && <span className="mt-1 block text-xs text-red-600">{validationErrors.occupation}</span>}
                      </FormField>

                      <FormField label="Nơi làm việc" htmlFor="workPlace">
                        <Input id="workPlace" value={citizenInfo.workPlace} onChange={(e) => setCitizenInfo((prev) => ({ ...prev, workPlace: e.target.value }))} />
                        {validationErrors.workPlace && <span className="mt-1 block text-xs text-red-600">{validationErrors.workPlace}</span>}
                      </FormField>

                      <FormField label="Thu nhập hàng tháng (VNĐ)" htmlFor="monthlyIncome">
                        <Input id="monthlyIncome" type="number" min={0} value={citizenInfo.monthlyIncome} onChange={(e) => setCitizenInfo((prev) => ({ ...prev, monthlyIncome: e.target.value }))} />
                        {validationErrors.monthlyIncome && <span className="mt-1 block text-xs text-red-600">{validationErrors.monthlyIncome}</span>}
                      </FormField>

                      <FormField label="Chỗ ở hiện tại" htmlFor="currentResidence">
                        <Input id="currentResidence" value={citizenInfo.currentResidence} onChange={(e) => setCitizenInfo((prev) => ({ ...prev, currentResidence: e.target.value }))} />
                        {validationErrors.currentResidence && <span className="mt-1 block text-xs text-red-600">{validationErrors.currentResidence}</span>}
                      </FormField>

                      <FormField label="Diện tích bình quân/người (m²)" htmlFor="averageHousingAreaPerPerson">
                        <Input id="averageHousingAreaPerPerson" type="number" min={0} step="0.1" value={citizenInfo.averageHousingAreaPerPerson} onChange={(e) => setCitizenInfo((prev) => ({ ...prev, averageHousingAreaPerPerson: e.target.value }))} />
                        {validationErrors.averageHousingAreaPerPerson && <span className="mt-1 block text-xs text-red-600">{validationErrors.averageHousingAreaPerPerson}</span>}
                      </FormField>

                      <FormField label="Tình trạng nhà ở" htmlFor="housingStatus">
                        <select
                          id="housingStatus"
                          value={citizenInfo.housingStatus}
                          onChange={(e) => setCitizenInfo((prev) => ({ ...prev, housingStatus: e.target.value }))}
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900/80"
                        >
                          <option value="">-- Chọn --</option>
                          {HOUSING_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        {validationErrors.housingStatus && <span className="mt-1 block text-xs text-red-600">{validationErrors.housingStatus}</span>}
                      </FormField>

                      <FormField label="Nhóm ưu tiên" htmlFor="priorityGroup">
                        <select
                          id="priorityGroup"
                          value={citizenInfo.priorityGroup}
                          onChange={(e) => setCitizenInfo((prev) => ({ ...prev, priorityGroup: e.target.value }))}
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900/80"
                        >
                          <option value="">-- Chọn --</option>
                          {PRIORITY_GROUP_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        {validationErrors.priorityGroup && <span className="mt-1 block text-xs text-red-600">{validationErrors.priorityGroup}</span>}
                      </FormField>

                    </div>

                    <div className="mt-4 grid gap-4">
                      <FormField label="Địa chỉ thường trú" htmlFor="permanentAddress">
                        <Textarea
                          id="permanentAddress"
                          value={citizenInfo.permanentAddress}
                          onChange={(e) => setCitizenInfo((prev) => ({ ...prev, permanentAddress: e.target.value }))}
                        />
                        {validationErrors.permanentAddress && <span className="mt-1 block text-xs text-red-600">{validationErrors.permanentAddress}</span>}
                      </FormField>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                      <Button type="button" variant="outline" onClick={() => setIsPolicyEditing(false)}>Hủy</Button>
                      <Button type="button" variant="accent" onClick={() => void saveCitizenDeclaration()} disabled={savingCitizenInfo}>
                        {savingCitizenInfo ? 'Đang lưu...' : 'Lưu khai báo'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
              {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowPasswordForm((v) => !v)}
                aria-expanded={showPasswordForm}
                aria-controls="change-password-panel"
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm font-semibold">Bảo mật tài khoản</p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Đổi mật khẩu</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${showPasswordForm ? 'rotate-180' : ''}`}
                />
              </button>
              {showPasswordForm && (
                <form
                  id="change-password-panel"
                  className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const fd = new FormData(e.currentTarget)
                    const currentPassword = String(fd.get('currentPassword'))
                    const newPassword = String(fd.get('newPassword'))
                    const confirmPassword = String(fd.get('confirmPassword'))

                    if (!currentPassword || !newPassword || !confirmPassword) {
                      setPwMsg({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin.' })
                      return
                    }
                    if (newPassword.length < 8) {
                      setPwMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' })
                      return
                    }
                    if (newPassword !== confirmPassword) {
                      setPwMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' })
                      return
                    }
                    if (currentPassword === newPassword) {
                      setPwMsg({ type: 'error', text: 'Mật khẩu mới phải khác mật khẩu hiện tại.' })
                      return
                    }

                    try {
                      const res = await authApi.changePassword({ currentPassword, newPassword, confirmPassword })
                      console.info('[change-password] success', res)
                      setPwMsg({ type: 'success', text: 'Đổi mật khẩu thành công.' })
                      setShowPasswordForm(false)
                    } catch (err) {
                      console.error('[change-password] failed', err)
                      setPwMsg({ type: 'error', text: formatError(err) })
                    }
                  }}
                >
                  <FormField label="Mật khẩu hiện tại" htmlFor="currentPassword">
                    <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
                  </FormField>
                  <FormField label="Mật khẩu mới" htmlFor="newPassword">
                    <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
                  </FormField>
                  <FormField label="Xác nhận mật khẩu" htmlFor="confirmPassword">
                    <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
                  </FormField>
                  <Button type="submit">Xác nhận đổi mật khẩu</Button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'account' && pwMsg && (
            <div data-testid="pw-msg" className="mt-4">
              <Alert variant={pwMsg.type === 'error' ? 'error' : 'success'}>{pwMsg.text}</Alert>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">Xóa tài khoản</p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Tài khoản và toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                  </span>
                </div>
                <DeleteAccountButton />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-slate-200/80 p-6 dark:border-slate-800">
        <Button variant="ghost" className="text-red-600" onClick={() => void logout()}>Đăng xuất</Button>
      </div>
    </div>
  )
}

function PolicySummary({
  citizenInfo,
  householdMembers,
  userDocuments,
  profileDocumentTypes,
}: {
  citizenInfo: CitizenDeclarationState
  householdMembers: HouseholdMemberDraft[]
  userDocuments: UserDocumentDto[]
  profileDocumentTypes: DocumentTypeDto[]
}) {
  const label = (options: Array<{ value: string; label: string }>, value: string) => options.find((option) => option.value === value)?.label ?? value
  const documentLabel = (code: string) => profileDocumentTypes.find((document) => document.code === code)?.label ?? code

  return (
    <div className="space-y-4">
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <SummaryItem label="Tình trạng hôn nhân" value={label(MARITAL_STATUS_OPTIONS, citizenInfo.maritalStatus)} />
        <SummaryItem label="Nghề nghiệp" value={citizenInfo.occupation} />
        <SummaryItem label="Nơi làm việc" value={citizenInfo.workPlace} />
        <SummaryItem label="Thu nhập hàng tháng" value={`${Number(citizenInfo.monthlyIncome).toLocaleString('vi-VN')} VNĐ`} />
        <SummaryItem label="Chỗ ở hiện tại" value={citizenInfo.currentResidence} />
        <SummaryItem label="Diện tích bình quân/người" value={`${citizenInfo.averageHousingAreaPerPerson} m²`} />
        <SummaryItem label="Tình trạng nhà ở" value={label(HOUSING_STATUS_OPTIONS, citizenInfo.housingStatus)} />
        <SummaryItem label="Nhóm ưu tiên" value={label(PRIORITY_GROUP_OPTIONS, citizenInfo.priorityGroup)} />
        <SummaryItem label="Địa chỉ thường trú" value={citizenInfo.permanentAddress} className="sm:col-span-2" />
      </div>

      <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Hộ gia đình và người phụ thuộc</p>
        {householdMembers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Chưa khai báo thành viên sống cùng.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {householdMembers.map((member) => (
              <div key={member.memberId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
                <span className="font-medium">{member.fullName} <span className="font-normal text-slate-500">({label(RELATIONSHIP_OPTIONS, member.relationship)})</span></span>
                {member.isDependent && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">Người phụ thuộc: {label(DEPENDENT_REASON_OPTIONS, member.dependentReason)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Giấy tờ đã đính kèm</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {userDocuments.length === 0 ? <span className="text-sm text-slate-500 dark:text-slate-400">Chưa có tài liệu.</span> : userDocuments.map((document) => (
            <span key={document.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> {documentLabel(document.documentType)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SummaryItem({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{value || 'Chưa cập nhật'}</p>
    </div>
  )
}

function DeleteAccountButton() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleDelete = async () => {
    if (!password) {
      setMsg({ type: 'error', text: 'Vui lòng nhập mật khẩu để xác nhận.' })
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      await usersApi.deleteAccount({
        password,
        reason: reason.trim() || undefined,
      })
      // Xóa local storage và chuyển về trang login
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
      clearRole()
      navigate('login')
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        onClick={() => setOpen(true)}
      >
        Xóa tài khoản
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Xóa tài khoản</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Bạn có chắc chắn muốn xóa tài khoản này? Tất cả dữ liệu sẽ bị mất vĩnh viễn.
            </p>
            <div className="mt-4 space-y-3">
              <FormField label="Nhập mật khẩu để xác nhận" htmlFor="delete-password">
                <Input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu của bạn"
                />
              </FormField>
              <FormField label="Lý do (tùy chọn)" htmlFor="delete-reason">
                <Input
                  id="delete-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Cho chúng tôi biết lý do..."
                />
              </FormField>
            </div>
            {msg && (
              <Alert variant={msg.type === 'error' ? 'error' : 'success'} className="mt-3">
                {msg.text}
              </Alert>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); setPassword(''); setReason(''); setMsg(null) }}>
                Hủy
              </Button>
              <Button
                variant="accent"
                className="bg-red-600 hover:bg-red-700"
                disabled={loading}
                onClick={() => void handleDelete()}
              >
                {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
