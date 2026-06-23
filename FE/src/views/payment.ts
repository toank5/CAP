import { paymentApi, startVnPayPayment } from '../api/payment'
import { getRouteConfig, navigate } from '../router'
import type { PaymentInfoDto } from '../types'
import { el, fdStr, field, onFormSubmit, showResult } from '../ui/helpers'
import { pageHeader } from '../ui/page'

const VNPAY_TEST_CARD = el(
  'div',
  { class: 'payment-sandbox-guide' },
  el('h4', { class: 'payment-sandbox-title' }, 'Thẻ test VNPay Sandbox'),
  el('ul', { class: 'payment-sandbox-list' },
    el('li', {}, 'Ngân hàng: NCB'),
    el('li', {}, 'Số thẻ: 9704198526191432198'),
    el('li', {}, 'Ngày hết hạn: 07/15'),
    el('li', {}, 'OTP: 123456'),
  ),
)

function paymentStatusLabel(status?: string): { text: string; className: string } {
  switch (status) {
    case 'Success':
      return { text: 'Thành công', className: 'is-success' }
    case 'Pending':
      return { text: 'Đang chờ', className: 'is-pending' }
    case 'Cancelled':
      return { text: 'Đã hủy', className: 'is-cancelled' }
    case 'Failed':
      return { text: 'Thất bại', className: 'is-failed' }
    default:
      return { text: status ?? 'Không rõ', className: 'is-pending' }
  }
}

function parsePayments(data: unknown): PaymentInfoDto[] {
  if (!data || typeof data !== 'object') return []
  const o = data as Record<string, unknown>
  const list = o.data ?? o.Data
  return Array.isArray(list) ? (list as PaymentInfoDto[]) : []
}

export function paymentsView(): HTMLElement {
  const m = getRouteConfig('payments')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const paymentsList = el('div', { class: 'payments-list' })
  const createBtn = el('button', { type: 'button', class: 'btn-primary' }, 'Tạo thanh toán test')

  const loadPayments = async () => {
    paymentsList.replaceChildren(el('p', { class: 'payments-loading' }, 'Đang tải...'))
    try {
      const data = await paymentApi.getMyPayments()
      const payments = parsePayments(data)

      if (payments.length === 0) {
        paymentsList.replaceChildren(
          el('p', { class: 'payments-empty' }, 'Chưa có giao dịch nào. Bấm "Tạo thanh toán test" để thử VNPay Sandbox.'),
        )
      } else {
        const items = payments.map((payment) => {
          const st = paymentStatusLabel(payment.status)
          return el(
            'div',
            { class: 'payment-card' },
            el('div', { class: 'payment-card-head' },
              el('div', {},
                el('h3', { class: 'payment-order-id' }, payment.orderId),
                el('p', { class: 'payment-order-info' }, payment.orderInfo),
              ),
              el('span', { class: `payment-status ${st.className}` }, st.text),
            ),
            el('div', { class: 'payment-card-meta' },
              el('span', {}, `${Number(payment.amount).toLocaleString('vi-VN')} VNĐ`),
              el('span', {}, new Date(payment.createdAt ?? '').toLocaleString('vi-VN')),
            ),
          )
        })
        paymentsList.replaceChildren(...items)
      }
    } catch (err) {
      paymentsList.replaceChildren(el('p', { class: 'payments-error' }, String(err)))
    }
  }

  createBtn.addEventListener('click', () => navigate('create-payment'))

  const page = el(
    'article',
    { class: 'page payment-page' },
    pageHeader(m),
    el('div', { class: 'card' },
      el('div', { class: 'toolbar' }, createBtn),
      paymentsList,
      VNPAY_TEST_CARD,
      result,
    ),
  )

  void loadPayments()
  return page
}

export function createPaymentView(): HTMLElement {
  const m = getRouteConfig('create-payment')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })

  const form = el(
    'form',
    { class: 'form-card' },
    field('Nội dung thanh toán', 'orderInfo', 'text', {
      placeholder: 'Thanh toan dat coc nha o An Binh',
      value: 'Thanh toan test VNPay Sandbox',
    }),
    field('Số tiền (VND)', 'amount', 'number', { value: '100000', min: '1000', max: '100000000' }),
    el('button', { type: 'submit', class: 'btn-primary' }, 'Thanh toán qua VNPay'),
  )

  onFormSubmit(form, result, async (fd) => {
    const amount = parseFloat(fdStr(fd, 'amount')) || 0
    const orderInfo = fdStr(fd, 'orderInfo')
    const url = await startVnPayPayment(orderInfo, amount)
    showResult(result, { success: true, message: 'Đang chuyển sang cổng VNPay...' })
    window.location.href = url
    return { success: true, data: { paymentUrl: url } }
  })

  return el(
    'article',
    { class: 'page payment-page' },
    pageHeader(m),
    el('div', { class: 'card' },
      form,
      VNPAY_TEST_CARD,
      result,
    ),
  )
}
