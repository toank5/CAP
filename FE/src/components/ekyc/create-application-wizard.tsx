import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Home as HomeIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { housingApplicationsApi } from '@/api/housing-applications'
import { housingProjectsApi } from '@/api/housing-projects'
import { usersApi } from '@/api/users'
import { FileDropzone } from '@/components/shared/file-dropzone'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input, Select } from '@/components/ui/input'
import { navigate } from '@/hooks/useHashRoute'
import {
  APPLICATION_STATUS,
  BLOCKING_APPLICATION_STATUSES,
  DOC_TYPE_LABELS,
  HOUSING_STATUS_LABELS,
  canCreateNewApplication,
  getRequiredDocsForPriorityGroup,
} from '@/lib/constants'
import {
  validateDocumentFile,
} from '@/lib/ekyc-helpers'
import { extractApplicationId, extractProjects } from '@/lib/parsers'
import { formatError } from '@/lib/format-error'
import { useUserProfile } from '@/providers/user-profile-provider'
import type { CreateApplicationDto } from '@/types'

// Luồng chính theo yêu cầu: 5 bước. Step 2 (Hộ gia đình) lưu cùng create-application qua `householdMembers[]`.
// Step 3 (Nhóm đối tượng) chọn priorityGroup + khai báo lịch sử hợp đồng nhà ở xã hội.

type Step = 1 | 2 | 3 | 4 | 5

interface DocUpload {
  type: string
  file: File
  documentId?: string
  state: 'pending' | 'uploading' | 'uploaded' | 'error'
  error?: string
}

interface HouseholdMember {
  id: string
  fullName: string
  relationship: string
  dateOfBirth: string
  citizenId: string
  note: string
}

// maritals: mã BE (EligibilityRuleEngine dùng MARRIED).
const MARITAL_STATUSES = [
  { value: 'SINGLE', label: 'Độc thân' },
  { value: 'MARRIED', label: 'Đã kết hôn' },
  { value: 'DIVORCED', label: 'Ly hôn' },
  { value: 'WIDOWED', label: 'Góa' },
]

/** Nhóm đối tượng ưu tiên — đồng bộ với BE (PriorityGroupConstants.cs Đ76 Luật Nhà ở 2023). */
const PRIORITY_GROUPS = [
  { value: 'MERIT_PERSON', label: 'Người có công với cách mạng', description: 'Được hỗ trợ cải thiện nhà ở theo Pháp lệnh Ưu đãi người có công (khoản 1 Đ76).' },
  { value: 'RURAL_POOR', label: 'Hộ nghèo nông thôn', description: 'Hộ gia đình thuộc diện nghèo theo chuẩn quốc gia (khoản 2 Đ76).' },
  { value: 'RURAL_NEAR_POOR', label: 'Hộ cận nghèo nông thôn', description: 'Hộ gia đình thuộc diện cận nghèo theo chuẩn quốc gia (khoản 3 Đ76).' },
  { value: 'URBAN_POOR', label: 'Hộ nghèo đô thị', description: 'Hộ gia đình thuộc diện nghèo theo chuẩn quốc gia (khoản 4 Đ76).' },
  { value: 'URBAN_NEAR_POOR', label: 'Hộ cận nghèo đô thị', description: 'Hộ gia đình thuộc diện cận nghèo theo chuẩn quốc gia (khoản 4 Đ76).' },
  { value: 'LOW_INCOME_URBAN', label: 'Người thu nhập thấp tại đô thị', description: 'Cá nhân/hộ gia đình có thu nhập thấp, áp dụng trần thu nhập Đ30 (khoản 5 Đ76).' },
  { value: 'WORKER', label: 'Công nhân, người lao động tại DN/HTX/KCN', description: 'Đang làm việc tại doanh nghiệp/HTX/liên hiệp HTX/KCN (khoản 6 Đ76).' },
  { value: 'MILITARY_PERSONNEL', label: 'Lực lượng vũ trang, cơ yếu', description: 'Đang phục vụ trong lực lượng vũ trang/cơ yếu (khoản 7 Đ76).' },
  { value: 'CIVIL_SERVANT', label: 'Cán bộ, công chức, viên chức', description: 'Cán bộ/công chức/viên chức do cơ quan công tác cấp (khoản 8 Đ76).' },
  { value: 'PUBLIC_HOUSING_RETURN', label: 'Đối tượng trả lại nhà công vụ', description: 'Đang trả lại nhà ở công vụ (khoản 9 Đ76).' },
  { value: 'LAND_RECOVERY_AFFECTED', label: 'Bị thu hồi đất / giải tỏa nhà ở', description: 'Bị thu hồi đất ở/giải tỏa nhà ở thuộc sở hữu Nhà nước (khoản 10 Đ76).' },
]

/** Quan hệ trong hộ — mã BE (HouseholdRelationshipConstants). */
const HOUSEHOLD_RELATIONS = [
  { value: 'SPOUSE', label: 'Vợ / Chồng' },
  { value: 'CHILD', label: 'Con' },
  { value: 'PARENT', label: 'Cha / Mẹ' },
  { value: 'SIBLING', label: 'Anh / Chị / Em' },
  { value: 'GRANDPARENT', label: 'Ông / Bà' },
  { value: 'GRANDCHILD', label: 'Cháu' },
  { value: 'OTHER', label: 'Khác' },
]

