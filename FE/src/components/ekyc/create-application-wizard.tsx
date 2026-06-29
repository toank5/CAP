import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronRight, IdCard, Info, Loader2, ScanFace, UserCheck } from 'lucide-react'
import { housingApplicationsApi } from '@/api/housing-applications'
import { housingProjectsApi } from '@/api/housing-projects'
import { ekycApi, parseFaceMatch, parseLiveness, parseOcr } from '@/api/ekyc'
import { CameraCapture } from '@/components/ekyc/camera-capture'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input, Select } from '@/components/ui/input'
import { navigate } from '@/hooks/useHashRoute'
import { HOUSING_STATUS_LABELS } from '@/lib/constants'
import {
  formatCooldown,
  formatEkycError,
  getOcrCooldownRemainingMs,
  isValidCitizenId,
  setOcrCooldown,
  validateIdImage,
  validateLivenessVideo,
  validateSelfieImage,
} from '@/lib/ekyc-helpers'
import { extractApplicationId, extractProjects } from '@/lib/parsers'
import type { OcrResultDto } from '@/types'

type Step = 1 | 2 | 3

interface EkycState {
  ocr: boolean
  citizenOk: boolean
  face: boolean
  liveness: boolean
}

function formatSimilarity(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—'
  const pct = value <= 1 ? value * 100 : value
  return `${Math.round(pct)}%`
}

