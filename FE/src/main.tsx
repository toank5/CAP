import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { QueryProvider } from './providers/query-provider'
import { ThemeProvider } from './providers/theme-provider'
import { UserProfileProvider } from './providers/user-profile-provider'
import { NotificationsProvider } from './providers/notifications-provider'
import { WishlistProvider } from './providers/wishlist-provider'
import './index.css'

// Xử lý khi popup VNPay redirect về Frontend (đóng popup và báo cho tab chính)
const searchStr = window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '')
if (window.opener && searchStr && searchStr.includes('vnp_')) {
  try {
    const params = new URLSearchParams(searchStr)
    const code = params.get('vnp_ResponseCode') || params.get('vnp_TransactionStatus') || ''
    window.opener.postMessage(
      {
        type: 'VNPAY_CALLBACK_DONE',
        success: code === '00',
        responseCode: code,
        search: searchStr,
      },
      '*',
    )
    window.close()
  } catch {
    /* ignore */
  }
}

const root = document.querySelector<HTMLDivElement>('#app')
if (root) {
  if (!location.hash) location.hash = '#/landing'
  createRoot(root).render(
    <StrictMode>
      <ThemeProvider>
        <QueryProvider>
          <UserProfileProvider>
            <NotificationsProvider>
              <WishlistProvider>
                <App />
              </WishlistProvider>
            </NotificationsProvider>
          </UserProfileProvider>
        </QueryProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}
