import { useEffect, useMemo, useState } from 'react'
import { Eye, FileText, Printer, Send, Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle, CheckCheck, X, FilePlus } from 'lucide-react'
import {
  housingApplicationsApi,
  parseApplicationDetail,
  parseAuditChecklist,
  parsePagedApplications,
  parsePagedMeta,
  type AuditChecklistResponse,
} from '@/api/housing-applications'
import { housingProjectsApi, parseApartments } from '@/api/housing-projects'
import { reportsApi } from '@/api/reports'
import { CreateApplicationWizard } from '@/components/ekyc/create-application-wizard'
import { ApplicationTimeline } from '@/components/shared/application-timeline'
import { FileDropzone } from '@/components/shared/file-dropzone'
import {
  ApartmentCard,
  PaymentSection,
  SignContractSection,
} from '@/components/payment/payment-section'
import { contractApi, parseContractStatus, parseInstallmentsEnvelope, summarizeInstallments } from '@/api/contracts'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { navigate } from '@/hooks/useHashRoute'
import { labelApplicationStatus } from '@/lib/labels'
import { APPLICATION_STATUS, DOC_TYPE_LABELS, HOUSING_STATUS_LABELS } from '@/lib/constants'
import { formatError } from '@/lib/format-error'
import { ensureVerifiedForApplication } from '@/lib/ekyc-gate'
import { formatDepositCountdown } from '@/lib/deposit-deadline'
import { formatSxdCountdown } from '@/lib/sxd-deadline'
import { getRole } from '@/router'
import type { ApartmentDto, ApplicationDetailDto, ApplicationSummaryDto } from '@/types'

function DetailRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800 sm:flex-row sm:justify-between ${danger ? 'bg-rose-50/80 px-2 dark:bg-rose-950/30' : ''}`}>
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${danger ? 'text-rose-700 dark:text-rose-300' : ''}`}>{value}</span>
    </div>
  )
}

const PAGE_SIZE = 10

