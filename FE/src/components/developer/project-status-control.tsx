import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Hourglass,
  Loader2,
  PlayCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { housingProjectsApi, type ProjectStatusAction } from '@/api/housing-projects'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatError } from '@/lib/format-error'
import { labelProjectStatus } from '@/lib/labels'
import {
  AUTO_OPEN_AFTER_DAYS,
  daysUntilAutoOpen,
  effectiveProjectStatus,
  isOpenForRegistration,
  isPending,
  isUpcoming,
  normalizeStatus,
} from '@/lib/project-status-flow'
import type { HousingProjectDto } from '@/types'

interface Props {
  project: HousingProjectDto
  /** Callback refetch project sau khi SXD đổi trạng thái thành công. */
  onChanged?: (next: HousingProjectDto) => void
}

/**
 * Panel SXD quản lý trạng thái dự án.
 *
 *   PENDING  → [Duyệt → Sắp mở bán] [Từ chối]
 *   UPCOMING → [Mở đăng ký ngay]  (BE ghi đè lên logic 30 ngày)
 *              + hiển thị đếm ngược tự động mở
 *   OPEN     → chỉ hiển thị badge (đã mở)
 *   CLOSED/FULL/REJECTED → chỉ hiển thị badge
 *
 * Ứng dụng:
 *   - Vai trò Department Of Construction (Sở Xây dựng) hoặc System Administrator
 *   - Tự coi `effectiveProjectStatus` để quyết định bước tiếp theo (kể cả khi đã quá 30 ngày)
 */
