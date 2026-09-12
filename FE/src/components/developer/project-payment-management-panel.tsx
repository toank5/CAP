import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  FileX2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import {
  paymentApi,
  parseCancellationRequests,
  parsePaymentProgressItems,
  type CancellationRequestItemDto,
  type ApplicationProgressItem,
} from '@/api/payment'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { formatError } from '@/lib/format-error'

interface ProjectPaymentManagementPanelProps {
  projectId: string
  projectName?: string
}

export function ProjectPaymentManagementPanel({
  projectId,
  projectName,
}: ProjectPaymentManagementPanelProps) {
  const [requests, setRequests] = useState<CancellationRequestItemDto[]>([])
  const [overdueApps, setOverdueApps] = useState<ApplicationProgressItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Forced Revocation Modal State
  const [forcedModalOpen, setForcedModalOpen] = useState(false)
  const [forcedAppId, setForcedAppId] = useState('')
  const [forcedReason, setForcedReason] = useState(
    'Chậm nộp tiền đợt quá 2 kỳ liên tiếp không có lý do chính đáng — đơn phương chấm dứt thỏa thuận và thu hồi căn theo Điều 5 Quy chế NOXH.',
  )

  const loadRequests = async () => {
    setLoading(true)
    setError('')
    try {
      const [cancelData, progressData] = await Promise.all([
        paymentApi.getCancellationRequests(projectId),
        paymentApi.getPaymentProgress(projectId).catch(() => null),
      ])
      setRequests(parseCancellationRequests(cancelData))
      setOverdueApps(
        parsePaymentProgressItems(progressData).filter((it) => it.isEligibleForForcedRevocation),
      )
    } catch (err) {
      console.warn('[ProjectPaymentManagementPanel] Failed to load cancellation requests:', err)
      setRequests([])
      setOverdueApps([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      void loadRequests()
    }
  }, [projectId])

  const handleApprove = async (req: CancellationRequestItemDto) => {
    if (
      !window.confirm(
        'Xác nhận DUYỆT đơn xin rút hồ sơ của "' + (req.applicantName || req.applicationId) + '"?\n' +
        '• Phạt mất cọc: ' + (req.forfeitedAmount ?? 0).toLocaleString('vi-VN') + ' VNĐ\n' +
        '• Hoàn trả: ' + (req.refundAmount ?? 0).toLocaleString('vi-VN') + ' VNĐ vào STK ' + (req.bankAccountNumber || '—') + ' (' + (req.bankName || '—') + ')\n\n' +
        'Suất căn hộ sẽ được hoàn lại quỹ căn để đôn ứng viên Danh sách chờ (Waitlist).',
      )
    ) {
      return
    }

    setActionBusy(req.applicationId)
    setMsg(null)
    try {
      await paymentApi.approveCancellation(req.applicationId)
      setMsg({
        type: 'success',
        text: 'Đã duyệt đơn rút hồ sơ của ' + (req.applicantName || req.applicationId) + '. Căn hộ đã được thu hồi và sẵn sàng đôn ứng viên Waitlist.',
      })
      await loadRequests()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setActionBusy(null)
    }
  }

  const handleOpenReject = (applicationId: string) => {
    setRejectTargetId(applicationId)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const handleConfirmReject = async () => {
    if (!rejectTargetId) return
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối yêu cầu rút hồ sơ.')
      return
    }

    setActionBusy(rejectTargetId)
    setMsg(null)
    try {
      await paymentApi.rejectCancellation(rejectTargetId, { reason: rejectReason.trim() })
      setMsg({
        type: 'success',
        text: 'Đã gửi phản hồi từ chối yêu cầu rút hồ sơ cho công dân.',
      })
      setRejectModalOpen(false)
      await loadRequests()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setActionBusy(null)
    }
  }

  const handleConfirmForcedRevocation = async () => {
    if (!forcedAppId.trim()) {
      alert('Vui lòng nhập Mã hồ sơ (Application ID) cần cưỡng chế thanh lý.')
      return
    }
    if (!forcedReason.trim()) {
      alert('Vui lòng nhập lý do cưỡng chế thu hồi căn.')
      return
    }

    setActionBusy('forced')
    setMsg(null)
    try {
      await paymentApi.cancelContract(forcedAppId.trim(), {
        reason: forcedReason.trim(),
        isForcedRevocation: true,
      })
      setMsg({
        type: 'success',
        text: 'Đã thực hiện cưỡng chế thanh lý hợp đồng. Tiền cọc bị phạt tịch thu và căn hộ đã được trả về quỹ căn.',
      })
      setForcedModalOpen(false)
      setForcedAppId('')
      await loadRequests()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setActionBusy(null)
    }
  }

  const formatMoney = (v?: number) => {
    if (v == null || Number.isNaN(v)) return '0 VNĐ'
    return v.toLocaleString('vi-VN') + ' VNĐ'
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50/90 via-orange-50/50 to-white p-5 shadow-xs dark:border-rose-900/50 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white shadow-md">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Rút hồ sơ &amp; xử lý vi phạm
                </h3>
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                  Chủ đầu tư điều hành
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Duyệt đơn tự nguyện rút hồ sơ (hoàn tiền trừ cọc vi phạm) và cưỡng chế thanh lý hợp đồng quá 2 đợt không đóng tiền theo Điều 5 Quy chế NOXH.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForcedModalOpen(true)}
              className="inline-flex items-center gap-1.5 border-rose-300 bg-rose-50/60 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <FileX2 className="h-3.5 w-3.5" />
              Cưỡng chế thanh lý vi phạm
            </Button>

            <button
              type="button"
              onClick={loadRequests}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              title="Làm mới danh sách"
            >
              <RefreshCw className={'h-3.5 w-3.5 ' + (loading ? 'animate-spin' : '')} />
            </button>
          </div>
        </div>
      </div>

      {/* Thông báo kết quả */}
      {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs dark:border-rose-900/40 dark:bg-slate-900">
        <div className="mb-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Hồ sơ chậm ≥ 2 kỳ — đủ điều kiện thu hồi cưỡng chế ({overdueApps.length})
          </h4>
          <p className="text-xs text-slate-500">
            Chọn hồ sơ trong danh sách, không cần dán mã. Suất căn sẽ trả về quỹ để đôn waitlist.
          </p>
        </div>
        {overdueApps.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">Không có hồ sơ quá hạn 2 kỳ trở lên.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50 text-[11px] font-bold uppercase text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                <tr>
                  <th className="px-3 py-2">Người mua</th>
                  <th className="px-3 py-2">Căn</th>
                  <th className="px-3 py-2 text-right">Kỳ quá hạn</th>
                  <th className="px-3 py-2 text-right">Lãi phạt</th>
                  <th className="px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overdueApps.map((app) => (
                  <tr key={app.applicationId}>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-900 dark:text-white">{app.applicantName || '—'}</div>
                      <div className="text-[11px] text-slate-400">CCCD: {app.citizenId || '—'}</div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-blue-600">{app.apartmentUnitName || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-rose-600">{app.overduePhasesCount}</td>
                    <td className="px-3 py-2.5 text-right">{formatMoney(app.accruedPenalty)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        size="sm"
                        className="h-7 bg-rose-600 px-2.5 text-[11px] font-bold text-white hover:bg-rose-700"
                        onClick={() => {
                          setForcedAppId(app.applicationId)
                          setForcedModalOpen(true)
                        }}
                      >
                        Thu hồi căn
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Danh sách yêu cầu xin rút hồ sơ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Banknote className="h-4 w-4 text-rose-600" />
              Đơn xin ngừng thanh toán &amp; Tự nguyện rút hồ sơ ({requests.length})
            </h4>
            <p className="text-xs text-slate-500">
              Khách hàng gặp khó khăn tài chính xin rút hồ sơ — CĐT duyệt hoàn tiền sau khi khấu trừ phạt mất tiền cọc đợt 1.
            </p>
          </div>

          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Dự án: {projectName || projectId}
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
            Đang tải danh sách yêu cầu rút hồ sơ...
          </div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Hiện không có yêu cầu xin rút hồ sơ hoặc hủy hợp đồng nào đang chờ xử lý trong dự án này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-lg">Người nộp đơn</th>
                  <th className="px-3 py-2.5">Căn hộ</th>
                  <th className="px-3 py-2.5 text-right">Đã thanh toán</th>
                  <th className="px-3 py-2.5 text-right text-rose-600">Phạt mất cọc</th>
                  <th className="px-3 py-2.5 text-right text-emerald-600">Tiền hoàn lại</th>
                  <th className="px-3 py-2.5">Tài khoản hoàn tiền</th>
                  <th className="px-3 py-2.5">Lý do</th>
                  <th className="px-3 py-2.5 text-right rounded-r-lg">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((r) => {
                  const isPending = !r.status || r.status.toUpperCase() === 'PENDING'
                  const isBusy = actionBusy === r.applicationId

                  return (
                    <tr key={r.applicationId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {r.applicantName || '(Chưa cập nhật)'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          CCCD: {r.citizenId || '—'} {r.phoneNumber ? '· ' + r.phoneNumber : ''}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {r.applicationId.slice(0, 8)}...
                        </div>
                      </td>

                      <td className="px-3 py-3 font-semibold text-blue-600 dark:text-blue-400">
                        {r.apartmentCode || '—'}
                      </td>

                      <td className="px-3 py-3 text-right font-medium">
                        {formatMoney(r.totalPaid)}
                      </td>

                      <td className="px-3 py-3 text-right font-bold text-rose-600">
                        - {formatMoney(r.forfeitedAmount)}
                      </td>

                      <td className="px-3 py-3 text-right font-bold text-emerald-600">
                        {formatMoney(r.refundAmount)}
                      </td>

                      <td className="px-3 py-3">
                        {r.bankAccountNumber ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {r.bankName || 'Ngân hàng'}
                            </div>
                            <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {r.bankAccountNumber}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {r.accountHolderName || ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa cung cấp</span>
                        )}
                      </td>

                      <td className="px-3 py-3 max-w-xs">
                        <p className="line-clamp-2 text-slate-600 dark:text-slate-300" title={r.reason}>
                          {r.reason || 'Khó khăn tài chính không thể tiếp tục thanh toán'}
                        </p>
                        {r.requestedAt && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(r.requestedAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleApprove(r)}
                              className="h-7 bg-emerald-600 px-2.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                            >
                              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Duyệt'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => handleOpenReject(r.applicationId)}
                              className="h-7 border-rose-300 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                            >
                              Từ chối
                            </Button>
                          </div>
                        ) : (
                          <span
                            className={'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ' + (
                              r.status && r.status.toUpperCase() === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            )}
                          >
                            {r.status && r.status.toUpperCase() === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal từ chối yêu cầu rút hồ sơ */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        size="md"
      >
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Từ chối yêu cầu rút hồ sơ
              </h3>
              <p className="text-xs text-slate-500">
                Nhập lý do phản hồi cho công dân về việc không chấp thuận đơn xin rút hồ sơ.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Lý do từ chối *
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="VD: Hợp đồng đang trong giai đoạn chuyển giao quyền sở hữu / Hồ sơ thông tin nhận hoàn tiền chưa hợp lệ..."
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={actionBusy === rejectTargetId || !rejectReason.trim()}
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {actionBusy === rejectTargetId ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Xác nhận từ chối
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Cưỡng chế thanh lý vi phạm */}
      <Modal
        open={forcedModalOpen}
        onClose={() => setForcedModalOpen(false)}
        size="md"
      >
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cưỡng chế thanh lý hợp đồng &amp; Thu hồi căn hộ
              </h3>
              <p className="text-xs text-slate-500">
                Áp dụng khi người mua chậm nộp tiền quá 2 đợt cam kết theo quy định Điều 5 Nghiệp vụ NOXH.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {forcedAppId ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {overdueApps.find((a) => a.applicationId === forcedAppId)?.applicantName || 'Hồ sơ đã chọn'}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">{forcedAppId}</p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chọn hồ sơ từ danh sách chậm ≥ 2 kỳ, hoặc dán mã nếu không có trong danh sách
                </label>
                <input
                  type="text"
                  value={forcedAppId}
                  onChange={(e) => setForcedAppId(e.target.value)}
                  placeholder="Mã hồ sơ (UUID)"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Căn cứ pháp lý &amp; Lý do đơn phương chấm dứt *
              </label>
              <textarea
                rows={3}
                value={forcedReason}
                onChange={(e) => setForcedReason(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Hậu quả pháp lý:
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Khách hàng vi phạm bị <strong>phạt tịch thu toàn bộ tiền đặt cọc đợt 1</strong>.</li>
                <li>Thỏa thuận mua bán / Hợp đồng bị <strong>thanh lý cưỡng chế</strong>.</li>
                <li>Căn hộ được hoàn về quỹ căn để <strong>đôn người đứng đầu Danh sách chờ (Waitlist #1)</strong> lên quyền mua.</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setForcedModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={actionBusy === 'forced' || !forcedAppId.trim() || !forcedReason.trim()}
              onClick={handleConfirmForcedRevocation}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {actionBusy === 'forced' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Cưỡng chế thanh lý
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
