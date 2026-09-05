import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
  Loader2,
  Upload,
  UserCheck,
  X,
  ExternalLink,
} from 'lucide-react'
import { housingApplicationsApi } from '@/api/housing-applications'
import { housingProjectsApi } from '@/api/housing-projects'
import { usersApi } from '@/api/users'
import { FileDropzone } from '@/components/shared/file-dropzone'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Select } from '@/components/ui/input'
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
import type { CreateApplicationDto } from '@/types'

// Wizard 3 bước — dùng API prefill để tự fill thông tin đã kê khai
// Bước 1: Chọn dự án + xem lại thông tin (prefilled) + chọn nhóm đối tượng
// Bước 2: Tài liệu (vault docs tự động check)
// Bước 3: Rà soát & Nộp

type Step = 1 | 2 | 3

interface DocUpload {
  type: string
  file?: File
  documentId?: string
  state: 'vault' | 'pending' | 'uploading' | 'uploaded' | 'error'
  fileName?: string
  fileUrl?: string
  error?: string
}

interface PrefillData {
  applicantId?: string
  fullName?: string | null
  citizenId?: string | null
  phoneNumber?: string | null
  dateOfBirth?: string | null
  isEkycVerified?: boolean
  occupation?: string | null
  workPlace?: string | null
  currentResidence?: string | null
  permanentAddress?: string | null
  housingStatus?: string | null
  maritalStatus?: string | null
  monthlyIncome?: number | null
  spouseMonthlyIncome?: number | null
  averageHousingAreaPerPerson?: number | null
  priorityGroup?: string | null
  priorityGroupLabel?: string | null
  householdMembers?: Array<{
    fullName: string
    relationship: string
    citizenId?: string | null
    dateOfBirth?: string | null
    occupation?: string | null
    monthlyIncome?: number | string | null
    isDependent?: boolean | null
    dependentReason?: string | null
    hasMeritService?: boolean | null
    meritDetails?: string | null
    note?: string | null
  }> | null
  availableVaultDocuments?: Array<{
    documentId: string
    documentType: string
    documentTypeLabel?: string | null
    fileName?: string | null
    fileUrl?: string | null
  }> | null
}

// maritals: mã BE
const MARITAL_LABELS: Record<string, string> = {
  SINGLE: 'Độc thân',
  MARRIED: 'Đã kết hôn',
  DIVORCED: 'Ly hôn',
  WIDOWED: 'Góa',
}

/** Nhóm đối tượng ưu tiên — đồng bộ với BE (PriorityGroupConstants.cs Đ76 Luật Nhà ở 2023). */
const PRIORITY_GROUPS = [
  { value: 'MERIT_PERSON', label: 'Người có công với cách mạng' },
  { value: 'RURAL_POOR', label: 'Hộ nghèo nông thôn' },
  { value: 'RURAL_NEAR_POOR', label: 'Hộ cận nghèo nông thôn' },
  { value: 'URBAN_POOR', label: 'Hộ nghèo đô thị' },
  { value: 'URBAN_NEAR_POOR', label: 'Hộ cận nghèo đô thị' },
  { value: 'LOW_INCOME_URBAN', label: 'Người thu nhập thấp tại đô thị' },
  { value: 'WORKER', label: 'Công nhân, người lao động tại DN/HTX/KCN' },
  { value: 'MILITARY_PERSONNEL', label: 'Lực lượng vũ trang, cơ yếu' },
  { value: 'CIVIL_SERVANT', label: 'Cán bộ, công chức, viên chức' },
  { value: 'PUBLIC_HOUSING_RETURN', label: 'Đối tượng trả lại nhà công vụ' },
  { value: 'LAND_RECOVERY_AFFECTED', label: 'Bị thu hồi đất / giải tỏa nhà ở' },
]

/** Quan hệ trong hộ — mã BE */
const RELATIONSHIP_LABELS: Record<string, string> = {
  SPOUSE: 'Vợ / Chồng',
  CHILD: 'Con',
  PARENT: 'Cha / Mẹ',
  SIBLING: 'Anh / Chị / Em',
  GRANDPARENT: 'Ông / Bà',
  GRANDCHILD: 'Cháu',
  OTHER: 'Khác',
}

