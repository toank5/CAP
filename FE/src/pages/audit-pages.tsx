import { useEffect, useState } from 'react'
import { CheckCircle2, Flag, ShieldAlert, XCircle } from 'lucide-react'
import {
  auditApi,
  AUDIT_STATUS_LABEL,
  AUDIT_STATUS_TONE,
  DEFAULT_CHECK_TEMPLATES,
  parseAuditRecord,
  parseAuditRecords,
  type AuditCheck,
  type AuditRecord,
} from '@/api/audit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/label'
import { Input, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageCard } from '@/components/layout/page-header'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import { getRole } from '@/router'

function persistAuditId(id: string) {
  if (id) sessionStorage.setItem('auditId', id)
  else sessionStorage.removeItem('auditId')
}

function readAuditId(): string {
  return sessionStorage.getItem('auditId') ?? ''
}

function AuditStatusBadge({ status }: { status: string }) {
  return <Badge variant={AUDIT_STATUS_TONE[status] ?? 'secondary'}>{AUDIT_STATUS_LABEL[status] ?? status}</Badge>
}

export function AuditListPage() {
  const role = getRole()
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const canManage = role === 'Department Of Construction' || role === 'System Administrator'

  const load = async () => {
    if (!canManage) {
      setLoading(false)
      setError('Chỉ Sở Xây dựng / Admin mới xem được mục công bố hậu kiểm. Để duyệt hồ sơ, đăng nhập SXD → Hồ sơ → Phê duyệt.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await auditApi.list()
      const all = parseAuditRecords(data)
      const audits = all.filter((r) =>
        !r.announcementType || r.announcementType.toUpperCase() === 'AUDIT',
      )
      setRecords(audits)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [canManage])

  const visible = statusFilter
    ? records.filter((r) => r.status === statusFilter)
    : records

  return (
    <div>
      <PageCard className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? 'Đang tải...' : `${visible.length} công bố hậu kiểm`}
          </p>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(AUDIT_STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <Button variant="accent" onClick={() => navigate('audit-create')}>+ Tạo công bố</Button>
          </div>
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        {!loading && visible.length === 0 && (
          <Alert variant="info">
            Chưa có công bố hậu kiểm nào. Sở Xây dựng có thể tạo công bố bằng nút «+ Tạo công bố» ở trên.
          </Alert>
        )}
        <div className="grid gap-3">
          {visible.map((r) => (
            <button
              key={r.id}
              type="button"
              className="glass-card flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left transition hover:ring-2 hover:ring-primary/20"
              onClick={() => {
                persistAuditId(r.id)
                navigate('audit-detail')
              }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{r.title}</h3>
                  <AuditStatusBadge status={r.status} />
                </div>
                {r.projectName && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Dự án: {r.projectName}</p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Người tạo: {r.createdByName ?? r.createdBy ?? '—'}
                  {r.createdAt && ` · ${new Date(r.createdAt).toLocaleString('vi-VN')}`}
                </p>
                {r.summary && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-1">{r.summary}</p>
                )}
              </div>
              <ShieldAlert className="h-5 w-5 text-blue-500" />
            </button>
          ))}
        </div>
      </PageCard>
    </div>
  )
}

export function AuditCreatePage() {
  const role = getRole()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [projectId, setProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [legalDocNumber, setLegalDocNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!title.trim() || !content.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập tiêu đề và nội dung.' })
      return
    }
    setBusy(true)
    try {
      const data = await auditApi.create({
        title: title.trim(),
        content: content.trim(),
        projectId: projectId.trim() || undefined,
        projectName: projectName.trim() || undefined,
        legalDocumentNumber: legalDocNumber.trim() || undefined,
        announcementType: 'AUDIT',
        status: 'PUBLISHED',
        isPinned: false,
      })
      const created = parseAuditRecord(data)
      const id = created?.id
      setMsg({ type: 'success', text: 'Tạo công bố hậu kiểm thành công.' })
      if (id) {
        persistAuditId(id)
        navigate('audit-detail')
      } else {
        navigate('audit-list')
      }
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy(false)
    }
  }

  if (role !== 'Department Of Construction' && role !== 'System Administrator') {
    return (
      <div>
        <PageCard className="p-6">
          <Alert variant="warning">Chỉ Sở Xây dựng / Admin mới có quyền tạo công bố hậu kiểm.</Alert>
        </PageCard>
      </div>
    )
  }

  return (
    <div>
      <PageCard className="p-6">
        <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
          {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
          <FormField label="Tiêu đề công bố" htmlFor="ac-title">
            <Input id="ac-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </FormField>
          <FormField label="Nội dung" htmlFor="ac-content">
            <textarea
              id="ac-content"
              className="input min-h-[140px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung hậu kiểm..."
              required
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Mã dự án (tùy chọn)" htmlFor="ac-pid">
              <Input id="ac-pid" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
            </FormField>
            <FormField label="Tên dự án (tùy chọn)" htmlFor="ac-pname">
              <Input id="ac-pname" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Số văn bản pháp lý (tùy chọn)" htmlFor="ac-docnum">
            <Input id="ac-docnum" value={legalDocNumber} onChange={(e) => setLegalDocNumber(e.target.value)} />
          </FormField>
          <div className="flex gap-2">
            <Button variant="accent" type="submit" disabled={busy}>{busy ? 'Đang tạo...' : 'Tạo công bố'}</Button>
            <Button variant="outline" type="button" onClick={() => navigate('audit-list')}>Huỷ</Button>
          </div>
        </form>
      </PageCard>
    </div>
  )
}

function CheckItem({
  check,
  onChange,
  disabled,
}: {
  check: AuditCheck
  onChange: (c: AuditCheck) => void
  disabled: boolean
}) {
  const statuses: AuditCheck['status'][] = ['OK', 'WARN', 'FAIL']
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <span className="text-sm">{check.field}</span>
      <div className="flex gap-1">
        {statuses.map((s) => {
          const active = check.status === s
          const cls =
            s === 'OK' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
              s === 'WARN' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
          return (
            <button
              key={s}
              type="button"
              disabled={disabled}
              className={`rounded-md px-2 py-1 text-xs font-semibold transition ${cls}${active ? ' ring-2 ring-offset-1 ring-current' : ' opacity-50 hover:opacity-80'}`}
              onClick={() => onChange({ ...check, status: s })}
            >
              {s === 'OK' ? '✓ Đạt' : s === 'WARN' ? '⚠ Cảnh báo' : '✗ Không đạt'}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AuditDetailPage() {
  const id = readAuditId()
  const role = getRole()
  const [record, setRecord] = useState<AuditRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editing, setEditing] = useState(false)
  const [checks, setChecks] = useState<AuditCheck[]>(DEFAULT_CHECK_TEMPLATES)
  const [summary, setSummary] = useState('')
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')

  const reload = async () => {
    if (!id) return
    try {
      const data = await auditApi.getById(id)
      const r = parseAuditRecord(data)
      setRecord(r)
      if (r?.checks && r.checks.length > 0) {
        setChecks(r.checks)
        setSummary(r.summary ?? '')
      } else if (r?.summary) {
        setSummary(r.summary)
      }
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [id])

  const updateCheck = (i: number, c: AuditCheck) => {
    setChecks((prev) => {
      const next = [...prev]
      next[i] = c
      return next
    })
  }

  const action = async (label: string, fn: () => Promise<unknown>) => {
    if (!id || busy) return
    setBusy(label)
    setMsg(null)
    try {
      await fn()
      await reload()
      setEditing(false)
      setMsg({ type: 'success', text: `${label} thành công.` })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy('')
    }
  }

  const saveChecks = async () => {
    if (!record) return
    setBusy('save')
    setMsg(null)
    try {
      await auditApi.saveChecks(record.id, checks, summary)
      await reload()
      setEditing(false)
      setMsg({ type: 'success', text: 'Lưu checklist thành công.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy('')
    }
  }

  if (!id) {
    return (
      <div>
        <PageCard className="p-6"><Alert variant="error">Không tìm thấy công bố.</Alert></PageCard>
      </div>
    )
  }
  if (loading) {
    return (
      <div>
        <PageCard className="p-6"><p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p></PageCard>
      </div>
    )
  }
  if (error) {
    return (
      <div>
        <PageCard className="p-6"><Alert variant="error">{error}</Alert></PageCard>
      </div>
    )
  }
  if (!record) return null

  const isSxd = role === 'Department Of Construction' || role === 'System Administrator'
  const canReview = isSxd && record.status !== 'ARCHIVED'

  return (
    <div>
      <PageCard className="space-y-6 p-6">
        <Button variant="ghost" className="mb-2" onClick={() => navigate('audit-list')}>← Danh sách hậu kiểm</Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{record.title}</h2>
            {record.projectName && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Dự án: {record.projectName}
              </p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Tạo bởi: {record.createdByName ?? record.createdBy ?? '—'}
              {record.createdAt && ` · ${new Date(record.createdAt).toLocaleString('vi-VN')}`}
            </p>
            {record.legalDocumentNumber && (
              <p className="text-xs text-slate-400 dark:text-slate-500">Số VBPL: {record.legalDocumentNumber}</p>
            )}
          </div>
          <AuditStatusBadge status={record.status} />
        </div>

        {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}

        {record.content && !record.content.startsWith('checks:') && (
          <div className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
            {record.content}
          </div>
        )}

        {/* Checklist hậu kiểm */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-semibold">Checklist hậu kiểm</h4>
            {canReview && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Chỉnh sửa checklist</Button>
            )}
          </div>

          {(editing || (record.checks && record.checks.length > 0)) && (
            <div className="space-y-2">
              {(editing ? checks : (record.checks ?? [])).map((c, i) => (
                <CheckItem
                  key={`${c.field}-${i}`}
                  check={c}
                  onChange={(updated) => updateCheck(i, updated)}
                  disabled={!editing}
                />
              ))}
            </div>
          )}

          {(editing || record.summary) && (
            <div className="mt-3">
              <FormField label="Tổng kết / Ghi chú" htmlFor="audit-summary">
                <textarea
                  id="audit-summary"
                  className="input min-h-[80px]"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={!editing}
                  placeholder="Ghi chú kết quả hậu kiểm..."
                />
              </FormField>
            </div>
          )}

          {editing && (
            <div className="mt-3 flex gap-2">
              <Button variant="accent" disabled={!!busy} onClick={() => void saveChecks()}>
                {busy === 'save' ? 'Đang lưu...' : 'Lưu checklist'}
              </Button>
              <Button variant="outline" disabled={!!busy} onClick={() => { setEditing(false); setChecks(DEFAULT_CHECK_TEMPLATES); }}>
                Huỷ
              </Button>
            </div>
          )}
        </div>

        {/* Quyết định */}
        {isSxd && canReview && (
          <div className="flex flex-wrap gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-800 dark:bg-blue-950/30">
            <h4 className="mb-2 w-full text-sm font-semibold text-blue-900 dark:text-blue-200">
              Quyết định hậu kiểm
            </h4>
            <Button
              variant="accent"
              disabled={!!busy}
              onClick={() => action('Phê duyệt', () => auditApi.approve(record!.id, summary || 'Đạt hậu kiểm'))}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {busy === 'Phê duyệt' ? 'Đang phê duyệt...' : 'Đạt hậu kiểm'}
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => action('Gắn cờ', () => auditApi.flag(record!.id, summary || 'Cần xem xét thêm'))}
            >
              <Flag className="mr-1.5 h-4 w-4" />
              {busy === 'Gắn cờ' ? 'Đang gắn...' : 'Gắn cờ'}
            </Button>
            <Button
              variant="outline"
              className="text-rose-600 dark:text-rose-400"
              disabled={!!busy}
              onClick={() => {
                setRejectReason('')
                setRejectError('')
                setRejectModalOpen(true)
              }}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              {busy === 'Từ chối' ? 'Đang từ chối...' : 'Từ chối'}
            </Button>
          </div>
        )}

        <Modal
          open={rejectModalOpen}
          onClose={() => { if (!busy) setRejectModalOpen(false) }}
          title="Từ chối hồ sơ hậu kiểm"
          description={`Nhập lý do từ chối cho hồ sơ: ${record.title}`}
        >
          <div className="space-y-4">
            <FormField label="Lý do từ chối *" htmlFor="audit-reject-reason" error={rejectError}>
              <Textarea
                id="audit-reject-reason"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value)
                  if (rejectError) setRejectError('')
                }}
                placeholder="Nhập chi tiết lý do từ chối hồ sơ hậu kiểm..."
                rows={4}
                autoFocus
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                disabled={!!busy}
                onClick={() => setRejectModalOpen(false)}
              >
                Huỷ bỏ
              </Button>
              <Button
                variant="accent"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                disabled={!!busy}
                onClick={async () => {
                  if (!rejectReason.trim()) {
                    setRejectError('Vui lòng nhập lý do từ chối.')
                    return
                  }
                  setRejectModalOpen(false)
                  await action('Từ chối', () => auditApi.reject(record.id, rejectReason.trim()))
                }}
              >
                {busy === 'Từ chối' ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </Button>
            </div>
          </div>
        </Modal>
      </PageCard>
    </div>
  )
}
