import { useEffect, useState } from 'react'
import { paymentApi } from '@/api/payment'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { extractList } from '@/lib/parsers'
import { formatError } from '@/lib/format-error'
import { paymentStatusBadge } from '@/lib/labels'
import type { PaymentInfoDto } from '@/types'


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
        {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>}
        {error && <Alert variant="error">{error}</Alert>}
        {!loading && payments.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có giao dịch nào. Vào Hợp đồng để thanh toán từng đợt.</p>
        )}
        <div className="grid gap-3">
          {payments.map((p) => {
            const st = paymentStatusBadge(p.status)
            return (
              <div key={p.orderId} className="glass-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{p.orderId}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{p.orderInfo}</p>
                  </div>
                  <Badge variant={st.variant}>{st.text}</Badge>
                </div>
                <p className="mt-2 text-sm">{Number(p.amount).toLocaleString('vi-VN')} VNĐ · {new Date(p.createdAt ?? '').toLocaleString('vi-VN')}</p>
              </div>
            )
          })}
        </div>
      </PageCard>
    </div>
  )
}

