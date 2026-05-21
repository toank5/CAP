import { ApiError } from '../api/http'

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Record<string, string>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v
      else if (k.startsWith('on') && typeof v === 'string') {
        /* skip */
      } else node.setAttribute(k, v)
    }
  }
  for (const c of children) {
    node.append(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return node
}

export function field(
  label: string,
  name: string,
  type = 'text',
  extra: Record<string, string> = {},
): HTMLDivElement {
  const id = name
  return el(
    'div',
    { class: 'form-field' },
    el('label', { for: id }, label),
    el('input', { type, name, id, ...extra }),
  )
}

export function formatError(err: unknown): string {
  if (err instanceof ApiError) {
    const b = err.body
    if (b && typeof b === 'object') {
      const pd = b as { title?: string; errors?: Record<string, string[]> }
      if (pd.errors) {
        return Object.entries(pd.errors)
          .flatMap(([k, msgs]) => msgs.map((m) => `${k}: ${m}`))
          .join(' · ')
      }
      if (pd.title && pd.title !== 'Unauthorized') return pd.title
      const msg =
        (b as { message?: string; Message?: string }).message ??
        (b as { Message?: string }).Message
      if (msg) return msg
    }
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

export function formatSuccess(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Thao tác hoàn tất thành công.'
  const o = data as Record<string, unknown>
  const msg = o.message ?? o.Message
  if (typeof msg === 'string' && msg.trim()) return msg

  const user = o.user ?? o.User
  if (user && typeof user === 'object') {
    const u = user as Record<string, unknown>
    const name = u.fullName ?? u.FullName
    const email = u.email ?? u.Email
    if (typeof name === 'string') return `Xin chào, ${name}!`
    if (typeof email === 'string') return `Đã tải hồ sơ: ${email}`
  }

  if (o.success === true || o.Success === true) return 'Thành công.'
  return 'Thao tác hoàn tất thành công.'
}

export function showResult(container: HTMLElement, data: unknown, err?: unknown): void {
  let box = container.querySelector<HTMLElement>('.flash-message')
  if (!box) {
    box = el('div', { class: 'flash-message', role: 'status' })
    container.append(box)
  }
  container.classList.add('has-message')

  if (err) {
    box.className = 'flash-message flash-error'
    box.textContent = formatError(err)
  } else {
    box.className = 'flash-message flash-success'
    box.textContent = formatSuccess(data)
  }
}

export async function onFormSubmit(
  form: HTMLFormElement,
  resultEl: HTMLElement,
  handler: (fd: FormData) => Promise<unknown>,
): Promise<void> {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')
    btn?.setAttribute('disabled', 'true')
    try {
      const data = await handler(new FormData(form))
      showResult(resultEl, data)
    } catch (err) {
      showResult(resultEl, null, err)
    } finally {
      btn?.removeAttribute('disabled')
    }
  })
}

export function fdStr(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}
