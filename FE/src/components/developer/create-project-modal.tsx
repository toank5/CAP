import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Loader2,
  Sparkles,
  Home,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  X,
  Building2,
  ArrowRight,
  ArrowLeft,
  Check,
  ListChecks,
} from 'lucide-react'
import { housingProjectsApi } from '@/api/housing-projects'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/alert'
import { ensureHcmLocationsLoaded, HCM_PROVINCE } from '@/lib/vietnam-locations'
import { formatError } from '@/lib/format-error'
import { FLASH_CREATE_PROJECT_KEY } from '@/lib/constants'
import { navigate } from '@/hooks/useHashRoute'
import type { CreateApartmentDto, CreateHousingProjectRequestDto } from '@/types'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  onCreated?: () => void | Promise<void>
}

const inputClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-50 dark:placeholder:text-slate-500 dark:hover:border-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30 dark:disabled:bg-slate-900/40'
const labelClass =
  'mb-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300'
const requiredDot = <span className="text-rose-500" aria-hidden>*</span>

export function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Lưu ý nghiệp vụ (commit này): Khi CĐT tạo dự án xong, status LUÔN = PENDING.
  // Trạng thái chỉ chuyển khi SXD duyệt (PENDING → UPCOMING), sau đó tự mở sau 30 ngày
  // hoặc SXD bấm "Chuyển sang Đang mở đăng ký" (UPCOMING → OPEN). Vì vậy form tạo
  // không có ô chọn trạng thái, không load status từ BE.
  const [step, setStep] = useState<1 | 2>(1)
  const bodyRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [ward, setWard] = useState('')
  const [street, setStreet] = useState('')
  const [wards, setWards] = useState<string[]>([])
  const [decisionNumber, setDecisionNumber] = useState('')
  // approvalDate & isConfirmed: BỎ — CĐT không được tự nhập "ngày SXD duyệt" /
  // tự tick "đã được SXD phê duyệt". BE sẽ tự set `publicAnnounceAt` khi SXD
  // gọi PATCH status?action=approve (xem ProjectStatusControl).
  const [apartments, setApartments] = useState<
    { unitName: string; area: string; price: string }[]
  >([{ unitName: '', area: '', price: '' }])
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [imagesFiles, setImagesFiles] = useState<File[]>([])

  useEffect(() => {
    if (!open) {
      setProjectName('')
      setDescription('')
      setWard('')
      setStreet('')
      setDecisionNumber('')
      setThumbnailFile(null)
      setImagesFiles([])
      setApartments([{ unitName: '', area: '', price: '' }])
      setError('')
      setStep(1)
      return
    }
    void ensureHcmLocationsLoaded()
      .then(setWards)
      .catch(() => setWards([]))
  }, [open])

  // Khi có lỗi validate, đảm bảo user nhìn thấy alert ngay — scroll tới vị trí alert
  // trong body container (đặc biệt step 2 có nhiều trường, alert nằm xa nút submit).
  useEffect(() => {
    if (!error || !errorRef.current || !bodyRef.current) return
    const alertTop = errorRef.current.offsetTop
    bodyRef.current.scrollTo({ top: Math.max(0, alertTop - 12), behavior: 'smooth' })
  }, [error])

  const validateStep1 = (): string | null => {
    if (!projectName.trim()) return 'Vui lòng nhập tên dự án.'
    if (projectName.trim().length < 5) return 'Tên dự án phải có ít nhất 5 ký tự.'
    if (!ward) return 'Vui lòng chọn phường/xã.'
    if (!decisionNumber.trim()) return 'Vui lòng nhập số quyết định phê duyệt.'
    // approvalDate & isConfirmed: BỎ — SXD sẽ tự set khi duyệt dự án.
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
      if (!r.unitName.trim()) return `Căn #${i + 1}: thiếu tên căn.`
      if (!r.area.trim() || isNaN(parseFloat(r.area)) || parseFloat(r.area) <= 0)
        return `Căn #${i + 1}: diện tích không hợp lệ.`
      if (!r.price.trim() || isNaN(parseFloat(r.price)) || parseFloat(r.price) <= 0)
        return `Căn #${i + 1}: giá không hợp lệ.`
    }
    return null
  }

  const goNext = () => {
    const err = validateStep1()
    if (err) {
      setError(err)
      return
    }
    setError('')
    setStep(2)
  }

  const goPrev = () => {
    setError('')
    setStep(1)
  }

  // Xoá lỗi khi user sửa bất kỳ field nào (step 1 hoặc step 2).
  // effect phụ thuộc vào giá trị từng field → chạy đúng lúc user thay đổi.
  useEffect(() => {
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    projectName,
    ward,
    decisionNumber,
    apartments,
  ])

  // Realtime validity cho step 2 — dùng để disable nút submit khi form invalid.
  // Trùng logic với validateStep2() nhưng trả boolean để dùng trong JSX.
  const isStep2Valid = useMemo(() => validateStep2() === null, [
    apartments,
  ])

  const buildApartmentsPayload = (): CreateApartmentDto[] =>
    apartments
      .filter((r) => r.unitName.trim())
      .map((r) => ({
        unitName: r.unitName.trim(),
        area: parseFloat(r.area) || 0,
        price: parseFloat(r.price) || 0,
      }))

  const updateAptRow = (
    index: number,
    field: 'unitName' | 'area' | 'price',
    value: string,
  ) => {
    setApartments((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    // FIX: Khi ở step 1, Enter trong input sẽ trigger implicit form submission
    // (HTML mặc định khi không có button submit trong form). Trước đây code chạy
    // validateStep2() ngay → báo "chưa thêm căn" dù user chưa sang step 2.
    // → Redirect sang goNext để đồng nhất UX với click nút "Tiếp tục".
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
      const aptPayload = buildApartmentsPayload()
      const areas = aptPayload.map((a) => a.area)
      const prices = aptPayload.map((a) => a.price)
      const body: CreateHousingProjectRequestDto = {
        projectName: projectName.trim(),
        description: description.trim(),
        province: HCM_PROVINCE,
        district: ward.trim(),
        street: street.trim() || undefined,
        ward: ward.trim() || undefined,
        address: [street.trim(), ward.trim(), HCM_PROVINCE].filter(Boolean).join(', '),
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        minArea: areas.length ? Math.min(...areas) : 0,
        maxArea: areas.length ? Math.max(...areas) : 0,
        availableUnits: aptPayload.length,
        decisionNumber: decisionNumber.trim() || undefined,
        isConfirmed: true,
        housingProjectStatusId: 'f4f45259-46f8-4061-9916-7ede2422c159',
        thumbnailFile: thumbnailFile ?? undefined,
        imagesFiles: imagesFiles.length > 0 ? imagesFiles : undefined,
        apartments: aptPayload,
      }
      await housingProjectsApi.create(body)
      try {
        await onCreated?.()
      } catch (cbErr) {
        // onCreated có thể reload list, throw thì vẫn đóng modal — không để kẹt loading
        console.warn('[CreateProjectModal] onCreated callback error:', cbErr)
      }
      // Lưu tên dự án để trang projects hiện banner "Tạo dự án thành công"
      try {
        sessionStorage.setItem(FLASH_CREATE_PROJECT_KEY, body.projectName)
      } catch {
        // sessionStorage có thể không khả dụng (cookie tắt, private mode) — bỏ qua
      }
      onClose()
      setTimeout(() => navigate('projects'), 100)
    } catch (err) {
      console.error('[CreateProjectModal] create error:', err)
      setError(formatError(err))
      // KHÔNG setSubmitting(false) ở đây — để finally lo
    } finally {
      // Luôn reset submitting, dù success/error/abort đều đảm bảo button không bị kẹt
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
    return {
      count: filled.length,
      minArea: Math.min(...areas).toFixed(1),
      maxArea: Math.max(...areas).toFixed(1),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((a, b) => a + b, 0) / filled.length,
    }
  }, [apartments])
// Auto-clear error khi user sửa bất kỳ field nào (UX mượt hơn, đỡ bị dính alert cũ)
useEffect(() => {
  if (!error) return
  const t = setTimeout(() => setError(''), 0)
  return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  projectName,
  description,
  ward,
  street,
  decisionNumber,
  apartments,
])

  return (
    <Modal open={open} onClose={submitting ? () => undefined : onClose} size="xl" fullHeight>
      <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col">
        {/* === Header === */}
        <header className="mb-1 flex items-center justify-between gap-4 border-b border-slate-200/70 pb-1 dark:border-slate-700/60">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
                <Building2 className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Tạo dự án nhà ở mới
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Nhập đầy đủ thông tin theo quy định của Sở Xây dựng.
                </p>
              </div>
            </div>
          </div>
          {aptSummary && (
            <div className="hidden shrink-0 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1.5 text-right text-[10px] dark:border-emerald-500/30 dark:bg-emerald-950/30 lg:block">
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                {aptSummary.count} căn · {aptSummary.minArea}–{aptSummary.maxArea} m²
              </p>
              <p className="text-emerald-600/80 dark:text-emerald-300/80">
                {fmtVnd(aptSummary.minPrice)} – {fmtVnd(aptSummary.maxPrice)}
              </p>
            </div>
          )}
        </header>

        {/* === Stepper === */}
        <div className="mb-1">
          <Stepper current={step} />
        </div>

        {error && (
          <div ref={errorRef} className="mb-1">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {/* === Body: Step 1 — Thông tin dự án (1 viewport, flat grid, không scroll) === */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto overflow-x-hidden pr-1">
          {step === 1 && (
            <div className="grid gap-x-3 gap-y-2 md:grid-cols-12">
              <div className="md:col-span-12 rounded-md border border-sky-200/70 bg-sky-50/60 px-3 py-2 text-[11px] text-slate-700 dark:border-sky-500/30 dark:bg-sky-950/30 dark:text-slate-200">
                <strong className="font-semibold">Lưu ý:</strong> Dự án sau khi tạo sẽ ở trạng thái{' '}
                <span className="font-semibold text-amber-700 dark:text-amber-300">Chờ phê duyệt</span>{' '}
                (Sở Xây dựng xem xét). Khi được duyệt, dự án chuyển sang{' '}
                <span className="font-semibold">Sắp mở bán</span> và{' '}
                <span className="font-semibold">tự mở đăng ký sau 30 ngày</span> (hoặc Sở có thể chuyển
                sớm hơn).
              </div>
              {/* === Row 1: Tên dự án (full) — không còn dropdown trạng thái vì CĐT
                chỉ được tạo ở trạng thái PENDING, SXD sẽ duyệt về sau === */}
              <Field label="Tên dự án" required className="md:col-span-12">
                <input
                  className={inputClass}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="VD: Khu NOXH Bình Dương — Block A"
                  maxLength={150}
                  disabled={submitting}
                />
              </Field>

              {/* === Row 2: Tỉnh (col-4) | Phường/Xã (col-4) | Đường (col-4) === */}
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
              <Field label="Đường / Số nhà" className="md:col-span-4">
                <input
                  className={inputClass}
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="VD: 123 Nguyễn Trãi"
                  disabled={submitting}
                />
              </Field>

              {/* === Row 3: Số QĐ (full) — Ngày phê duyệt + checkbox SXD BỎ.
                BE sẽ tự set publicAnnounceAt khi SXD gọi PATCH status?action=approve. === */}
              <Field label="Số quyết định" required className="md:col-span-12">
                <input
                  className={inputClass}
                  value={decisionNumber}
                  onChange={(e) => setDecisionNumber(e.target.value)}
                  placeholder="VD: 1234/QĐ-UBND"
                  disabled={submitting}
                />
              </Field>

              {/* === Row 4: Mô tả (full) === */}
              <Field
                label="Mô tả"
                hint="Tối đa 500 ký tự — hiển thị trên trang chủ."
                className="md:col-span-12"
              >
                <textarea
                  className={`${inputClass} min-h-[44px] resize-none`}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả ngắn về vị trí, tiện ích nổi bật..."
                  maxLength={500}
                  disabled={submitting}
                />
              </Field>

              {/* === Row 5: Hình ảnh dự án (compact 2 cột) === */}
              <Field label="Ảnh đại diện dự án" className="md:col-span-6">
                <FilePicker
                  mode="single"
                  onPickSingle={(f) => setThumbnailFile(f)}
                  file={thumbnailFile}
                  disabled={submitting}
                />
              </Field>
              <Field
                label="Ảnh chi tiết công trình"
                hint={imagesFiles.length > 0 ? `${imagesFiles.length} ảnh đã chọn` : undefined}
                className="md:col-span-6"
              >
                <FilePicker
                  mode="multi"
                  onPickMulti={(files) => setImagesFiles(files)}
                  files={imagesFiles}
                  disabled={submitting}
                />
              </Field>
            </div>
          )}

          {/* === Step 2 — Chi tiết dự án (1 cột: tóm tắt + danh sách căn) === */}
          {step === 2 && (
            <div className="flex flex-col gap-2">
              {/* Tóm tắt nhanh */}
              {aptSummary ? (
                <div className="grid grid-cols-4 gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40">
                  <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/60 p-2 text-center dark:border-emerald-500/30 dark:bg-emerald-950/20">
                    <p className="text-[9px] uppercase tracking-wide text-emerald-600/70 dark:text-emerald-300/70">Số căn</p>
                    <p className="mt-0.5 text-lg font-bold text-emerald-700 dark:text-emerald-200">{aptSummary.count}</p>
                  </div>
                  <div className="rounded-lg border border-sky-200/60 bg-sky-50/60 p-2 text-center dark:border-sky-500/30 dark:bg-sky-950/20">
                    <p className="text-[9px] uppercase tracking-wide text-sky-600/70 dark:text-sky-300/70">Diện tích (m²)</p>
                    <p className="mt-0.5 text-sm font-bold text-sky-700 dark:text-sky-200">{aptSummary.minArea}–{aptSummary.maxArea}</p>
                  </div>
                  <div className="rounded-lg border border-violet-200/60 bg-violet-50/60 p-2 text-center dark:border-violet-500/30 dark:bg-violet-950/20">
                    <p className="text-[9px] uppercase tracking-wide text-violet-600/70 dark:text-violet-300/70">Giá thấp nhất</p>
                    <p className="mt-0.5 text-sm font-bold text-violet-700 dark:text-violet-200">{fmtVnd(aptSummary.minPrice)}</p>
                  </div>
                  <div className="rounded-lg border border-fuchsia-200/60 bg-fuchsia-50/60 p-2 text-center dark:border-fuchsia-500/30 dark:bg-fuchsia-950/20">
                    <p className="text-[9px] uppercase tracking-wide text-fuchsia-600/70 dark:text-fuchsia-300/70">Giá cao nhất</p>
                    <p className="mt-0.5 text-sm font-bold text-fuchsia-700 dark:text-fuchsia-200">{fmtVnd(aptSummary.maxPrice)}</p>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                  Thêm căn ở bảng bên dưới để xem tóm tắt tự động.
                </p>
              )}

              {/* Danh sách căn hộ */}
              <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40 p-3.5">
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-50">Danh sách căn hộ</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{filledCount} căn đã nhập · Thêm ít nhất một căn</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApartments((prev) => [...prev, { unitName: '', area: '', price: '' }])}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-indigo-300 bg-indigo-50/50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
                  >
                    <Plus className="h-3 w-3" />
                    Thêm căn
                  </button>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-slate-800/95">
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="w-8 px-2 py-1.5 font-semibold">#</th>
                        <th className="px-2 py-1.5 font-semibold">Tên căn</th>
                        <th className="px-2 py-1.5 font-semibold">Diện tích (m²)</th>
                        <th className="px-2 py-1.5 font-semibold">Giá (VNĐ)</th>
                        <th className="w-10 px-2 py-1.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {apartments.map((row, idx) => (
                        <tr key={idx} className="group transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="px-2 py-1 text-xs font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-2 py-1">
                            <input className={`${inputClass} py-1.5`} value={row.unitName} onChange={(e) => updateAptRow(idx, 'unitName', e.target.value)} placeholder="A-101" disabled={submitting} />
                          </td>
                          <td className="px-2 py-1">
                            <input className={`${inputClass} py-1.5`} type="number" min="0" step="0.1" value={row.area} onChange={(e) => updateAptRow(idx, 'area', e.target.value)} placeholder="38.5" disabled={submitting} />
                          </td>
                          <td className="px-2 py-1">
                            <input className={`${inputClass} py-1.5`} type="number" min="0" value={row.price} onChange={(e) => updateAptRow(idx, 'price', e.target.value)} placeholder="720000000" disabled={submitting} />
                          </td>
                          <td className="px-2 py-1 text-center">
                            <button type="button" onClick={() => setApartments((prev) => prev.filter((_, i) => i !== idx))} disabled={submitting || apartments.length <= 1} className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-700 dark:hover:border-rose-700/60 dark:hover:bg-rose-950/40" title="Xoá căn này">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* === Footer === */}
        <div
          className={`sticky bottom-0 mt-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3.5 py-1 shadow-md transition-colors ${
            step === 2 && !isStep2Valid && !submitting
              ? 'border-amber-300/80 bg-gradient-to-r from-amber-50/80 via-white to-rose-50/70 dark:border-amber-700/60 dark:from-amber-950/30 dark:via-slate-900/60 dark:to-rose-950/20'
              : 'border-slate-200/80 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/80 dark:border-slate-700/60 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-violet-950/30'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            <ListChecks className="mr-1 inline h-3 w-3 text-indigo-500" />
            Bước {step}/2 · {filledCount} căn
            {step === 2 && !isStep2Valid && !submitting && (
              <span className="ml-2 text-amber-700 dark:text-amber-400">
                · chưa sẵn sàng để tạo
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={goPrev}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Quay lại
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Huỷ
            </button>
            {step === 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:shadow-lg hover:brightness-110 disabled:opacity-50"
              >
                Tiếp tục: Chi tiết dự án
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !isStep2Valid}
                title={
                  !isStep2Valid
                    ? 'Vui lòng nhập đầy đủ: ít nhất 1 căn hợp lệ (tên + diện tích + giá).'
                    : undefined
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang tạo dự án...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Tạo dự án (Bước cuối)
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

/* ===== Helpers ===== */

function Stepper({ current }: { current: 1 | 2 }) {
  const steps = [
    { num: 1, label: 'Thông tin dự án', icon: Home, desc: 'Tên, vị trí, hồ sơ' },
    { num: 2, label: 'Chi tiết dự án', icon: Building2, desc: 'Danh sách căn hộ' },
  ]
  return (
    <div className="flex items-stretch gap-1.5 rounded-lg border border-slate-200/70 bg-slate-100/60 p-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/40">
      {steps.map((s) => {
        const active = current === s.num
        const done = current > s.num
        const Icon = s.icon
        return (
          <div
            key={s.num}
            className={[
              'flex flex-1 items-center gap-2 rounded-md px-2.5 py-1.5 transition-all duration-300',
              active
                ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-md ring-1 ring-indigo-500/30'
                : done
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'bg-transparent text-slate-400 dark:text-slate-500',
            ].join(' ')}
          >
            <span
              className={[
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all',
                active
                  ? 'bg-white/25 text-white'
                  : done
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
              ].join(' ')}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : s.num}
            </span>
            <div className="hidden min-w-0 flex-1 sm:block">
              <p
                className={[
                  'text-[11px] font-bold leading-tight',
                  active
                    ? 'text-white'
                    : done
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-500 dark:text-slate-400',
                ].join(' ')}
              >
                {s.label}
              </p>
              <p
                className={[
                  'text-[9px] leading-tight',
                  active
                    ? 'text-white/80'
                    : done
                      ? 'text-emerald-600/80 dark:text-emerald-300/80'
                      : 'text-slate-400 dark:text-slate-500',
                ].join(' ')}
              >
                {s.desc}
              </p>
            </div>
            <Icon
              className={[
                'h-3.5 w-3.5 shrink-0 sm:hidden',
                active ? 'text-white' : 'opacity-60',
              ].join(' ')}
            />
          </div>
        )
      })}
    </div>
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

/** Hiển thị preview ảnh từ File bằng URL.createObjectURL (auto-revoke khi unmount) */
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

      {/* === Chế độ 1 ảnh (thumbnail) === */}
      {!multiple && (
        <div className="flex items-start gap-2.5">
          {/* Preview hoặc placeholder */}
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

          {/* Info + actions */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor={inputId}
                className={[
                  'inline-flex cursor-pointer items-center gap-1 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:opacity-90',
                  disabled ? 'pointer-events-none opacity-50' : '',
                ].join(' ')}
              >
                <Upload className="h-3 w-3" />
                {props.file ? 'Đổi ảnh' : 'Chọn ảnh'}
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
                <span className="italic">Chưa có ảnh — JPG/PNG/WebP</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* === Chế độ nhiều ảnh (gallery) === */}
      {multiple && (
        <div>
          <div
            className={[
              'grid grid-cols-4 gap-1.5 rounded-lg border-2 border-dashed p-1.5',
              props.files.length > 0
                ? 'border-indigo-200 bg-indigo-50/30 dark:border-indigo-500/30 dark:bg-indigo-950/10'
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

            {/* Nút thêm ảnh */}
            <label
              htmlFor={inputId}
              className={[
                'flex aspect-square cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-white text-slate-400 transition hover:border-indigo-400 hover:bg-indigo-50/60 hover:text-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400',
                disabled ? 'pointer-events-none opacity-50' : '',
              ].join(' ')}
            >
              <Plus className="h-5 w-5" />
            </label>
          </div>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            {props.files.length > 0
              ? `${props.files.length} ảnh — click dấu + để thêm`
              : <span className="italic">Click dấu + để thêm ảnh</span>}
          </p>
        </div>
      )}
    </div>
  )
}