export function ProjectStatusControl({ project, onChanged }: Props) {
  const [busy, setBusy] = useState<ProjectStatusAction | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const raw = normalizeStatus(project.status)
  const eff = effectiveProjectStatus(project)
  const daysLeft = daysUntilAutoOpen(project)

  const run = async (action: ProjectStatusAction, opts?: { rejectReason?: string }) => {
    if (busy) return
    setBusy(action)
    setError('')
    setSuccess('')
    try {
      if (action === 'open') {
        await housingProjectsApi.changeLifecycleStatus(project.id ?? '', 'OPEN')
      } else {
        await housingProjectsApi.patchStatus(project.id ?? '', {
          action,
          rejectReason: opts?.rejectReason,
        })
      }
      // Refetch project để lấy status + publicAnnounceAt mới nhất
      const data = await housingProjectsApi.getById(project.id ?? '')
      // Sau refetch, ProjectDetailView cha sẽ tự cập nhật (vì navigate cùng projectId,
      // ProjectDetailView useEffect theo projectId). Nhưng cũng gọi onChanged best-effort.
      onChanged?.(project)
      setSuccess(
        action === 'approve'
          ? 'Đã duyệt — dự án chuyển sang Sắp mở bán.'
          : action === 'open'
            ? 'Đã mở đăng ký cho người dân.'
            : 'Đã từ chối dự án.',
      )
      setRejectMode(false)
      setRejectReason('')
      // Buộc reload parent: emit event đơn giản — ProjectDetailView sẽ tự gọi lại API khi mount.
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
      // Suppress unused-warning cho data refetch (đã được cache, parent sẽ tự refetch)
      void data
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBusy(null)
    }
  }

  const announcedAt = project.publicAnnounceAt
    ? new Date(project.publicAnnounceAt)
    : null

  return (
    <section className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <header className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-amber-700 dark:text-amber-300" />
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
          Quản lý trạng thái dự án — Sở Xây dựng
        </p>
      </header>

      {/* Trạng thái hiện tại */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Trạng thái hiện tại:
        </span>
        <StatusBadge effective={eff} raw={raw} />
        {eff !== raw && (
          <span className="text-[10px] italic text-slate-500 dark:text-slate-400">
            (BE lưu: {labelProjectStatus(project.status) || '—'})
          </span>
        )}
      </div>

      {/* Thông tin phụ trợ */}
      {announcedAt && !Number.isNaN(announcedAt.getTime()) && (
        <p className="mb-3 text-[11px] text-slate-600 dark:text-slate-400">
          <Clock className="mr-1 inline h-3 w-3" />
          Sở duyệt lúc:{' '}
          <strong>{announcedAt.toLocaleString('vi-VN')}</strong>
        </p>
      )}

      {isPending(project) && (
        <Alert variant="warning" className="mb-3">
          <strong>Chờ phê duyệt.</strong> Dự án vừa được Chủ đầu tư tạo và đang chờ Sở xem xét.
          Dự án <em>chưa hiển thị cho người dân</em>.
        </Alert>
      )}

      {isUpcoming(project) && (
        <Alert variant="info" className="mb-3">
          <strong>Sắp mở bán.</strong>{' '}
          {daysLeft !== null && daysLeft > 0 ? (
            <>
              Hệ thống sẽ tự động mở đăng ký sau{' '}
              <strong>{Math.ceil(daysLeft)} ngày</strong> (tính từ lúc Sở duyệt, tối đa{' '}
              {AUTO_OPEN_AFTER_DAYS} ngày).
            </>
          ) : daysLeft !== null && daysLeft <= 0 ? (
            <>Đã quá {AUTO_OPEN_AFTER_DAYS} ngày — dự án hiện được hiển thị là Đang mở đăng ký.</>
          ) : (
            <>Dự án sẽ tự mở đăng ký sau {AUTO_OPEN_AFTER_DAYS} ngày kể từ khi Sở duyệt.</>
          )}
        </Alert>
      )}

      {isOpenForRegistration(project) && (
        <Alert variant="success" className="mb-3">
          <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
          <strong>Đang mở đăng ký.</strong> Người dân có thể nộp hồ sơ trong khoảng thời gian đăng ký.
        </Alert>
      )}

      {error && (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-3">
          <Alert variant="success">{success}</Alert>
        </div>
      )}

      {/* Nút hành động theo trạng thái */}
      <div className="flex flex-wrap items-center gap-2">
        {isPending(project) && (
          <>
            <Button
              variant="default"
              disabled={!!busy}
              onClick={() => run('approve')}
              title="Duyệt dự án → chuyển sang Sắp mở bán"
            >
              {busy === 'approve' ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Đang duyệt...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Duyệt → Sắp mở bán
                </>
              )}
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                setRejectMode((v) => !v)
                setError('')
              }}
            >
              <XCircle className="mr-1 h-3.5 w-3.5 text-rose-600" /> Từ chối
            </Button>
          </>
        )}

        {isUpcoming(project) && (
          <Button
            variant="default"
            disabled={!!busy}
            onClick={() => run('open')}
            title="Mở đăng ký ngay (không cần đợi hết 30 ngày)"
          >
            {busy === 'open' ? (
              <>
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Đang mở...
              </>
            ) : (
              <>
                <PlayCircle className="mr-1 h-3.5 w-3.5" />
                Chuyển sang Đang mở đăng ký
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        )}

        {isOpenForRegistration(project) && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            <Hourglass className="mr-1 inline h-3 w-3" />
            Trạng thái kết thúc khi Sở đóng đăng ký hoặc hết suất.
          </span>
        )}

        {(normalizeStatus(project.status) === 'REJECTED' ||
          normalizeStatus(project.status) === 'CLOSED' ||
          normalizeStatus(project.status) === 'FULL') && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Trạng thái cuối — không thể chuyển thêm.
          </span>
        )}
      </div>

      {/* Form từ chối */}
      {rejectMode && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-800 dark:bg-rose-950/30">
          <label className="mb-1 block text-[11px] font-semibold text-rose-800 dark:text-rose-200">
            Lý do từ chối (gửi về Chủ đầu tư)
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            placeholder="VD: Hồ sơ pháp lý chưa đầy đủ, vui lòng bổ sung..."
            className="block w-full rounded-md border border-rose-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-rose-700 dark:bg-slate-800 dark:text-slate-50"
            disabled={!!busy}
          />
          <div className="mt-2 flex gap-2">
            <Button
              variant="default"
              disabled={!!busy || !rejectReason.trim()}
              onClick={() => run('reject', { rejectReason: rejectReason.trim() })}
            >
              {busy === 'reject' ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Đang gửi...
                </>
              ) : (
                'Xác nhận từ chối'
              )}
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                setRejectMode(false)
                setRejectReason('')
              }}
            >
              Huỷ
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function StatusBadge({ effective, raw }: { effective: string; raw: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING: {
      label: 'Chờ phê duyệt',
      cls: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-700/60',
      icon: <Hourglass className="h-3.5 w-3.5" />,
    },
    UPCOMING: {
      label: 'Sắp mở bán',
      cls: 'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:ring-blue-700/60',
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    OPEN: {
      label: 'Đang mở đăng ký',
      cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-700/60',
      icon: <PlayCircle className="h-3.5 w-3.5" />,
    },
    CLOSED: {
      label: 'Đã đóng đăng ký',
      cls: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700',
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
    FULL: {
      label: 'Đã hết suất',
      cls: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    REJECTED: {
      label: 'Bị từ chối',
      cls: 'bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-700/60',
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
  }
  const m = map[effective] ?? {
    label: labelProjectStatus(effective) || effective || 'Chưa xác định',
    cls: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700',
    icon: <Hourglass className="h-3.5 w-3.5" />,
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${m.cls}`}
      title={raw && raw !== effective ? `BE: ${raw}` : undefined}
    >
      {m.icon}
      {m.label}
    </span>
  )
}