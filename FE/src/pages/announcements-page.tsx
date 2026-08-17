import { useCallback, useEffect, useState } from 'react'
import { Pin, Paperclip, Plus, Trash2, Edit2 } from 'lucide-react'
import {
  announcementsApi,
  parseAnnouncement,
  parsePagedAnnouncements,
  type AnnouncementDto,
} from '@/api/announcements'
import { reportsApi } from '@/api/reports'
import { GovHeroBanner } from '@/components/layout/gov-hero-banner'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import { getRole } from '@/router'
import { formatError } from '@/lib/format-error'

const TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  { value: 'OFFICIAL', label: 'Thông báo chính thức' },
  { value: 'LOTTERY', label: 'Lịch bốc thăm' },
  { value: 'PRICE_ADJUSTMENT', label: 'Điều chỉnh giá' },
  { value: 'GENERAL', label: 'Chung' },
]

function typeLabel(t: string) {
  return TYPE_OPTIONS.find((o) => o.value === t)?.label || t || 'Thông báo'
}

export function AnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [selected, setSelected] = useState<AnnouncementDto | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async (q?: { search?: string; type?: string }) => {
    setLoading(true)
    setError('')
    try {
      const data = await announcementsApi.getPublished({
        page: 1,
        pageSize: 30,
        search: q?.search || undefined,
        type: q?.type || undefined,
      })
      setItems(parsePagedAnnouncements(data).items)
    } catch (err) {
      setError(formatError(err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const data = await announcementsApi.getById(id)
      const parsed = parseAnnouncement(data)
      setSelected(parsed)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setDetailLoading(false)
    }
  }

  if (selected) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelected(null)}>← Danh sách thông báo</Button>
        {detailLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                {typeLabel(selected.announcementType)}
              </span>
              {selected.isPinned && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                  <Pin className="h-3 w-3" /> Ghim
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selected.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {selected.createdByName}
              {selected.projectName ? ` · ${selected.projectName}` : ''}
              {' · '}
              {selected.createdAt ? new Date(selected.createdAt).toLocaleString('vi-VN') : ''}
            </p>
            {selected.legalDocumentNumber && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Số văn bản: <strong>{selected.legalDocumentNumber}</strong>
              </p>
            )}
            <div
              className="prose prose-slate mt-6 max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: selected.content }}
            />
            {selected.attachments.length > 0 && (
              <div className="mt-6 border-t pt-4 dark:border-slate-700">
                <h3 className="mb-2 text-sm font-semibold">Đính kèm</h3>
                <ul className="space-y-2">
                  {selected.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={a.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                      >
                        <Paperclip className="h-4 w-4" />
                        {a.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <GovHeroBanner
        badge="Công khai"
        title="Thông báo từ Sở Xây dựng & Chủ đầu tư"
        subtitle="Lịch bốc thăm, điều chỉnh giá bán và các thông báo chính thức."
      />

      <form
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          void load({ search, type })
        }}
      >
        <Input
          placeholder="Tìm theo tiêu đề..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="sm:w-56">
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      {loading && (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Chưa có thông báo"
          description="Hiện chưa có bài viết thông báo công khai."
        />
      )}

      <div className="grid gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => void openDetail(item.id)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:ring-2 hover:ring-blue-200 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
              <div className="flex items-center gap-2">
                {item.isPinned && <Pin className="h-4 w-4 text-amber-500" />}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {typeLabel(item.announcementType)}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {item.createdByName}
              {item.projectName ? ` · ${item.projectName}` : ''}
              {' · '}
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TRANG QUẢN LÝ THÔNG BÁO CHO SỞ XÂY DỰNG
// ═══════════════════════════════════════════════════════════════

export function SxdAnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [total, setTotal] = useState(0)
  const [exporting, setExporting] = useState(false)

  // Form tạo/sửa
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<AnnouncementDto | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formType, setFormType] = useState('GENERAL')
  const [formDocNumber, setFormDocNumber] = useState('')
  const [formEffective, setFormEffective] = useState('')
  const [formExpire, setFormExpire] = useState('')
  const [formPinned, setFormPinned] = useState(false)
  const [formBusy, setFormBusy] = useState(false)
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await announcementsApi.getManagement({
        page: 1,
        pageSize: 50,
        search: search || undefined,
        type: type || undefined,
      })
      const parsed = parsePagedAnnouncements(data)
      setItems(parsed.items)
      setTotal(parsed.totalCount)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }, [search, type])

  useEffect(() => { void load() }, [load])

  const openCreate = () => {
    setEditItem(null)
    setFormTitle('')
    setFormContent('')
    setFormType('GENERAL')
    setFormDocNumber('')
    setFormEffective('')
    setFormExpire('')
    setFormPinned(false)
    setFormMsg(null)
    setFormOpen(true)
  }

  const openEdit = (item: AnnouncementDto) => {
    setEditItem(item)
    setFormTitle(item.title)
    setFormContent(item.content)
    setFormType(item.announcementType || 'GENERAL')
    setFormDocNumber(item.legalDocumentNumber || '')
    setFormEffective(item.effectiveDate ? item.effectiveDate.split('T')[0] : '')
    setFormExpire(item.expirationDate ? item.expirationDate.split('T')[0] : '')
    setFormPinned(item.isPinned)
    setFormMsg(null)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      setFormMsg({ type: 'error', text: 'Tiêu đề và nội dung là bắt buộc.' })
      return
    }
    setFormBusy(true)
    setFormMsg(null)
    try {
      const body = {
        title: formTitle.trim(),
        content: formContent.trim(),
        announcementType: formType,
        legalDocumentNumber: formDocNumber.trim() || undefined,
        effectiveDate: formEffective || undefined,
        expirationDate: formExpire || undefined,
        isPinned: formPinned,
      }
      if (editItem) {
        await announcementsApi.update(editItem.id, body)
      } else {
        await announcementsApi.create(body)
      }
      setFormOpen(false)
      void load()
    } catch (err) {
      setFormMsg({ type: 'error', text: formatError(err) })
    } finally {
      setFormBusy(false)
    }
  }

  const handleDelete = async (item: AnnouncementDto) => {
    if (!window.confirm(`Xóa thông báo "${item.title}"?`)) return
    try {
      await announcementsApi.delete(item.id)
      void load()
    } catch (err) {
      setError(formatError(err))
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await reportsApi.exportPostCheckExcel()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader routeId="sxd-announcements" />
      <PageCard className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1">
            <Input
              placeholder="Tìm tiêu đề..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void load() }}
            />
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-48">
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Button variant="outline" onClick={() => void load()}>Tìm</Button>
          <Button variant="accent" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Tạo thông báo
          </Button>
        </div>

        {/* Báo cáo */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={exporting} onClick={() => void handleExport()}>
            {exporting ? 'Đang tải...' : '📥 Xuất hậu kiểm CCCD (Excel)'}
          </Button>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {loading && <Skeleton className="h-16 w-full" />}

        {!loading && items.length === 0 && (
          <EmptyState
            title="Chưa có thông báo"
            description="Tạo thông báo mới bằng nút bên trên."
          />
        )}

        {!loading && items.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3">Ghim</th>
                  <th className="px-4 py-3">Người tạo</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium">{item.title}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                        {typeLabel(item.announcementType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.isPinned && <Pin className="h-4 w-4 text-amber-500" />}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.createdByName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 dark:text-rose-400"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* Modal tạo/sửa thông báo */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold">{editItem ? 'Sửa thông báo' : 'Tạo thông báo mới'}</h2>
            {formMsg && <Alert variant={formMsg.type === 'error' ? 'error' : 'success'} className="mb-4">{formMsg.text}</Alert>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Tiêu đề *</label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Nhập tiêu đề..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Nội dung *</label>
                <textarea
                  className="input min-h-[120px]"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Nhập nội dung thông báo..."
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Loại</label>
                  <Select value={formType} onChange={(e) => setFormType(e.target.value)}>
                    <option value="GENERAL">Chung</option>
                    <option value="OFFICIAL">Thông báo chính thức</option>
                    <option value="LOTTERY">Lịch bốc thăm</option>
                    <option value="PRICE_ADJUSTMENT">Điều chỉnh giá</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Số văn bản pháp lý</label>
                  <Input value={formDocNumber} onChange={(e) => setFormDocNumber(e.target.value)} placeholder="VD: 1234/QĐ-SXD" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Ngày hiệu lực</label>
                  <Input type="date" value={formEffective} onChange={(e) => setFormEffective(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Ngày hết hạn</label>
                  <Input type="date" value={formExpire} onChange={(e) => setFormExpire(e.target.value)} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formPinned} onChange={(e) => setFormPinned(e.target.checked)} />
                Ghim lên đầu danh sách
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Huỷ</Button>
              <Button variant="accent" disabled={formBusy} onClick={() => void handleSave()}>
                {formBusy ? 'Đang lưu...' : editItem ? 'Lưu thay đổi' : 'Tạo thông báo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
