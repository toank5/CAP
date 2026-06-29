import { useEffect, useState } from 'react'
import { paymentApi, startVnPayPayment } from '@/api/payment'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { navigate } from '@/hooks/useHashRoute'
import { extractList } from '@/lib/parsers'
import { formatError } from '@/lib/format-error'
import { paymentStatusBadge } from '@/lib/labels'
import type { PaymentInfoDto } from '@/types'

function VnPayGuide() {
  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
      <h4 className="font-semibold">Thẻ thử nghiệm VNPay</h4>
      <ul className="mt-2 list-inside list-disc text-slate-600 dark:text-slate-400">
        <li>Ngân hàng: NCB</li>
        <li>Số thẻ: 9704198526191432198</li>
        <li>Ngày hết hạn: 07/15</li>
        <li>OTP: 123456</li>
      </ul>
    </div>
  )
}

export function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentInfoDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    void paymentApi.getMyPayments()
      .then((data) => setPayments(extractList(data) as unknown as PaymentInfoDto[]))
      .catch((err) => setError(formatError(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <div>
      <PageHeader routeId="payments" />
      <PageCard className="p-6">
        <Button variant="accent" className="mb-4" onClick={() => navigate('create-payment')}>Tạo thanh toán thử</Button>
        {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
        {error && <Alert variant="error">{error}</Alert>}
        {!loading && payments.length === 0 && (
          <p className="text-sm text-slate-500">Chưa có giao dịch nào. Bấm &quot;Tạo thanh toán thử&quot; để thử cổng VNPay.</p>
        )}
        <div className="grid gap-3">
          {payments.map((p) => {
            const st = paymentStatusBadge(p.status)
            return (
              <div key={p.orderId} className="glass-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{p.orderId}</h3>
                    <p className="text-sm text-slate-500">{p.orderInfo}</p>
                  </div>
                  <Badge variant={st.variant}>{st.text}</Badge>
                </div>
                <p className="mt-2 text-sm">{Number(p.amount).toLocaleString('vi-VN')} VNĐ · {new Date(p.createdAt ?? '').toLocaleString('vi-VN')}</p>
              </div>
            )
          })}
        </div>
        <VnPayGuide />
      </PageCard>
    </div>
  )
}

export function CreatePaymentPage() {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div>
      <PageHeader routeId="create-payment" />
      <PageCard className="p-6">
        <form className="mx-auto max-w-md space-y-4" onSubmit={async (e) => {
          e.preventDefault()
          setLoading(true)
          setMsg(null)
          const fd = new FormData(e.currentTarget)
          try {
            const url = await startVnPayPayment(
              String(fd.get('applicationId')).trim(),
              String(fd.get('orderInfo') || ''),
            )
            setMsg({ type: 'success', text: 'Đang chuyển sang cổng VNPay...' })
            window.location.href = url
          } catch (err) {
            setMsg({ type: 'error', text: formatError(err) })
            setLoading(false)
          }
        }}>
          <FormField label="Mã hồ sơ (Application ID)" htmlFor="applicationId">
            <Input id="applicationId" name="applicationId" placeholder="VD: 6300d56e-cad7-48e0-b55d-7204b77cb14f" required />
          </FormField>
          <FormField label="Nội dung thanh toán (tùy chọn)" htmlFor="orderInfo">
            <Input id="orderInfo" name="orderInfo" defaultValue="Thanh toan thu nghiem VNPay" />
          </FormField>
          {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
          <Button type="submit" variant="accent" disabled={loading}>{loading ? 'Đang xử lý...' : 'Thanh toán qua VNPay'}</Button>
        </form>
        <VnPayGuide />
      </PageCard>
    </div>
  )
}
