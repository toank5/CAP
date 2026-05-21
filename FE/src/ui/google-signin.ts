import { el } from './helpers'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void
        }
      }
    }
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const existing = document.querySelector('script[data-google-gsi]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Google GSI load failed')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleGsi = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Không tải được Google Sign-In'))
    document.head.append(script)
  })
}

export async function mountGoogleSignInButton(
  container: HTMLElement,
  onCredential: (idToken: string) => void | Promise<void>,
): Promise<void> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  if (!clientId?.trim()) {
    container.append(
      el(
        'p',
        { class: 'google-warn' },
        'Thiếu VITE_GOOGLE_CLIENT_ID trong .env — phải trùng GoogleAuth:ClientId trên BE.',
      ),
    )
    return
  }

  try {
    await loadGoogleScript()
  } catch (err) {
    container.append(
      el('p', { class: 'google-warn' }, err instanceof Error ? err.message : String(err)),
    )
    return
  }

  const host = el('div', { class: 'google-btn-host' })
  container.append(host)

  window.google!.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      void onCredential(response.credential)
    },
  })

  window.google!.accounts.id.renderButton(host, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    width: '320',
  })
}