const STEPS: { id: Step; label: string; icon: typeof UserCheck }[] = [
  { id: 1, label: 'Xác nhận', icon: UserCheck },
  { id: 2, label: 'Tài liệu', icon: FileCheck2 },
  { id: 3, label: 'Nộp hồ sơ', icon: CheckCircle2 },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function extractPrefill(data: unknown): PrefillData {
  if (!data || typeof data !== 'object') return {}
  const o = data as Record<string, unknown>
  const payload = (o.data ?? o.Data ?? o) as Record<string, unknown>
  return payload as PrefillData
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}:</span>
      <span className="font-medium text-slate-900 dark:text-white">
        {value || <span className="font-normal italic text-slate-400">Chưa kê khai</span>}
      </span>
    </div>
  )
}

function Stepper({ step, completedSteps }: { step: Step; completedSteps: Step[] }) {
  return (
    <ol className="mb-6 grid grid-cols-3 gap-1.5">
      {STEPS.map((s) => {
        const state = step === s.id ? 'doing' : completedSteps.includes(s.id) ? 'done' : 'todo'
        const Icon = s.icon
        return (
          <li
            key={s.id}
            className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition ${state === 'doing'
                ? 'border-primary bg-primary/10 text-primary dark:bg-accent/10'
                : state === 'done'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
              }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full ${state === 'doing'
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
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>(1)
  const [completedSteps, setCompletedSteps] = useState<Step[]>([])
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState('')
  const [activeBlock, setActiveBlock] = useState<string | null>(null)

  // Dữ liệu prefill từ BE
  const [prefill, setPrefill] = useState<PrefillData | null>(null)
  const [prefillLoading, setPrefillLoading] = useState(true)
  const [prefillError, setPrefillError] = useState(false)

  // Chỉ cho phép sửa 2 trường trong wizard
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedPriorityGroup, setSelectedPriorityGroup] = useState('')
  const [hasPriorContract, setHasPriorContract] = useState(false)
  const [priorContractNote, setPriorContractNote] = useState('')

  const [projects, setProjects] = useState<{ id: string; name: string; availableUnits?: number }[]>([])
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<string>('DRAFT')
  const [docs, setDocs] = useState<Record<string, DocUpload | null>>({})
  const [commitment, setCommitment] = useState(false)

  const isBusy = busy.length > 0

  // Kiểm tra chặn hồ sơ hiện có
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
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
              : 'Bạn đang có hồ sơ đang xử lý. Vui lòng chờ hồ sơ hoàn tất trước khi tạo hồ sơ mới.',
          )
        } else {
          setActiveBlock(null)
        }
      } catch {
        try {
          const data = await housingApplicationsApi.activeCheck()
          if (cancelled) return
          const has =
            Boolean((data as { hasActiveApplication?: boolean })?.hasActiveApplication) ||
            Boolean((data as { HasActiveApplication?: boolean })?.HasActiveApplication)
          if (has) setActiveBlock((data as { message?: string })?.message || 'Bạn đang có hồ sơ khác đang hoạt động.')
        } catch { /* ignore */ }
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Load prefill
  useEffect(() => {
    setPrefillLoading(true)
    void usersApi.getApplicationPrefill()
      .then((data) => {
        const p = extractPrefill(data)
        setPrefill(p)
        if (p.priorityGroup) setSelectedPriorityGroup(p.priorityGroup)
        setPrefillLoading(false)
      })
      .catch(() => {
        setPrefillError(true)
        setPrefillLoading(false)
      })
  }, [])

  // Load danh sách dự án
  useEffect(() => {
    void housingProjectsApi.list().then((data) => {
      const items = extractProjects(data)
        .filter((p) => p.id)
        .map((p) => ({ id: p.id!, name: p.projectName || p.name || 'Dự án', availableUnits: p.availableUnits }))
      setProjects(items)
      const presetId = sessionStorage.getItem('createApplicationProjectId')
      if (presetId && items.some((p) => p.id === presetId)) {
        setSelectedProjectId(presetId)
        sessionStorage.removeItem('createApplicationProjectId')
      } else if (items.length === 1) {
        setSelectedProjectId(items[0].id)
      }
    }).catch(() => setProjects([]))
  }, [])

  // Cập nhật docs khi đổi nhóm đối tượng hoặc khi prefill load xong
  const requiredDocs = useMemo(
    () => getRequiredDocsForPriorityGroup(selectedPriorityGroup),
    [selectedPriorityGroup],
  )
  useEffect(() => {
    setDocs((prev) => {
      const next: Record<string, DocUpload | null> = {}
      for (const t of requiredDocs) {
        const vaultDoc = prefill?.availableVaultDocuments?.find(d => d.documentType === t)
        if (vaultDoc) {
          next[t] = {
            type: t,
            documentId: vaultDoc.documentId,
            state: 'vault',
            fileName: vaultDoc.fileName ?? undefined,
            fileUrl: vaultDoc.fileUrl ?? undefined,
          }
        } else {
          next[t] = prev[t] ?? null
        }
      }
      return next
    })
  }, [requiredDocs, prefill])

  // Kiểm tra thiếu thông tin
  const missingFields = useMemo(() => {
    if (!prefill) return []
    const missing: string[] = []
    if (!prefill.occupation?.trim()) missing.push('Nghề nghiệp')
    if (!prefill.workPlace?.trim()) missing.push('Nơi làm việc')
    if (!prefill.currentResidence?.trim()) missing.push('Nơi ở hiện tại')
    if (!prefill.housingStatus) missing.push('Tình trạng nhà ở')
    if (!prefill.maritalStatus) missing.push('Tình trạng hôn nhân')
    if (prefill.monthlyIncome == null) missing.push('Thu nhập hàng tháng')
    return missing
  }, [prefill])

  const allDocsReady = requiredDocs.every((k) => docs[k]?.state === 'uploaded' || docs[k]?.state === 'vault')

  const buildCreateBody = (): CreateApplicationDto | null => {
    if (!selectedProjectId || !selectedPriorityGroup || !prefill) return null
    return {
      projectId: selectedProjectId,
      fullName: prefill.fullName?.trim() ?? '',
      citizenId: prefill.citizenId?.trim() ?? '',
      occupation: prefill.occupation?.trim() ?? null,
      workPlace: prefill.workPlace?.trim() ?? null,
      currentResidence: prefill.currentResidence?.trim() ?? '',
      permanentAddress: prefill.permanentAddress?.trim() ?? '',
      housingStatus: prefill.housingStatus ?? 'NO_HOUSE',
      maritalStatus: prefill.maritalStatus ?? 'SINGLE',
      monthlyIncome: prefill.monthlyIncome ?? null,
      spouseMonthlyIncome: prefill.spouseMonthlyIncome ?? null,
      averageHousingAreaPerPerson: prefill.averageHousingAreaPerPerson ?? null,
      priorityGroup: selectedPriorityGroup,
      householdMembers: prefill.householdMembers && prefill.householdMembers.length > 0
        ? prefill.householdMembers.map(m => ({
          fullName: m.fullName,
          relationship: m.relationship,
          dateOfBirth: m.dateOfBirth ?? null,
          citizenId: m.citizenId ?? null,
          occupation: m.occupation ?? null,
          monthlyIncome: m.monthlyIncome != null ? Number(m.monthlyIncome) : null,
          isDependent: Boolean(m.isDependent),
          dependentReason: m.dependentReason ?? null,
          hasMeritService: Boolean(m.hasMeritService),
          meritDetails: m.meritDetails ?? null,
          note: m.note ?? null,
        }))
        : null,
    }
  }

  const createDraft = async (): Promise<string | null> => {
    const body = buildCreateBody()
    if (!body) {
      setMsg({ type: 'error', text: 'Thiếu thông tin để tạo hồ sơ. Kiểm tra lại dự án và nhóm đối tượng.' })
      return null
    }
    setBusy('create')
    setMsg(null)
    try {
      if (draftId) {
        const updateBody = {
          fullName: body.fullName, citizenId: body.citizenId, occupation: body.occupation,
          workPlace: body.workPlace, currentResidence: body.currentResidence,
          permanentAddress: body.permanentAddress, housingStatus: body.housingStatus,
          maritalStatus: body.maritalStatus, monthlyIncome: body.monthlyIncome,
          spouseMonthlyIncome: body.spouseMonthlyIncome,
          averageHousingAreaPerPerson: body.averageHousingAreaPerPerson,
          priorityGroup: body.priorityGroup, householdMembers: body.householdMembers,
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

  const uploadOneDoc = async (key: string, file: File, applicationId?: string | null): Promise<boolean> => {
    const id = applicationId ?? draftId
    if (!id) {
      setMsg({ type: 'error', text: 'Cần lưu nháp hồ sơ trước khi upload tài liệu.' })
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
    if (err) { setMsg({ type: 'error', text: err }); return }
    setDocs((d) => ({ ...d, [key]: { type: key, file, state: 'pending' } }))
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
      if (!entry || entry.state === 'uploaded' || entry.state === 'vault') continue
      if (entry.state === 'pending' && entry.file) {
        const res = await uploadOneDoc(key, entry.file, appId)
        if (!res) ok = false
      }
    }
    setBusy('')
    if (ok) setMsg({ type: 'success', text: 'Upload tài liệu thành công.' })
    else setMsg({ type: 'error', text: 'Một số tài liệu upload thất bại. Kiểm tra lại.' })
  }

  const handleSubmit = async () => {
    if (!draftId) { setMsg({ type: 'error', text: 'Bạn cần lưu nháp trước khi nộp.' }); return }
    if (!commitment) { setMsg({ type: 'error', text: 'Vui lòng tích cam kết thông tin chính xác trước khi nộp.' }); return }
    if (!allDocsReady) { setMsg({ type: 'error', text: `Vui lòng đảm bảo đủ ${requiredDocs.length} loại giấy tờ.` }); return }
    if (draftStatus !== 'DRAFT' && draftStatus !== 'NEED_MORE_DOCUMENTS') {
      setMsg({ type: 'warning', text: `Hồ sơ đang ở trạng thái "${draftStatus}", không thể nộp lại.` }); return
    }
    setBusy('submit')
    setMsg(null)
    try {
      const result = await housingApplicationsApi.submit(draftId) as { newStatus?: string; NewStatus?: string }
      const newStatus = result?.newStatus ?? result?.NewStatus ?? 'SUBMITTED'
      setDraftStatus(newStatus)
      setCompletedSteps((prev) => (prev.includes(3) ? prev : [...prev, 3]))
      await queryClient.invalidateQueries({ queryKey: ['dashboard-apps'] })
      await queryClient.invalidateQueries({ queryKey: ['housing-applications'] })
      setMsg({ type: 'success', text: `Nộp hồ sơ thành công (${newStatus}). Đang chuyển trang...` })
      setTimeout(() => {
        sessionStorage.setItem('applicationId', draftId)
        navigate('application-detail')
      }, 900)
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy('')
    }
  }

  const goNextFromStep1 = async () => {
    if (!selectedProjectId) { setMsg({ type: 'error', text: 'Vui lòng chọn dự án.' }); return }
    if (!selectedPriorityGroup) { setMsg({ type: 'error', text: 'Vui lòng chọn nhóm đối tượng ưu tiên.' }); return }
    if (missingFields.length > 0) {
      setMsg({ type: 'error', text: `Hồ sơ còn thiếu: ${missingFields.join(', ')}. Vui lòng kê khai tại trang Hồ sơ cá nhân.` })
      return
    }
    setMsg(null)
    setCompletedSteps((prev) => (prev.includes(1) ? prev : [...prev, 1]))
    setStep(2)
  }

  const goNextFromStep2 = async () => {
    const id = await createDraft()
    if (!id) return
    // Upload file mới (vault docs không cần upload lại)
    const pendingKeys = requiredDocs.filter(k => docs[k]?.state === 'pending')
    if (pendingKeys.length > 0) {
      setBusy('upload-all')
      for (const key of pendingKeys) {
        const entry = docs[key]
        if (entry?.file) await uploadOneDoc(key, entry.file, id)
      }
      setBusy('')
    }
    setCompletedSteps((prev) => (prev.includes(2) ? prev : [...prev, 2]))
    setStep(3)
  }


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
        <Stepper step={step} completedSteps={completedSteps} />

        <AnimatePresence mode="wait">
          {/* ─── BƯỚC 1: XEM LẠI THÔNG TIN ──────────────────────────────── */}
          {step === 1 && (
            <motion.section key="s1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
              <div className="glass-card p-5 sm:p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold">Bước 1 — Xác nhận thông tin & chọn dự án</h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Thông tin dưới đây được lấy từ hồ sơ kê khai của bạn. Nếu cần chỉnh sửa, vui lòng cập nhật tại trang{' '}
                  <button type="button" className="font-semibold text-primary underline" onClick={() => navigate('profile')}>
                    Hồ sơ cá nhân <ExternalLink className="inline h-3 w-3" />
                  </button>
                </p>

                {prefillLoading && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-slate-500">Đang tải thông tin...</span>
                  </div>
                )}

                {prefillError && (
                  <Alert variant="error">Không tải được thông tin kê khai. Vui lòng thử lại hoặc kiểm tra kết nối.</Alert>
                )}

                {!prefillLoading && prefill && (
                  <>
                    {missingFields.length > 0 && (
                      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Chưa kê khai đủ thông tin</p>
                          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                            Còn thiếu: <strong>{missingFields.join(', ')}</strong>.{' '}
                            <button type="button" className="font-semibold underline" onClick={() => navigate('profile')}>
                              Kê khai ngay →
                            </button>
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Thông tin cá nhân (chỉ đọc)</p>
                      <div className="grid gap-2 sm:grid-cols-2 text-sm">
                        <SummaryRow label="Họ tên" value={prefill.fullName} />
                        <SummaryRow label="CCCD" value={prefill.citizenId} />
                        <SummaryRow label="Địa chỉ thường trú" value={prefill.permanentAddress} />
                        <SummaryRow label="Nơi ở hiện tại" value={prefill.currentResidence} />
                        <SummaryRow label="Nghề nghiệp" value={prefill.occupation} />
                        <SummaryRow label="Nơi làm việc" value={prefill.workPlace} />
                        <SummaryRow label="Thu nhập/tháng" value={prefill.monthlyIncome != null ? `${Number(prefill.monthlyIncome).toLocaleString('vi-VN')} đ` : null} />
                        <SummaryRow label="Tình trạng hôn nhân" value={prefill.maritalStatus ? MARITAL_LABELS[prefill.maritalStatus] : null} />
                        {prefill.maritalStatus === 'MARRIED' && (
                          <SummaryRow label="Thu nhập vợ/chồng" value={prefill.spouseMonthlyIncome != null ? `${Number(prefill.spouseMonthlyIncome).toLocaleString('vi-VN')} đ` : null} />
                        )}
                        <SummaryRow label="Tình trạng nhà ở" value={prefill.housingStatus ? (HOUSING_STATUS_LABELS[prefill.housingStatus] ?? prefill.housingStatus) : null} />
                        {prefill.housingStatus === 'SMALL_HOUSE' && (
                          <SummaryRow label="Diện tích TB/người" value={prefill.averageHousingAreaPerPerson != null ? `${prefill.averageHousingAreaPerPerson} m²` : null} />
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Hộ gia đình</p>
                      {(!prefill.householdMembers || prefill.householdMembers.length === 0) ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">Chưa kê khai thành viên hộ gia đình.</p>
                      ) : (
                        <ul className="space-y-1">
                          {prefill.householdMembers.map((m, idx) => (
                            <li key={idx} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-white px-3 py-2 text-sm dark:bg-slate-900/50">
                              <span className="font-medium">{m.fullName}</span>
                              <span className="text-slate-500">— {RELATIONSHIP_LABELS[m.relationship] ?? m.relationship}</span>
                              {m.citizenId && <span className="font-mono text-xs text-slate-400">({m.citizenId})</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Dự án nhà ở *" htmlFor="projectId">
                        <Select id="projectId" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} required>
                          <option value="">{projects.length ? 'Chọn dự án' : 'Chưa có dự án'}</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}{p.availableUnits != null ? ` — còn ${p.availableUnits} căn` : ''}
                            </option>
                          ))}
                        </Select>
                      </FormField>

                      <FormField label="Nhóm đối tượng ưu tiên *" htmlFor="priorityGroup">
                        <Select id="priorityGroup" value={selectedPriorityGroup} onChange={(e) => setSelectedPriorityGroup(e.target.value)} required>
                          <option value="">— Chọn nhóm đối tượng —</option>
                          {PRIORITY_GROUPS.map((g) => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                          ))}
                        </Select>
                        {prefill.priorityGroup && selectedPriorityGroup === prefill.priorityGroup && (
                          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">✓ Đã điền từ hồ sơ kê khai</p>
                        )}
                      </FormField>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={hasPriorContract} onChange={(e) => setHasPriorContract(e.target.checked)} />
                        <span>Đã từng ký hợp đồng mua nhà ở xã hội trước đây?</span>
                      </label>
                      {hasPriorContract && (
                        <FormField label="Ghi chú lịch sử *" htmlFor="priorNote">
                          <input
                            id="priorNote"
                            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900/80"
                            value={priorContractNote}
                            onChange={(e) => setPriorContractNote(e.target.value)}
                            placeholder="Ví dụ: đã ký hợp đồng năm 2020 tại..."
                            maxLength={500}
                          />
                        </FormField>
                      )}
                    </div>
                  </>
                )}

                <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-700">
                  <Button
                    type="button"
                    variant="accent"
                    disabled={prefillLoading || isBusy || !selectedProjectId || !selectedPriorityGroup}
                    onClick={() => void goNextFromStep1()}
                  >
                    Tiếp tục <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.section>
          )}

          {/* ─── BƯỚC 2: TÀI LIỆU ───────────────────────────────────────── */}
          {step === 2 && (
            <motion.section key="s2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
              <div className="glass-card p-5 sm:p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold">Bước 2 — Tài liệu đính kèm</h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Cần {requiredDocs.length} loại giấy tờ. Tài liệu đã tải lên trong hồ sơ cá nhân sẽ được{' '}
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">tự động sử dụng</span>.
                </p>

                <div className="space-y-3">
                  {requiredDocs.map((key) => {
                    const doc = docs[key]
                    const isVault = doc?.state === 'vault'
                    const isUploaded = doc?.state === 'uploaded'
                    const isPending = doc?.state === 'pending'
                    return (
                      <div
                        key={key}
                        className={`rounded-xl border p-4 transition-colors ${isVault || isUploaded
                            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                            : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{DOC_TYPE_LABELS[key] ?? key}</p>
                          {(isVault || isUploaded) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {isVault ? 'Có sẵn từ hồ sơ' : 'Đã tải lên'}
                            </span>
                          )}
                        </div>

                        {isVault ? (
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono truncate">{doc.fileName ?? 'Tài liệu đã lưu'}</span>
                            {doc.fileUrl && (
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline shrink-0">
                                Xem <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1">
                            <FileDropzone
                              disabled={isBusy}
                              label="Kéo thả PDF hoặc bấm chọn"
                              onFile={(f) => handleFilePick(key, f)}
                            />
                            {isPending && doc.file && (
                              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                                <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{doc.file.name} ({formatBytes(doc.file.size)})</span>
                                <button type="button" onClick={() => setDocs((d) => ({ ...d, [key]: null }))} className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-red-500 dark:hover:bg-slate-700">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                            {doc?.state === 'uploading' && <p className="mt-1 text-xs text-primary animate-pulse">Đang tải lên...</p>}
                            {doc?.state === 'error' && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{doc.error || 'Lỗi upload'}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {requiredDocs.some(k => docs[k]?.state === 'pending') && (
                  <Button type="button" variant="outline" disabled={isBusy} onClick={() => void handleUploadAll()}>
                    {busy === 'upload-all' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tải lên…</> : <><Upload className="mr-2 h-4 w-4" />Tải lên file mới</>}
                  </Button>
                )}

                <div className="flex justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
                  <Button type="button" variant="outline" disabled={isBusy} onClick={() => setStep(1)}>← Quay lại</Button>
                  <Button
                    type="button"
                    variant="accent"
                    disabled={!allDocsReady || isBusy}
                    onClick={() => void goNextFromStep2()}
                  >
                    {isBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xử lý…</> : <>Tiếp tục rà soát <ArrowRight className="ml-1 h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            </motion.section>
          )}

          {/* ─── BƯỚC 3: RÀ SOÁT & NỘP ─────────────────────────────────── */}
          {step === 3 && (
            <motion.section key="s3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
              <div className="glass-card p-5 sm:p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold">Bước 3 — Rà soát & Nộp hồ sơ</h2>
                </div>
                <Alert variant="info">
                  <strong>Quy trình tiếp theo:</strong> Sau khi nộp, CĐT tiếp nhận &amp; thẩm định → có thể yêu cầu bổ sung hoặc chuyển Sở Xây dựng → Sở phê duyệt → chờ bốc thăm/ký hợp đồng (nếu trúng).
                </Alert>

                <div className="grid gap-4 text-sm lg:grid-cols-2">
                  <section>
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Thông tin cá nhân</p>
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 grid gap-2">
                      <p><span className="text-slate-500">Dự án:</span> <strong>{projects.find(p => p.id === selectedProjectId)?.name ?? '—'}</strong></p>
                      <p><span className="text-slate-500">Họ tên:</span> {prefill?.fullName || '—'}</p>
                      <p><span className="text-slate-500">CCCD:</span> {prefill?.citizenId || '—'}</p>
                      <p><span className="text-slate-500">Nghề nghiệp:</span> {prefill?.occupation || '—'}</p>
                      <p><span className="text-slate-500">Nơi ở hiện tại:</span> {prefill?.currentResidence || '—'}</p>
                      <p><span className="text-slate-500">Thường trú:</span> {prefill?.permanentAddress || '—'}</p>
                      <p><span className="text-slate-500">Thực trạng nhà:</span> {prefill?.housingStatus ? (HOUSING_STATUS_LABELS[prefill.housingStatus] ?? prefill.housingStatus) : '—'}</p>
                      <p><span className="text-slate-500">Hôn nhân:</span> {prefill?.maritalStatus ? (MARITAL_LABELS[prefill.maritalStatus] ?? prefill.maritalStatus) : '—'}</p>
                      <p><span className="text-slate-500">Thu nhập/tháng:</span> {prefill?.monthlyIncome != null ? `${Number(prefill.monthlyIncome).toLocaleString('vi-VN')} đ` : '—'}</p>
                    </div>
                  </section>

                  <section>
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Hộ gia đình & Đối tượng</p>
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Nhóm đối tượng:</p>
                        <p className="font-medium">{PRIORITY_GROUPS.find(g => g.value === selectedPriorityGroup)?.label ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Tổng người trong hộ:</p>
                        <p className="font-medium">{1 + (prefill?.householdMembers?.length ?? 0)} người</p>
                      </div>
                      {prefill?.householdMembers && prefill.householdMembers.length > 0 && (
                        <ul className="space-y-1">
                          {prefill.householdMembers.map((m, idx) => (
                            <li key={idx} className="text-sm">{m.fullName} — {RELATIONSHIP_LABELS[m.relationship] ?? m.relationship}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                </div>

                <section>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Tài liệu đính kèm</p>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {requiredDocs.map((key) => {
                      const d = docs[key]
                      const ok = d?.state === 'uploaded' || d?.state === 'vault'
                      return (
                        <li key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40">
                          {ok
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            : <X className="h-4 w-4 text-amber-500 shrink-0" />}
                          <span className="text-sm">{DOC_TYPE_LABELS[key] ?? key}</span>
                          {d?.state === 'vault' && <span className="text-xs text-slate-400">(từ hồ sơ)</span>}
                        </li>
                      )
                    })}
                  </ul>
                </section>

                <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/40">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary"
                    checked={commitment}
                    onChange={(e) => setCommitment(e.target.checked)}
                  />
                  <span>Tôi cam kết thông tin và tài liệu đã cung cấp là chính xác. Sau khi nộp, hồ sơ sẽ được đóng băng để thẩm định.</span>
                </label>

                {draftId && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mã hồ sơ: <span className="font-mono">{draftId}</span> · Trạng thái: <strong>{draftStatus}</strong>
                  </p>
                )}

                <div className="flex justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
                  <Button type="button" variant="outline" disabled={isBusy} onClick={() => setStep(2)}>← Quay lại</Button>
                  <Button
                    type="button"
                    variant="accent"
                    className="bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_14px_-2px_rgba(16,185,129,0.45)] dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    disabled={!commitment || !allDocsReady || (draftStatus !== 'DRAFT' && draftStatus !== 'NEED_MORE_DOCUMENTS') || isBusy}
                    onClick={() => void handleSubmit()}
                  >
                    {busy === 'submit' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang nộp…</> : 'Nộp hồ sơ'}
                  </Button>
                </div>
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

