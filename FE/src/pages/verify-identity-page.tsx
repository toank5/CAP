import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  IdCard,
  Info,
  Loader2,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  Upload,
  User,
  FileCheck,
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
import { getRole, isLoggedIn, roleHome } from '@/router'
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

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-6 dark:from-slate-900 dark:to-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Navigation Bar with Back Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate(isLoggedIn() ? roleHome(getRole()) : 'landing')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            Quay lại màn chính
          </button>

          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Cổng Định Danh Điện Tử eKYC Quốc Gia
          </div>
        </div>

        {/* Hero Notice Banner */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/90 p-5 text-sm text-slate-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-slate-300 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#003D7A] text-white shadow-xs">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#003D7A] dark:text-white">
                Xác minh danh tính bắt buộc cho hồ sơ Nhà ở Xã hội
              </h2>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Theo quy định của ứng dụng nhà nước và Sở Xây dựng, mỗi Căn cước công dân (CCCD) chỉ được đăng ký một tài khoản duy nhất. Vui lòng chuẩn bị ảnh CCCD mặt trước rõ nét và sẵn sàng chụp selfie. Thông tin từ CCCD sẽ tự động được lưu vào tài khoản của bạn sau khi xác minh thành công.
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Verification Steps & Main Cards (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            {/* Step Navigation Tabs */}
            <ol className="grid grid-cols-2 gap-3">
              {[
                { id: 1 as Step, label: 'Ảnh CCCD & OCR', icon: IdCard },
                { id: 2 as Step, label: 'Khuôn mặt sinh trắc học', icon: ScanFace },
              ].map((s) => {
                const isActive = s.id === step
                const isDone = (s.id === 1 && ekyc.citizenOk) || (s.id === 2 && ekyc.face)
                const Icon = s.icon
                return (
                  <li
                    key={s.id}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition shadow-xs ${isActive
                        ? 'border-primary bg-primary/10 text-primary dark:bg-accent/10 ring-2 ring-primary/20'
                        : isDone
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300'
                          : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                      }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${isActive
                          ? 'bg-primary text-white shadow-xs'
                          : isDone
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                    >
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-wider">Bước {s.id}</span>
                      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{s.label}</span>
                    </div>
                  </li>
                )
              })}
            </ol>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.section
                  key="s1"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <IdCard className="h-5 w-5 text-primary" />
                        Bước 1 — Xác thực ảnh CCCD &amp; Trích xuất thông tin
                      </CardTitle>
                      <CardDescription>Upload ảnh Căn cước công dân mặt trước rõ nét (định dạng JPG, PNG, WEBP ≤ 5 MB).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField label="Chọn ảnh CCCD mặt trước" htmlFor="cccd-file">
                        <input
                          ref={idInputRef}
                          id="cccd-file"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-xs file:font-bold file:text-primary hover:file:bg-primary/20 dark:file:bg-accent/20 dark:file:text-accent cursor-pointer"
                          disabled={isBusy}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) selectIdCard(f)
                            e.target.value = ''
                          }}
                        />
                      </FormField>

                      {idCardPreview && (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/50">
                          <img
                            src={idCardPreview}
                            alt="Ảnh CCCD"
                            className="max-h-64 w-full rounded-xl bg-white object-contain dark:bg-slate-800"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <Button
                          type="button"
                          variant="accent"
                          disabled={!idCardFile || isBusy || cooldownLocked}
                          onClick={() => void runOcr()}
                          className="cursor-pointer"
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
                        <Button type="button" variant="outline" disabled={isBusy} onClick={enableManualEntry} className="cursor-pointer">
                          Nhập tay (bỏ qua OCR)
                        </Button>
                      </div>

                      <CooldownBanner />

                      {ocrResult && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                          <p className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Kết quả nhận diện OCR tự động
                          </p>
                          <ul className="mt-2.5 grid gap-2 text-xs text-slate-700 dark:text-slate-300 sm:grid-cols-2">
                            <li className="rounded-lg bg-white/70 p-2 dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-900/30">
                              <span className="text-slate-400 block font-medium">Họ tên:</span>
                              <strong className="text-slate-900 dark:text-white font-bold">{ocrResult.name || '—'}</strong>
                            </li>
                            <li className="rounded-lg bg-white/70 p-2 dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-900/30">
                              <span className="text-slate-400 block font-medium">Số CCCD:</span>
                              <strong className="text-slate-900 dark:text-white font-bold">{ocrResult.id || '—'}</strong>
                            </li>
                            <li className="rounded-lg bg-white/70 p-2 dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-900/30">
                              <span className="text-slate-400 block font-medium">Ngày sinh:</span>
                              <strong className="text-slate-900 dark:text-white font-bold">{ocrResult.dob || '—'}</strong>
                            </li>
                            <li className="rounded-lg bg-white/70 p-2 dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-900/30">
                              <span className="text-slate-400 block font-medium">Địa chỉ thường trú:</span>
                              <strong className="text-slate-900 dark:text-white font-bold">{ocrResult.address || ocrResult.home || '—'}</strong>
                            </li>
                          </ul>
                        </div>
                      )}

                      {(manualEntry || ocrResult) && (
                        <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Xác nhận thông tin công dân {manualEntry && !ocrResult ? '(Nhập tay)' : ''}
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
                              className="cursor-pointer"
                            >
                              Kiểm tra số CCCD
                            </Button>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          type="button"
                          variant="accent"
                          disabled={!step1Ready || isBusy}
                          onClick={() => {
                            setMsg(null)
                            setStep(2)
                          }}
                          className="cursor-pointer"
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
                  <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ScanFace className="h-5 w-5 text-primary" />
                        Bước 2 — Xác thực khuôn mặt sinh trắc học
                      </CardTitle>
                      <CardDescription>Chụp ảnh selfie trực tiếp từ camera hoặc upload ảnh chân dung để so khớp với ảnh CCCD.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CameraCapture mode="photo" onPhoto={(file) => queueSelfie(file)} />

                      <div className="text-center text-xs text-slate-400">hoặc tải lên file ảnh selfie</div>
                      <input
                        ref={selfieInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-xs file:font-bold file:text-primary hover:file:bg-primary/20 dark:file:bg-accent/20 dark:file:text-accent cursor-pointer"
                        disabled={isBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) queueSelfie(f)
                          e.target.value = ''
                        }}
                      />

                      {selfiePreview && (
                        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                          <img
                            src={selfiePreview}
                            alt="Selfie"
                            className="h-20 w-20 rounded-full border-2 border-white object-cover shadow-sm dark:border-slate-800"
                          />
                          <div className="text-sm">
                            <p
                              className={`font-bold ${ekyc.face ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'
                                }`}
                            >
                              {ekyc.face ? '✓ Đã xác thực khớp khuôn mặt' : 'Chưa xác thực khuôn mặt'}
                            </p>
                            {faceSimilarity != null && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Độ khớp ảnh CCCD: <strong className="font-bold text-slate-900 dark:text-white">{formatSimilarity(faceSimilarity)}</strong>
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-1">
                        <Button
                          type="button"
                          variant="accent"
                          disabled={!pendingSelfie || isBusy}
                          onClick={() => void runFaceMatch()}
                          className="cursor-pointer"
                        >
                          {busy === 'face' ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Đang so khớp khuôn mặt…
                            </>
                          ) : (
                            'So khớp khuôn mặt sinh trắc học'
                          )}
                        </Button>
                      </div>

                      <div className="flex flex-wrap justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="outline" disabled={isBusy} onClick={() => setStep(1)} className="cursor-pointer">
                          ← Quay lại bước 1
                        </Button>
                        <Button
                          type="button"
                          variant="accent"
                          disabled={!step2Ready || isBusy}
                          onClick={() => void saveVerifiedInfo()}
                          className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                        >
                          {busy === 'save' ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Đang lưu…
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" /> Lưu thông tin &amp; Hoàn tất định danh
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

          {/* Right Column: User Session, Summary & Guidelines (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            {/* User Session Info Card */}
            <Card className="shadow-xs border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-primary" />
                  Tài khoản đang thực hiện
                </CardTitle>
                <CardDescription className="text-xs">
                  Vai trò: <strong className="font-semibold text-slate-800 dark:text-slate-200">{roleLabel || 'Người dùng'}</strong>
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Real-time Verified Summary */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4.5 dark:border-accent/30 dark:bg-accent/10 shadow-xs space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:text-accent">
                <FileCheck className="h-4 w-4" />
                Thông tin đã đối soát
              </p>
              <div className="grid gap-2 text-xs dark:text-slate-200">
                <div className="flex justify-between border-b border-primary/10 pb-1.5 dark:border-accent/20">
                  <span className="text-slate-500 dark:text-slate-400">Họ và tên:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">{form.fullName || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-primary/10 pb-1.5 dark:border-accent/20">
                  <span className="text-slate-500 dark:text-slate-400">Số CCCD:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">{form.citizenId || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-primary/10 pb-1.5 dark:border-accent/20">
                  <span className="text-slate-500 dark:text-slate-400">Ngày sinh:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">{form.dob || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-primary/10 pb-1.5 dark:border-accent/20">
                  <span className="text-slate-500 dark:text-slate-400">Địa chỉ:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right truncate max-w-[180px]">{form.address || '—'}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500 dark:text-slate-400">Sinh trắc khuôn mặt:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-right">
                    {ekyc.face ? `✓ Khớp${faceSimilarity != null ? ` (${formatSimilarity(faceSimilarity)})` : ''}` : 'Chưa hoàn tất'}
                  </span>
                </div>
              </div>
            </div>

            {/* Legal & Shooting Guidelines Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 shadow-xs space-y-3">
              <p className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Lưu ý quan trọng khi định danh
              </p>
              <ul className="space-y-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span><strong>Chụp thẳng góc CCCD:</strong> Không bị lóa bóng đèn, không che khuất số và mã QR.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span><strong>Chụp selfie rõ mặt:</strong> Không đeo kính râm, khẩu trang hoặc đội mũ che kín mặt.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>Dữ liệu được đối soát tự động phục vụ thẩm định hồ sơ theo Nghị định 100/2024/NĐ-CP.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}