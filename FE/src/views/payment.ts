import { paymentApi } from '../api/payment'
import { getRouteConfig, navigate } from '../router'
import { el, fdStr, field, onFormSubmit } from '../ui/helpers'
import { pageWithContent } from '../ui/page'

export function paymentsView(): HTMLElement {
  const m = getRouteConfig('payments')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const paymentsList = el('div', { class: 'payments-list' })
  const createBtn = el('button', { type: 'button', class: 'btn-primary' }, 'Tạo thanh toán mới')

  const loadPayments = async () => {
    paymentsList.replaceChildren(el('p', {}, 'Đang tải...'))
    try {
      const data = await paymentApi.getMyPayments()
      const payments = (data as { data?: Array<any> })?.data ?? []

      if (payments.length === 0) {
        paymentsList.replaceChildren(el('p', {}, 'Không có giao dịch nào.'))
      } else {
        const items = payments.map((payment: any) =>
          el(
            'div',
            { class: 'payment-card', style: 'padding: 16px; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 12px;' },
            el('div', { style: 'display: flex; justify-content: space-between; align-items: center;' },
              el('div', {},
                el('h3', {}, payment.orderId || 'N/A'),
                el('p', {}, `Số tiền: ${payment.amount?.toLocaleString('vi-VN') || '0'} VNĐ`),
                el('p', {}, `Mô tả: ${payment.description || 'N/A'}`),
              ),
              el('div', { style: 'text-align: right;' },
                el('p', { style: `color: ${payment.status === 'completed' ? 'green' : 'orange'};` }, 
                  payment.status === 'completed' ? '✓ Hoàn thành' : '⏳ Đang chờ'
                ),
                el('p', { style: 'font-size: 0.9em; color: #666;' }, 
                  new Date(payment.createdAt).toLocaleDateString('vi-VN')
                ),
              ),
            ),
          ),
        )
        paymentsList.replaceChildren(...items)
      }
    } catch (err) {
      paymentsList.replaceChildren(el('p', { style: 'color: red;' }, String(err)))
    }
  }

  createBtn.addEventListener('click', () => {
    navigate('create-payment')
  })

  const toolbar = el('div', { class: 'toolbar' }, createBtn)
  const page = pageWithContent(m, toolbar, paymentsList, result)

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      loadPayments()
    }
  })
  observer.observe(page)

  return page
}

export function createPaymentView(): HTMLElement {
  const m = getRouteConfig('create-payment')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })

  const form = el(
    'form',
    { class: 'form-card' },
    field('ID dự án', 'projectId'),
    field('Số tiền', 'amount', 'number'),
    field('Mô tả', 'description', 'text', {}),
    field('URL quay về', 'returnUrl', 'url', {}),
    el('button', { type: 'submit', class: 'btn-primary' }, m.cta),
  )

  onFormSubmit(form, result, async (fd) => {
    const response = await paymentApi.createPaymentUrl({
      projectId: fdStr(fd, 'projectId'),
      amount: parseFloat(fdStr(fd, 'amount')) || 0,
      description: fdStr(fd, 'description') || undefined,
      returnUrl: fdStr(fd, 'returnUrl') || undefined,
    })

    // Nếu có paymentUrl, redirect tới trang thanh toán
    if (response && typeof response === 'object') {
      const paymentUrl = (response as any).paymentUrl
      if (paymentUrl) {
        setTimeout(() => {
          window.location.href = paymentUrl
        }, 1500)
      }
    }

    return response
  })

  return pageWithContent(m, form, result)
}