const STEPS: { id: Step; label: string; icon: typeof UserCheck }[] = [
  { id: 1, label: 'Cá nhân', icon: UserCheck },
  { id: 2, label: 'Hộ gia đình', icon: Users },
  { id: 3, label: 'Đối tượng', icon: HomeIcon },
  { id: 4, label: 'Tài liệu', icon: FileCheck2 },
  { id: 5, label: 'Rà soát', icon: CheckCircle2 },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function extractCitizenId(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const root = data as Record<string, unknown>
  const u = (root.user ?? root.User ?? root) as Record<string, unknown>
  if (!u || typeof u !== 'object') return ''
  return String(u.citizenId ?? u.CitizenId ?? '')
}

function extractAddress(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const root = data as Record<string, unknown>
  const u = (root.user ?? root.User ?? root) as Record<string, unknown>
  if (!u || typeof u !== 'object') return ''
  const addr = u.address ?? u.Address ?? u.currentAddress ?? u.CurrentAddress ?? u.permanentAddress ?? u.PermanentAddress ?? ''
  return typeof addr === 'string' ? addr : ''
}

function extractDateOfBirth(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const root = data as Record<string, unknown>
  const u = (root.user ?? root.User ?? root) as Record<string, unknown>
  if (!u || typeof u !== 'object') return ''
  const raw = u.dateOfBirth ?? u.DateOfBirth
  if (!raw) return ''
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return String(raw)
  return d.toLocaleDateString('vi-VN')
}

const ekycInputClass = 'bg-slate-50 opacity-90 dark:bg-slate-800/50'

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function Stepper({ progress }: { progress: Record<Step, 'todo' | 'doing' | 'done'> }) {
  return (
    <ol className="mb-6 grid grid-cols-5 gap-1.5">
      {STEPS.map((s) => {
        const state = progress[s.id]
        const Icon = s.icon
        return (
          <li
            key={s.id}
            className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition ${
              state === 'doing'
                ? 'border-primary bg-primary/10 text-primary dark:bg-accent/10'
                : state === 'done'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                state === 'doing'
                  ? 'bg-primary text-white'
                  : state === 'done'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            </span>
            <span className="text-[10px] leading-tight">Bước {s.id}</span>
            <span className="text-[9px] font-medium opacity-80">{s.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function CreateApplicationWizard() {
  const { fullName: profileFullName } = useUserProfile()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>(1)
  const [completedSteps, setCompletedSteps] = useState<Step[]>([])
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState('')
  const [projects, setProjects] = useState<{ id: string; name: string; minPrice?: number; maxPrice?: number; availableUnits?: number }[]>([])

  const [form, setForm] = useState({
    projectId: '',
    fullName: '',
    citizenId: '',
    occupation: '',
    workPlace: '',
    currentResidence: '',
    permanentAddress: '',
    housingStatus: 'NO_HOUSE' as 'NO_HOUSE' | 'SMALL_HOUSE',
    maritalStatus: 'SINGLE' as typeof MARITAL_STATUSES[number]['value'],
    monthlyIncome: '',
    spouseMonthlyIncome: '',
    averageHousingAreaPerPerson: '',
    priorityGroup: '',
  })

  /** Bước 3 — Hộ gia đình (chờ BE: gửi kèm create-application). */
  const [householdSize, setHouseholdSize] = useState('0')
  const [household, setHousehold] = useState<HouseholdMember[]>([])

  /** Bước 3 — Nhóm đối tượng theo Nghị định 100/2024. */
  const [hasPriorContract, setHasPriorContract] = useState(false)
  const [priorContractNote, setPriorContractNote] = useState('')

  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<string>('DRAFT')
  const [docs, setDocs] = useState<Record<string, DocUpload | null>>({})
  const [commitment, setCommitment] = useState(false)
  const [activeBlock, setActiveBlock] = useState<string | null>(null)
  const [dateOfBirthLabel, setDateOfBirthLabel] = useState('')
  const [ekycIncomplete, setEkycIncomplete] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        // Lấy tất cả hồ sơ của user hiện tại (tối đa 50) để FE tự quyết định
        // được phép tạo mới hay không — đúng quy tắc:
        //  - Chỉ hồ sơ ở trạng thái "thất bại" (REJECTED / LOTTERY_LOST / CANCELED) mới cho tạo mới.
        //  - Nháp (DRAFT) không chặn — user có thể tiếp tục hoặc tạo mới.
        const paged = await housingApplicationsApi.getMy({ pageIndex: 1, pageSize: 50 })
        if (cancelled) return
        const items = Array.isArray(paged?.items) ? paged.items : []
        const statuses = items
          .map((it) => (it?.applicationStatus ?? null) as string | null)
          .filter(Boolean)
        if (!canCreateNewApplication(statuses)) {
          const blockingLabel = APPLICATION_STATUS[statuses.find((s) =>
            s ? BLOCKING_APPLICATION_STATUSES.includes(s as never) : false,
          ) || '']?.label
          setActiveBlock(
            blockingLabel
              ? `Bạn đang có hồ sơ ở trạng thái "${blockingLabel}". Vui lòng chờ hồ sơ hoàn tất (trượt/đã hủy) trước khi tạo hồ sơ mới.`
              : 'Bạn đang có hồ sơ đang xử lý. Vui lòng chờ hồ sơ hoàn tất (trượt/đã hủy) trước khi tạo hồ sơ mới.',
          )
        } else {
          setActiveBlock(null)
        }
      } catch {
        // Fallback: nếu không lấy được my-applications, dùng active-check cũ
        try {
          const data = await housingApplicationsApi.activeCheck()
          if (cancelled) return
          const has =
            Boolean((data as { hasActiveApplication?: boolean })?.hasActiveApplication) ||
            Boolean((data as { HasActiveApplication?: boolean })?.HasActiveApplication)
          if (has) {
            setActiveBlock(
              (data as { message?: string })?.message ||
                'Bạn đang có hồ sơ khác đang hoạt động. Không thể tạo hồ sơ mới.',
            )
          }
        } catch {
          /* ignore — BE vẫn chặn khi tạo */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Khi đổi nhóm đối tượng, danh sách giấy tờ bắt buộc thay đổi → reset các ô tương ứng.
  const requiredDocs = useMemo(
    () => getRequiredDocsForPriorityGroup(form.priorityGroup),
    [form.priorityGroup],
  )
  useEffect(() => {
    setDocs((prev) => {
      const next: Record<string, DocUpload | null> = {}
      for (const t of requiredDocs) next[t] = prev[t] ?? null
      return next
    })
  }, [requiredDocs])

  const isBusy = busy.length > 0

  useEffect(() => {
    void usersApi.getProfile()
      .then((data) => {
        const cid = extractCitizenId(data)
        const addr = extractAddress(data)
        const dob = extractDateOfBirth(data)
        const name = profileFullName || ''
        setDateOfBirthLabel(dob)
        setForm((f) => ({
          ...f,
          fullName: name || f.fullName,
          citizenId: cid || f.citizenId,
          // Thường trú lấy từ eKYC — khóa không sửa tay
          permanentAddress: addr || f.permanentAddress,
          currentResidence: f.currentResidence || addr,
        }))
        setEkycIncomplete(!cid || !name.trim() || !addr.trim())
      })
      .catch(() => {
        setForm((f) => ({ ...f, fullName: f.fullName || profileFullName || '' }))
        setEkycIncomplete(true)
      })
  }, [profileFullName])

  useEffect(() => {
    void housingProjectsApi.list().then((data) => {
      const items = extractProjects(data)
        .filter((p) => p.id)
        .map((p) => ({
          id: p.id!,
          name: p.projectName || p.name || 'Dự án',
          minPrice: p.minPrice,
          maxPrice: p.maxPrice,
          availableUnits: p.availableUnits,
        }))
      setProjects(items)
      const presetId = sessionStorage.getItem('createApplicationProjectId')
      if (presetId && items.some((p) => p.id === presetId)) {
        setForm((f) => ({ ...f, projectId: presetId }))
        sessionStorage.removeItem('createApplicationProjectId')
      } else if (items.length === 1) {
        setForm((f) => ({ ...f, projectId: items[0].id }))
      }
    }).catch(() => setProjects([]))
  }, [])

  const parseAreaPerPerson = (raw: string): number | null => {
    const area = parseFloat(raw.replace(/,/g, ''))
    if (!raw.trim() || Number.isNaN(area)) return null
    return area
  }

  /** Diện tích chỉ hợp lệ khi SMALL_HOUSE: > 0 và < 15 m²/người. */
  const isValidSmallHouseArea = (raw: string): boolean => {
    const area = parseAreaPerPerson(raw)
    return area != null && area > 0 && area < 15
  }

  const isMarried = form.maritalStatus === 'MARRIED'

  const step1Ready =
    !!form.projectId &&
    form.fullName.trim().length > 0 &&
    form.citizenId.trim().length > 0 &&
    form.currentResidence.trim().length > 0 &&
    form.permanentAddress.trim().length > 0 &&
    form.maritalStatus.trim().length > 0 &&
    form.monthlyIncome !== '' &&
    Number(form.monthlyIncome) >= 0 &&
    (form.housingStatus !== 'SMALL_HOUSE' || isValidSmallHouseArea(form.averageHousingAreaPerPerson)) &&
    // Đã kết hôn: thu nhập vợ/chồng bắt buộc (>= 0); các tình trạng khác không bắt
    (!isMarried || (form.spouseMonthlyIncome !== '' && Number(form.spouseMonthlyIncome) >= 0))

  const step2Ready =
    householdSize !== '' &&
    Number(householdSize) >= 0 &&
    household.every((m) => m.fullName.trim().length > 0 && m.relationship !== '' && m.citizenId.trim().length >= 9)

  const step3Ready = form.priorityGroup !== '' && (!hasPriorContract || priorContractNote.trim().length > 0)

  const allDocsUploaded = requiredDocs.every((k) => docs[k]?.state === 'uploaded')

  const buildCreateBody = (): CreateApplicationDto | null => {
    if (!form.projectId || !form.priorityGroup) return null
    if (form.housingStatus === 'SMALL_HOUSE' && !isValidSmallHouseArea(form.averageHousingAreaPerPerson)) {
      setMsg({
        type: 'error',
        text: 'Khi khai nhà diện tích nhỏ: bắt buộc nhập diện tích bình quân đầu người dưới 15 m²/người.',
      })
      return null
    }
    if (form.maritalStatus === 'MARRIED') {
      if (form.spouseMonthlyIncome === '' || Number.isNaN(parseFloat(form.spouseMonthlyIncome)) || Number(form.spouseMonthlyIncome) < 0) {
        setMsg({
          type: 'error',
          text: 'Khi đã kết hôn: bắt buộc khai thu nhập vợ/chồng (có thể là 0).',
        })
        return null
      }
    }
    return {
      projectId: form.projectId,
      fullName: form.fullName.trim(),
      citizenId: form.citizenId.trim(),
      occupation: form.occupation.trim() || null,
      workPlace: form.workPlace.trim() || null,
      currentResidence: form.currentResidence.trim(),
      permanentAddress: form.permanentAddress.trim(),
      housingStatus: form.housingStatus,
      maritalStatus: form.maritalStatus,
      monthlyIncome: form.monthlyIncome !== '' ? parseFloat(form.monthlyIncome) : null,
      spouseMonthlyIncome:
        form.maritalStatus === 'MARRIED' && form.spouseMonthlyIncome !== ''
          ? parseFloat(form.spouseMonthlyIncome)
          : null,
      // NO_HOUSE: không gửi diện tích (tránh sai sót giữ giá trị cũ)
      averageHousingAreaPerPerson:
        form.housingStatus === 'SMALL_HOUSE'
          ? parseAreaPerPerson(form.averageHousingAreaPerPerson)
          : null,
      priorityGroup: form.priorityGroup,
      householdMembers:
        household.length > 0
          ? household.map((m) => ({
              fullName: m.fullName.trim(),
              relationship: m.relationship,
              dateOfBirth: m.dateOfBirth || null,
              citizenId: m.citizenId.trim() || null,
              note: m.note.trim() || null,
            }))
          : null,
    }
  }

  const createDraft = async (): Promise<string | null> => {
    const body = buildCreateBody()
    if (!body) {
      if (!form.priorityGroup) {
        setMsg({ type: 'error', text: 'Vui lòng chọn nhóm đối tượng (bước 3) trước khi lưu nháp.' })
      }
      return null
    }
    setBusy('create')
    setMsg(null)
    try {
        if (draftId) {
          // UpdateApplicationRequestDto không nhận projectId
          const updateBody = {
            fullName: body.fullName,
            citizenId: body.citizenId,
            occupation: body.occupation,
            workPlace: body.workPlace,
            currentResidence: body.currentResidence,
            permanentAddress: body.permanentAddress,
            housingStatus: body.housingStatus,
            maritalStatus: body.maritalStatus,
            monthlyIncome: body.monthlyIncome,
            spouseMonthlyIncome: body.spouseMonthlyIncome,
            averageHousingAreaPerPerson: body.averageHousingAreaPerPerson,
            priorityGroup: body.priorityGroup,
            householdMembers: body.householdMembers,
          }
          await housingApplicationsApi.update(draftId, updateBody)
        setDraftStatus('DRAFT')
        return draftId
      }
      const data = await housingApplicationsApi.create(body)
      const appId = extractApplicationId(data)
      if (!appId) {
        setMsg({ type: 'error', text: 'BE không trả về mã hồ sơ. Vui lòng thử lại.' })
        return null
      }
      setDraftId(appId)
      setDraftStatus('DRAFT')
      return appId
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
      return null
    } finally {
      setBusy('')
    }
  }

  const handleSaveDraft = async () => {
    const id = await createDraft()
    if (id) {
      setMsg({ type: 'success', text: 'Lưu hồ sơ nháp thành công. Bạn có thể quay lại sau để upload tài liệu và nộp.' })
    }
  }

  const uploadOneDoc = async (
    key: string,
    file: File,
    applicationId?: string | null,
  ): Promise<boolean> => {
    const id = applicationId ?? draftId
    if (!id) {
      setMsg({ type: 'error', text: 'Bạn cần lưu nháp hồ sơ trước khi upload tài liệu.' })
      return false
    }
    setDocs((d) => ({ ...d, [key]: { type: key, file, state: 'uploading' } }))
    try {
      const res = await housingApplicationsApi.uploadDocument(id, key, file)
      const detail = (res as { documentId?: string; DocumentId?: string } | null) ?? null
      const documentId = String(detail?.documentId ?? detail?.DocumentId ?? '')
      setDocs((d) => ({ ...d, [key]: { type: key, file, documentId, state: 'uploaded' } }))
      return true
    } catch (err) {
      setDocs((d) => ({ ...d, [key]: { type: key, file, state: 'error', error: formatError(err) } }))
      return false
    }
  }

  const handleFilePick = (key: string, file: File | null) => {
    if (!file) return
    const err = validateDocumentFile(file)
    if (err) {
      setMsg({ type: 'error', text: err })
      return
    }
    setDocs((d) => ({ ...d, [key]: { type: key, file, state: 'pending' } }))
    setMsg({ type: 'info', text: `Đã chọn ${DOC_TYPE_LABELS[key]}. Bấm "Upload" để gửi lên máy chủ.` })
  }

  const handleUploadAll = async () => {
    let appId = draftId
    if (!appId) {
      appId = await createDraft()
      if (!appId) return
    }
    setBusy('upload-all')
    let ok = true
    for (const key of requiredDocs) {
      const entry = docs[key]
      if (!entry) continue
      if (entry.state === 'uploaded') continue
      const res = await uploadOneDoc(key, entry.file, appId)
      if (!res) ok = false
    }
    setBusy('')
    if (ok) {
      setMsg({ type: 'success', text: 'Upload tài liệu thành công. Có thể nộp hồ sơ ngay.' })
    } else {
      setMsg({ type: 'error', text: 'Một số tài liệu upload thất bại. Kiểm tra lại và thử lại.' })
    }
  }

  const handleSubmit = async () => {
    if (!draftId) {
      setMsg({ type: 'error', text: 'Bạn cần lưu nháp và upload đầy đủ tài liệu trước khi nộp.' })
      return
    }
    if (!commitment) {
      setMsg({ type: 'error', text: 'Vui lòng tích cam kết thông tin chính xác trước khi nộp.' })
      return
    }
    if (!allDocsUploaded) {
      setMsg({
        type: 'error',
        text: `Vui lòng upload đủ ${requiredDocs.length} giấy tờ PDF bắt buộc trước khi nộp hồ sơ.`,
      })
      return
    }
    if (draftStatus !== 'DRAFT' && draftStatus !== 'NEED_MORE_DOCUMENTS') {
      setMsg({ type: 'warning', text: `Hồ sơ đang ở trạng thái "${draftStatus}", không thể nộp lại.` })
      return
    }
    setBusy('submit')
    setMsg(null)
    try {
      const result = await housingApplicationsApi.submit(draftId) as {
        newStatus?: string
        NewStatus?: string
      }
      const newStatus = result?.newStatus ?? result?.NewStatus ?? 'SUBMITTED'
      setDraftStatus(newStatus)
      setCompletedSteps((prev) => (prev.includes(5) ? prev : [...prev, 5]))
      // Invalidate dashboard queries so the new application appears immediately in the list
      await queryClient.invalidateQueries({ queryKey: ['dashboard-apps'] })
      await queryClient.invalidateQueries({ queryKey: ['housing-applications'] })
      setMsg({ type: 'success', text: `Nộp hồ sơ thành công (trạng thái: ${newStatus}). Hệ thống sẽ chuyển sang trang chi tiết.` })
      setTimeout(() => {
        sessionStorage.setItem('applicationId', draftId)
        navigate('application-detail')
      }, 900)
    } catch (err) {
      const errMsg = formatError(err)
      setMsg({ type: 'error', text: errMsg })
      console.error('[submit] lỗi nộp hồ sơ:', err)
    } finally {
      setBusy('')
    }
  }

  const goNextFromStep1 = () => {
    if (ekycIncomplete || !form.fullName.trim() || !form.citizenId.trim() || !form.permanentAddress.trim()) {
      setMsg({
        type: 'error',
        text: 'Thiếu thông tin eKYC (họ tên / CCCD / địa chỉ). Vui lòng xác minh danh tính trước khi nộp hồ sơ.',
      })
      return
    }
    if (form.housingStatus === 'SMALL_HOUSE' && !isValidSmallHouseArea(form.averageHousingAreaPerPerson)) {
      setMsg({
        type: 'error',
        text: 'Vui lòng nhập diện tích bình quân đầu người dưới 15 m² (bắt buộc khi khai nhà diện tích nhỏ).',
      })
      return
    }
    if (form.maritalStatus === 'MARRIED' && (form.spouseMonthlyIncome === '' || Number(form.spouseMonthlyIncome) < 0)) {
      setMsg({
        type: 'error',
        text: 'Vui lòng khai thu nhập vợ/chồng (bắt buộc khi đã kết hôn).',
      })
      return
    }
    setMsg(null)
    setCompletedSteps((prev) => (prev.includes(1) ? prev : [...prev, 1]))
    setStep(2)
  }

  const goNextFromStep2 = () => {
    const ids = household.map((m) => m.citizenId.trim()).filter(Boolean)
    const dup = ids.find((id, i) => ids.indexOf(id) !== i)
    if (dup) {
      setMsg({ type: 'error', text: `Số CCCD "${dup}" bị trùng giữa các thành viên hộ gia đình.` })
      return
    }
    if (form.citizenId.trim() && ids.includes(form.citizenId.trim())) {
      setMsg({ type: 'error', text: 'CCCD thành viên không được trùng với CCCD của bạn.' })
      return
    }
    setMsg(null)
    setCompletedSteps((prev) => (prev.includes(2) ? prev : [...prev, 2]))
    setStep(3)
  }

  const goNextFromStep3 = async () => {
    const id = await createDraft()
    if (!id) return
    setCompletedSteps((prev) => (prev.includes(3) ? prev : [...prev, 3]))
    setStep(4)
  }

  const addHouseholdMember = () => {
    setHousehold((h) => [
      ...h,
      { id: uid(), fullName: '', relationship: '', dateOfBirth: '', citizenId: '', note: '' },
    ])
  }

  const updateMember = (id: string, patch: Partial<HouseholdMember>) => {
    setHousehold((h) => h.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  const removeMember = (id: string) => {
    setHousehold((h) => h.filter((m) => m.id !== id))
  }

  /** Khi user đổi số thành viên, tự cắt/bù để khớp. */
  useEffect(() => {
    const target = Math.max(0, Number(householdSize) || 0)
    setHousehold((current) => {
      if (current.length === target) return current
      if (current.length < target) {
        const need = target - current.length
        const newMembers = Array.from({ length: need }, () => ({
          id: uid(),
          fullName: '',
          relationship: '',
          dateOfBirth: '',
          citizenId: '',
          note: '',
        }))
        return [...current, ...newMembers]
      }
      return current.slice(0, target)
    })
  }, [householdSize])

  const progress: Record<Step, 'todo' | 'doing' | 'done'> = {
    1: step === 1 ? 'doing' : completedSteps.includes(1) ? 'done' : 'todo',
    2: step === 2 ? 'doing' : completedSteps.includes(2) ? 'done' : 'todo',
    3: step === 3 ? 'doing' : completedSteps.includes(3) ? 'done' : 'todo',
    4: step === 4 ? 'doing' : completedSteps.includes(4) ? 'done' : 'todo',
    5: step === 5 ? 'doing' : 'todo',
  }

  const summary = useMemo(
    () => (
      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 dark:border-accent/30 dark:bg-accent/10">
        <p className="text-xs font-bold uppercase tracking-widest text-primary dark:text-accent">Thông tin từ eKYC (chỉ đọc)</p>
        <div className="mt-2 grid gap-1 text-sm dark:text-slate-200">
          <p><span className="text-slate-500 dark:text-slate-400">Họ tên:</span> {form.fullName || '—'}</p>
          <p><span className="text-slate-500 dark:text-slate-400">CCCD:</span> {form.citizenId || '—'}</p>
          {dateOfBirthLabel && (
            <p><span className="text-slate-500 dark:text-slate-400">Ngày sinh:</span> {dateOfBirthLabel}</p>
          )}
          <p><span className="text-slate-500 dark:text-slate-400">Thường trú (CCCD):</span> {form.permanentAddress || '—'}</p>
          <p><span className="text-slate-500 dark:text-slate-400">Khuôn mặt:</span> ✓ Đã xác thực khi tạo tài khoản</p>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Họ tên, CCCD, địa chỉ thường trú lấy từ eKYC — không sửa tay. Cập nhật số điện thoại tại Hồ sơ cá nhân.
        </p>
      </div>
    ),
    [form.fullName, form.citizenId, form.permanentAddress, dateOfBirthLabel],
  )

  return (
    <div className="mx-auto w-full space-y-4">
      {activeBlock && (
        <Alert variant="error">
          {activeBlock}{' '}
          <button type="button" className="font-semibold underline" onClick={() => navigate('applications')}>
            Xem hồ sơ của tôi
          </button>
        </Alert>
      )}
      <fieldset disabled={!!activeBlock} className={activeBlock ? 'pointer-events-none opacity-60' : undefined}>
      <Stepper progress={progress} />

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.section key="s1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
            <div className="glass-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Bước 1 — Thông tin cá nhân</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Họ tên, CCCD, địa chỉ thường trú lấy từ eKYC (chỉ đọc). Bổ sung nghề nghiệp, nơi ở hiện tại và thực trạng nhà ở.
              </p>
              {summary}

                {ekycIncomplete && (
                  <Alert variant="warning">
                    Chưa đủ dữ liệu eKYC để tạo hồ sơ.{' '}
                    <button type="button" className="font-semibold underline" onClick={() => navigate('verify-identity')}>
                      Xác minh danh tính
                    </button>
                  </Alert>
                )}

                <FormField label="Dự án nhà ở *" htmlFor="projectId">
                  <Select id="projectId" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} required>
                    <option value="">{projects.length ? 'Chọn dự án' : 'Chưa có dự án'}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.availableUnits != null ? ` — còn ${p.availableUnits} căn` : ''}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Họ và tên (eKYC) *" htmlFor="fullName">
                    <Input
                      id="fullName"
                      value={form.fullName}
                      readOnly
                      className={ekycInputClass}
                      title="Lấy từ eKYC — không thể sửa tay"
                    />
                  </FormField>
                  <FormField label="Số CCCD (eKYC) *" htmlFor="citizenId">
                    <Input
                      id="citizenId"
                      value={form.citizenId}
                      readOnly
                      className={`${ekycInputClass} font-mono`}
                      title="Lấy từ eKYC — không thể sửa tay"
                    />
                  </FormField>
                  {dateOfBirthLabel && (
                    <FormField label="Ngày sinh (eKYC)" htmlFor="dateOfBirth">
                      <Input id="dateOfBirth" value={dateOfBirthLabel} readOnly className={ekycInputClass} />
                    </FormField>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Nghề nghiệp" htmlFor="occupation">
                    <Input id="occupation" value={form.occupation} onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))} maxLength={200} />
                  </FormField>
                  <FormField label="Nơi làm việc" htmlFor="workPlace">
                    <Input id="workPlace" value={form.workPlace} onChange={(e) => setForm((f) => ({ ...f, workPlace: e.target.value }))} maxLength={500} />
                  </FormField>
                  <FormField label="Thu nhập hàng tháng (VNĐ) *" htmlFor="monthlyIncome">
                    <Input id="monthlyIncome" type="number" min={0} step={1000} value={form.monthlyIncome} onChange={(e) => setForm((f) => ({ ...f, monthlyIncome: e.target.value }))} placeholder="Ví dụ: 12000000" required />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Thực trạng nhà ở *" htmlFor="housingStatus">
                    <Select
                      id="housingStatus"
                      value={form.housingStatus}
                      onChange={(e) => {
                        const next = e.target.value as typeof form.housingStatus
                        setForm((f) => ({
                          ...f,
                          housingStatus: next,
                          averageHousingAreaPerPerson:
                            next === 'SMALL_HOUSE' ? f.averageHousingAreaPerPerson : '',
                        }))
                      }}
                      required
                    >
                      {Object.entries(HOUSING_STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Tình trạng hôn nhân *" htmlFor="maritalStatus">
                    <Select
                      id="maritalStatus"
                      value={form.maritalStatus}
                      onChange={(e) => {
                        const next = e.target.value as typeof form.maritalStatus
                        setForm((f) => ({
                          ...f,
                          maritalStatus: next,
                          spouseMonthlyIncome: next === 'MARRIED' ? f.spouseMonthlyIncome : '',
                        }))
                      }}
                      required
                    >
                      {MARITAL_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                  </FormField>
                  {isMarried && (
                    <FormField label="Thu nhập vợ/chồng (VNĐ) *" htmlFor="spouseMonthlyIncome">
                      <Input
                        id="spouseMonthlyIncome"
                        type="number"
                        min={0}
                        step={1000}
                        value={form.spouseMonthlyIncome}
                        onChange={(e) => setForm((f) => ({ ...f, spouseMonthlyIncome: e.target.value }))}
                        placeholder="Ví dụ: 8000000"
                        required
                      />
                    </FormField>
                  )}
                </div>

                <FormField label="Nơi ở hiện tại *" htmlFor="currentResidence">
                  <Input id="currentResidence" value={form.currentResidence} onChange={(e) => setForm((f) => ({ ...f, currentResidence: e.target.value }))} maxLength={500} required />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Địa chỉ đang sinh sống (có thể khác thường trú trên CCCD).
                  </p>
                </FormField>

                <FormField label="Địa chỉ thường trú / tạm trú (eKYC) *" htmlFor="permanentAddress">
                  <Input
                    id="permanentAddress"
                    value={form.permanentAddress}
                    readOnly
                    className={ekycInputClass}
                    title="Lấy từ eKYC — không thể sửa tay"
                  />
                </FormField>

                {form.housingStatus === 'SMALL_HOUSE' && (
                  <FormField label="Diện tích bình quân đầu người (m²) *" htmlFor="averageHousingAreaPerPerson">
                    <Input
                      id="averageHousingAreaPerPerson"
                      type="number"
                      min={0.1}
                      max={14.99}
                      step={0.1}
                      value={form.averageHousingAreaPerPerson}
                      onChange={(e) => setForm((f) => ({ ...f, averageHousingAreaPerPerson: e.target.value }))}
                      placeholder="Ví dụ: 12.5 (phải dưới 15)"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Chỉ khai khi có nhà thuộc sở hữu và diện tích bình quân &lt; 15 m²/người (Đ29.2).
                    </p>
                    {form.averageHousingAreaPerPerson.trim() !== '' && !isValidSmallHouseArea(form.averageHousingAreaPerPerson) && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Diện tích phải lớn hơn 0 và nhỏ hơn 15 m²/người.
                      </p>
                    )}
                  </FormField>
                )}

                <div className="flex flex-wrap justify-between gap-2 pt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Nháp sẽ được tạo sau khi chọn nhóm đối tượng (bước 3).
                  </span>
                  <Button type="button" variant="accent" disabled={!step1Ready || isBusy || ekycIncomplete} onClick={() => goNextFromStep1()}>
                    Tiếp tục <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
          </motion.section>
        )}

        {step === 2 && (
          <motion.section key="s2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
            <div className="glass-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Bước 2 — Hộ gia đình</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Khai số thành viên và quan hệ trong hộ. Dữ liệu được gửi kèm khi tạo hồ sơ qua trường <code>householdMembers[]</code>.
              </p>
                <FormField label="Số thành viên thêm (ngoài bạn) *" htmlFor="householdSize">
                  <Input
                    id="householdSize"
                    type="number"
                    min={0}
                    max={20}
                    value={householdSize}
                    onChange={(e) => setHouseholdSize(e.target.value)}
                    placeholder="0 nếu sống một mình"
                    required
                  />
                </FormField>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tổng người trong hộ = 1 (bạn) + số thành viên thêm. Độc thân có thể để 0.
                </p>

                <div className="space-y-3">
                  {household.map((m, idx) => (
                    <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Thành viên #{idx + 1}</p>
                        <button type="button" onClick={() => removeMember(m.id)} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-500 dark:hover:bg-slate-700" aria-label="Xóa thành viên">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <FormField label="Họ tên *" htmlFor={`m-name-${m.id}`}>
                          <Input id={`m-name-${m.id}`} value={m.fullName} onChange={(e) => updateMember(m.id, { fullName: e.target.value })} maxLength={100} required />
                        </FormField>
                        <FormField label="Quan hệ *" htmlFor={`m-rel-${m.id}`}>
                          <Select id={`m-rel-${m.id}`} value={m.relationship} onChange={(e) => updateMember(m.id, { relationship: e.target.value })} required>
                            <option value="">— Chọn —</option>
                            {HOUSEHOLD_RELATIONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </Select>
                        </FormField>
                        <FormField label="Năm sinh" htmlFor={`m-year-${m.id}`}>
                          <Input id={`m-year-${m.id}`} type="date" value={m.dateOfBirth} onChange={(e) => updateMember(m.id, { dateOfBirth: e.target.value })} />
                        </FormField>
                        <FormField label="CCCD thành viên *" htmlFor={`m-cid-${m.id}`}>
                          <Input id={`m-cid-${m.id}`} value={m.citizenId} onChange={(e) => updateMember(m.id, { citizenId: e.target.value })} maxLength={15} placeholder="Bắt buộc để quét trùng" required />
                        </FormField>
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addHouseholdMember}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm thành viên
                  </Button>
                </div>

                <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <Button type="button" variant="outline" disabled={isBusy} onClick={() => setStep(1)}>← Quay lại</Button>
                  <Button type="button" variant="accent" disabled={!step2Ready || isBusy} onClick={goNextFromStep2}>
                    Tiếp tục <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
          </motion.section>
        )}

        {step === 3 && (
          <motion.section key="s3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
            <div className="glass-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <HomeIcon className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Bước 3 — Xác nhận thông tin</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Kiểm tra lại nhóm đối tượng và lịch sử hợp đồng nhà ở xã hội.
              </p>
                <FormField label="Nhóm đối tượng ưu tiên *" htmlFor="priorityGroup">
                  <Select id="priorityGroup" value={form.priorityGroup} onChange={(e) => setForm((f) => ({ ...f, priorityGroup: e.target.value }))} required>
                    <option value="">— Chọn nhóm đối tượng —</option>
                    {PRIORITY_GROUPS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </Select>
                </FormField>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={hasPriorContract} onChange={(e) => setHasPriorContract(e.target.checked)} />
                    <span>Đã từng ký hợp đồng mua nhà ở xã hội trước đây?</span>
                  </label>
                  <FormField label={hasPriorContract ? 'Ghi chú lịch sử *' : 'Ghi chú lịch sử'} htmlFor="priorNote">
                    <Input id="priorNote" value={priorContractNote} onChange={(e) => setPriorContractNote(e.target.value)} placeholder="Ví dụ: chưa từng" maxLength={500} disabled={!hasPriorContract} required={hasPriorContract} />
                  </FormField>
                </div>

                <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <Button type="button" variant="outline" disabled={isBusy} onClick={() => setStep(2)}>← Quay lại</Button>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled={!step3Ready || isBusy} onClick={() => void handleSaveDraft()}>
                      {busy === 'create' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu…</> : 'Chỉ lưu nháp'}
                    </Button>
                    <Button type="button" variant="accent" disabled={!step3Ready || isBusy} onClick={() => void goNextFromStep3()}>
                      {busy === 'create'
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu nháp…</>
                        : <>Lưu nháp &amp; tải giấy tờ <ArrowRight className="ml-1 h-4 w-4" /></>}
                    </Button>
                  </div>
                </div>
              </div>
          </motion.section>
        )}

        {step === 4 && (
          <motion.section key="s4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
            <div className="glass-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <FileCheck2 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Bước 4 — Tài liệu đính kèm</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Upload PDF bắt buộc theo nhóm đối tượng (tối đa 10 MB / file). Cần {requiredDocs.length} loại giấy tờ.
              </p>
                {summary}
                {!draftId && (
                  <Alert variant="warning">Bạn cần lưu nháp hồ sơ trước khi upload tài liệu.</Alert>
                )}

                <div className="space-y-3">
                  {requiredDocs.map((key) => {
                    const doc = docs[key]
                    return (
                      <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{DOC_TYPE_LABELS[key]}</p>
                        <div className="mt-2">
                          <FileDropzone
                            disabled={isBusy || !draftId}
                            label={`Kéo thả PDF «${DOC_TYPE_LABELS[key]}» hoặc bấm chọn`}
                            onFile={(f) => handleFilePick(key, f)}
                          />
                        </div>
                        {doc && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{doc.file.name}</span>
                            <span className="text-slate-500 dark:text-slate-400">({formatBytes(doc.file.size)})</span>
                            {doc.state === 'uploading' && <span className="inline-flex items-center gap-1 text-primary dark:text-accent"><Loader2 className="h-3 w-3 animate-spin" /> Đang tải lên…</span>}
                            {doc.state === 'uploaded' && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Đã tải lên</span>}
                            {doc.state === 'error' && <span className="text-red-600 dark:text-red-400">{doc.error || 'Lỗi upload'}</span>}
                            <button type="button" onClick={() => setDocs((d) => ({ ...d, [key]: null }))} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-500 dark:hover:bg-slate-700" aria-label="Xóa file">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={isBusy} onClick={() => void handleUploadAll()}>
                    {busy === 'upload-all' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tải lên…</> : <><Upload className="mr-2 h-4 w-4" /> Tải lên tất cả</>}
                  </Button>
                </div>

                <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <Button type="button" variant="outline" disabled={isBusy} onClick={() => setStep(3)}>← Quay lại</Button>
                  <Button type="button" variant="accent" disabled={!allDocsUploaded || (draftStatus !== 'DRAFT' && draftStatus !== 'NEED_MORE_DOCUMENTS') || isBusy} onClick={() => {
                    setCompletedSteps((prev) => (prev.includes(4) ? prev : [...prev, 4]))
                    setStep(5)
                  }}>
                    Tiếp tục rà soát <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.section>
          )}

          {step === 5 && (
          <motion.section key="s5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
            <div className="glass-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Bước 5 — Rà soát trước khi nộp</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Kiểm tra toàn bộ thông tin. Sau khi nộp, hồ sơ sẽ chuyển sang trạng thái <strong>SUBMITTED</strong>.
              </p>
              <Alert variant="info">
                <strong>Quy trình tiếp theo:</strong> Sau khi nộp, CĐT tiếp nhận &amp; thẩm định → có thể yêu cầu bổ sung hoặc chuyển Sở Xây dựng → Sở phê duyệt → chờ bốc thăm/ký hợp đồng (nếu trúng).
              </Alert>

              <div className="grid gap-4 text-sm lg:grid-cols-2">
                <section>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Cá nhân</p>
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="grid gap-2 lg:grid-cols-2">
                      <p><span className="text-slate-500">Dự án:</span> <strong>{projects.find((p) => p.id === form.projectId)?.name ?? '—'}</strong></p>
                      <p><span className="text-slate-500">Họ tên:</span> {form.fullName || '—'}</p>
                      <p><span className="text-slate-500">CCCD:</span> {form.citizenId || '—'}</p>
                      <p><span className="text-slate-500">Nghề nghiệp:</span> {form.occupation || '—'}</p>
                      <p><span className="text-slate-500">Nơi làm việc:</span> {form.workPlace || '—'}</p>
                      <p><span className="text-slate-500">Nơi ở hiện tại:</span> {form.currentResidence || '—'}</p>
                      <p><span className="text-slate-500">Thường trú:</span> {form.permanentAddress || '—'}</p>
                      <p><span className="text-slate-500">Thực trạng nhà:</span> {HOUSING_STATUS_LABELS[form.housingStatus] ?? '—'}</p>
                      <p><span className="text-slate-500">Hôn nhân:</span> {MARITAL_STATUSES.find((s) => s.value === form.maritalStatus)?.label ?? (form.maritalStatus || '—')}</p>
                      <p><span className="text-slate-500">Thu nhập/tháng:</span> {form.monthlyIncome ? `${Number(form.monthlyIncome).toLocaleString('vi-VN')} đ` : '—'}</p>
                      {form.maritalStatus === 'MARRIED' && (
                        <p><span className="text-slate-500">Thu nhập vợ/chồng:</span> {form.spouseMonthlyIncome ? `${Number(form.spouseMonthlyIncome).toLocaleString('vi-VN')} đ` : '—'}</p>
                      )}
                      {form.housingStatus === 'SMALL_HOUSE' && (
                        <p><span className="text-slate-500">Diện tích TB/người:</span> {form.averageHousingAreaPerPerson || '—'} m²</p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Hộ gia đình & Đối tượng</p>
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Nhóm đối tượng:</p>
                      <p className="font-medium">{PRIORITY_GROUPS.find((g) => g.value === form.priorityGroup)?.label ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Tổng người trong hộ:</p>
                      <p className="font-medium">{1 + (Number(householdSize) || 0)} (bạn + {householdSize || 0} thành viên thêm)</p>
                    </div>
                    {household.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Thành viên:</p>
                        <ul className="space-y-1">
                          {household.map((m, idx) => (
                            <li key={m.id} className="text-sm">
                              <strong>#{idx + 1}</strong> {m.fullName} — {HOUSEHOLD_RELATIONS.find((r) => r.value === m.relationship)?.label ?? m.relationship}
                              {m.citizenId ? `, CCCD: ${m.citizenId}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {hasPriorContract && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">Đã từng ký HĐ: {priorContractNote}</p>
                    )}
                  </div>
                </section>
              </div>

              <section>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Tài liệu đính kèm</p>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {requiredDocs.map((key) => {
                      const d = docs[key]
                      return (
                        <li key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40">
                          <span className="text-sm">{DOC_TYPE_LABELS[key]}</span>
                          {d?.state === 'uploaded' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </section>

              <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <Button type="button" variant="outline" disabled={isBusy} onClick={() => setStep(4)}>← Quay lại</Button>
                <Button
                  type="button"
                  variant="accent"
                  className="bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_14px_-2px_rgba(16,185,129,0.45)] dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  disabled={!commitment || !allDocsUploaded || (draftStatus !== 'DRAFT' && draftStatus !== 'NEED_MORE_DOCUMENTS') || isBusy}
                  onClick={() => void handleSubmit()}
                >
                  {busy === 'submit' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang nộp…</> : 'Nộp hồ sơ'}
                </Button>
              </div>

              <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/40">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={commitment}
                  onChange={(e) => setCommitment(e.target.checked)}
                />
                <span>
                  Tôi cam kết thông tin và tài liệu đã cung cấp là chính xác. Sau khi nộp, hồ sơ sẽ được đóng băng để thẩm định.
                </span>
              </label>

              {draftId && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mã hồ sơ: <span className="font-mono">{draftId}</span> · Trạng thái hiện tại: <strong>{draftStatus}</strong>
                </p>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </fieldset>

    {msg && (
      <Alert variant={msg.type === 'error' ? 'error' : msg.type === 'warning' ? 'warning' : msg.type === 'info' ? 'info' : 'success'}>
        {msg.text}
      </Alert>
    )}
  </div>
)
}
