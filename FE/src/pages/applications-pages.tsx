import { useEffect, useState } from 'react'
import { housingApplicationsApi, parseApplicationDetail, parsePagedApplications } from '@/api/housing-applications'
import { CreateApplicationWizard } from '@/components/ekyc/create-application-wizard'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input, Select } from '@/components/ui/input'
import { navigate } from '@/hooks/useHashRoute'
import { labelApplicationStatus } from '@/lib/labels'
import { APPLICATION_STATUS, DOC_TYPE_LABELS, HOUSING_STATUS_LABELS } from '@/lib/constants'
import { formatError } from '@/lib/format-error'
import { getRole } from '@/router'
import type { ApplicationDetailDto, ApplicationSummaryDto } from '@/types'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800 sm:flex-row sm:justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export function ApplicationsPage() {
  const role = getRole()
  const isApplicant = role === 'Applicant'
  const [apps, setApps] = useState<ApplicationSummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const load = async (filter?: { search?: string; status?: string }) => {
    setLoading(true)
    setError('')
    try {
      const data = isApplicant
        ? await housingApplicationsApi.getMy({ pageIndex: 1, pageSize: 20, ...filter })
        : await housingApplicationsApi.getAll({ pageIndex: 1, pageSize: 20, ...filter })
      setApps(parsePagedApplications(data))
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [isApplicant])

  return (
    <div>
      <PageHeader routeId="applications" />
      <PageCard className="p-6">
        {isApplicant && (
          <div className="mb-4">
            <Button variant="accent" onClick={() => navigate('create-application')}>Tạo hồ sơ mới</Button>
          </div>
        )}
        <form className="mb-6 grid gap-3 sm:grid-cols-3" onSubmit={(e) => {
          e.preventDefault()
          void load({ search: search || undefined, status: status || undefined })
        }}>
          <FormField label="Tìm kiếm" htmlFor="search"><Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Họ tên / CCCD" /></FormField>
          <FormField label="Trạng thái" htmlFor="status">
            <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả</option>
              {Object.entries(APPLICATION_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
          </FormField>
          <div className="flex items-end"><Button type="submit" variant="outline">Lọc</Button></div>
        </form>
        {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
        {error && <Alert variant="error">{error}</Alert>}
        {!loading && !error && apps.length === 0 && (
          <p className="text-sm text-slate-500">{isApplicant ? 'Bạn chưa có hồ sơ nào.' : 'Không có hồ sơ phù hợp.'}</p>
        )}
        <div className="grid gap-3">
          {apps.map((app) => (
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
              <p className="mt-1 text-sm text-slate-500">{app.applicantFullName} · CCCD: {app.citizenId}</p>
              <p className="text-sm text-slate-500">Thu nhập: {Number(app.estimatedMonthlyIncome).toLocaleString('vi-VN')} VNĐ/tháng</p>
              <p className="text-xs text-slate-400">{app.documentCount} tài liệu · {new Date(app.createdAt).toLocaleDateString('vi-VN')}</p>
            </button>
          ))}
        </div>
      </PageCard>
    </div>
  )
}

export function CreateApplicationPage() {
  return (
    <div>
      <PageHeader routeId="create-application" />
      <PageCard className="p-6">
        <CreateApplicationWizard />
      </PageCard>
    </div>
  )
}

function ApplicationDetailInner({ appId }: { appId: string }) {
  const role = getRole()
  const [app, setApp] = useState<ApplicationDetailDto | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const data = await housingApplicationsApi.getById(appId)
    setApp(parseApplicationDetail(data))
  }

  useEffect(() => {
    void refresh().catch((err) => setMsg({ type: 'error', text: formatError(err) })).finally(() => setLoading(false))
  }, [appId])

  const review = async (reviewer: 'vo' | 'wm', action: string, needNote = false) => {
    let note: string | null = null
    if (needNote) {
      note = window.prompt('Nhập ghi chú / lý do:')
      if (!note?.trim()) { setMsg({ type: 'error', text: 'Ghi chú là bắt buộc.' }); return }
    }
    try {
      const body = { action, note: note?.trim() || null }
      if (reviewer === 'vo') await housingApplicationsApi.voReview(appId, body)
      else await housingApplicationsApi.wmReview(appId, body)
      await refresh()
      setMsg({ type: 'success', text: 'Cập nhật hồ sơ thành công.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Đang tải...</p>
  if (!app) return <Alert variant="error">Không đọc được dữ liệu hồ sơ.</Alert>

  const canEditDocs = role === 'Applicant' && (app.applicationStatus === 'DRAFT' || app.applicationStatus === 'NEED_MORE_DOCUMENTS')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{app.projectName}</h2>
        <StatusBadge status={app.applicationStatus} />
      </div>
      <div className="glass-card p-4">
        <h3 className="mb-2 font-semibold">Thông tin đăng ký</h3>
        <DetailRow label="Họ tên" value={app.fullName} />
        <DetailRow label="CCCD" value={app.citizenId} />
        <DetailRow label="Nghề nghiệp" value={app.occupation || '—'} />
        <DetailRow label="Nơi làm việc" value={app.workPlace || '—'} />
        <DetailRow label="Nơi ở hiện tại" value={app.currentResidence} />
        <DetailRow label="Thường trú/tạm trú" value={app.permanentAddress} />
        <DetailRow label="Thực trạng nhà ở" value={HOUSING_STATUS_LABELS[app.housingStatus] ?? app.housingStatus} />
        <DetailRow label="Thu nhập/tháng" value={`${Number(app.estimatedMonthlyIncome).toLocaleString('vi-VN')} VNĐ`} />
        <DetailRow label="Ngày tạo" value={new Date(app.createdAt).toLocaleString('vi-VN')} />
        {app.officerFullName && <DetailRow label="Cán bộ thẩm định" value={app.officerFullName} />}
      </div>
      <div className="glass-card p-4">
        <h3 className="mb-2 font-semibold">Tài liệu đính kèm</h3>
        {(app.documents ?? []).length === 0 && <p className="text-sm text-slate-500">Chưa có tài liệu.</p>}
        {(app.documents ?? []).map((doc) => (
          <div key={doc.documentId} className="flex flex-wrap items-center justify-between gap-2 border-b py-3 last:border-0">
            <div>
              <p className="font-medium">{DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}</p>
              <p className="text-xs text-slate-500">{doc.fileName} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB</p>
            </div>
            <div className="flex gap-2">
              <a href={doc.fileUrl} target="_blank" rel="noopener" className="text-sm font-semibold text-primary hover:underline">Xem PDF</a>
              {canEditDocs && (
                <Button variant="ghost" size="sm" className="text-red-600" onClick={async () => {
                  try {
                    await housingApplicationsApi.deleteDocument(app.applicationId, doc.documentId)
                    await refresh()
                    setMsg({ type: 'success', text: 'Đã xóa tài liệu.' })
                  } catch (err) { setMsg({ type: 'error', text: formatError(err) }) }
                }}>Xóa</Button>
              )}
            </div>
          </div>
        ))}
        {canEditDocs && (
          <form className="mt-4 space-y-3 border-t pt-4" onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const file = fd.get('file') as File | null
            if (!file?.size) { setMsg({ type: 'error', text: 'Chọn file PDF.' }); return }
            try {
              await housingApplicationsApi.uploadDocument(app.applicationId, String(fd.get('documentType')), file)
              await refresh()
              setMsg({ type: 'success', text: 'Tải lên tài liệu thành công.' })
              e.currentTarget.reset()
            } catch (err) { setMsg({ type: 'error', text: formatError(err) }) }
          }}>
            <FormField label="Loại giấy tờ" htmlFor="documentType">
              <Select id="documentType" name="documentType">
                {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </FormField>
            <FormField label="Tệp PDF" htmlFor="doc-file"><Input id="doc-file" name="file" type="file" accept="application/pdf" required /></FormField>
            <Button type="submit" variant="outline">Tải lên tài liệu</Button>
          </form>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {role === 'Applicant' && app.applicationStatus === 'DRAFT' && (
          <Button variant="accent" onClick={async () => {
            try { await housingApplicationsApi.submit(app.applicationId); await refresh(); setMsg({ type: 'success', text: 'Đã nộp hồ sơ.' }) }
            catch (err) { setMsg({ type: 'error', text: formatError(err) }) }
          }}>Nộp hồ sơ</Button>
        )}
        {role === 'Verification Officer' && ['SUBMITTED', 'NEED_MORE_DOCUMENTS'].includes(app.applicationStatus) && (
          <Button variant="accent" onClick={async () => {
            try { await housingApplicationsApi.assign(app.applicationId); await refresh(); setMsg({ type: 'success', text: 'Đã nhận hồ sơ.' }) }
            catch (err) { setMsg({ type: 'error', text: formatError(err) }) }
          }}>Nhận hồ sơ thẩm định</Button>
        )}
        {role === 'Verification Officer' && app.applicationStatus === 'UNDER_REVIEW' && (
          <>
            <Button variant="accent" onClick={() => void review('vo', 'APPROVE')}>Phê duyệt</Button>
            <Button variant="outline" onClick={() => void review('vo', 'REJECT', true)}>Từ chối</Button>
          </>
        )}
        {role === 'Ward Manager' && app.applicationStatus === 'UNDER_REVIEW' && (
          <>
            <Button variant="accent" onClick={() => void review('wm', 'APPROVE')}>Phê duyệt</Button>
            <Button variant="outline" onClick={() => void review('wm', 'REQUEST_MORE_DOCUMENTS', true)}>Yêu cầu bổ sung</Button>
            <Button variant="outline" onClick={() => void review('wm', 'REJECT', true)}>Từ chối</Button>
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
                <span className="text-slate-500"> · {h.changedByFullName} · {new Date(h.changedAt).toLocaleString('vi-VN')}</span>
                {h.note && <p className="text-slate-600">{h.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
    </div>
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
