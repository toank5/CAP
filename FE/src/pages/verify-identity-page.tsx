import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  ChevronRight,
  IdCard,
  Info,
  Loader2,
  ScanFace,
  Upload,
  User,
} from 'lucide-react'
import { ekycApi, parseFaceMatch, parseOcr } from '@/api/ekyc'
import { usersApi } from '@/api/users'
import { CameraCapture } from '@/components/ekyc/camera-capture'
import { CooldownBanner } from '@/components/ekyc/cooldown-banner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { navigate } from '@/hooks/useHashRoute'
import {
  formatEkycError,
  isValidCitizenId,
  setOcrCooldown,
  validateIdImage,
  validateSelfieImage,
} from '@/lib/ekyc-helpers'
import { formatError } from '@/lib/format-error'
import { setCachedVerified } from '@/lib/verification'
import { isLoggedIn, roleHome } from '@/router'
import { useUserProfile } from '@/providers/user-profile-provider'
import type { OcrResultDto } from '@/types'

type Step = 1 | 2

function formatSimilarity(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—'
  const pct = value <= 1 ? value * 100 : value
  return `${Math.round(pct)}%`
}

function parseOcrDob(dob?: string): string {
  if (!dob) return ''
  // FPT AI trả về 'dd/MM/yyyy'
  const m = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return ''
  const [, dd, mm, yyyy] = m
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

export function VerifyIdentityPage() {
  const idInputRef = useRef<HTMLInputElement>(null)
  const selfieInputRef = useRef<HTMLInputElement>(null)
  const { roleLabel, refreshProfile } = useUserProfile()
  // Track cooldown lock để disable nút OCR mà không ép cả page re-render mỗi giây
  const cooldownLockedRef = useRef(false)
  const [cooldownLocked, setCooldownLocked] = useState(false)

  const [step, setStep] = useState<Step>(1)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState('')
  const [manualEntry, setManualEntry] = useState(false)

  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResultDto | null>(null)

  const [_selfieFile, setSelfieFile] = useState<File | null>(null)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [faceSimilarity, setFaceSimilarity] = useState<number | null>(null)
  const [pendingSelfie, setPendingSelfie] = useState<File | null>(null)

  const [ekyc, setEkyc] = useState({ ocr: false, citizenOk: false, face: false })
  const [form, setForm] = useState({
    fullName: '',
    citizenId: '',
    address: '',
    dob: '',
  })

  const isBusy = busy.length > 0

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('login')
    }
  }, [])

  // Lắng nghe tick cooldown từ CooldownBanner thông qua custom event
  // → Tránh re-render toàn trang mỗi giây
  useEffect(() => {
    const onTick = (e: Event) => {
      const remaining = (e as CustomEvent<number>).detail
      const locked = remaining > 0
      if (cooldownLockedRef.current !== locked) {
        cooldownLockedRef.current = locked
        setCooldownLocked(locked)
      }
    }
    window.addEventListener('ocr-cooldown-tick', onTick as EventListener)
    return () => window.removeEventListener('ocr-cooldown-tick', onTick as EventListener)
  }, [])

  useEffect(() => () => {
    if (idCardPreview) URL.revokeObjectURL(idCardPreview)
    if (selfiePreview) URL.revokeObjectURL(selfiePreview)
  }, [idCardPreview, selfiePreview])

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
    setEkyc({ ocr: false, citizenOk: false, face: false })
    setFaceSimilarity(null)
    setSelfieFile(null)
    setPendingSelfie(null)
    if (selfiePreview) {
      URL.revokeObjectURL(selfiePreview)
      setSelfiePreview(null)
    }
  }

  const checkCitizenId = async (citizenId: string): Promise<boolean> => {
    const value = citizenId.trim()
    if (!isValidCitizenId(value)) {
      setMsg({ type: 'error', text: 'Số CCCD phải có 9 hoặc 12 chữ số.' })
      setEkyc((s) => ({ ...s, citizenOk: false }))
      return false
    }
    try {
      await ekycApi.checkCitizenId(value)
      setEkyc((s) => ({ ...s, citizenOk: true }))
      return true
    } catch (err) {
      setEkyc((s) => ({ ...s, citizenOk: false }))
      setMsg({ type: 'error', text: formatEkycError(err) })
      return false
    }
  }

  const applyOcrToForm = (ocr: OcrResultDto) => {
    const addr = ocr.address || ocr.home || ''
    setForm((f) => ({
      ...f,
      fullName: ocr.name || f.fullName,
      citizenId: ocr.id || f.citizenId,
      address: addr || f.address,
      dob: parseOcrDob(ocr.dob) || f.dob,
    }))
  }

  const runOcr = async () => {
    if (!idCardFile) {
      setMsg({ type: 'error', text: 'Chọn ảnh CCCD trước.' })
      return
    }
    if (cooldownLockedRef.current) {
      setMsg({ type: 'warning', text: 'OCR tạm khóa. Hãy chờ một chút hoặc dùng nhập tay.' })
      return
    }

    setBusy('ocr')
    setMsg(null)
    setOcrResult(null)
    setEkyc({ ocr: false, citizenOk: false, face: false })

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

      setMsg({ type: 'success', text: 'Đọc CCCD thành công. Sang bước xác thực khuôn mặt.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatEkycError(err) })
      if (String(formatEkycError(err)).includes('429')) {
        setOcrCooldown(30)
        cooldownLockedRef.current = true
        setCooldownLocked(true)
        window.dispatchEvent(new CustomEvent<number>('ocr-cooldown-tick', { detail: 30_000 }))
      }
    } finally {
      setBusy('')
    }
  }

  const enableManualEntry = () => {
    if (!idCardFile) {
      // Cho phép nhập tay hoàn toàn không cần ảnh CCCD (OCR đang lỗi).
      // Bước xác thực khuôn mặt (step 2) vẫn dùng selfie nên vẫn có thể tiếp tục.
      setMsg({ type: 'info', text: 'Nhập thông tin CCCD bên dưới. Bước xác thực khuôn mặt sẽ yêu cầu ảnh selfie.' })
    } else {
      setMsg({ type: 'info', text: 'Nhập thông tin CCCD bên dưới, sau đó bấm "Kiểm tra số CCCD".' })
    }
    setManualEntry(true)
    setEkyc((s) => ({ ...s, ocr: false, citizenOk: false }))
    setOcrResult(null)
  }

  const verifyManualCitizen = async () => {
    if (!form.fullName.trim()) {
      setMsg({ type: 'error', text: 'Nhập họ và tên trước.' })
      return
    }
    if (!form.address.trim()) {
      setMsg({ type: 'error', text: 'Nhập địa chỉ thường trú trước.' })
      return
    }
    const ok = await checkCitizenId(form.citizenId)
    if (ok) {
      setEkyc((s) => ({ ...s, ocr: true }))
      setMsg({ type: 'success', text: 'CCCD hợp lệ. Sang bước xác thực khuôn mặt.' })
    }
  }

  const queueSelfie = (file: File) => {
    const err = validateSelfieImage(file)
    if (err) {
      setMsg({ type: 'error', text: err })
      return
    }
    setPendingSelfie(file)
    if (selfiePreview) URL.revokeObjectURL(selfiePreview)
    setSelfiePreview(URL.createObjectURL(file))
    setMsg({ type: 'info', text: 'Đã chọn ảnh selfie. Bấm "Xác thực khuôn mặt" để gửi lên hệ thống.' })
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

  const step1Ready =
    ekyc.citizenOk &&
    (ekyc.ocr || manualEntry) &&
    form.fullName.trim().length > 0 &&
    isValidCitizenId(form.citizenId) &&
    form.address.trim().length > 0
  const step2Ready = ekyc.face

  const saveVerifiedInfo = async () => {
    setBusy('save')
    setMsg(null)
    try {
      await usersApi.updateProfile({
        fullName: form.fullName.trim(),
        phoneNumber: null,
        citizenId: form.citizenId.trim(),
        dateOfBirth: form.dob || null,
        address: form.address.trim(),
      })
      await refreshProfile()
      // Đánh dấu đã xác minh để middleware ở App.tsx không redirect lại
      setCachedVerified(true)
      setMsg({ type: 'success', text: 'Xác minh danh tính thành công. Đang chuyển hướng...' })
      window.setTimeout(() => {
        navigate(roleHome(sessionStorage.getItem('userRole') ?? 'Applicant'))
      }, 1200)
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy('')
    }
  }

  const summary = useMemo(
    () => (
      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 dark:border-accent/30 dark:bg-accent/10">
        <p className="text-xs font-bold uppercase tracking-widest text-primary dark:text-accent">
          Thông tin đã xác thực
        </p>
        <div className="mt-2 grid gap-1 text-sm dark:text-slate-200">
          <p>
            <span className="text-slate-500 dark:text-slate-400">Họ tên:</span> {form.fullName || '—'}
          </p>
          <p>
            <span className="text-slate-500 dark:text-slate-400">CCCD:</span> {form.citizenId || '—'}
          </p>
          <p>
            <span className="text-slate-500 dark:text-slate-400">Ngày sinh:</span> {form.dob || '—'}
          </p>
          <p>
            <span className="text-slate-500 dark:text-slate-400">Địa chỉ:</span> {form.address || '—'}
          </p>
          <p>
            <span className="text-slate-500 dark:text-slate-400">Khuôn mặt:</span>{' '}
            {ekyc.face ? `✓ Khớp${faceSimilarity != null ? ` (${formatSimilarity(faceSimilarity)})` : ''}` : '—'}
          </p>
        </div>
      </div>
    ),
    [form.fullName, form.citizenId, form.dob, form.address, ekyc.face, faceSimilarity],
  )

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-6 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-slate-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-slate-300">
        <p className="flex items-start gap-2 font-semibold text-[#003D7A] dark:text-white">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Xác minh danh tính bắt buộc
        </p>
        <p className="mt-2 text-xs leading-relaxed">
          Theo quy định của ứng dụng nhà nước, mỗi CCCD chỉ được đăng ký một tài khoản. Vui lòng chuẩn bị ảnh CCCD mặt trước rõ nét
          và sẵn sàng chụp selfie. Thông tin từ CCCD sẽ tự động được lưu vào tài khoản của bạn sau khi xác minh thành công.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" />
            Vai trò: {roleLabel || '—'}
          </CardTitle>
          <CardDescription>Bạn đang đăng nhập với vai trò này. Quy trình áp dụng cho tất cả người dùng.</CardDescription>
        </CardHeader>
      </Card>

      <ol className="grid grid-cols-2 gap-2">
        {[
          { id: 1 as Step, label: 'CCCD', icon: IdCard },
          { id: 2 as Step, label: 'Khuôn mặt', icon: ScanFace },
        ].map((s) => {
          const isActive = s.id === step
          const isDone = (s.id === 1 && ekyc.citizenOk) || (s.id === 2 && ekyc.face)
          const Icon = s.icon
          return (
            <li
              key={s.id}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-center text-xs font-semibold transition ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary dark:bg-accent/10'
                  : isDone
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isActive
                    ? 'bg-primary text-white'
                    : isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span className="leading-tight">Bước {s.id}</span>
              <span className="text-[10px] font-medium opacity-80">{s.label}</span>
            </li>
          )
        })}
      </ol>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.section
            key="s1"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <IdCard className="h-5 w-5 text-primary" />
                  Bước 1 — Xác thực CCCD
                </CardTitle>
                <CardDescription>Upload ảnh CCCD mặt trước rõ nét (≤ 5 MB).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Chọn ảnh CCCD" htmlFor="cccd-file">
                  <input
                    ref={idInputRef}
                    id="cccd-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 dark:file:bg-accent/20 dark:file:text-accent"
                    disabled={isBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) selectIdCard(f)
                      e.target.value = ''
                    }}
                  />
                </FormField>

                {idCardPreview && (
                  <img
                    src={idCardPreview}
                    alt="Ảnh CCCD"
                    className="max-h-56 w-full rounded-xl border border-slate-200 bg-white object-contain dark:border-slate-700"
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="accent"
                    disabled={!idCardFile || isBusy || cooldownLocked}
                    onClick={() => void runOcr()}
                  >
                    {busy === 'ocr' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang đọc CCCD…
                      </>
                    ) : (
                      'Đọc thông tin CCCD (OCR)'
                    )}
                  </Button>
                  <Button type="button" variant="outline" disabled={isBusy} onClick={enableManualEntry}>
                    Nhập tay (bỏ qua OCR)
                  </Button>
                </div>

                <CooldownBanner />

                {ocrResult && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">Kết quả OCR</p>
                    <ul className="mt-2 grid gap-1 text-slate-700 dark:text-slate-300 sm:grid-cols-2">
                      <li>
                        <span className="text-slate-500 dark:text-slate-400">Họ tên:</span> {ocrResult.name || '—'}
                      </li>
                      <li>
                        <span className="text-slate-500 dark:text-slate-400">Số CCCD:</span> {ocrResult.id || '—'}
                      </li>
                      <li>
                        <span className="text-slate-500 dark:text-slate-400">Ngày sinh:</span> {ocrResult.dob || '—'}
                      </li>
                      <li className="sm:col-span-2">
                        <span className="text-slate-500 dark:text-slate-400">Địa chỉ:</span>{' '}
                        {ocrResult.address || ocrResult.home || '—'}
                      </li>
                    </ul>
                  </div>
                )}

                {(manualEntry || ocrResult) && (
                  <div className="space-y-3 rounded-xl border-t border-slate-200 pt-4 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Thông tin từ CCCD {manualEntry && !ocrResult ? '(nhập tay — vui lòng kiểm tra)' : ''}
                    </p>
                    <FormField label="Họ và tên" htmlFor="s1-fullName">
                      <Input
                        id="s1-fullName"
                        value={form.fullName}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, fullName: e.target.value }))
                          if (ekyc.citizenOk) setEkyc((s) => ({ ...s, citizenOk: false }))
                        }}
                      />
                    </FormField>
                    <FormField label="Số CCCD (9 hoặc 12 số)" htmlFor="s1-citizenId">
                      <Input
                        id="s1-citizenId"
                        value={form.citizenId}
                        maxLength={12}
                        inputMode="numeric"
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '')
                          setForm((f) => ({ ...f, citizenId: v }))
                          if (ekyc.citizenOk) setEkyc((s) => ({ ...s, citizenOk: false }))
                        }}
                      />
                    </FormField>
                    <FormField label="Ngày sinh" htmlFor="s1-dob">
                      <Input
                        id="s1-dob"
                        type="date"
                        value={form.dob}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, dob: e.target.value }))
                          if (ekyc.citizenOk) setEkyc((s) => ({ ...s, citizenOk: false }))
                        }}
                      />
                    </FormField>
                    <FormField label="Địa chỉ thường trú" htmlFor="s1-address">
                      <Input
                        id="s1-address"
                        value={form.address}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, address: e.target.value }))
                          if (ekyc.citizenOk) setEkyc((s) => ({ ...s, citizenOk: false }))
                        }}
                      />
                    </FormField>
                    {manualEntry && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => void verifyManualCitizen()}
                      >
                        Kiểm tra số CCCD
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="accent"
                    disabled={!step1Ready || isBusy}
                    onClick={() => {
                      setMsg(null)
                      setStep(2)
                    }}
                  >
                    Tiếp tục xác thực khuôn mặt <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            key="s2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ScanFace className="h-5 w-5 text-primary" />
                  Bước 2 — Xác thực khuôn mặt
                </CardTitle>
                <CardDescription>Chụp selfie hoặc upload ảnh. Hệ thống sẽ so khớp với ảnh CCCD ở bước 1.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary}

                <CameraCapture mode="photo" onPhoto={(file) => queueSelfie(file)} />

                <div className="text-center text-xs text-slate-400">hoặc upload ảnh selfie</div>
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 dark:file:bg-accent/20 dark:file:text-accent"
                  disabled={isBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) queueSelfie(f)
                    e.target.value = ''
                  }}
                />

                {selfiePreview && (
                  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                    <img
                      src={selfiePreview}
                      alt="Selfie"
                      className="h-20 w-20 rounded-full border-2 border-white object-cover shadow dark:border-slate-800"
                    />
                    <div className="text-sm">
                      <p
                        className={`font-semibold ${
                          ekyc.face ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {ekyc.face ? '✓ Đã xác thực' : 'Chưa xác thực'}
                      </p>
                      {faceSimilarity != null && (
                        <p className="text-slate-500 dark:text-slate-400">Độ khớp: {formatSimilarity(faceSimilarity)}</p>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="accent"
                  disabled={!pendingSelfie || isBusy}
                  onClick={() => void runFaceMatch()}
                >
                  {busy === 'face' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xác thực…
                    </>
                  ) : (
                    'Xác thực khuôn mặt'
                  )}
                </Button>

                <div className="flex flex-wrap justify-between gap-2 pt-2">
                  <Button type="button" variant="outline" disabled={isBusy} onClick={() => setStep(1)}>
                    ← Quay lại
                  </Button>
                  <Button
                    type="button"
                    variant="accent"
                    disabled={!step2Ready || isBusy}
                    onClick={() => void saveVerifiedInfo()}
                  >
                    {busy === 'save' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang lưu…
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" /> Lưu thông tin &amp; hoàn tất
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>

      {msg && (
        <Alert
          variant={
            msg.type === 'error' ? 'error' : msg.type === 'warning' ? 'warning' : msg.type === 'info' ? 'info' : 'success'
          }
        >
          {msg.text}
        </Alert>
      )}
    </div>
    </div>
  )
}