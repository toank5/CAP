import { useState } from 'react'
import { motion } from 'framer-motion'
import { authApi } from '@/api/auth'
import { saveTokensFromResponse } from '@/api/http'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { navigate } from '@/hooks/useHashRoute'
import { extractRole, setPendingOtpEmail } from '@/lib/auth-helpers'
import { formatError } from '@/lib/format-error'
import { isLoggedIn, roleHome, setRole } from '@/router'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await authApi.login({ email, password })
      saveTokensFromResponse(data)
      const o = (data ?? {}) as Record<string, unknown>
      if (o.requiresOtpVerification === true || o.RequiresOtpVerification === true) {
        setPendingOtpEmail(email)
        navigate('verify-otp')
        return
      }
      if (isLoggedIn()) {
        const role = extractRole(data)
        setRole(role)
        navigate(roleHome(role))
      }
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
          <CardDescription>Truy cập bảng điều khiển và quản lý hồ sơ</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Địa chỉ email" htmlFor="email"><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></FormField>
            <FormField label="Mật khẩu" htmlFor="password"><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></FormField>
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="submit" className="w-full" variant="accent" disabled={loading}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</Button>
          </form>
          <div className="mt-4 space-y-2 text-center text-sm text-slate-500">
            <p>
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => navigate('forgot-password')}>Quên mật khẩu?</button>
              {' · '}
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => navigate('register')}>Đăng ký</button>
            </p>
            <p>
              <button type="button" className="hover:underline" onClick={() => navigate('verify-otp')}>Xác thực OTP</button>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