export function ApplicationsPage() {
  const role = getRole()
  const isApplicant = role === 'Applicant'
  const isDeveloper = role === 'Housing Developer'
  const isSxd = role === 'Department Of Construction'
  const [apps, setApps] = useState<ApplicationSummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [status, setStatus] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    const hash = window.location.hash.replace(/^#\/?/, '')
    const qIdx = hash.indexOf('?')
    if (qIdx < 0) return ''
    const params = new URLSearchParams(hash.slice(qIdx + 1))
    return params.get('status') ?? ''
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkMsg, setBulkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [exporting, setExporting] = useState(false)

  // SXD bulk actions
  const [sxdBulkSending, setSxdBulkSending] = useState(false)

  useEffect(() => {
    setPageIndex(1)
  }, [status])

  const load = async (filter?: { search?: string; status?: string }, page = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = isApplicant
        ? await housingApplicationsApi.getMy({ pageIndex: page, pageSize: PAGE_SIZE, ...filter })
        : role === 'Housing Developer'
        ? await housingApplicationsApi.getDeveloperDashboard({ pageIndex: page, pageSize: PAGE_SIZE, ...filter })
        : role === 'Department Of Construction'
        ? await housingApplicationsApi.getSxdDashboard({ pageIndex: page, pageSize: PAGE_SIZE, ...filter })
        : await housingApplicationsApi.getAll({ pageIndex: page, pageSize: PAGE_SIZE, ...filter })
      const parsed = parsePagedApplications(data)
      const meta = parsePagedMeta(data, PAGE_SIZE)
      setApps(parsed)
      setPageIndex(page)
      setTotalCount(meta.totalCount)
      setTotalPages(meta.totalPages)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load({ search: search || undefined, status: status || undefined }, pageIndex)
  }, [role, status, pageIndex])

  const submittable = useMemo(
    () => apps.filter((a) => a.applicationStatus === 'REVIEWING'),
    [apps],
  )

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const pool = isDeveloper ? submittable : sxdSelectable
      if (prev.size === pool.length) return new Set()
      return new Set(pool.map((a) => a.applicationId))
    })
  }

  const submitSelectedToSxd = async () => {
    if (selected.size === 0 || bulkSending) return
    if (!window.confirm(
      `Gửi ${selected.size} hồ sơ đã chọn lên Sở Xây dựng? Hành động này không thể hoàn tác.`,
    )) return
    setBulkSending(true)
    setBulkMsg(null)
    try {
      await housingApplicationsApi.submitToDepartment(Array.from(selected))
      setBulkMsg({ type: 'success', text: `Đã gửi ${selected.size} hồ sơ lên Sở Xây dựng.` })
      setSelected(new Set())
      await load({ search: search || undefined, status: status || undefined })
    } catch (err) {
      setBulkMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBulkSending(false)
    }
  }

  // SXD bulk: chỉ chọn những PENDING_SXD_REVIEW
  const sxdSelectable = useMemo(
    () => apps.filter((a) => a.applicationStatus === 'PENDING_SXD_REVIEW'),
    [apps],
  )

  const sxdToggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sxdToggleSelectAll = () => {
    setSelected((prev) => {
      if (prev.size === sxdSelectable.length) return new Set()
      return new Set(sxdSelectable.map((a) => a.applicationId))
    })
  }

  const sxdBulkApprove = async () => {
    if (selected.size === 0 || sxdBulkSending) return
    if (!window.confirm(`Phê duyệt ${selected.size} hồ sơ đã chọn?`)) return
    setSxdBulkSending(true)
    setBulkMsg(null)
    try {
      await housingApplicationsApi.bulkSxdApprove(Array.from(selected))
      setBulkMsg({ type: 'success', text: `Đã phê duyệt ${selected.size} hồ sơ.` })
      setSelected(new Set())
      await load({ search: search || undefined, status: status || undefined })
    } catch (err) {
      setBulkMsg({ type: 'error', text: formatError(err) })
    } finally {
      setSxdBulkSending(false)
    }
  }

  const sxdBulkReject = async () => {
    if (selected.size === 0 || sxdBulkSending) return
    const note = window.prompt(`Từ chối ${selected.size} hồ sơ — nhập lý do (bắt buộc):`)
    if (!note?.trim()) return
    setSxdBulkSending(true)
    setBulkMsg(null)
    try {
      await housingApplicationsApi.bulkSxdReject(Array.from(selected), note.trim())
      setBulkMsg({ type: 'success', text: `Đã từ chối ${selected.size} hồ sơ.` })
      setSelected(new Set())
      await load({ search: search || undefined, status: status || undefined })
    } catch (err) {
      setBulkMsg({ type: 'error', text: formatError(err) })
    } finally {
      setSxdBulkSending(false)
    }
  }

  const exportDraft = async () => {
    setExporting(true)
    setBulkMsg(null)
    try {
      await reportsApi.exportApplicationsExcel({
        status: status || (isDeveloper ? 'REVIEWING' : undefined),
        search: search || undefined,
      })
      setBulkMsg({ type: 'success', text: 'Đã xuất file Excel danh sách dự kiến.' })
    } catch (err) {
      setBulkMsg({ type: 'error', text: formatError(err) })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader routeId="applications" />
      <PageCard className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? 'Đang tải...' : `Tổng cộng ${totalCount} hồ sơ${totalPages > 1 ? ` (trang ${pageIndex}/${totalPages})` : ''}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {(isDeveloper || isSxd) && (
              <Button variant="outline" size="sm" disabled={exporting} onClick={() => void exportDraft()}>
                {exporting ? 'Đang xuất…' : 'Xuất danh sách (Excel)'}
              </Button>
            )}
            {isApplicant && (
              <Button
                variant="accent"
                onClick={() => {
                  void ensureVerifiedForApplication().then((ok) => {
                    if (ok) navigate('create-application')
                  })
                }}
              >
                + Tạo hồ sơ mới
              </Button>
            )}
          </div>
        </div>
        <form className="mb-6 grid gap-3 sm:grid-cols-3" onSubmit={(e) => {
          e.preventDefault()
          setPageIndex(1)
          void load({ search: search || undefined, status: status || undefined }, 1)
        }}>
          <FormField label="Tìm kiếm" htmlFor="search"><Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Họ tên / CCCD" /></FormField>
          <FormField label="Trạng thái" htmlFor="status">
            <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả</option>
              {Object.entries(APPLICATION_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
          </FormField>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="outline">Lọc</Button>
            <Button type="button" variant="ghost" onClick={() => void load({ search: search || undefined, status: status || undefined }, pageIndex)} title="Tải lại danh sách">
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {isDeveloper && submittable.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-800 dark:bg-blue-950/30">
            <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={submittable.length > 0 && selected.size === submittable.length}
                onChange={toggleSelectAll}
              />
              Gom danh sách dự kiến: đã chọn <strong>{selected.size}</strong> / {submittable.length} hồ sơ đang thẩm định
            </label>
            <Button
              variant="accent"
              size="sm"
              disabled={selected.size === 0 || bulkSending}
              onClick={() => void submitSelectedToSxd()}
            >
              <Send className="mr-1.5 h-4 w-4" />
              {bulkSending ? 'Đang gửi…' : `Gửi thẩm định sang Sở (${selected.size || 0})`}
            </Button>
          </div>
        )}

        {/* SXD bulk approve/reject toolbar */}
        {isSxd && sxdSelectable.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-800 dark:bg-indigo-950/30">
            <label className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={sxdSelectable.length > 0 && selected.size === sxdSelectable.length}
                onChange={sxdToggleSelectAll}
              />
              Đã chọn <strong>{selected.size}</strong> / {sxdSelectable.length} hồ sơ chờ SXD duyệt
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="accent"
                size="sm"
                disabled={selected.size === 0 || sxdBulkSending}
                onClick={() => void sxdBulkApprove()}
              >
                <CheckCheck className="mr-1.5 h-4 w-4" />
                {sxdBulkSending ? 'Đang duyệt…' : `Duyệt đồng loạt (${selected.size || 0})`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-400 text-amber-700 dark:text-amber-300"
                disabled={selected.size === 0 || sxdBulkSending}
                onClick={() => void sxdBulkReject()}
              >
                <X className="mr-1.5 h-4 w-4" />
                Từ chối đồng loạt
              </Button>
            </div>
          </div>
        )}
        {bulkMsg && (
          <Alert variant={bulkMsg.type === 'error' ? 'error' : 'success'} className="mb-4">
            {bulkMsg.text}
          </Alert>
        )}

        {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>}
        {error && <Alert variant="error">{error}</Alert>}
        {!loading && !error && apps.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{isApplicant ? 'Bạn chưa có hồ sơ nào.' : 'Không có hồ sơ phù hợp.'}</p>
        )}

        {(isDeveloper || isSxd) ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  {(isDeveloper || isSxd) && <th className="px-3 py-2">Chọn</th>}
                  <th className="px-3 py-2">Họ tên</th>
                  <th className="px-3 py-2">CCCD</th>
                  <th className="px-3 py-2">Dự án</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  {isSxd && <th className="px-3 py-2">Hạn 20 ngày</th>}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => {
                  const canSelect = isDeveloper && app.applicationStatus === 'REVIEWING'
                    || isSxd && app.applicationStatus === 'PENDING_SXD_REVIEW'
                  const countdown =
                    isSxd && app.applicationStatus === 'PENDING_SXD_REVIEW'
                      ? formatSxdCountdown(app.submittedAt || app.createdAt)
                      : null
                  const openDetail = () => {
                    sessionStorage.setItem('applicationId', app.applicationId)
                    navigate('application-detail')
                  }
                  return (
                    <tr
                      key={app.applicationId}
                      onClick={openDetail}
                      className={`cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40 ${app.isViolation ? 'bg-rose-50 dark:bg-rose-950/30' : ''}`}
                    >
                      {isDeveloper && (
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          {canSelect && (
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-blue-600"
                              checked={selected.has(app.applicationId)}
                              onChange={() => toggleSelect(app.applicationId)}
                            />
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2 font-medium">{app.applicantFullName}</td>
                      <td className="px-3 py-2 font-mono text-xs">{app.citizenId}</td>
                      <td className="px-3 py-2">{app.projectName}</td>
                      <td className="px-3 py-2"><StatusBadge status={app.applicationStatus} /></td>
                      {isSxd && (
                        <td className="px-3 py-2">
                          {countdown ? (
                            <span className={`text-xs font-semibold ${countdown.isOverdue ? 'text-rose-600' : countdown.days <= 3 ? 'text-amber-600' : 'text-slate-600'}`}>
                              {countdown.label}
                            </span>
                          ) : '—'}
                        </td>
                      )}
                      <td className="px-3 py-2 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {isDeveloper &&
                            (app.applicationStatus === 'APPROVED' ||
                              app.applicationStatus === 'APPROVED_BY_TIMEOUT') &&
                            app.projectId && (
                              <Button
                                size="sm"
                                variant="accent"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  sessionStorage.setItem('projectId', app.projectId)
                                  navigate('project-detail')
                                }}
                              >
                                Cấp căn
                              </Button>
                            )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetail()
                            }}
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Xem hồ sơ
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {totalCount > PAGE_SIZE && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-3 pb-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Hiển thị {(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, totalCount)} trong {totalCount} hồ sơ
                </p>
                <Pagination pageIndex={pageIndex} totalPages={totalPages} onPageChange={(p) => setPageIndex(p)} />
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {apps.map((app) => {
              const depositCd = formatDepositCountdown(app.applicationStatus, app.updatedAt)
              return (
              <button
                key={app.applicationId}
                type="button"
                className="glass-card w-full p-4 text-left transition hover:ring-2 hover:ring-primary/20"
                onClick={() => {
                  sessionStorage.setItem('applicationId', app.applicationId)
                  navigate('application-detail')
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold">{app.projectName || 'Dự án'}</h3>
                  <StatusBadge status={app.applicationStatus} />
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{app.applicantFullName} · CCCD: {app.citizenId}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{app.documentCount} tài liệu · {new Date(app.createdAt).toLocaleDateString('vi-VN')}</p>
                {depositCd && (
                  <p className={`mt-1 text-xs font-semibold ${depositCd.isOverdue ? 'text-rose-600' : 'text-amber-700'}`}>
                    Hạn Đợt 1 ({depositCd.hoursLimit}h từ duyệt): {depositCd.label}
                    {' · '}đến {depositCd.deadline.toLocaleString('vi-VN')}
                  </p>
                )}
              </button>
              )
            })}
            {totalCount > PAGE_SIZE && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Hiển thị {(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, totalCount)} trong {totalCount} hồ sơ
                </p>
                <Pagination pageIndex={pageIndex} totalPages={totalPages} onPageChange={(p) => setPageIndex(p)} />
              </div>
            )}
          </div>
        )}
      </PageCard>
    </div>
  )
}

export function CreateApplicationPage() {
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    void ensureVerifiedForApplication({ silent: true }).then((ok) => {
      if (cancelled) return
      setReady(ok)
      setChecking(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4">
      <PageHeader routeId="create-application" />
      {checking ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Đang kiểm tra xác minh danh tính...</p>
      ) : ready ? (
        <CreateApplicationWizard />
      ) : (
        <div className="space-y-4">
          <Alert variant="warning">
            Cần xác minh danh tính (eKYC) trước khi tạo hồ sơ đăng ký nhà ở xã hội. Bạn vẫn có thể
            duyệt dự án và lưu quan tâm mà không cần eKYC.
          </Alert>
          <Button variant="accent" onClick={() => navigate('verify-identity')}>
            Xác minh danh tính
          </Button>
          <Button variant="outline" onClick={() => navigate('applications')}>
            Quay lại danh sách hồ sơ
          </Button>
        </div>
      )}
    </div>
  )
}

function ApplicationDetailInner({ appId }: { appId: string }) {
  const role = getRole()
  const [app, setApp] = useState<ApplicationDetailDto | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [acting, setActing] = useState('')
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawReason, setWithdrawReason] = useState('')
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [docType, setDocType] = useState(Object.keys(DOC_TYPE_LABELS)[0] ?? '')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [, setTick] = useState(0)
  const [apartments, setApartments] = useState<ApartmentDto[]>([])
  const [selectedApartmentId, setSelectedApartmentId] = useState('')
  const [assigningApt, setAssigningApt] = useState(false)
  const [aiAuditing, setAiAuditing] = useState(false)
  const [aiAuditResult, setAiAuditResult] = useState<AuditChecklistResponse | null>(null)
  const [aiAuditOpen, setAiAuditOpen] = useState(false)
  const [aiAuditError, setAiAuditError] = useState('')
  // Payment / contract state
  const [contractStatus, setContractStatus] = useState<{
    isSigned: boolean
    signedAt?: string | null
    applicationStatus: string
  } | null>(null)
  const [installments, setInstallments] = useState<import('@/api/contracts').PaymentInstallment[]>([])
  const [installmentsError, setInstallmentsError] = useState(false)
  const [contractPrice, setContractPrice] = useState<number | null>(null)
  const [housePrice, setHousePrice] = useState<number | null>(null)
  const [officialPrice, setOfficialPrice] = useState<number | null>(null)
  const [signing, setSigning] = useState(false)

  const refresh = async () => {
    const data = await housingApplicationsApi.getById(appId)
    setApp(parseApplicationDetail(data))

    // Load contract status + installments
    try {
      const s = await contractApi.getStatus(appId)
      const parsed = parseContractStatus(s)
      setContractStatus(parsed ? { isSigned: parsed.isSigned, signedAt: parsed.signedAt, applicationStatus: parsed.applicationStatus } : null)
    } catch { setContractStatus(null) }

    try {
      const i = await contractApi.getInstallments(appId)
      const env = parseInstallmentsEnvelope(i)
      setInstallments(env.installments)
      setInstallmentsError(false)
      setContractPrice(env.contractPrice ?? null)
      setHousePrice(env.housePrice ?? null)
      setOfficialPrice(env.officialPrice ?? null)
    } catch {
      setInstallments([])
      setInstallmentsError(true)
      setContractPrice(null)
      setHousePrice(null)
      setOfficialPrice(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        await refresh()
      } catch (err) {
        if (!cancelled) setMsg({ type: 'error', text: formatError(err) })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [appId])

  useEffect(() => {
    const status = app?.applicationStatus
    if (!status) return
    const depositActive = status === 'APPROVED' || status === 'APPROVED_BY_TIMEOUT'
    if (status !== 'PENDING_SXD_REVIEW' && !depositActive) return
    const ms = depositActive ? 1_000 : 60_000
    const id = window.setInterval(() => setTick((t) => t + 1), ms)
    return () => window.clearInterval(id)
  }, [app?.applicationStatus])

  // Load căn AVAILABLE của dự án khi CĐT/SXD mở hồ sơ đủ điều kiện bàn giao
  useEffect(() => {
    const roleNow = getRole()
    const isStaffRole =
      roleNow === 'Housing Developer' || roleNow === 'Department Of Construction'
    if (!isStaffRole || !app?.projectId) return
    const canAssign =
      !app.apartmentId &&
      (['CONTRACT_PENDING', 'CONTRACT_SIGNED', 'DEPOSIT_PAID', 'FULLY_PAID'].includes(app.applicationStatus) ||
        app.lotteryResult === 'WON' ||
        app.lotteryResult === 'PRIORITY_WON')
    if (!canAssign && !app.apartmentId) return
    let cancelled = false
    void housingProjectsApi
      .getById(app.projectId)
      .then((data) => {
        if (cancelled) return
        setApartments(
          parseApartments(data).filter(
            (t) =>
              String(t.status).toUpperCase() === 'AVAILABLE' || t.id === app.apartmentId,
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setApartments([])
      })
    return () => {
      cancelled = true
    }
  }, [app?.projectId, app?.applicationStatus, app?.apartmentId, app?.lotteryResult])

  const runAiAudit = async () => {
    if (aiAuditing) return
    setAiAuditing(true)
    setAiAuditError('')
    setAiAuditResult(null)
    setAiAuditOpen(true)
    try {
      const data = await housingApplicationsApi.auditDocuments(appId, app ? {
        // Gửi kèm thông tin đăng ký + danh sách tài liệu để AI đối chiếu chéo
        // với nội dung PDF (ví dụ: tên trên CCCD vs tên đăng ký, thu nhập vs chứng từ...)
        applicationInfo: app,
        documentIds: (app.documents ?? []).map((d) => d.documentId),
      } : undefined)
      const parsed = parseAuditChecklist(data)
      setAiAuditResult(
        parsed ?? {
          summary: 'AI không trả về checklist. Hãy xem lại t�ng mục trong hồ sơ.',
          checks: [],
        },
      )
    } catch (err) {
      setAiAuditError(formatError(err))
    } finally {
      setAiAuditing(false)
    }
  }

  const assignApartment = async () => {
    if (!selectedApartmentId || assigningApt) return
    setAssigningApt(true)
    setMsg(null)
    try {
      await housingApplicationsApi.assignApartment(appId, selectedApartmentId)
      await refresh()
      setSelectedApartmentId('')
      setMsg({ type: 'success', text: 'Đã bàn giao căn và sinh lịch thanh toán theo đợt.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setAssigningApt(false)
    }
  }

  const review = async (action: string, needNote = false) => {
    if (acting) return
    let note: string | null = null
    if (needNote) {
      note = window.prompt('Nhập ghi chú / lý do:')
      if (!note?.trim()) { setMsg({ type: 'error', text: 'Ghi chú là bắt buộc.' }); return }
    }
    setActing(`${role}-${action}`)
    try {
      const body = { action, note: note?.trim() || null }
      if (role === 'Housing Developer') await housingApplicationsApi.developerReview(appId, body)
      else if (role === 'Department Of Construction') await housingApplicationsApi.sxdReview(appId, body)
      await refresh()
      setMsg({ type: 'success', text: 'Cập nhật hồ sơ thành công.' })
      if (role === 'Housing Developer' && action === 'REQUEST_MORE_DOCUMENTS') {
        /* no-op */
      }
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setActing('')
    }
  }

  const submitToSxd = async (applicationIds: string[]) => {
    if (acting) return
    setActing('submit-sxd')
    try {
      await housingApplicationsApi.submitToDepartment(applicationIds)
      await refresh()
      setMsg({ type: 'success', text: `Đã gửi ${applicationIds.length} hồ sơ lên Sở Xây dựng.` })
      setReceiptOpen(true)
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setActing('')
    }
  }

  const handleSign = async () => {
    if (signing) return
    setSigning(true)
    setMsg(null)
    try {
      await contractApi.sign(appId)
      await refresh()
      setMsg({ type: 'success', text: 'Đã ký HĐ thành công. Đợt 2 (20%) đã tự mở — có thể đóng ngay.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setSigning(false)
    }
  }

  const confirmWithdraw = async () => {
    if (!withdrawReason.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập lý do rút hồ sơ.' })
      return
    }
    setActing('cancel')
    setMsg(null)
    try {
      await housingApplicationsApi.cancel(appId, withdrawReason.trim())
      setWithdrawOpen(false)
      setWithdrawReason('')
      await refresh()
      setMsg({ type: 'success', text: 'Đã rút hồ sơ.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setActing('')
    }
  }

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>
  if (!app) return <Alert variant="error">Không đọc được dữ liệu hồ sơ.</Alert>

  const canEditDocs = role === 'Applicant' && (app.applicationStatus === 'DRAFT' || app.applicationStatus === 'NEED_MORE_DOCUMENTS')
  const needMoreNote = (app.reviewHistories ?? [])
    .filter((h) => h.newStatus === 'NEED_MORE_DOCUMENTS' || h.action?.includes('REQUEST_MORE'))
    .at(-1)?.note
  const countdown =
    app.applicationStatus === 'PENDING_SXD_REVIEW'
      ? formatSxdCountdown(app.submittedAt || app.createdAt)
      : null
  const deposit1Paid = installments.some(i => i.ordinal === 1 && i.status === 'PAID')
  const deposit2Paid = installments.some(i => i.ordinal === 2 && i.status === 'PAID')
  const depositCountdown = !deposit1Paid && !deposit2Paid ? formatDepositCountdown(app.applicationStatus, app.updatedAt) : null
  const pdfDoc = (app.documents ?? []).find((d) => d.fileUrl?.toLowerCase().includes('.pdf') || d.fileName?.toLowerCase().endsWith('.pdf'))
  const isStaff = role === 'Housing Developer' || role === 'Department Of Construction'

  const profilePanel = (
    <div className="space-y-4">
      {(app.isViolation || app.violationReason) && (
        <Alert variant="error">
          <strong>Cảnh báo vi phạm:</strong> {app.violationReason || 'Hồ sơ bị đánh dấu vi phạm (trùng CCCD / đã có nhà đất).'}
        </Alert>
      )}
      {role === 'Applicant' && depositCountdown && (
        <Alert variant={depositCountdown.isOverdue ? 'error' : 'warning'}>
          <strong>Hạn thanh toán Đợt 1 ({depositCountdown.daysLimit} ngày sau khi ký).</strong>{' '}
          {depositCountdown.isOverdue
            ? <>Đã quá hạn Đợt 1 — tải lại trang để xem trạng thái mới nhất từ hệ thống.</>
            : <>Còn lại: <strong>{depositCountdown.label}</strong></>}
          {' · '}đến {depositCountdown.deadline.toLocaleString('vi-VN')}
        </Alert>
      )}
      {role === 'Applicant' && app.applicationStatus === 'NEED_MORE_DOCUMENTS' && (
        <Alert variant="warning">
          <strong>Yêu cầu bổ sung hồ sơ.</strong>{' '}
          {needMoreNote || 'Chủ đầu tư yêu cầu bổ sung giấy tờ. Vui lòng tải lại tài liệu bên dưới rồi nộp lại.'}
        </Alert>
      )}
      {countdown && role === 'Department Of Construction' && (
        <Alert variant={countdown.isOverdue ? 'error' : countdown.days <= 3 ? 'warning' : 'info'}>
          Hạn hậu kiểm 20 ngày: <strong>{countdown.label}</strong>
          {' · '}đến {countdown.deadline.toLocaleString('vi-VN')}
          {countdown.isOverdue && ' — hệ thống có thể tự duyệt quá hạn.'}
        </Alert>
      )}

      <div className="glass-card p-4">
        <h3 className="mb-3 font-semibold">Tiến độ hồ sơ</h3>
        <ApplicationTimeline currentStatus={app.applicationStatus} depositPaid={deposit1Paid} histories={app.reviewHistories} />
      </div>

      <div className={`glass-card p-4 ${app.isViolation ? 'ring-2 ring-rose-400' : ''}`}>
        <h3 className="mb-2 font-semibold">Thông tin đăng ký</h3>
        <DetailRow label="Họ tên" value={app.fullName} danger={app.isViolation} />
        <DetailRow label="CCCD" value={app.citizenId} danger={app.isViolation} />
        <DetailRow label="Nghề nghiệp" value={app.occupation || '—'} />
        <DetailRow label="Nơi làm việc" value={app.workPlace || '—'} />
        <DetailRow label="Nơi ở hiện tại" value={app.currentResidence} />
        <DetailRow label="Thường trú/tạm trú" value={app.permanentAddress} />
        <DetailRow label="Thực trạng nhà ở" value={HOUSING_STATUS_LABELS[app.housingStatus] ?? app.housingStatus} />
        <DetailRow
          label="Thu nhập/tháng"
          value={
            app.monthlyIncome != null || app.estimatedMonthlyIncome
              ? `${Number(app.monthlyIncome ?? app.estimatedMonthlyIncome).toLocaleString('vi-VN')} VNĐ`
              : '—'
          }
        />
        {app.spouseMonthlyIncome != null && (
          <DetailRow
            label="Thu nhập vợ/chồng"
            value={`${Number(app.spouseMonthlyIncome).toLocaleString('vi-VN')} VNĐ`}
          />
        )}
        <DetailRow label="Ngày tạo" value={new Date(app.createdAt).toLocaleString('vi-VN')} />
        {app.submittedAt && <DetailRow label="Ngày nộp" value={new Date(app.submittedAt).toLocaleString('vi-VN')} />}
        {app.finalDecisionDate && (
          <DetailRow label="Ngày duyệt" value={new Date(app.finalDecisionDate).toLocaleString('vi-VN')} />
        )}
        {app.officerFullName && <DetailRow label="Cán bộ thẩm định" value={app.officerFullName} />}
        {app.slotCode && <DetailRow label="Mã suất" value={app.slotCode} />}
        {app.lotteryResult && <DetailRow label="Kết quả bốc thăm" value={app.lotteryResult} />}
        {app.priorityScore != null && app.priorityScore > 0 && (
          <DetailRow label="Điểm ưu tiên" value={`${app.priorityScore} điểm`} />
        )}
        {app.maritalStatus && <DetailRow label="Tình trạng hôn nhân" value={app.maritalStatus} />}
        {app.averageHousingAreaPerPerson != null && (
          <DetailRow label="DT ở/người" value={`${app.averageHousingAreaPerPerson} m²`} />
        )}
      </div>

      {/* Kết quả thẩm định điều kiện (SXD) */}
      {role === 'Department Of Construction' && app.eligibility && (
        <div className={`rounded-xl border p-4 ${app.eligibility.isEligible ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20'}`}>
          <h3 className={`mb-3 font-semibold ${app.eligibility.isEligible ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'}`}>
            Kết quả thẩm định điều kiện
          </h3>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              {app.eligibility.isIncomeEligible ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
              <span>Thu nhập hợp lệ</span>
              {app.eligibility.totalScore != null && <span className="ml-auto font-medium">{app.eligibility.totalScore} điểm</span>}
            </div>
            <div className="flex items-center gap-2">
              {app.eligibility.isHousingStatusEligible ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
              <span>Thực trạng nhà ở</span>
            </div>
            <div className="flex items-center gap-2">
              {app.eligibility.isPriorityGroupEligible ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
              <span>Nhóm ưu tiên</span>
            </div>
            <div className="flex items-center gap-2">
              {app.eligibility.isEligible ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
              <span className="font-medium">Tổng kết: {app.eligibility.isEligible ? 'Đủ điều kiện' : 'Không đủ điều kiện'}</span>
            </div>
          </div>
          {app.eligibility.verifiedAt && (
            <p className="mt-2 text-xs text-slate-500">Xác minh lúc: {new Date(app.eligibility.verifiedAt).toLocaleString('vi-VN')}</p>
          )}
        </div>
      )}

      {/* Thành viên hộ gia đình (SXD) */}
      {role === 'Department Of Construction' && app.householdMembers && app.householdMembers.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="mb-3 font-semibold">Thành viên hộ gia đình ({app.householdMembers.length} người)</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Họ tên</th>
                  <th className="px-3 py-2 text-left">Quan hệ</th>
                  <th className="px-3 py-2 text-left">Ngày sinh</th>
                  <th className="px-3 py-2 text-left">CCCD</th>
                </tr>
              </thead>
              <tbody>
                {app.householdMembers.map((m, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-medium">{m.fullName}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{m.relationship}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                      {m.dateOfBirth ? new Date(m.dateOfBirth).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{m.citizenId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(isStaff || app.apartmentId) && (
        <div className="glass-card space-y-3 p-4">
          <h3 className="font-semibold">Căn được cấp (trước khi ký HĐ)</h3>
          {app.apartmentId ? (
            <>
              <DetailRow label="Tên căn" value={app.apartmentUnitName || '—'} />
              <DetailRow
                label="Diện tích"
                value={app.apartmentArea != null ? `${app.apartmentArea} m²` : '—'}
              />
              <DetailRow
                label="Giá"
                value={
                  app.apartmentPrice != null
                    ? `${Number(app.apartmentPrice).toLocaleString('vi-VN')} VNĐ`
                    : '—'
                }
              />
              <DetailRow
                label="Trạng thái căn"
                value={
                  String(app.apartmentStatus || '').toUpperCase() === 'ASSIGNED'
                    ? 'Đã cấp / bàn giao trên hệ thống'
                    : app.apartmentStatus || '—'
                }
              />
            </>
          ) : isStaff &&
            (['CONTRACT_PENDING', 'CONTRACT_SIGNED', 'DEPOSIT_PAID', 'FULLY_PAID'].includes(
              app.applicationStatus,
            ) ||
              app.lotteryResult === 'WON' ||
              app.lotteryResult === 'PRIORITY_WON') ? (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Hồ sơ đã trúng / chờ ký nhưng chưa có căn — chọn căn trống để người dân ký HĐ đủ thông tin.
              </p>
              <FormField label="Căn hộ" htmlFor="assign-apartment">
                <Select
                  id="assign-apartment"
                  value={selectedApartmentId}
                  onChange={(e) => setSelectedApartmentId(e.target.value)}
                  disabled={assigningApt || apartments.length === 0}
                >
                  <option value="">
                    {apartments.length ? 'Chọn căn…' : 'Dự án chưa có căn trống'}
                  </option>
                  {apartments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.unitName} · {t.area}m² · {Number(t.price).toLocaleString('vi-VN')}đ
                    </option>
                  ))}
                </Select>
              </FormField>
              <Button
                variant="accent"
                disabled={!selectedApartmentId || assigningApt}
                onClick={() => void assignApartment()}
              >
                {assigningApt ? 'Đang bàn giao…' : 'Bàn giao căn'}
              </Button>
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Chưa bàn giao căn.</p>
          )}
        </div>
      )}

      {/* Căn được cấp */}
      <ApartmentCard
        apartmentUnitName={app.apartmentUnitName}
        apartmentArea={app.apartmentArea}
        apartmentPrice={app.apartmentPrice}
        projectName={app.projectName}
        lotteryResult={app.lotteryResult}
      />

      {/* Ký HĐ */}
      <SignContractSection
        canSign={
          role === 'Applicant' &&
          !!app.apartmentId &&
          !contractStatus?.isSigned &&
          (
            contractStatus?.applicationStatus === 'CONTRACT_PENDING' ||
            contractStatus?.applicationStatus === 'DEPOSIT_PENDING' ||
            contractStatus?.applicationStatus === 'CONTRACTING'
          )
        }
        signing={signing}
        onSign={() => void handleSign()}
        applicationStatus={contractStatus?.applicationStatus ?? app.applicationStatus}
      />

      {/* Lịch 6 đợt thanh toán + nút thanh toán + lịch sử GD */}
      <PaymentSection
        installments={installments}
        paid={installments.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.paidAmount ?? i.amount), 0)}
        remaining={summarizeInstallments(installments).remaining}
        progress={summarizeInstallments(installments).progress}
        contractPrice={contractPrice}
        officialPrice={officialPrice}
        housePrice={housePrice}
        signedAt={contractStatus?.signedAt ?? null}
        applicationId={appId}
        applicationStatus={contractStatus?.applicationStatus ?? app.applicationStatus}
        hasError={installmentsError}
        hasApartment={!!app.apartmentId}
        onReload={() => void refresh()}
        role={role}
        projectId={app.projectId}
      />

      <div className="glass-card p-4">
        <h3 className="mb-2 font-semibold">Tài liệu đính kèm</h3>
        {(app.documents ?? []).length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có tài liệu.</p>}
        {(app.documents ?? []).map((doc) => (
          <div key={doc.documentId} className="flex flex-wrap items-center justify-between gap-2 border-b py-3 last:border-0">
            <div>
              <p className="font-medium">{DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{doc.fileName} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB</p>
            </div>
            <div className="flex gap-2">
              <a href={doc.fileUrl} target="_blank" rel="noopener" className="text-sm font-semibold text-primary hover:underline">Xem PDF</a>
              {canEditDocs && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 dark:text-red-400"
                  disabled={deletingId === doc.documentId}
                  onClick={async () => {
                    if (deletingId) return
                    if (!window.confirm(`Xóa tài liệu "${DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}"?`)) return
                    setDeletingId(doc.documentId)
                    try {
                      await housingApplicationsApi.deleteDocument(app.applicationId, doc.documentId)
                      await refresh()
                      setMsg({ type: 'success', text: 'Đã xóa tài liệu.' })
                    } catch (err) {
                      setMsg({ type: 'error', text: formatError(err) })
                    } finally {
                      setDeletingId(null)
                    }
                  }}
                >
                  {deletingId === doc.documentId ? 'Đang xóa…' : 'Xóa'}
                </Button>
              )}
            </div>
          </div>
        ))}
        {canEditDocs && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <FormField label="Loại giấy tờ" htmlFor="documentType">
              <Select id="documentType" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </FormField>
            <FileDropzone onFile={setPendingFile} disabled={uploading} />
            {pendingFile && <p className="text-xs text-slate-500">Đã chọn: {pendingFile.name}</p>}
            <Button
              type="button"
              variant="outline"
              disabled={uploading || !pendingFile}
              onClick={async () => {
                if (!pendingFile || uploading) return
                setUploading(true)
                try {
                  await housingApplicationsApi.uploadDocument(app.applicationId, docType, pendingFile)
                  await refresh()
                  setPendingFile(null)
                  setMsg({ type: 'success', text: 'Tải lên tài liệu thành công.' })
                } catch (err) {
                  setMsg({ type: 'error', text: formatError(err) })
                } finally {
                  setUploading(false)
                }
              }}
            >
              {uploading ? 'Đang tải lên…' : 'Tải lên tài liệu'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{app.projectName}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={app.applicationStatus} />
          {(app.receiptUrl || app.applicationStatus !== 'DRAFT') && (
            <Button variant="outline" size="sm" onClick={() => setReceiptOpen(true)}>
              <Printer className="mr-1.5 h-4 w-4" /> Phiếu tiếp nhận
            </Button>
          )}
        </div>
      </div>

      {isStaff ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0">{profilePanel}</div>
          <div className="glass-card flex min-h-[480px] flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold">Xem trước tài liệu PDF</span>
              </div>
              {pdfDoc && (
                <a
                  href={pdfDoc.fileUrl}
                  target="_blank"
                  rel="noopener"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Mở tab mới ↗
                </a>
              )}
            </div>
            {pdfDoc ? (
              <iframe title="PDF hồ sơ" src={pdfDoc.fileUrl} className="min-h-[440px] w-full flex-1 bg-slate-100" />
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
                Chưa có file PDF để xem. Mở từng tài liệu ở cột trái.
              </div>
            )}
            {/* Nút kiểm tra hồ sơ bằng AI — hỗ tr� CĐT duyệt nhanh */}
            {role === 'Housing Developer' && (
              <div className="border-t border-slate-200 bg-gradient-to-r from-indigo-50/60 to-sky-50/60 p-3 dark:border-slate-700 dark:from-indigo-950/30 dark:to-sky-950/30">
              <Button
                type="button"
                variant="accent"
                className="w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 text-white shadow-lg shadow-violet-500/25 hover:opacity-95"
                disabled={aiAuditing || (app.documents ?? []).length === 0}
                onClick={() => void runAiAudit()}
              >
                {aiAuditing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang phân tích tài liệu...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Kiểm tra hồ sơ bằng AI
                  </>
                )}
              </Button>
              {(app.documents ?? []).length === 0 ? (
                <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                  Hồ sơ chưa có tài liệu nào để AI phân tích.
                </p>
              ) : (
                <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                  AI sẽ đọc {(app.documents ?? []).length} tài liệu (PDF + ảnh) đối chiếu với thông tin đăng ký để cảnh báo rủi ro giúp CĐT duyệt nhanh hơn.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        profilePanel
      )}

      <div className="flex flex-wrap gap-2">
        {role === 'Applicant' && app.applicationStatus === 'DRAFT' && (
          <Button variant="accent" disabled={acting === 'submit'} onClick={async () => {
            if (acting) return
            setActing('submit')
            try {
              await housingApplicationsApi.submit(app.applicationId)
              await refresh()
              setMsg({ type: 'success', text: 'Đã nộp hồ sơ.' })
              setReceiptOpen(true)
            } catch (err) {
              setMsg({ type: 'error', text: formatError(err) })
            } finally {
              setActing('')
            }
          }}>{acting === 'submit' ? 'Đang nộp…' : 'Nộp hồ sơ'}</Button>
        )}
        {role === 'Applicant' && app.applicationStatus === 'NEED_MORE_DOCUMENTS' && (
          <Button variant="accent" disabled={acting === 'submit'} onClick={async () => {
            if (acting) return
            setActing('submit')
            try {
              await housingApplicationsApi.submit(app.applicationId)
              await refresh()
              setMsg({ type: 'success', text: 'Đã nộp lại hồ sơ bổ sung.' })
            } catch (err) {
              setMsg({ type: 'error', text: formatError(err) })
            } finally {
              setActing('')
            }
          }}>{acting === 'submit' ? 'Đang nộp…' : 'Nộp lại sau bổ sung'}</Button>
        )}
        {!['APPROVED', 'APPROVED_BY_TIMEOUT', 'DEPOSIT_PAID', 'CONTRACT_SIGNED', 'CONTRACT_PENDING', 'REJECTED', 'CANCELED', 'EXPIRED', 'LOTTERY_LOST'].includes(app.applicationStatus) && (
          <Button variant="outline" className="text-red-600" disabled={acting === 'cancel'} onClick={() => setWithdrawOpen(true)}>
            Rút hồ sơ
          </Button>
        )}
        {role === 'Housing Developer' && ['SUBMITTED', 'NEED_MORE_DOCUMENTS'].includes(app.applicationStatus) && (
          <Button variant="accent" disabled={acting === 'assign'} onClick={async () => {
            if (acting) return
            setActing('assign')
            try {
              await housingApplicationsApi.assign(app.applicationId)
              await refresh()
              setMsg({ type: 'success', text: 'Đã nhận hồ sơ.' })
            } catch (err) {
              setMsg({ type: 'error', text: formatError(err) })
            } finally {
              setActing('')
            }
          }}>{acting === 'assign' ? 'Đang nhận…' : 'Nhận hồ sơ thẩm định'}</Button>
        )}
        {role === 'Housing Developer' && app.applicationStatus === 'REVIEWING' && (
          <>
            <Button variant="outline" className="border-amber-400 text-amber-700" disabled={!!acting} onClick={() => void review('REQUEST_MORE_DOCUMENTS', true)}>🟡 Yêu cầu bổ sung</Button>
            <Button variant="outline" className="border-rose-400 text-rose-700" disabled={!!acting} onClick={() => void review('REJECT', true)}>🔴 Từ chối</Button>
            <Button variant="accent" disabled={acting === 'submit-sxd'} onClick={() => void submitToSxd([app.applicationId])}>
              {acting === 'submit-sxd' ? 'Đang gửi…' : '🟢 Đạt sơ duyệt → Gửi Sở'}
            </Button>
          </>
        )}
        {role === 'Department Of Construction' && app.applicationStatus === 'PENDING_SXD_REVIEW' && (
          <>
            <Button variant="accent" disabled={!!acting} onClick={() => void review('APPROVE')}>Phê duyệt</Button>
            <Button variant="outline" disabled={!!acting} onClick={() => void review('REJECT', true)}>Từ chối</Button>
            <Button variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300" disabled={!!acting} onClick={async () => {
              const note = window.prompt('Yêu cầu CĐT bổ sung giấy tờ — nhập nội dung:')
              if (!note?.trim()) return
              setActing('request-docs')
              try {
                await housingApplicationsApi.sxdRequestDocs(app.applicationId, note.trim())
                await refresh()
                setMsg({ type: 'success', text: 'Đã gửi yêu cầu bổ sung giấy tờ.' })
              } catch (err) {
                setMsg({ type: 'error', text: formatError(err) })
              } finally {
                setActing('')
              }
            }}>
              <FilePlus className="mr-1.5 h-4 w-4" />
              Yêu cầu CĐT bổ sung
            </Button>
            {app.isViolation ? (
              <Button
                variant="outline"
                className="border-emerald-400 text-emerald-700 dark:text-emerald-300"
                disabled={!!acting}
                onClick={async () => {
                  if (!window.confirm('Gỡ cờ vi phạm cho hồ sơ này?')) return
                  setActing('unflag')
                  try {
                    await housingApplicationsApi.unflagViolation(app.applicationId)
                    await refresh()
                    setMsg({ type: 'success', text: 'Đã gỡ cờ vi phạm.' })
                  } catch (err) {
                    setMsg({ type: 'error', text: formatError(err) })
                  } finally {
                    setActing('')
                  }
                }}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Gỡ cờ vi phạm
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-rose-400 text-rose-700 dark:text-rose-300"
                disabled={!!acting}
                onClick={async () => {
                  const reason = window.prompt('Lý do gắn cờ vi phạm (VD: CCCD trùng, đã có nhà đất):')
                  if (!reason?.trim()) return
                  setActing('flag')
                  try {
                    await housingApplicationsApi.flagViolation(app.applicationId, reason.trim())
                    await refresh()
                    setMsg({ type: 'success', text: 'Đã gắn cờ vi phạm cho hồ sơ.' })
                  } catch (err) {
                    setMsg({ type: 'error', text: formatError(err) })
                  } finally {
                    setActing('')
                  }
                }}
              >
                <AlertTriangle className="mr-1.5 h-4 w-4" />
                Gắn cờ vi phạm
              </Button>
            )}
          </>
        )}
      </div>

      {(app.reviewHistories ?? []).length > 0 && (
        <div className="glass-card p-4">
          <h3 className="mb-2 font-semibold">Lịch sử xét duyệt</h3>
          <ul className="space-y-2 text-sm">
            {app.reviewHistories!.map((h, i) => (
              <li key={i}>
                <strong>{labelApplicationStatus(h.oldStatus)} → {labelApplicationStatus(h.newStatus)}</strong>
                <span className="text-slate-500 dark:text-slate-400"> · {h.changedByFullName} · {new Date(h.changedAt).toLocaleString('vi-VN')}</span>
                {h.note && <p className="text-slate-600 dark:text-slate-300">{h.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}

      <Modal
        open={withdrawOpen}
        onClose={() => { if (acting !== 'cancel') setWithdrawOpen(false) }}
        title="Rút hồ sơ đã nộp"
        description="Hành động này không thể hoàn tác. Vui lòng nêu rõ lý do."
      >
        {msg?.type === 'error' && (
          <Alert variant="error" className="mb-3">{msg.text}</Alert>
        )}
        <FormField label="Lý do rút hồ sơ *" htmlFor="withdraw-reason">
          <Textarea
            id="withdraw-reason"
            rows={3}
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
            placeholder="Ví dụ: Không còn nhu cầu mua nữa"
            disabled={acting === 'cancel'}
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" disabled={acting === 'cancel'} onClick={() => setWithdrawOpen(false)}>Huỷ</Button>
          <Button variant="accent" className="bg-red-600 hover:bg-red-700" disabled={acting === 'cancel'} onClick={() => void confirmWithdraw()}>
            {acting === 'cancel' ? 'Đang rút…' : 'Xác nhận rút hồ sơ'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        title="Phiếu tiếp nhận hồ sơ"
        description="Bản xem trước để in gửi người dân."
        size="lg"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm dark:border-slate-700 dark:bg-slate-900 print:border-0">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">Phiếu tiếp nhận hồ sơ NOXH</p>
          <h4 className="mt-2 text-center text-lg font-bold">{app.projectName}</h4>
          <div className="mt-4 space-y-2">
            <p><strong>Mã tiếp nhận:</strong> <span className="font-mono">{app.applicationId}</span></p>
            <p><strong>Người nộp:</strong> {app.fullName}</p>
            <p><strong>CCCD:</strong> {app.citizenId}</p>
            <p><strong>Thời điểm:</strong> {new Date(app.submittedAt || app.updatedAt || app.createdAt).toLocaleString('vi-VN')}</p>
            <p><strong>Trạng thái:</strong> {labelApplicationStatus(app.applicationStatus)}</p>
          </div>
          {app.receiptUrl ? (
            <a href={app.receiptUrl} target="_blank" rel="noopener" className="mt-4 inline-block font-semibold text-blue-600 hover:underline">
              Mở file PDF phiếu tiếp nhận
            </a>
          ) : (
            <p className="mt-4 text-xs text-slate-500">PDF phiếu sẽ hiển thị khi hệ thống đã sinh `receiptUrl`.</p>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setReceiptOpen(false)}>Đóng</Button>
          <Button variant="accent" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> In
          </Button>
        </div>
      </Modal>

      {/* Modal kết quả kiểm tra hồ sơ bằng AI */}
      <Modal
        open={aiAuditOpen}
        onClose={() => { if (!aiAuditing) setAiAuditOpen(false) }}
        title="Kết quả kiểm tra hồ sơ bằng AI"
        description="AI đọc các tài liệu đính kèm (PDF + ảnh) và đưa ra cảnh báo rủi ro giúp CĐT duyệt nhanh hơn."
        size="lg"
      >
        {aiAuditing && (
          <div className="flex flex-col items-center gap-3 py-10 text-slate-600 dark:text-slate-300">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <p className="text-sm">Đang phân tích tài liệu hồ sơ, vui lòng đợi trong giây lát…</p>
          </div>
        )}
        {!aiAuditing && aiAuditError && (
          <Alert variant="error">
            Không thể phân tích hồ sơ: {aiAuditError}
          </Alert>
        )}
        {!aiAuditing && !aiAuditError && aiAuditResult && (
          <AiAuditResultPanel result={aiAuditResult} />
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={aiAuditing}
            onClick={() => setAiAuditOpen(false)}
          >
            Đóng
          </Button>
          <Button
            variant="accent"
            disabled={aiAuditing}
            onClick={() => void runAiAudit()}
          >
            <Sparkles className="h-4 w-4" /> Phân tích lại
          </Button>
        </div>
      </Modal>
    </div>
  )
}

/**
 * Panel hiển thị kết quả AI audit: tổng quan + danh sách checklist.
 * Thiết kế gọn 2 phần: (1) card tóm tắt có risk + counters, (2) grid checklist.
 */
function AiAuditResultPanel({ result }: { result: AuditChecklistResponse }) {
  const checks = result.checks ?? []

  // Đếm số mục theo trạng thái
  const counts = checks.reduce(
    (acc, c) => {
      const s = String(c.status).toUpperCase()
      if (s === 'OK') acc.ok += 1
      else if (s === 'FAIL') acc.fail += 1
      else if (s === 'WARN') acc.warn += 1
      else acc.other += 1
      return acc
    },
    { ok: 0, fail: 0, warn: 0, other: 0 },
  )

  const risk = String(result.riskLevel ?? '').toUpperCase()
  const RISK_META: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'secondary'; bar: string }> = {
    LOW: { label: 'Rủi ro thấp', tone: 'success', bar: 'bg-emerald-500' },
    MEDIUM: { label: 'Rủi ro trung bình', tone: 'warning', bar: 'bg-amber-500' },
    HIGH: { label: 'Rủi ro cao', tone: 'danger', bar: 'bg-red-500' },
  }
  const riskMeta = RISK_META[risk]

  // Cấu hình tone cho từng status (gộp mọi style vào 1 chỗ)
  const STATUS_META: Record<string, { icon: typeof CheckCircle2; badge: 'success' | 'warning' | 'danger' | 'secondary'; card: string; iconTone: string; label: string }> = {
    OK: {
      icon: CheckCircle2,
      badge: 'success',
      label: 'Đạt',
      card: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30',
      iconTone: 'text-emerald-600 dark:text-emerald-300',
    },
    WARN: {
      icon: AlertTriangle,
      badge: 'warning',
      label: 'Cảnh báo',
      card: 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/30',
      iconTone: 'text-amber-600 dark:text-amber-300',
    },
    FAIL: {
      icon: XCircle,
      badge: 'danger',
      label: 'Không đạt',
      card: 'border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/30',
      iconTone: 'text-red-600 dark:text-red-300',
    },
  }
  const otherMeta = {
    icon: AlertTriangle,
    badge: 'secondary' as const,
    label: 'Khác',
    card: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50',
    iconTone: 'text-slate-500 dark:text-slate-300',
  }

  return (
    <div className="space-y-4">
      {/* ===== Card tổng quan ===== */}
      <div className="relative overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-sky-50/60 p-4 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-sky-950/30">
        {riskMeta && (
          <span
            aria-hidden
            className={`absolute inset-x-0 top-0 h-1 ${riskMeta.bar}`}
          />
        )}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <span className="text-sm font-semibold text-violet-900 dark:text-violet-200">
              Tổng quan từ AI
            </span>
          </div>
          {riskMeta ? (
            <Badge variant={riskMeta.tone}>{riskMeta.label}</Badge>
          ) : (
            <Badge variant="secondary">Chưa xác định mức rủi ro</Badge>
          )}
        </div>

        {result.summary && (
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {result.summary}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {result.overallScore != null && (
            <span className="rounded-full bg-white/70 px-2.5 py-1 font-semibold text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
              Điểm tổng: <strong>{result.overallScore}</strong>
            </span>
          )}
          <CounterChip tone="ok" value={counts.ok} />
          {counts.warn > 0 && <CounterChip tone="warn" value={counts.warn} />}
          {counts.fail > 0 && <CounterChip tone="fail" value={counts.fail} />}
          {counts.other > 0 && <CounterChip tone="other" value={counts.other} />}
          {checks.length === 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Không có checklist chi tiết
            </span>
          )}
        </div>
      </div>

      {/* ===== Danh sách checklist ===== */}
      {checks.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {checks.map((c, i) => {
            const key = String(c.status).toUpperCase()
            const meta = STATUS_META[key] ?? otherMeta
            const Icon = meta.icon
            return (
              <div
                key={`${c.field}-${i}`}
                className={`flex items-start gap-3 rounded-xl border p-3 ${meta.card}`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.iconTone}`} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {c.field}
                    </span>
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                  </div>
                  {c.documentName && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tài liệu: <span className="font-mono">{c.documentName}</span>
                    </p>
                  )}
                  {c.note && (
                    <p className="text-sm text-slate-700 dark:text-slate-200">{c.note}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      </div>
  )
}

/** Chip đếm số mục theo trạng thái — gọn và tái sử dụng được. */
function CounterChip({
  tone,
  value,
}: {
  tone: 'ok' | 'warn' | 'fail' | 'other'
  value: number
}) {
  const META = {
    ok: { label: 'đạt', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', icon: '✓' },
    warn: { label: 'cảnh báo', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', icon: '!' },
    fail: { label: 'không đạt', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200', icon: '✗' },
    other: { label: 'khác', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: '·' },
  } as const
  const m = META[tone]
  return (
    <span className={`rounded-full px-2.5 py-1 font-semibold ${m.className}`}>
      {m.icon} {value} {m.label}
    </span>
  )
}

export function ApplicationDetailPage() {
  const appId = sessionStorage.getItem('applicationId')
  return (
    <div>
      <PageHeader routeId="application-detail" />
      <PageCard className="p-6">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('applications')}>← Danh sách hồ sơ</Button>
        {!appId ? <Alert variant="error">Không tìm thấy hồ sơ. Quay lại danh sách.</Alert> : <ApplicationDetailInner appId={appId} />}
      </PageCard>
    </div>
  )
}
