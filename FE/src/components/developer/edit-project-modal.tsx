import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  X,
  ArrowRight,
  ArrowLeft,
  ListChecks,
  Download,
  FileSpreadsheet,
  SlidersHorizontal,
  Edit3,
  FileText,
  CheckCircle2,
  FileCheck,
  ExternalLink,
} from 'lucide-react'
import { housingProjectsApi, parseApartments } from '@/api/housing-projects'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'
import { ensureHcmLocationsLoaded, HCM_PROVINCE } from '@/lib/vietnam-locations'
import { formatError } from '@/lib/format-error'
import { extractSingleProject } from '@/lib/parsers'
import type { CreateApartmentDto, CreateHousingProjectRequestDto, MilestoneSetupItemDto } from '@/types'
import {
  VALID_TRIGGER_EVENTS,
  DIRECTION_OPTIONS,
  MILESTONE_PRESETS,
  MIN_PAYMENT_PHASES,
  MAX_PAYMENT_PHASES,
  normalizeDirection,
  type ApartmentFormRow,
} from './create-project-modal'

interface EditApartmentFormRow extends ApartmentFormRow {
  id?: string
}

interface EditProjectModalProps {
  projectId: string
  open: boolean
  onClose: () => void
  onUpdated?: () => void | Promise<void>
}

const createDefaultApartment = (index: number): EditApartmentFormRow => ({
  unitName: `A-${100 + index + 1}`,
  buildingBlock: 'Block A',
  floorNumber: 1,
  numberOfBedrooms: 2,
  numberOfBathrooms: 1,
  area: '55',
  grossArea: '60',
  mainDoorDirection: 'SOUTH_EAST',
  balconyDirection: 'EAST',
  viewDescription: 'View công viên nội khu',
  maxOccupants: 4,
  minSuitableIncome: '',
  maxSuitableIncome: '',
  unitGroup: 'STANDARD',
  saleType: 'FULL_OWNERSHIP',
  coOwnershipRatio: '',
  price: '850000000',
  description: '',
  isExpanded: false,
})

const inputClass =
  'block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition hover:border-teal-300 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-50 dark:placeholder:text-slate-500 dark:hover:border-teal-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/20 dark:disabled:bg-slate-900/40'
const labelClass =
  'mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300'
const requiredDot = <span className="text-rose-500" aria-hidden>*</span>

