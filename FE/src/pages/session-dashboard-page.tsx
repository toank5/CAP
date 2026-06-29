import { useState } from 'react'
import { RefreshCw, Shield, LogOut, Server } from 'lucide-react'
import { authApi } from '@/api/auth'
import { saveTokensFromResponse } from '@/api/http'
import { usersApi } from '@/api/users'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { clearRole, navigate } from '@/router'
import { formatError, formatSuccess } from '@/lib/format-error'

export function SessionDashboardPage() {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const refresh = localStorage.getItem('refreshToken') ?? ''

  const run = async (key: string, fn: () => Promise<unknown>, saveToken = false) => {
    setLoading(key)
    setMsg(null)
    try {
      const data = await fn()
      if (saveToken) saveTokensFromResponse(data)
      setMsg({ type: 'success', text: formatSuccess(data) })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setLoading(null)
    }
  }

  const cards = [
    { key: 'admin', icon: Shield, title: 'Quyền quản trị', desc: 'Kiểm tra quyền quản trị hệ thống.', fn: () => usersApi.adminOnly() },
    { key: 'officer', icon: Server, title: 'Quyền cán bộ', desc: 'Kiểm tra quyền cán bộ thẩm định.', fn: () => usersApi.officerOnly() },
    { key: 'refresh', icon: RefreshCw, title: 'Làm mới phiên', desc: 'Gia hạn token đăng nhập an toàn.', fn: () => authApi.refreshToken({ refreshToken: refresh }), save: true },
    { key: 'logout', icon: LogOut, title: 'Đăng xuất', desc: 'Kết thúc phiên trên máy chủ.', fn: () => authApi.logout({ refreshToken: refresh }) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#003D7A] dark:text-white">Công cụ quản trị phiên</h1>
        <p className="mt-1 text-sm text-slate-600">Kiểm tra quyền, làm mới token và quản lý phiên đăng nhập.</p>
      </div>

      <div className="gov-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.key} className="rounded-xl border border-primary/10 bg-secondary/20 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-bold text-[#003D7A] dark:text-white">{c.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{c.desc}</p>
                <Button
                  className="mt-4"
                  variant="outline"
                  size="sm"
                  disabled={loading === c.key}
                  onClick={async () => {
                    await run(c.key, c.fn, c.save)
                    if (c.key === 'logout') {
                      localStorage.removeItem('accessToken')
                      localStorage.removeItem('refreshToken')
                      clearRole()
                      navigate('login')
                    }
                  }}
                >
                  {loading === c.key ? 'Đang xử lý...' : c.key === 'logout' ? 'Đăng xuất' : c.key === 'refresh' ? 'Làm mới' : 'Kiểm tra'}
                </Button>
              </div>
            )
          })}
        </div>
        {msg && <Alert className="mt-4" variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
      </div>
    </div>
  )
}
