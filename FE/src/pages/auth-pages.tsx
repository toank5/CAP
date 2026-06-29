import { useState } from 'react'
import { authApi } from '@/api/auth'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { navigate } from '@/hooks/useHashRoute'
import { clearRole } from '@/router'
import { setPendingOtpEmail, getPendingOtpEmail } from '@/lib/auth-helpers'
import { formatError, formatSuccess } from '@/lib/format-error'

function AuthLinks({ prompt, link, route }: { prompt: string; link: string; route: Parameters<typeof navigate>[0] }) {
  return (
    <p className="mt-4 text-center text-sm text-slate-500">
      {prompt}{' '}
      <button type="button" className="font-semibold text-primary hover:underline" onClick={() => navigate(route)}>
        {link}
      </button>
    </p>
  )
}

export function RegisterPage() {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    try {
      const data = await authApi.register({
        email: String(fd.get('email')),
        password: String(fd.get('password')),
        fullName: String(fd.get('fullName')),
        phoneNumber: String(fd.get('phoneNumber') || '') || null,
        role: 'Applicant',
      })
      setPendingOtpEmail(String(fd.get('email')))
      setMsg({ type: 'success', text: formatSuccess(data) + ' Kiểm tra email để xác thực OTP.' })
      setTimeout(() => navigate('verify-otp'), 1000)
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader><CardTitle>Đăng ký tài khoản</CardTitle><CardDescription>Tạo tài khoản người dùng trên cổng nhà ở xã hội</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Địa chỉ email" htmlFor="email"><Input id="email" name="email" type="email" required /></FormField>
            <FormField label="Mật khẩu" htmlFor="password"><Input id="password" name="password" type="password" required /></FormField>
            <FormField label="Họ và tên" htmlFor="fullName"><Input id="fullName" name="fullName" required /></FormField>
            <FormField label="Số điện thoại" htmlFor="phoneNumber"><Input id="phoneNumber" name="phoneNumber" type="tel" /></FormField>
            {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
            <Button type="submit" className="w-full" variant="accent" disabled={loading}>{loading ? 'Đang gửi...' : 'Gửi đăng ký'}</Button>
          </form>
          <AuthLinks prompt="Đã có tài khoản?" link="Đăng nhập" route="login" />
        </CardContent>
      </Card>
    </div>
  )
}

export function VerifyOtpPage() {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const defaultEmail = getPendingOtpEmail()

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      await authApi.verifyOtp({ email: String(fd.get('email')), otpCode: String(fd.get('otpCode')) })
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      clearRole()
      setMsg({ type: 'success', text: 'Xác thực thành công. Đăng nhập lại.' })
      setTimeout(() => navigate('login'), 800)
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setLoading(false)
    }
  }

  const resend = async (email: string) => {
    try {
      await authApi.resendOtp(email)
      setMsg({ type: 'success', text: 'Đã gửi lại mã OTP.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader><CardTitle>Xác thực OTP</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Địa chỉ email" htmlFor="email"><Input id="email" name="email" type="email" defaultValue={defaultEmail} required /></FormField>
            <FormField label="Mã OTP (6 số)" htmlFor="otpCode"><Input id="otpCode" name="otpCode" required maxLength={6} /></FormField>
            {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
            <Button type="submit" className="w-full" disabled={loading}>Xác nhận mã</Button>
          </form>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => {
            const email = (document.getElementById('email') as HTMLInputElement)?.value
            if (email) void resend(email)
          }}>Gửi lại mã</Button>
          <AuthLinks prompt="" link="Quay lại đăng nhập" route="login" />
        </CardContent>
      </Card>
    </div>
  )
}

export function ResendOtpPage() {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader><CardTitle>Gửi lại mã OTP</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault()
            const email = new FormData(e.currentTarget).get('email') as string
            try {
              await authApi.resendOtp(email)
              setPendingOtpEmail(email)
              setMsg({ type: 'success', text: 'Đã gửi mã. Chuyển sang trang xác thực.' })
              setTimeout(() => navigate('verify-otp'), 800)
            } catch (err) {
              setMsg({ type: 'error', text: formatError(err) })
            }
          }}>
            <FormField label="Địa chỉ email" htmlFor="email"><Input id="email" name="email" type="email" required /></FormField>
            {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
            <Button type="submit" className="w-full">Gửi lại mã</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function ForgotPasswordPage() {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader><CardTitle>Quên mật khẩu</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault()
            try {
              const data = await authApi.forgotPassword({ email: String(new FormData(e.currentTarget).get('email')) })
              setMsg({ type: 'success', text: formatSuccess(data) })
            } catch (err) {
              setMsg({ type: 'error', text: formatError(err) })
            }
          }}>
            <FormField label="Địa chỉ email" htmlFor="email"><Input id="email" name="email" type="email" required /></FormField>
            {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
            <Button type="submit" className="w-full">Gửi yêu cầu</Button>
          </form>
          <AuthLinks prompt="" link="Đăng nhập" route="login" />
        </CardContent>
      </Card>
    </div>
  )
}

export function ResetPasswordPage() {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader><CardTitle>Đặt lại mật khẩu</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            try {
              await authApi.resetPassword({
                email: String(fd.get('email')),
                otpCode: String(fd.get('otpCode')),
                newPassword: String(fd.get('newPassword')),
                confirmPassword: String(fd.get('confirmPassword')),
              })
              setMsg({ type: 'success', text: 'Đặt lại mật khẩu thành công.' })
              setTimeout(() => navigate('login'), 800)
            } catch (err) {
              setMsg({ type: 'error', text: formatError(err) })
            }
          }}>
            <FormField label="Địa chỉ email" htmlFor="email"><Input id="email" name="email" type="email" required /></FormField>
            <FormField label="Mã OTP" htmlFor="otpCode"><Input id="otpCode" name="otpCode" required /></FormField>
            <FormField label="Mật khẩu mới" htmlFor="newPassword"><Input id="newPassword" name="newPassword" type="password" required /></FormField>
            <FormField label="Xác nhận mật khẩu" htmlFor="confirmPassword"><Input id="confirmPassword" name="confirmPassword" type="password" required /></FormField>
            {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
            <Button type="submit" className="w-full">Cập nhật mật khẩu</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function ChangePasswordPage() {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  return (
    <div>
      <PageHeader routeId="change-password" />
      <PageCard className="max-w-md">
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          try {
            await authApi.changePassword({
              currentPassword: String(fd.get('currentPassword')),
              newPassword: String(fd.get('newPassword')),
              confirmPassword: String(fd.get('confirmPassword')),
            })
            setMsg({ type: 'success', text: 'Đổi mật khẩu thành công.' })
          } catch (err) {
            setMsg({ type: 'error', text: formatError(err) })
          }
        }}>
          <FormField label="Mật khẩu hiện tại" htmlFor="currentPassword"><Input id="currentPassword" name="currentPassword" type="password" required /></FormField>
          <FormField label="Mật khẩu mới" htmlFor="newPassword"><Input id="newPassword" name="newPassword" type="password" required /></FormField>
          <FormField label="Xác nhận" htmlFor="confirmPassword"><Input id="confirmPassword" name="confirmPassword" type="password" required /></FormField>
          {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
          <Button type="submit">Cập nhật mật khẩu</Button>
        </form>
      </PageCard>
    </div>
  )
}
