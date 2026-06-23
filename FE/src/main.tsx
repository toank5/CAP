import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { QueryProvider } from './providers/query-provider'
import { ThemeProvider } from './providers/theme-provider'
import { UserProfileProvider } from './providers/user-profile-provider'
import './index.css'

const root = document.querySelector<HTMLDivElement>('#app')
if (root) {
  if (!location.hash) location.hash = '#/landing'
  createRoot(root).render(
    <StrictMode>
      <ThemeProvider>
        <QueryProvider>
          <UserProfileProvider>
            <App />
          </UserProfileProvider>
        </QueryProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}