function StepBadge({ n, label, done, active }: { n: number; label: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? 'bg-primary/10 font-semibold text-primary' : done ? 'text-emerald-700' : 'text-slate-500'}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-primary text-white' : 'bg-slate-100'}`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </span>
      {label}
    </div>
  )
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 text-sm ${ok ? 'text-emerald-700' : 'text-slate-500'}`}>
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-slate-300" />}
      {label}
    </li>
  )
}

export function CreateApplicationWizard() {
  const idInputRef = useRef<HTMLInputElement>(null)
  const selfieInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(1)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [busy, setBusy] = useState('')
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [cooldownMs, setCooldownMs] = useState(0)
  const [manualEntry, setManualEntry] = useState(false)

  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResultDto | null>(null)

  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [faceSimilarity, setFaceSimilarity] = useState<number | null>(null)
  const [pendingSelfie, setPendingSelfie] = useState<File | null>(null)

  const [livenessVideo, setLivenessVideo] = useState<File | null>(null)

  const [ekyc, setEkyc] = useState<EkycState>({ ocr: false, citizenOk: false, face: false, liveness: false })

  const [form, setForm] = useState({
    projectId: '',
    fullName: '',
    citizenId: '',
    occupation: '',
    workPlace: '',
    currentResidence: '',
    permanentAddress: '',
    housingStatus: 'NO_HOUSE',
    estimatedMonthlyIncome: '',
  })

  const isBusy = busy.length > 0

  useEffect(() => {
    void housingProjectsApi.list().then((data) => {
      const items = extractProjects(data).filter((p) => p.id).map((p) => ({
        id: p.id!,
        name: p.projectName || p.name || 'Dự án',
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

  useEffect(() => {
    const tick = () => setCooldownMs(getOcrCooldownRemainingMs())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => () => {
    if (idCardPreview) URL.revokeObjectURL(idCardPreview)
    if (selfiePreview) URL.revokeObjectURL(selfiePreview)
  }, [idCardPreview, selfiePreview])

  const applyOcrToForm = (ocr: OcrResultDto) => {
    const addr = ocr.address || ocr.home || ''
    setForm((f) => ({
      ...f,
      fullName: ocr.name || f.fullName,
      citizenId: ocr.id || f.citizenId,
      currentResidence: addr || f.currentResidence,
      permanentAddress: addr || f.permanentAddress,
    }))
  }

  const selectIdCard = (file: File) => {
    const err = validateIdImage(file)
    if (err) {
      setMsg({ type: 'error', text: err })
      return
    }
    setMsg(null)
    setManualEntry(false)
    setIdCardFile(file)
    const preview = URL.createObjectURL(file)
    setIdCardPreview((old) => { if (old) URL.revokeObjectURL(old); return preview })
    setOcrResult(null)
    setEkyc({ ocr: false, citizenOk: false, face: false, liveness: false })
    setFaceSimilarity(null)
    setSelfieFile(null)
    setPendingSelfie(null)
    setSelfiePreview((old) => { if (old) URL.revokeObjectURL(old); return null })
  }

  const checkCitizenId = async (citizenId: string): Promise<boolean> => {
    if (!isValidCitizenId(citizenId)) {
      setMsg({ type: 'error', text: 'Số CCCD phải đủ 12 chữ số.' })
      setEkyc((s) => ({ ...s, citizenOk: false }))
      return false
    }
    try {
      await ekycApi.checkCitizenId(citizenId.trim())
      setEkyc((s) => ({ ...s, citizenOk: true }))
      return true
    } catch (err) {
      setEkyc((s) => ({ ...s, citizenOk: false }))
      setMsg({ type: 'error', text: formatEkycError(err) })
      return false
    }
  }

  const runOcr = async () => {
    if (!idCardFile) {
      setMsg({ type: 'error', text: 'Chọn ảnh CCCD trước.' })
      return
    }
    if (cooldownMs > 0) {
      setMsg({ type: 'warning', text: `OCR tạm khóa do giới hạn API. Thử lại sau ${formatCooldown(cooldownMs)} hoặc dùng nhập tay.` })
      return
    }

    setBusy('ocr')
    setMsg(null)
    setOcrResult(null)
    setEkyc((s) => ({ ...s, ocr: false, citizenOk: false, face: false }))
    setFaceSimilarity(null)

    try {
      const data = await ekycApi.ocr(idCardFile)
      const ocr = parseOcr(data)
      if (!ocr?.id && !ocr?.name) {
        setMsg({ type: 'error', text: 'Không trích xuất được thông tin. Dùng ảnh mặt trước CCCD rõ nét, không bị lóa hoặc mờ.' })
        return
      }
      setOcrResult(ocr)
      applyOcrToForm(ocr)
      setEkyc((s) => ({ ...s, ocr: true }))
      setManualEntry(false)

      if (ocr.id) {
        const ok = await checkCitizenId(ocr.id)
        if (!ok) return
      }

      setMsg({ type: 'success', text: 'Đọc CCCD thành công. Kiểm tra thông tin rồi sang bước xác thực khuôn mặt.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatEkycError(err) })
      if (String(formatEkycError(err)).includes('429') || String(err).includes('429')) {
        setOcrCooldown(30)
        setCooldownMs(getOcrCooldownRemainingMs())
      }
    } finally {
      setBusy('')
    }
  }

  const enableManualEntry = async () => {
    if (!idCardFile) {
      setMsg({ type: 'error', text: 'Vẫn cần upload ảnh CCCD (để so khớp khuôn mặt ở bước 2).' })
      return
    }
    setManualEntry(true)
    setEkyc((s) => ({ ...s, ocr: false, citizenOk: false }))
    setOcrResult(null)
    setMsg({ type: 'warning', text: 'Nhập tay thông tin CCCD bên dưới, sau đó bấm "Kiểm tra số CCCD".' })
  }

  const verifyManualCitizen = async () => {
    if (!form.fullName.trim()) {
      setMsg({ type: 'error', text: 'Nhập họ và tên.' })
      return
    }
    const ok = await checkCitizenId(form.citizenId)
    if (ok) setMsg({ type: 'success', text: 'Số CCCD hợp lệ. Có thể sang bước xác thực khuôn mặt.' })
  }

  const queueSelfie = (file: File) => {
    const err = validateSelfieImage(file)
    if (err) {
      setMsg({ type: 'error', text: err })
      return
    }
    setPendingSelfie(file)
    const preview = URL.createObjectURL(file)
    setSelfiePreview((old) => { if (old) URL.revokeObjectURL(old); return preview })
    setMsg({ type: 'success', text: 'Đã chọn ảnh selfie. Bấm "Xác thực khuôn mặt" để gửi lên hệ thống.' })
  }

  const runFaceMatch = async () => {
    const faceFile = pendingSelfie
    if (!idCardFile) {
      setMsg({ type: 'error', text: 'Cần ảnh CCCD từ bước 1.' })
      return
    }
    if (!faceFile) {
      setMsg({ type: 'error', text: 'Chụp hoặc chọn ảnh selfie trước.' })
      return
    }

    setBusy('face')
    setMsg(null)

    try {
      const data = await ekycApi.faceMatch(faceFile, idCardFile)
      const result = parseFaceMatch(data)
      setFaceSimilarity(result?.similarity ?? null)
      if (!result?.isMatch) {
        setEkyc((s) => ({ ...s, face: false }))
        setMsg({
          type: 'error',
          text: `Khuôn mặt chưa khớp (${formatSimilarity(result?.similarity)}). Chụp lại selfie cùng người trên CCCD, ánh sáng đủ, không đeo khẩu trang.`,
        })
        return
      }
      setSelfieFile(faceFile)
      setEkyc((s) => ({ ...s, face: true }))
      setMsg({ type: 'success', text: `Xác thực khuôn mặt thành công — độ khớp ${formatSimilarity(result?.similarity)}.` })
    } catch (err) {
      setEkyc((s) => ({ ...s, face: false }))
      setMsg({ type: 'error', text: formatEkycError(err) })
    } finally {
      setBusy('')
    }
  }

  const runLiveness = async (videoFile: File) => {
    const selfie = selfieFile ?? pendingSelfie
    if (!selfie) {
      setMsg({ type: 'error', text: 'Hoàn thành xác thực khuôn mặt trước khi kiểm tra liveness.' })
      return
    }
    const err = validateLivenessVideo(videoFile)
    if (err) {
      setMsg({ type: 'error', text: err })
      return
    }

    setBusy('liveness')
    setMsg(null)
    setLivenessVideo(videoFile)

    try {
      const data = await ekycApi.liveness(videoFile, selfie)
      const result = parseLiveness(data)
      if (!result?.isLive) {
        setEkyc((s) => ({ ...s, liveness: false }))
        setMsg({ type: 'error', text: result?.livenessMessage || result?.warning || 'Liveness thất bại. Quay lại video 3–5 giây, nhìn thẳng camera.' })
        return
      }
      setEkyc((s) => ({ ...s, liveness: true }))
      setMsg({ type: 'success', text: 'Xác minh liveness thành công.' })
    } catch (err) {
      setEkyc((s) => ({ ...s, liveness: false }))
      setMsg({ type: 'error', text: formatEkycError(err) })
    } finally {
      setBusy('')
    }
  }

  const step1Ready = idCardFile && ekyc.citizenOk && (ekyc.ocr || manualEntry) && form.fullName.trim() && isValidCitizenId(form.citizenId)
  const canGoStep3 = ekyc.face
  const canSubmit = canGoStep3 && form.projectId && form.fullName && isValidCitizenId(form.citizenId)
    && form.currentResidence && form.permanentAddress && form.estimatedMonthlyIncome

  const stepSummary = useMemo(() => (
    <div className="mb-6 grid gap-2 sm:grid-cols-3">
      <StepBadge n={1} label="Quét CCCD" done={!!step1Ready} active={step === 1} />
      <StepBadge n={2} label="Xác thực khuôn mặt" done={ekyc.face} active={step === 2} />
      <StepBadge n={3} label="Tạo hồ sơ" done={false} active={step === 3} />
    </div>
  ), [step1Ready, ekyc.face, step])

  const submit = async () => {
    if (!canSubmit) return
    setBusy('submit')
    setMsg(null)
    try {
      const data = await housingApplicationsApi.create({
        projectId: form.projectId,
        fullName: form.fullName.trim(),
        citizenId: form.citizenId.trim(),
        occupation: form.occupation || null,
        workPlace: form.workPlace || null,
        currentResidence: form.currentResidence,
        permanentAddress: form.permanentAddress,
        housingStatus: form.housingStatus,
        estimatedMonthlyIncome: parseFloat(form.estimatedMonthlyIncome) || 0,
      })
      const appId = extractApplicationId(data)
      if (appId) {
        sessionStorage.setItem('applicationId', appId)
        setTimeout(() => navigate('application-detail'), 800)
      }
      setMsg({ type: 'success', text: 'Tạo hồ sơ nháp thành công.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatEkycError(err) })
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-4 text-sm text-slate-700">
        <p className="flex items-start gap-2 font-semibold text-[#003D7A]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Hướng dẫn test eKYC
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed">
          <li>Ảnh CCCD: mặt trước, rõ nét, ≤ 5MB (JPEG/PNG).</li>
          <li>Mỗi lần bấm &quot;Đọc CCCD&quot; = 1 lượt gọi API — tránh bấm liên tục.</li>
          <li>Selfie phải cùng người trên CCCD; face match cần ảnh CCCD từ bước 1.</li>
          <li>Nếu báo lỗi 429: đợi ~30 phút hoặc dùng &quot;Nhập tay thông tin&quot;.</li>
        </ul>
      </div>

      {stepSummary}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-secondary/30 px-4 py-3">
        <CheckItem ok={!!idCardFile} label="Đã chọn ảnh CCCD" />
        <CheckItem ok={ekyc.ocr || manualEntry} label="Đã có thông tin CCCD" />
        <CheckItem ok={ekyc.citizenOk} label="CCCD hợp lệ" />
        <CheckItem ok={ekyc.face} label="Face match" />
        <CheckItem ok={ekyc.liveness} label="Liveness (tùy chọn)" />
      </ul>

      {step === 1 && (
        <section className="gov-card space-y-4 p-5">
          <div className="flex items-center gap-2 text-[#003D7A]">
            <IdCard className="h-5 w-5" />
            <h3 className="font-bold">Bước 1 — Quét ảnh CCCD (mặt trước)</h3>
          </div>

          <FormField label="Chọn ảnh CCCD" htmlFor="cccd-file">
            <input
              ref={idInputRef}
              id="cccd-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-sm"
              disabled={isBusy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) selectIdCard(f)
                e.target.value = ''
              }}
            />
          </FormField>

          {idCardPreview && (
            <img src={idCardPreview} alt="Ảnh CCCD" className="max-h-52 w-full rounded-lg border bg-white object-contain" />
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="accent" disabled={!idCardFile || isBusy || cooldownMs > 0} onClick={() => void runOcr()}>
              {busy === 'ocr' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang đọc CCCD...</> : 'Đọc thông tin CCCD (OCR)'}
            </Button>
            <Button type="button" variant="outline" disabled={!idCardFile || isBusy} onClick={() => void enableManualEntry()}>
              Nhập tay thông tin
            </Button>
          </div>

          {cooldownMs > 0 && (
            <p className="flex items-center gap-2 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4" />
              OCR tạm khóa — thử lại sau {formatCooldown(cooldownMs)} hoặc nhập tay.
            </p>
          )}

          {ocrResult && (
            <div className="rounded-lg bg-emerald-50 p-4 text-sm ring-1 ring-emerald-100">
              <p className="font-semibold text-emerald-800">Kết quả OCR</p>
              <ul className="mt-2 space-y-1 text-slate-700">
                <li><span className="text-slate-500">Họ tên:</span> {ocrResult.name || '—'}</li>
                <li><span className="text-slate-500">Số CCCD:</span> {ocrResult.id || '—'}</li>
                <li><span className="text-slate-500">Ngày sinh:</span> {ocrResult.dob || '—'}</li>
                <li><span className="text-slate-500">Địa chỉ:</span> {ocrResult.address || ocrResult.home || '—'}</li>
              </ul>
            </div>
          )}

          {(manualEntry || ocrResult) && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium text-slate-700">Thông tin từ CCCD {manualEntry && !ocrResult ? '(nhập tay)' : ''}</p>
              <FormField label="Họ và tên" htmlFor="s1-fullName">
                <Input id="s1-fullName" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              </FormField>
              <FormField label="Số CCCD (12 số)" htmlFor="s1-citizenId">
                <Input id="s1-citizenId" value={form.citizenId} maxLength={12} onChange={(e) => {
                  setForm((f) => ({ ...f, citizenId: e.target.value.replace(/\D/g, '') }))
                  setEkyc((s) => ({ ...s, citizenOk: false }))
                }} />
              </FormField>
              <FormField label="Nơi ở / thường trú" htmlFor="s1-address">
                <Input id="s1-address" value={form.currentResidence} onChange={(e) => setForm((f) => ({
                  ...f,
                  currentResidence: e.target.value,
                  permanentAddress: e.target.value,
                }))} />
              </FormField>
              {manualEntry && (
                <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => void verifyManualCitizen()}>
                  Kiểm tra số CCCD
                </Button>
              )}
            </div>
          )}

          <Button type="button" variant="accent" disabled={!step1Ready || isBusy} onClick={() => { setMsg(null); setStep(2) }}>
            Tiếp tục xác thực khuôn mặt <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="gov-card space-y-4 p-5">
          <div className="flex items-center gap-2 text-[#003D7A]">
            <ScanFace className="h-5 w-5" />
            <h3 className="font-bold">Bước 2 — Xác thực khuôn mặt</h3>
          </div>
          <p className="text-sm text-slate-600">
            Chụp selfie hoặc upload ảnh, sau đó bấm <strong>Xác thực khuôn mặt</strong> (mỗi lần bấm = 1 lượt gọi API).
          </p>

          <CameraCapture mode="photo" onPhoto={(file) => queueSelfie(file)} />

          <div className="text-center text-xs text-slate-400">hoặc upload ảnh selfie</div>
          <input
            ref={selfieInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm"
            disabled={isBusy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) queueSelfie(f)
              e.target.value = ''
            }}
          />

          {selfiePreview && (
            <div className="flex items-center gap-4 rounded-lg bg-secondary/30 p-3">
              <img src={selfiePreview} alt="Selfie" className="h-20 w-20 rounded-full border-2 border-white object-cover shadow" />
              <div className="text-sm">
                <p className="font-medium">{ekyc.face ? '✓ Đã xác thực' : 'Chưa xác thực'}</p>
                {faceSimilarity != null && <p className="text-slate-500">Độ khớp: {formatSimilarity(faceSimilarity)}</p>}
              </div>
            </div>
          )}

          <Button type="button" variant="accent" disabled={!pendingSelfie || isBusy} onClick={() => void runFaceMatch()}>
            {busy === 'face' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xác thực...</> : 'Xác thực khuôn mặt'}
          </Button>

          <details className="rounded-lg border border-dashed border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-medium">Liveness (tùy chọn)</summary>
            <p className="mt-2 text-xs text-slate-500">Quay video selfie 4 giây sau khi face match thành công.</p>
            <div className="mt-3">
              <CameraCapture
                mode="video"
                maxVideoSeconds={4}
                onVideo={(video) => void runLiveness(video)}
              />
            </div>
            {livenessVideo && <p className="mt-2 text-xs text-slate-500">{livenessVideo.name} · {ekyc.liveness ? '✓ Đạt' : 'Chưa đạt'}</p>}
          </details>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={isBusy} onClick={() => setStep(1)}>Quay lại</Button>
            <Button type="button" variant="accent" disabled={!canGoStep3 || isBusy} onClick={() => setStep(3)}>
              Điền hồ sơ <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="gov-card space-y-4 p-5">
          <div className="flex items-center gap-2 text-[#003D7A]">
            <UserCheck className="h-5 w-5" />
            <h3 className="font-bold">Bước 3 — Thông tin đăng ký</h3>
          </div>

          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            ✓ Đã xác thực CCCD và khuôn mặt{ekyc.liveness ? ' · Liveness' : ''}
          </div>

          <FormField label="Dự án nhà ở" htmlFor="projectId">
            <Select id="projectId" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} required>
              <option value="">{projects.length ? 'Chọn dự án' : 'Chưa có dự án'}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Họ và tên" htmlFor="fullName">
            <Input id="fullName" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
          </FormField>
          <FormField label="Số CCCD" htmlFor="citizenId">
            <Input id="citizenId" value={form.citizenId} readOnly className="bg-slate-50" />
          </FormField>
          <FormField label="Nghề nghiệp" htmlFor="occupation">
            <Input id="occupation" value={form.occupation} onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))} />
          </FormField>
          <FormField label="Nơi làm việc" htmlFor="workPlace">
            <Input id="workPlace" value={form.workPlace} onChange={(e) => setForm((f) => ({ ...f, workPlace: e.target.value }))} />
          </FormField>
          <FormField label="Nơi ở hiện tại" htmlFor="currentResidence">
            <Input id="currentResidence" value={form.currentResidence} onChange={(e) => setForm((f) => ({ ...f, currentResidence: e.target.value }))} required />
          </FormField>
          <FormField label="Địa chỉ thường trú/tạm trú" htmlFor="permanentAddress">
            <Input id="permanentAddress" value={form.permanentAddress} onChange={(e) => setForm((f) => ({ ...f, permanentAddress: e.target.value }))} required />
          </FormField>
          <FormField label="Thực trạng nhà ở" htmlFor="housingStatus">
            <Select id="housingStatus" value={form.housingStatus} onChange={(e) => setForm((f) => ({ ...f, housingStatus: e.target.value }))} required>
              {Object.entries(HOUSING_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FormField>
          <FormField label="Thu nhập hàng tháng (VNĐ)" htmlFor="estimatedMonthlyIncome">
            <Input id="estimatedMonthlyIncome" type="number" min={0} value={form.estimatedMonthlyIncome} onChange={(e) => setForm((f) => ({ ...f, estimatedMonthlyIncome: e.target.value }))} required />
          </FormField>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={isBusy} onClick={() => setStep(2)}>Quay lại</Button>
            <Button type="button" variant="accent" disabled={!canSubmit || isBusy} onClick={() => void submit()}>
              {busy === 'submit' ? 'Đang tạo...' : 'Tạo hồ sơ nháp'}
            </Button>
          </div>
        </section>
      )}

      {msg && (
        <Alert variant={msg.type === 'error' ? 'error' : msg.type === 'warning' ? 'warning' : 'success'}>
          {msg.text}
        </Alert>
      )}
    </div>
  )
}