export function EditProjectModal({
  projectId,
  open,
  onClose,
  onUpdated,
}: EditProjectModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const bodyRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const [loadingProject, setLoadingProject] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [ward, setWard] = useState('')
  const [street, setStreet] = useState('')
  const [wards, setWards] = useState<string[]>([])
  const [decisionNumber, setDecisionNumber] = useState('')
  const [existingDecisionDocumentUrl, setExistingDecisionDocumentUrl] = useState<string | null>(null)
  const [decisionDocumentFile, setDecisionDocumentFile] = useState<File | null>(null)
  const [decisionDocumentUrl, setDecisionDocumentUrl] = useState<string>('')
  const [uploadingDocument, setUploadingDocument] = useState(false)

  const [milestones, setMilestones] = useState<MilestoneSetupItemDto[]>([
    { phaseOrder: 1, phaseName: 'Đợt 1 (Đặt cọc / Cấp nhà)', percentage: 0, triggerEvent: 'ON_LOTTERY_WON', dueDays: 0 },
    { phaseOrder: 2, phaseName: 'Đợt 2 (Bàn giao nhà)', percentage: 0, triggerEvent: 'HANDOVER', dueDays: 0 },
    { phaseOrder: 3, phaseName: 'Đợt 3 (Nhận sổ hồng)', percentage: 0, triggerEvent: 'RED_BOOK_ISSUED', dueDays: 0 },
  ])

  const [apartments, setApartments] = useState<EditApartmentFormRow[]>([])
  const [originalApartmentIds, setOriginalApartmentIds] = useState<string[]>([])

  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [imagesFiles, setImagesFiles] = useState<File[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [error, setError] = useState('')

  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDecisionDocumentFile(file)
    setUploadingDocument(true)
    setError('')
    try {
      const res = (await housingProjectsApi.uploadDocument(file)) as any
      const docUrl =
        res?.url ||
        res?.data?.url ||
        res?.documentUrl ||
        res?.data?.documentUrl ||
        res?.data ||
        (typeof res === 'string' ? res : '')
      if (docUrl && typeof docUrl === 'string') {
        setDecisionDocumentUrl(docUrl)
      }
    } catch (err: any) {
      console.warn('[EditProjectModal] Warning upload decision document:', err)
    } finally {
      setUploadingDocument(false)
    }
  }

  // Load project details & apartments on open
  useEffect(() => {
    if (!open || !projectId) return
    setError('')
    setLoadingProject(true)

    void ensureHcmLocationsLoaded()
      .then(setWards)
      .catch(() => setWards([]))

    housingProjectsApi
      .getById(projectId)
      .then(async (res) => {
        const p = extractSingleProject(res)
        const raw = ((res as any)?.data ?? (res as any)?.Data ?? res) as Record<string, any>
        if (!p && !raw) return

        setProjectName(p?.projectName || p?.name || raw?.projectName || raw?.name || '')
        setDescription(p?.description || raw?.description || '')
        setWard(p?.ward || p?.district || raw?.ward || raw?.district || '')
        setStreet(p?.street || raw?.street || raw?.Street || '')
        setDecisionNumber(p?.decisionNumber || raw?.decisionNumber || raw?.DecisionNumber || '')

        const docUrl = p?.decisionDocumentUrl || raw?.decisionDocumentUrl || raw?.DecisionDocumentUrl || null
        setExistingDecisionDocumentUrl(docUrl)
        setDecisionDocumentUrl(docUrl || '')
        setDecisionDocumentFile(null)

        setExistingThumbnailUrl(p?.thumbnailUrl || raw?.thumbnailUrl || null)

        const rawImages = p?.images || raw?.images || raw?.Images || []
        const imgUrls: string[] = Array.isArray(rawImages)
          ? rawImages.map((img: any) => (typeof img === 'string' ? img : img?.imageUrl || img?.url || '')).filter(Boolean)
          : []
        setExistingImages(imgUrls)

        const rawMilestones = p?.milestones || raw?.milestones || raw?.Milestones
        if (Array.isArray(rawMilestones) && rawMilestones.length >= 3) {
          setMilestones(
            rawMilestones.map((m: any, idx: number) => ({
              phaseOrder: idx + 1,
              phaseName: m.phaseName || m.PhaseName || `Đợt ${idx + 1}`,
              percentage: Number(m.percentage ?? m.Percentage) || 0,
              triggerEvent: m.triggerEvent || m.TriggerEvent || 'ON_LOTTERY_WON',
              dueDays: Number(m.dueDays ?? m.DueDays) || 7,
            }))
          )
        }

        let aptList = parseApartments(res)
        if (aptList.length === 0) {
          try {
            const aptRes = await housingProjectsApi.getApartments(projectId)
            aptList = parseApartments(aptRes)
          } catch (e) { }
        }

        if (aptList.length > 0) {
          const loadedRows: EditApartmentFormRow[] = aptList.map((a, idx) => ({
            id: a.id || undefined,
            unitName: a.unitName || `A-${100 + idx + 1}`,
            buildingBlock: a.buildingBlock || 'Block A',
            floorNumber: a.floorNumber ?? 1,
            numberOfBedrooms: a.numberOfBedrooms ?? 2,
            numberOfBathrooms: a.numberOfBathrooms ?? 1,
            area: String(a.area || '50'),
            grossArea: a.grossArea ? String(a.grossArea) : '',
            mainDoorDirection: a.mainDoorDirection || 'SOUTH_EAST',
            balconyDirection: a.balconyDirection || 'EAST',
            viewDescription: a.viewDescription || '',
            maxOccupants: a.maxOccupants ?? 4,
            minSuitableIncome: '',
            maxSuitableIncome: '',
            unitGroup: (a.unitGroup?.toUpperCase() === 'PRIORITY' ? 'PRIORITY' : 'STANDARD') as any,
            saleType: (a.saleType?.toUpperCase() === 'CO_OWNERSHIP' ? 'CO_OWNERSHIP' : 'FULL_OWNERSHIP') as any,
            coOwnershipRatio: a.coOwnershipRatio != null ? Number(a.coOwnershipRatio) : '',
            price: String(a.price || '800000000'),
            description: a.description || '',
            isExpanded: false,
          }))
          setApartments(loadedRows)
          setOriginalApartmentIds(aptList.map((a) => a.id).filter(Boolean))
        } else {
          setApartments([createDefaultApartment(0)])
          setOriginalApartmentIds([])
        }
      })
      .catch((err) => {
        setError(formatError(err))
      })
      .finally(() => {
        setLoadingProject(false)
      })
  }, [open, projectId])

  useEffect(() => {
    if (!error || !errorRef.current || !bodyRef.current) return
    const alertTop = errorRef.current.offsetTop
    bodyRef.current.scrollTo({ top: Math.max(0, alertTop - 12), behavior: 'smooth' })
  }, [error])

  const validateStep1 = (): string | null => {
    if (!projectName.trim()) return 'Vui lòng nhập tên dự án.'
    if (projectName.trim().length < 5) return 'Tên dự án phải có ít nhất 5 ký tự.'
    if (!ward) return 'Vui lòng chọn phường/xã.'
    if (!street.trim()) return 'Vui lòng nhập địa chỉ đường / số nhà (Bắt buộc).'
    if (!decisionNumber.trim()) return 'Vui lòng nhập số quyết định phê duyệt.'

    if (milestones.length < MIN_PAYMENT_PHASES) {
      return `Cần ít nhất ${MIN_PAYMENT_PHASES} đợt thanh toán (Đợt 1 là cọc, tối đa 30%).`
    }
    if (milestones.length > MAX_PAYMENT_PHASES) {
      return `Tối đa ${MAX_PAYMENT_PHASES} đợt thanh toán.`
    }

    // Kiểm tra tỷ lệ Đợt 1 <= 30% theo Luật Nhà ở Xã hội
    const phase1Pct = Number(milestones[0]?.percentage) || 0
    if (phase1Pct > 30) {
      return `Đợt 1 đang là ${phase1Pct}% — Theo quy định Luật Nhà ở Xã hội, tỷ lệ thanh toán Đợt 1 tối đa chỉ được 30%.`
    }

    const totalPercentage = milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0)
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return `Tổng tỷ lệ thanh toán phải là 100% (hiện tại: ${totalPercentage}%).`
    }

    for (let i = 0; i < milestones.length; i++) {
      if (!milestones[i].phaseName.trim()) return `Đợt ${i + 1}: Vui lòng nhập tên đợt thanh toán.`
      if (!milestones[i].triggerEvent.trim()) return `Đợt ${i + 1}: Vui lòng chọn sự kiện kích hoạt.`
      const pct = Number(milestones[i].percentage)
      if (pct <= 0) return `Đợt ${i + 1}: Vui lòng nhập tỷ lệ % thanh toán lớn hơn 0%.`
      const days = Number(milestones[i].dueDays)
      if (days <= 0) return `Đợt ${i + 1}: Thời hạn thanh toán phải lớn hơn 0 ngày.`
    }
    return null
  }

  const validateStep2 = (): string | null => {
    const filled = apartments.filter(
      (r) => r.unitName.trim() || r.area.trim() || r.price.trim(),
    )
    if (filled.length === 0) {
      return 'Vui lòng thêm ít nhất 1 căn (tên, diện tích, giá).'
    }
    for (let i = 0; i < filled.length; i++) {
      const r = filled[i]
      if (!r.unitName.trim()) return `Căn #${i + 1}: Vui lòng nhập tên/mã căn.`
      const areaNum = parseFloat(r.area)
      if (isNaN(areaNum) || areaNum < 15 || areaNum > 300)
        return `Căn #${i + 1} (${r.unitName}): Diện tích thông thủy phải từ 15 đến 300 m².`
      const priceNum = parseFloat(r.price)
      if (isNaN(priceNum) || priceNum < 1000000 || priceNum > 100000000000)
        return `Căn #${i + 1} (${r.unitName}): Giá bán không hợp lệ (tối thiểu 1.000.000 VNĐ).`
      if (r.saleType === 'CO_OWNERSHIP') {
        const ratio = Number(r.coOwnershipRatio)
        if (isNaN(ratio) || ratio < 1 || ratio > 99) {
          return `Căn #${i + 1} (${r.unitName}): Tỷ lệ đồng sở hữu phải từ 1% đến 99%.`
        }
      }
    }
    return null
  }

  const goNext = () => {
    if (transitioning) return
    const err = validateStep1()
    if (err) {
      setError(err)
      return
    }
    setError('')
    setTransitioning(true)
    setStep(2)
    setTimeout(() => {
      setTransitioning(false)
    }, 350)
  }

  const goPrev = () => {
    setError('')
    setStep(1)
  }

  useEffect(() => {
    setError('')
  }, [projectName, ward, street, decisionNumber, apartments])

  const isStep2Valid = useMemo(() => validateStep2() === null, [apartments])

  const buildApartmentDto = (r: EditApartmentFormRow): CreateApartmentDto => ({
    unitName: r.unitName.trim(),
    floorNumber: r.floorNumber !== '' ? Number(r.floorNumber) : undefined,
    buildingBlock: r.buildingBlock.trim() || undefined,
    numberOfBedrooms: r.numberOfBedrooms !== '' ? Number(r.numberOfBedrooms) : undefined,
    numberOfBathrooms: r.numberOfBathrooms !== '' ? Number(r.numberOfBathrooms) : undefined,
    area: parseFloat(r.area) || 0,
    grossArea: r.grossArea ? parseFloat(r.grossArea) : undefined,
    mainDoorDirection: normalizeDirection(r.mainDoorDirection),
    balconyDirection: normalizeDirection(r.balconyDirection),
    viewDescription: r.viewDescription.trim() || undefined,
    maxOccupants: r.maxOccupants !== '' ? Number(r.maxOccupants) : undefined,
    minSuitableIncome: r.minSuitableIncome ? parseFloat(r.minSuitableIncome) : undefined,
    maxSuitableIncome: r.maxSuitableIncome ? parseFloat(r.maxSuitableIncome) : undefined,
    unitGroup: r.unitGroup || 'STANDARD',
    saleType: r.saleType || 'FULL_OWNERSHIP',
    coOwnershipRatio: r.saleType === 'CO_OWNERSHIP' && r.coOwnershipRatio !== '' ? Number(r.coOwnershipRatio) : undefined,
    price: parseFloat(r.price) || 0,
    description: r.description.trim() || undefined,
  })

  const updateAptRow = <K extends keyof EditApartmentFormRow>(
    index: number,
    field: K,
    value: EditApartmentFormRow[K],
  ) => {
    setApartments((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    )
  }

  const toggleExpand = (index: number) => {
    setApartments((prev) =>
      prev.map((row, i) => (i === index ? { ...row, isExpanded: !row.isExpanded } : row)),
    )
  }

  const [importingExcel, setImportingExcel] = useState(false)

  const handleDownloadTemplate = async () => {
    try {
      if (projectId) {
        await housingProjectsApi.downloadApartmentsExcelTemplate(projectId)
        return
      }
    } catch (e) {
      console.warn('[EditProjectModal] BE template download failed, falling back to CSV:', e)
    }

    const csvHeader = 'Mã căn,Tòa/Block,Tầng,Số PN,Số WC,Diện tích thông thủy (m2),Diện tích tim tường (m2),Giá bán (VNĐ),Nhóm căn (STANDARD/PRIORITY),Hình thức bán (FULL_OWNERSHIP/CO_OWNERSHIP),Tỷ lệ sở hữu (%),Hướng cửa chính (EAST/WEST/SOUTH/NORTH/SOUTH_EAST/NORTH_EAST/SOUTH_WEST/NORTH_WEST),Hướng ban công,Mô tả view,Sức chứa tối đa (người),Ghi chú\n'
    const sampleRows = [
      'A-101,Block A,1,2,1,55,60,850000000,STANDARD,FULL_OWNERSHIP,100,SOUTH_EAST,EAST,View công viên nội khu,4,Căn mẫu tiêu chuẩn\n',
      'A-102,Block A,1,1,1,40,45,620000000,PRIORITY,CO_OWNERSHIP,50,EAST,SOUTH,View hồ bơi,2,Căn ưu tiên đồng sở hữu\n',
      'B-201,Block B,2,3,2,75,82,1200000000,STANDARD,FULL_OWNERSHIP,100,SOUTH,SOUTH_EAST,View thoáng nhìn ra sông,6,Căn góc 3 phòng ngủ\n',
    ].join('')

    const blob = new Blob(['\uFEFF' + csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mau_danh_sach_can_ho_fecaps.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    if (isExcel && projectId) {
      setImportingExcel(true)
      setError('')
      try {
        await housingProjectsApi.importApartmentsExcel(projectId, file)
        const updatedProj = await housingProjectsApi.getById(projectId)
        const apts = parseApartments(updatedProj)
        if (apts.length > 0) {
          setApartments(apts.map((a, i) => ({
            id: a.id,
            unitName: a.unitName || `Căn ${i + 1}`,
            buildingBlock: a.buildingBlock || 'Block A',
            floorNumber: a.floorNumber || 1,
            numberOfBedrooms: a.numberOfBedrooms || 2,
            numberOfBathrooms: a.numberOfBathrooms || 1,
            area: String(a.area || '50'),
            grossArea: a.grossArea ? String(a.grossArea) : '',
            price: String(a.price || '800000000'),
            unitGroup: (a.unitGroup === 'PRIORITY' ? 'PRIORITY' : 'STANDARD') as any,
            saleType: (a.saleType === 'CO_OWNERSHIP' ? 'CO_OWNERSHIP' : 'FULL_OWNERSHIP') as any,
            coOwnershipRatio: a.coOwnershipRatio != null ? Number(a.coOwnershipRatio) : '',
            mainDoorDirection: a.mainDoorDirection || 'SOUTH_EAST',
            balconyDirection: a.balconyDirection || 'EAST',
            viewDescription: a.viewDescription || '',
            maxOccupants: a.maxOccupants || 4,
            minSuitableIncome: '',
            maxSuitableIncome: '',
            description: a.description || '',
            isExpanded: false,
          })))
        }
      } catch (err: any) {
        setError('Lỗi khi import file Excel lên hệ thống: ' + formatError(err))
      } finally {
        setImportingExcel(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string
        if (!text) return
        const lines = text.split(/\r?\n/).filter((l) => l.trim())
        if (lines.length <= 1) {
          setError('File CSV không có dữ liệu căn hộ.')
          return
        }

        const parsedRows: EditApartmentFormRow[] = []
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
          if (!cols[0]) continue

          parsedRows.push({
            unitName: cols[0] || `Căn ${i}`,
            buildingBlock: cols[1] || 'Block A',
            floorNumber: cols[2] ? parseInt(cols[2], 10) || 1 : 1,
            numberOfBedrooms: cols[3] ? parseInt(cols[3], 10) || 1 : 2,
            numberOfBathrooms: cols[4] ? parseInt(cols[4], 10) || 1 : 1,
            area: cols[5] || '50',
            grossArea: cols[6] || '',
            price: cols[7] || '800000000',
            unitGroup: cols[8]?.toUpperCase().includes('PRIORITY') ? 'PRIORITY' : 'STANDARD',
            saleType: cols[9]?.toUpperCase().includes('CO') ? 'CO_OWNERSHIP' : 'FULL_OWNERSHIP',
            coOwnershipRatio: cols[10] ? parseInt(cols[10], 10) || 50 : '',
            mainDoorDirection: normalizeDirection(cols[11]) || 'SOUTH_EAST',
            balconyDirection: normalizeDirection(cols[12]) || 'EAST',
            viewDescription: cols[13] || '',
            maxOccupants: cols[14] ? parseInt(cols[14], 10) || 4 : 4,
            minSuitableIncome: '',
            maxSuitableIncome: '',
            description: cols[15] || '',
            isExpanded: false,
          })
        }

        if (parsedRows.length > 0) {
          setApartments(parsedRows)
          setError('')
        }
      } catch (err: any) {
        setError('Lỗi khi đọc file: ' + err.message)
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (submitting || transitioning) return
    if (step === 1) {
      goNext()
      return
    }
    const err = validateStep2()
    if (err) {
      setError(err)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const validApartmentRows = apartments.filter((r) => r.unitName.trim())
      const areas = validApartmentRows.map((a) => parseFloat(a.area) || 0)
      const prices = validApartmentRows.map((a) => parseFloat(a.price) || 0)

      let thumbnailUrl = existingThumbnailUrl || undefined
      if (thumbnailFile) {
        const thumbRes = (await housingProjectsApi.uploadImage(thumbnailFile)) as any
        thumbnailUrl = thumbRes?.url || thumbRes?.data?.url || thumbRes?.imageUrl || thumbRes?.data || (typeof thumbRes === 'string' ? thumbRes : undefined)
      }

      const newUploadedImages: string[] = []
      for (const file of imagesFiles) {
        const res = (await housingProjectsApi.uploadImage(file)) as any
        const uploadedUrl = res?.url || res?.data?.url || res?.imageUrl || res?.data || (typeof res === 'string' ? res : undefined)
        if (uploadedUrl && typeof uploadedUrl === 'string') {
          newUploadedImages.push(uploadedUrl)
        }
      }

      let finalDocUrl = decisionDocumentUrl || existingDecisionDocumentUrl || undefined
      if (decisionDocumentFile && !decisionDocumentUrl) {
        try {
          const docRes = (await housingProjectsApi.uploadDocument(decisionDocumentFile)) as any
          finalDocUrl =
            docRes?.url ||
            docRes?.data?.url ||
            docRes?.documentUrl ||
            docRes?.data?.documentUrl ||
            docRes?.data ||
            (typeof docRes === 'string' ? docRes : undefined)
        } catch (err) {
          console.warn('[EditProjectModal] Warning upload decision document:', err)
        }
      }

      // 1. Cập nhật thông tin cơ bản dự án
      const body: CreateHousingProjectRequestDto = {
        projectName: projectName.trim(),
        description: description.trim(),
        province: HCM_PROVINCE,
        district: ward.trim() || 'Quận 1',
        street: street.trim(),
        ward: ward.trim(),
        address: [street.trim(), ward.trim(), HCM_PROVINCE].filter(Boolean).join(', '),
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        minArea: areas.length ? Math.min(...areas) : 0,
        maxArea: areas.length ? Math.max(...areas) : 0,
        availableUnits: validApartmentRows.length,
        decisionNumber: decisionNumber.trim(),
        decisionDocumentUrl: finalDocUrl,
        thumbnailUrl,
        images: newUploadedImages.length > 0 ? newUploadedImages : undefined,
      }

      try {
        await housingProjectsApi.update(projectId, body)
      } catch (err: any) {
        console.warn('[EditProjectModal] Warning updating project main info:', err)
      }

      // 2. Cập nhật tiến độ thanh toán qua endpoint riêng
      const milestonesPayload = milestones.map((m, i) => ({
        phaseOrder: i + 1,
        phaseName: m.phaseName.trim(),
        percentage: Number(m.percentage),
        triggerEvent: m.triggerEvent,
        dueDays: Number(m.dueDays) || 7,
      }))
      await housingProjectsApi.updateMilestones(projectId, milestonesPayload)

      // 3. Xử lý Quỹ căn hộ: Cập nhật căn cũ, tạo mới căn thêm, xoá căn đã bỏ
      const currentRowIds = new Set(validApartmentRows.map((r) => r.id).filter(Boolean))

      // Xoá các căn đã bị remove trên UI
      for (const oldId of originalApartmentIds) {
        if (!currentRowIds.has(oldId)) {
          try {
            await housingProjectsApi.deleteApartment(projectId, oldId)
          } catch (e) {
            console.warn('[EditProjectModal] Warning deleting apartment:', oldId, e)
          }
        }
      }

      // Cập nhật từng căn cũ hoặc tạo căn mới
      for (const row of validApartmentRows) {
        const aptDto = buildApartmentDto(row)
        if (row.id) {
          await housingProjectsApi.updateApartment(projectId, row.id, aptDto)
        } else {
          await housingProjectsApi.createApartment(projectId, aptDto)
        }
      }

      if (onUpdated) await onUpdated()
      onClose()
    } catch (err: any) {
      console.error('[EditProjectModal] update error:', err)
      setError(formatError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const filledCount = apartments.filter((r) => r.unitName.trim()).length

  const aptSummary = useMemo(() => {
    const filled = apartments.filter(
      (r) => r.unitName.trim() && parseFloat(r.area) > 0 && parseFloat(r.price) > 0,
    )
    if (filled.length === 0) return null
    const areas = filled.map((r) => parseFloat(r.area))
    const prices = filled.map((r) => parseFloat(r.price))
    const priorityCount = filled.filter((r) => r.unitGroup === 'PRIORITY').length
    const standardCount = filled.filter((r) => r.unitGroup === 'STANDARD').length
    const fullCount = filled.filter((r) => r.saleType === 'FULL_OWNERSHIP').length
    const coCount = filled.filter((r) => r.saleType === 'CO_OWNERSHIP').length

    return {
      count: filled.length,
      priorityCount,
      standardCount,
      fullCount,
      coCount,
      minArea: Math.min(...areas).toFixed(1),
      maxArea: Math.max(...areas).toFixed(1),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((a, b) => a + b, 0) / filled.length,
    }
  }, [apartments])

  return (
    <Modal open={open} onClose={submitting ? () => undefined : onClose} size="full" fullHeight>
      <form onSubmit={(e) => { e.preventDefault(); if (step === 1) goNext(); else handleSubmit(); }} noValidate className="flex h-full flex-col">
        {/* === Header — teal gradient === */}
        <header className="-mx-1 -mt-1 mb-0 rounded-t-xl bg-gradient-to-r from-teal-700 to-teal-500 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
              <Edit3 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-white">Chỉnh sửa thông tin dự án & Quỹ căn</h2>
              <p className="text-[11px] text-teal-100">
                {projectName ? `Cập nhật dự án: ${projectName}` : 'Cập nhật thông tin dự án, tiến độ thanh toán và quỹ căn'}
              </p>
            </div>
            {aptSummary && (
              <div className="hidden shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-right text-[10px] lg:block">
                <p className="font-semibold text-white">
                  {aptSummary.count} căn ({aptSummary.priorityCount} Ưu tiên · {aptSummary.standardCount} Tiêu chuẩn)
                </p>
                <p className="text-teal-100">
                  {fmtVnd(aptSummary.minPrice)} – {fmtVnd(aptSummary.maxPrice)} · {aptSummary.minArea}–{aptSummary.maxArea} m²
                </p>
              </div>
            )}
          </div>
        </header>

        {/* === Step indicator teal === */}
        <div className="mb-2 mt-3 flex items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => step === 2 && goPrev()}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${step === 1
              ? 'bg-teal-600 text-white shadow-sm'
              : 'cursor-pointer border border-teal-200 bg-teal-50 text-teal-600 hover:bg-teal-100'
              }`}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[9px] font-bold">
              1
            </span>
            Thông tin dự án & Tiến độ
          </button>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <div
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold ${step === 2
              ? 'bg-teal-600 text-white shadow-sm'
              : 'border border-dashed border-teal-300 bg-teal-50/60 text-teal-500'
              }`}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[9px] font-bold">
              2
            </span>
            Quỹ căn hộ ({filledCount} căn)
          </div>
        </div>

        {error && (
          <div ref={errorRef} className="mb-2">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {loadingProject ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <span className="ml-2 text-sm font-medium text-slate-600">Đang tải thông tin dự án...</span>
          </div>
        ) : (
          /* === Body === */
          <div ref={bodyRef} className="flex-1 overflow-y-auto overflow-x-hidden pr-1">
            {/* STEP 1: Thông tin dự án */}
            {step === 1 && (
              <div className="grid gap-x-3 gap-y-2 md:grid-cols-12">
                <div className="md:col-span-12 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2 text-[11px] text-teal-900 dark:border-teal-800/40 dark:bg-teal-950/30 dark:text-teal-200">
                  <strong className="font-semibold">Trạng thái chỉnh sửa:</strong> Dự án đang ở trạng thái{' '}
                  <span className="font-semibold text-teal-700 dark:text-teal-300">Chờ phê duyệt (Pending)</span>. Bạn có thể cập nhật mọi thông tin trước khi Sở Xây dựng duyệt.
                </div>

                {/* Section: Thông tin cơ bản */}
                <div className="md:col-span-12 mb-1 mt-2 flex items-center gap-2 border-l-[3px] border-teal-500 pl-2.5">
                  <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                    Thông tin cơ bản
                  </span>
                </div>

                <Field label="Tên dự án" required className="md:col-span-12">
                  <input
                    className={inputClass}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="VD: Khu Nhà ở Xã hội Tân Bình — Block A & B"
                    maxLength={150}
                    disabled={submitting}
                  />
                </Field>

                <Field label="Tỉnh/Thành phố" required className="md:col-span-4">
                  <select
                    className={`${inputClass} cursor-not-allowed bg-slate-100 dark:bg-slate-900/80`}
                    value={HCM_PROVINCE}
                    disabled
                  >
                    <option value={HCM_PROVINCE}>{HCM_PROVINCE}</option>
                  </select>
                </Field>

                <Field label="Phường/Xã" required className="md:col-span-4">
                  <select
                    className={inputClass}
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    disabled={submitting || wards.length === 0}
                  >
                    <option value="">
                      {wards.length ? '-- Chọn phường/xã --' : 'Đang tải...'}
                    </option>
                    {wards.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Đường / Số nhà" required className="md:col-span-4">
                  <input
                    className={inputClass}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="VD: 123 Hoàng Văn Thụ"
                    disabled={submitting}
                  />
                </Field>

                {/* Section: Pháp lý & Quyết định phê duyệt */}
                <div className="md:col-span-12 rounded-xl border border-teal-200/80 bg-teal-50/40 p-3.5 dark:border-teal-800/40 dark:bg-teal-950/20">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-200">
                      <FileText className="h-4 w-4 text-teal-600" />
                      <span>Pháp lý dự án & Quyết định phê duyệt</span>
                      {requiredDot}
                    </div>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400">Được thẩm định bởi Sở Xây dựng</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <label className={labelClass}>
                        <span>Số quyết định phê duyệt</span>
                        {requiredDot}
                      </label>
                      <input
                        className={inputClass}
                        value={decisionNumber}
                        onChange={(e) => setDecisionNumber(e.target.value)}
                        placeholder="VD: 1234/QĐ-UBND hoặc 567/SXD-PTN"
                        disabled={submitting}
                      />
                      <p className="mt-1 text-[10px] text-slate-500">Mã văn bản pháp lý chấp thuận đầu tư / phê duyệt dự án.</p>
                    </div>

                    <div className="sm:col-span-6">
                      <label className={labelClass}>
                        <span>Văn bản / Quyết định đính kèm</span>
                        <span className="text-[10px] font-normal lowercase text-slate-400">(Tùy chọn: PDF, DOCX, Ảnh)</span>
                      </label>

                      <input
                        ref={documentInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleDocumentChange}
                        disabled={submitting || uploadingDocument}
                      />

                      {decisionDocumentFile || decisionDocumentUrl || existingDecisionDocumentUrl ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-teal-300 bg-white p-2 text-xs shadow-sm dark:border-teal-700 dark:bg-slate-800">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileCheck className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-slate-800 dark:text-slate-200">
                                {decisionDocumentFile?.name || 'Văn bản quyết định phê duyệt đính kèm'}
                              </p>
                              <p className="text-[10px] text-teal-600 dark:text-teal-400">
                                {uploadingDocument ? (
                                  <span className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Đang tải file lên...
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Đã có file đính kèm
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            {(decisionDocumentUrl || existingDecisionDocumentUrl) && (
                              <a
                                href={decisionDocumentUrl || existingDecisionDocumentUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                title="Xem văn bản"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setDecisionDocumentFile(null)
                                setDecisionDocumentUrl('')
                                setExistingDecisionDocumentUrl(null)
                                if (documentInputRef.current) documentInputRef.current.value = ''
                              }}
                              disabled={submitting}
                              className="rounded-md border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                              title="Xóa file đính kèm"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => documentInputRef.current?.click()}
                          disabled={submitting || uploadingDocument}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-teal-300 bg-white/80 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:border-teal-500 hover:bg-teal-50/80 dark:border-teal-700 dark:bg-slate-800/80 dark:text-teal-300"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Tải lên văn bản / Quyết định (.PDF, .DOC, .PNG)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <Field
                  label="Mô tả dự án"
                  hint="Tối đa 500 ký tự — hiển thị thông tin giới thiệu, vị trí và tiện ích tới người dân."
                  className="md:col-span-12"
                >
                  <textarea
                    className={`${inputClass} min-h-[44px] resize-none`}
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả ngắn về vị trí địa lý, tiện ích xung quanh, hạ tầng kỹ thuật..."
                    maxLength={500}
                    disabled={submitting}
                  />
                </Field>

                {/* Section: Tiến độ thanh toán (Milestones) */}
                <div className="md:col-span-12 mt-2 rounded-xl border border-teal-200/80 bg-white p-3.5 shadow-sm dark:border-teal-800/40 dark:bg-slate-900/60">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-teal-800 dark:text-teal-300">
                        Chính sách thanh toán theo tiến độ
                      </span>
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                        {milestones.length} đợt · Đợt 1 (cọc) ≤ 30%
                      </span>
                      {requiredDot}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (milestones.length < MAX_PAYMENT_PHASES) {
                            setMilestones([
                              ...milestones,
                              {
                                phaseOrder: milestones.length + 1,
                                phaseName: `Đợt ${milestones.length + 1}`,
                                percentage: 0,
                                triggerEvent: 'CONSTRUCTION_ROUGH_FLOOR',
                                dueDays: 7,
                              },
                            ])
                          }
                        }}
                        disabled={milestones.length >= MAX_PAYMENT_PHASES || submitting}
                        className="flex items-center gap-1 rounded-md border border-dashed border-teal-400 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-40 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                      >
                        <Plus className="h-3.5 w-3.5" /> Thêm đợt
                      </button>
                    </div>
                  </div>

                  {/* Presets buttons */}
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Mẫu tiến độ chuẩn:</span>
                    {MILESTONE_PRESETS.map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setMilestones(preset.milestones)}
                        disabled={submitting}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${milestones.length === preset.milestones.length &&
                          milestones[0]?.percentage === preset.milestones[0]?.percentage
                          ? 'border-teal-500 bg-teal-50 font-bold text-teal-700 shadow-sm dark:bg-teal-950/50 dark:text-teal-300'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-300 hover:bg-teal-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        title={preset.description}
                      >
                        🎯 {preset.name}
                      </button>
                    ))}
                  </div>

                  {/* Total percentage bar indicator */}
                  {(() => {
                    const total = milestones.reduce((s, m) => s + (Number(m.percentage) || 0), 0)
                    const isValid = Math.abs(total - 100) < 0.01
                    const isPhase1Valid = !milestones[0] || Number(milestones[0].percentage) <= 30
                    return (
                      <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Tổng tỷ lệ các đợt thanh toán:
                          </span>
                          <span
                            className={`font-bold ${isValid
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                              }`}
                          >
                            {total}% / 100% {isValid ? '✓ Đạt chuẩn' : `(Chênh lệch ${total - 100 > 0 ? `+${total - 100}` : total - 100}%)`}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className={`h-full transition-all duration-300 ${isValid
                              ? 'bg-emerald-500'
                              : total > 100
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                              }`}
                            style={{ width: `${Math.min(100, Math.max(0, total))}%` }}
                          />
                        </div>
                        {!isPhase1Valid && (
                          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            <span>⚠️ <strong>Lỗi vi phạm:</strong> Tỷ lệ thanh toán Đợt 1 đang là <strong>{milestones[0].percentage}%</strong> (Luật Nhà ở Xã hội quy định Đợt 1 không được vượt quá <strong>30%</strong>).</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <div className="space-y-2">
                    {milestones.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-wrap items-center gap-2 rounded-xl border p-2.5 transition ${idx === 0 && Number(m.percentage) > 30
                          ? 'border-rose-300 bg-rose-50/40 dark:border-rose-800/80 dark:bg-rose-950/20'
                          : 'border-slate-200/80 bg-slate-50/60 hover:border-teal-300 dark:border-slate-700 dark:bg-slate-800/40'
                          }`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${idx === 0 && Number(m.percentage) > 30 ? 'bg-rose-600' : 'bg-teal-600'
                          }`}>
                          {idx + 1}
                        </span>

                        <div className="min-w-[160px] flex-1">
                          <input
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                            value={m.phaseName}
                            placeholder={`Tên đợt ${idx + 1}`}
                            disabled={submitting}
                            onChange={(e) => {
                              const n = [...milestones]
                              n[idx] = { ...n[idx], phaseName: e.target.value }
                              setMilestones(n)
                            }}
                          />
                        </div>

                        <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-white pr-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-800">
                          <input
                            type="number"
                            className="w-14 rounded-l-lg border-0 bg-transparent px-1.5 py-1.5 text-center text-xs font-bold text-teal-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none dark:text-teal-300"
                            value={m.percentage === 0 ? '' : m.percentage}
                            placeholder="0"
                            min={0}
                            max={idx === 0 ? 30 : 100}
                            disabled={submitting}
                            onChange={(e) => {
                              const raw = e.target.value
                              const n = [...milestones]
                              n[idx] = { ...n[idx], percentage: raw === '' ? 0 : Number(raw) }
                              setMilestones(n)
                            }}
                          />
                          <span className="rounded bg-teal-100 px-1 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
                            %
                          </span>
                        </div>

                        <div className="min-w-[190px] flex-1">
                          <select
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                            value={m.triggerEvent}
                            disabled={submitting}
                            onChange={(e) => {
                              const n = [...milestones]
                              n[idx] = { ...n[idx], triggerEvent: e.target.value }
                              setMilestones(n)
                            }}
                          >
                            {VALID_TRIGGER_EVENTS.map((t) => (
                              <option key={t.code} value={t.code}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-white pr-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-800">
                          <input
                            type="number"
                            className="w-14 rounded-l-lg border-0 bg-transparent px-1.5 py-1.5 text-center text-xs font-medium text-amber-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none dark:text-amber-300"
                            value={m.dueDays === 0 ? '' : (m.dueDays ?? '')}
                            placeholder="0"
                            min={0}
                            max={180}
                            disabled={submitting}
                            onChange={(e) => {
                              const raw = e.target.value
                              const n = [...milestones]
                              n[idx] = { ...n[idx], dueDays: raw === '' ? 0 : Number(raw) }
                              setMilestones(n)
                            }}
                          />
                          <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                            ngày
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={milestones.length <= MIN_PAYMENT_PHASES || submitting}
                          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/40"
                          title={milestones.length <= MIN_PAYMENT_PHASES ? `Tối thiểu ${MIN_PAYMENT_PHASES} đợt thanh toán` : 'Xóa đợt này'}
                          onClick={() => {
                            if (milestones.length > MIN_PAYMENT_PHASES) {
                              setMilestones(
                                milestones
                                  .filter((_, i) => i !== idx)
                                  .map((item, i) => ({ ...item, phaseOrder: i + 1 })),
                              )
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section: Hình ảnh dự án */}
                <div className="md:col-span-12 mb-1 mt-3 flex items-center gap-2 border-l-[3px] border-teal-500 pl-2.5">
                  <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                    Hình ảnh dự án
                  </span>
                </div>

                <Field label="Ảnh đại diện dự án (Thumbnail)" className="md:col-span-6">
                  <div className="space-y-2">
                    {existingThumbnailUrl && !thumbnailFile && (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
                        <img
                          src={existingThumbnailUrl}
                          alt="Thumbnail hiện tại"
                          className="h-12 w-12 rounded object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                            Ảnh thumbnail hiện tại
                          </p>
                          <button
                            type="button"
                            onClick={() => setExistingThumbnailUrl(null)}
                            className="text-[11px] font-semibold text-rose-500 hover:underline"
                          >
                            Xoá ảnh hiện tại
                          </button>
                        </div>
                      </div>
                    )}
                    <FilePicker
                      mode="single"
                      onPickSingle={(f) => setThumbnailFile(f)}
                      file={thumbnailFile}
                      disabled={submitting}
                    />
                  </div>
                </Field>

                <Field
                  label="Thư viện ảnh công trình / tiện ích"
                  hint={
                    imagesFiles.length > 0 || existingImages.length > 0
                      ? `${existingImages.length} ảnh hiện tại · ${imagesFiles.length} ảnh mới`
                      : undefined
                  }
                  className="md:col-span-6"
                >
                  <div className="space-y-2">
                    {existingImages.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-800/40">
                        {existingImages.map((img, i) => (
                          <div key={i} className="group relative aspect-square h-12 w-12 overflow-hidden rounded border border-slate-200">
                            <img src={img} alt="Hình ảnh" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setExistingImages(existingImages.filter((_, idx) => idx !== i))}
                              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 transition group-hover:opacity-100"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <FilePicker
                      mode="multi"
                      onPickMulti={(files) => setImagesFiles(files)}
                      files={imagesFiles}
                      disabled={submitting}
                    />
                  </div>
                </Field>
              </div>
            )}

            {/* STEP 2: Thiết lập chi tiết quỹ căn */}
            {step === 2 && (
              <div className="flex flex-col gap-3">
                {/* Tóm tắt nhanh */}
                {aptSummary ? (
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-teal-100 bg-teal-50/30 p-2.5 shadow-sm dark:border-teal-800/40 dark:bg-slate-900/40 sm:grid-cols-5">
                    <div className="rounded-lg border border-teal-200/80 bg-white p-2 text-center dark:border-teal-700/60 dark:bg-slate-800">
                      <p className="text-[9px] uppercase tracking-wide text-teal-600 dark:text-teal-300">
                        Tổng số căn
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-teal-700 dark:text-teal-200">
                        {aptSummary.count}
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber-200/80 bg-white p-2 text-center dark:border-amber-700/60 dark:bg-slate-800">
                      <p className="text-[9px] uppercase tracking-wide text-amber-600 dark:text-amber-300">
                        Cơ cấu căn
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-amber-700 dark:text-amber-200">
                        {aptSummary.priorityCount} Ưu tiên · {aptSummary.standardCount} Thường
                      </p>
                    </div>
                    <div className="rounded-lg border border-blue-200/80 bg-white p-2 text-center dark:border-blue-700/60 dark:bg-slate-800">
                      <p className="text-[9px] uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        Hình thức bán
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-blue-700 dark:text-blue-200">
                        {aptSummary.fullCount} 100% · {aptSummary.coCount} Đồng sở hữu
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-200/80 bg-white p-2 text-center dark:border-emerald-700/60 dark:bg-slate-800">
                      <p className="text-[9px] uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                        Diện tích (m²)
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-200">
                        {aptSummary.minArea} – {aptSummary.maxArea}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-lg border border-violet-200/80 bg-white p-2 text-center dark:border-violet-700/60 dark:bg-slate-800 sm:col-span-1">
                      <p className="text-[9px] uppercase tracking-wide text-violet-600 dark:text-violet-300">
                        Khoảng giá
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-violet-700 dark:text-violet-200">
                        {fmtVnd(aptSummary.minPrice)} – {fmtVnd(aptSummary.maxPrice)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                    Chưa có căn hộ nào. Hãy thêm căn thủ công hoặc nhập từ file Excel/CSV mẫu.
                  </p>
                )}

                {/* Toolbar chức năng */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-50">
                      Danh sách căn hộ ({apartments.length})
                    </h3>
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                      {filledCount} căn hợp lệ
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      className="hidden"
                      onChange={handleImportCsv}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting || importingExcel}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      title="Nhập danh sách căn từ file Excel (.xlsx) hoặc CSV"
                    >
                      {importingExcel ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      ) : (
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      {importingExcel ? 'Đang import...' : 'Nhập Excel / CSV'}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      disabled={submitting || importingExcel}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      title="Tải file mẫu Excel (.xlsx) hoặc CSV để điền danh sách căn hộ"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-600" />
                      Tải file mẫu Excel
                    </button>

                    <button
                      type="button"
                      onClick={() => setApartments((prev) => [...prev, createDefaultApartment(prev.length)])}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 rounded-md border border-dashed border-teal-400 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 transition hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-950/30 dark:text-teal-300"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thêm căn
                    </button>

                    {apartments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setApartments([createDefaultApartment(0)])}
                        disabled={submitting}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
                        title="Đặt lại danh sách"
                      >
                        Làm mới
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh sách căn hộ (Bảng chi tiết) */}
                <div className="space-y-2">
                  {apartments.map((row, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border transition-all ${row.isExpanded
                        ? 'border-teal-400 bg-teal-50/20 shadow-md dark:border-teal-600 dark:bg-teal-950/20'
                        : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40'
                        }`}
                    >
                      {/* Hàng chính */}
                      <div className="flex flex-wrap items-center gap-2 p-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {idx + 1}
                        </span>

                        {/* Mã căn */}
                        <div className="w-24">
                          <label className="text-[10px] font-semibold text-slate-500">Mã căn *</label>
                          <input
                            className={`${inputClass} py-1 text-xs font-semibold`}
                            value={row.unitName}
                            onChange={(e) => updateAptRow(idx, 'unitName', e.target.value)}
                            placeholder="A-101"
                            disabled={submitting}
                          />
                        </div>

                        {/* Tòa / Block */}
                        <div className="w-24">
                          <label className="text-[10px] font-semibold text-slate-500">Tòa / Block</label>
                          <input
                            className={`${inputClass} py-1 text-xs`}
                            value={row.buildingBlock}
                            onChange={(e) => updateAptRow(idx, 'buildingBlock', e.target.value)}
                            placeholder="Block A"
                            disabled={submitting}
                          />
                        </div>

                        {/* Tầng */}
                        <div className="w-16">
                          <label className="text-[10px] font-semibold text-slate-500">Tầng</label>
                          <input
                            type="number"
                            min={1}
                            max={200}
                            className={`${inputClass} py-1 text-center text-xs`}
                            value={row.floorNumber}
                            onChange={(e) => updateAptRow(idx, 'floorNumber', e.target.value ? Number(e.target.value) : '')}
                            disabled={submitting}
                          />
                        </div>

                        {/* Số PN / WC */}
                        <div className="flex w-24 items-center gap-1">
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-slate-500">PN</label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              className={`${inputClass} py-1 text-center text-xs`}
                              value={row.numberOfBedrooms}
                              onChange={(e) => updateAptRow(idx, 'numberOfBedrooms', e.target.value ? Number(e.target.value) : '')}
                              disabled={submitting}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-slate-500">WC</label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              className={`${inputClass} py-1 text-center text-xs`}
                              value={row.numberOfBathrooms}
                              onChange={(e) => updateAptRow(idx, 'numberOfBathrooms', e.target.value ? Number(e.target.value) : '')}
                              disabled={submitting}
                            />
                          </div>
                        </div>

                        {/* Diện tích thông thủy */}
                        <div className="w-24">
                          <label className="text-[10px] font-semibold text-slate-500">DT sử dụng (m²) *</label>
                          <input
                            type="number"
                            step="0.1"
                            min={15}
                            max={300}
                            className={`${inputClass} py-1 text-xs`}
                            value={row.area}
                            onChange={(e) => updateAptRow(idx, 'area', e.target.value)}
                            placeholder="55.0"
                            disabled={submitting}
                          />
                        </div>

                        {/* Giá bán VNĐ */}
                        <div className="w-32">
                          <label className="text-[10px] font-semibold text-slate-500">Giá bán (VNĐ) *</label>
                          <input
                            type="number"
                            step="1000000"
                            min={1000000}
                            className={`${inputClass} py-1 text-xs`}
                            value={row.price}
                            onChange={(e) => updateAptRow(idx, 'price', e.target.value)}
                            placeholder="850000000"
                            disabled={submitting}
                          />
                        </div>

                        {/* Nhóm căn */}
                        <div className="w-28">
                          <label className="text-[10px] font-semibold text-slate-500">Nhóm căn</label>
                          <select
                            className={`${inputClass} py-1 text-xs`}
                            value={row.unitGroup}
                            onChange={(e) => updateAptRow(idx, 'unitGroup', e.target.value as any)}
                            disabled={submitting}
                          >
                            <option value="STANDARD">Tiêu chuẩn</option>
                            <option value="PRIORITY">Ưu tiên</option>
                          </select>
                        </div>

                        {/* Hình thức bán */}
                        <div className="w-32">
                          <label className="text-[10px] font-semibold text-slate-500">Hình thức bán</label>
                          <select
                            className={`${inputClass} py-1 text-xs`}
                            value={row.saleType}
                            onChange={(e) => updateAptRow(idx, 'saleType', e.target.value as any)}
                            disabled={submitting}
                          >
                            <option value="FULL_OWNERSHIP">Bán 100%</option>
                            <option value="CO_OWNERSHIP">Đồng sở hữu</option>
                          </select>
                        </div>

                        {/* Nút mở rộng chi tiết */}
                        <div className="ml-auto flex items-center gap-1 pt-3.5">
                          <button
                            type="button"
                            onClick={() => toggleExpand(idx)}
                            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${row.isExpanded
                              ? 'bg-teal-600 text-white'
                              : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            title="Thêm hướng cửa, view, sức chứa..."
                          >
                            <SlidersHorizontal className="h-3 w-3" />
                            {row.isExpanded ? 'Thu gọn' : 'Chi tiết'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setApartments((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={submitting || apartments.length <= 1}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:hover:border-rose-700/60 dark:hover:bg-rose-950/40"
                            title="Xoá căn này"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Hàng mở rộng */}
                      {row.isExpanded && (
                        <div className="grid gap-3 border-t border-teal-100 bg-teal-50/30 p-3 dark:border-teal-800/40 dark:bg-teal-950/10 sm:grid-cols-2 md:grid-cols-4">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              Diện tích tim tường / Sàn (m²)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              className={`${inputClass} py-1 text-xs`}
                              value={row.grossArea}
                              onChange={(e) => updateAptRow(idx, 'grossArea', e.target.value)}
                              placeholder="60.0"
                              disabled={submitting}
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              Hướng cửa chính
                            </label>
                            <select
                              className={`${inputClass} py-1 text-xs`}
                              value={row.mainDoorDirection}
                              onChange={(e) => updateAptRow(idx, 'mainDoorDirection', e.target.value)}
                              disabled={submitting}
                            >
                              <option value="">-- Chọn hướng --</option>
                              {DIRECTION_OPTIONS.map((d) => (
                                <option key={d.code} value={d.code}>
                                  {d.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              Hướng ban công / Cửa sổ
                            </label>
                            <select
                              className={`${inputClass} py-1 text-xs`}
                              value={row.balconyDirection}
                              onChange={(e) => updateAptRow(idx, 'balconyDirection', e.target.value)}
                              disabled={submitting}
                            >
                              <option value="">-- Chọn hướng --</option>
                              {DIRECTION_OPTIONS.map((d) => (
                                <option key={d.code} value={d.code}>
                                  {d.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              Sức chứa tối đa (người)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              className={`${inputClass} py-1 text-xs`}
                              value={row.maxOccupants}
                              onChange={(e) => updateAptRow(idx, 'maxOccupants', e.target.value ? Number(e.target.value) : '')}
                              placeholder="4"
                              disabled={submitting}
                            />
                          </div>

                          {row.saleType === 'CO_OWNERSHIP' && (
                            <div>
                              <label className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                Tỷ lệ đồng sở hữu (%) *
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                className={`${inputClass} border-amber-300 py-1 text-xs`}
                                value={row.coOwnershipRatio}
                                onChange={(e) => updateAptRow(idx, 'coOwnershipRatio', e.target.value ? Number(e.target.value) : '')}
                                placeholder="50"
                                disabled={submitting}
                              />
                            </div>
                          )}

                          <div className={row.saleType === 'CO_OWNERSHIP' ? 'md:col-span-3' : 'md:col-span-2'}>
                            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              Mô tả tầm nhìn (View)
                            </label>
                            <input
                              className={`${inputClass} py-1 text-xs`}
                              value={row.viewDescription}
                              onChange={(e) => updateAptRow(idx, 'viewDescription', e.target.value)}
                              placeholder="VD: Nhìn ra công viên trung tâm, thoáng mát"
                              disabled={submitting}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              Ghi chú / Tiện nghi đặc biệt
                            </label>
                            <input
                              className={`${inputClass} py-1 text-xs`}
                              value={row.description}
                              onChange={(e) => updateAptRow(idx, 'description', e.target.value)}
                              placeholder="VD: Căn góc 2 mặt thoáng, bàn giao hoàn thiện cơ bản"
                              disabled={submitting}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === Footer === */}
        <div className="sticky bottom-0 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            <ListChecks className="mr-1 inline h-3 w-3 text-teal-500" />
            Bước {step}/2 · {filledCount} căn hộ
            {step === 2 && !isStep2Valid && !submitting && (
              <span className="ml-2 text-amber-700 dark:text-amber-400">
                · cần nhập đủ tên, diện tích (15-300m²), giá
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={goPrev}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Quay lại
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Huỷ
            </button>
            {step === 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={submitting || transitioning || loadingProject}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md disabled:opacity-50"
              >
                Tiếp tục: Quỹ căn hộ
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitting || !isStep2Valid || transitioning || loadingProject}
                title={
                  !isStep2Valid
                    ? 'Vui lòng nhập đầy đủ: ít nhất 1 căn hợp lệ (tên + diện tích 15-300m² + giá).'
                    : undefined
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang lưu thay đổi...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Lưu cập nhật dự án
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}

function fmtVnd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} tỷ`
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} tr`
  return n.toLocaleString('vi-VN')
}

function Field({
  label,
  required,
  hint,
  suffix,
  children,
  className = '',
}: {
  label: string
  required?: boolean
  hint?: string
  suffix?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className={labelClass}>
        <span>{label}</span>
        {required && requiredDot}
      </label>
      {suffix ? (
        <div className="relative">
          {children}
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
            {suffix}
          </span>
        </div>
      ) : (
        children
      )}
      {hint && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

type SinglePickerProps = {
  mode: 'single'
  onPickSingle: (f: File | null) => void
  file: File | null
}

type MultiPickerProps = {
  mode: 'multi'
  onPickMulti: (files: File[]) => void
  files: File[]
}

type FilePickerProps = {
  disabled?: boolean
} & (SinglePickerProps | MultiPickerProps)

function Thumb({ file, className }: { file: File; className?: string }) {
  const [src, setSrc] = useState<string>('')
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <img src={src} alt={file.name} className={className} />
}

function FilePicker(props: FilePickerProps) {
  const { mode, disabled } = props
  const multiple = mode === 'multi'
  const inputId = useMemo(() => `fp-${Math.random().toString(36).slice(2, 9)}`, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mode === 'multi') {
      props.onPickMulti(e.target.files ? Array.from(e.target.files) : [])
    } else {
      props.onPickSingle(e.target.files?.[0] ?? null)
    }
  }

  const handleClear = () => {
    if (mode === 'multi') props.onPickMulti([])
    else props.onPickSingle(null)
  }

  return (
    <div>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      {!multiple && (
        <div className="flex items-start gap-2.5">
          <div
            className={[
              'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed',
              props.file
                ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-950/20'
                : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/40',
            ].join(' ')}
          >
            {props.file ? (
              <Thumb file={props.file} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-slate-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor={inputId}
                className={[
                  'inline-flex cursor-pointer items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-teal-700',
                  disabled ? 'pointer-events-none opacity-50' : '',
                ].join(' ')}
              >
                <Upload className="h-3 w-3" />
                {props.file ? 'Đổi ảnh' : 'Chọn ảnh mới'}
              </label>
              {props.file && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-3 w-3" />
                  Xoá
                </button>
              )}
            </div>
            <p className="mt-1 truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {props.file ? props.file.name : (
                <span className="italic">Chưa chọn ảnh mới — JPG/PNG/WebP</span>
              )}
            </p>
          </div>
        </div>
      )}

      {multiple && (
        <div>
          <div
            className={[
              'grid grid-cols-4 gap-1.5 rounded-lg border-2 border-dashed p-1.5',
              props.files.length > 0
                ? 'border-teal-200 bg-teal-50/30 dark:border-teal-500/30 dark:bg-teal-950/10'
                : 'border-slate-300 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-800/30',
            ].join(' ')}
          >
            {props.files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="group relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <Thumb file={file} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => props.onPickMulti(props.files.filter((_, i) => i !== idx))}
                  disabled={disabled}
                  aria-label="Xoá ảnh"
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/95 text-white opacity-0 shadow-sm transition hover:bg-rose-600 group-hover:opacity-100 disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            <label
              htmlFor={inputId}
              className={[
                'flex aspect-square cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-white text-slate-400 transition hover:border-teal-400 hover:bg-teal-50/60 hover:text-teal-600 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-teal-500 dark:hover:bg-teal-950/30 dark:hover:text-teal-400',
                disabled ? 'pointer-events-none opacity-50' : '',
              ].join(' ')}
            >
              <Plus className="h-5 w-5" />
            </label>
          </div>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            {props.files.length > 0
              ? `${props.files.length} ảnh mới — click dấu + để thêm`
              : <span className="italic">Click dấu + để thêm ảnh mới</span>}
          </p>
        </div>
      )}
    </div>
  )
}
