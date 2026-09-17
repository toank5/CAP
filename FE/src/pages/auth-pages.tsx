import { useEffect, useState } from 'react'
import { authApi } from '@/api/auth'
import { saveTokensFromResponse } from '@/api/http'
import { PageCard } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useOtpCountdown } from '@/hooks/use-otp-countdown'
import { navigate } from '@/hooks/useHashRoute'
import { setPendingOtpEmail, getPendingOtpEmail } from '@/lib/auth-helpers'
import { formatError, formatSuccess } from '@/lib/format-error'
import { setCachedVerified } from '@/lib/verification'

function AuthLinks({ prompt, link, route }: { prompt: string; link: string; route: Parameters<typeof navigate>[0] }) {
  return (
    <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
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
        <CardHeader>
          <CardTitle>Đăng ký tài khoản</CardTitle>
          <CardDescription>
            Tạo tài khoản công dân trên cổng nhà ở xã hội. Sau khi xác thực email, hệ thống yêu cầu xác minh CCCD + khuôn mặt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Địa chỉ email" htmlFor="email">
              <Input id="email" name="email" type="email" required />
            </FormField>
            <FormField label="Mật khẩu (tối thiểu 8 ký tự)" htmlFor="password">
              <Input id="password" name="password" type="password" minLength={8} required />
            </FormField>
            <FormField label="Họ và tên" htmlFor="fullName">
              <Input id="fullName" name="fullName" required />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Có thể được cập nhật từ CCCD ở bước xác minh danh tính.
              </p>
            </FormField>
            <FormField label="Số điện thoại" htmlFor="phoneNumber">
              <Input id="phoneNumber" name="phoneNumber" type="tel" />
            </FormField>
            {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
            <Button type="submit" className="w-full" variant="accent" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi đăng ký'}
            </Button>
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
  const { secondsLeft, isActive, start } = useOtpCountdown(60)

  useEffect(() => {
    start(60)
  }, [start])

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') || defaultEmail)
    const otpCode = String(fd.get('otpCode') || '')
    try {
      const data = await authApi.verifyOtp(email, otpCode)
      saveTokensFromResponse(data)
      const role: string = (() => {
        const u = (data as { user?: { role?: string } } | null)?.user
        return u?.role ?? ''
      })()
      const requireEkycHint = role === 'Applicant'
      if (requireEkycHint) {
        setCachedVerified(false)
        setMsg({
          type: 'success',
          text: 'Xác thực email thành công. Bạn có thể duyệt dự án ngay — xác minh CCCD khi đăng ký hồ sơ.',
        })
        setTimeout(() => navigate('home-user'), 800)
      } else {
        // Cán bộ do admin tạo trực tiếp — không cần eKYC, đăng nhập thẳng
        setMsg({ type: 'success', text: 'Xác thực thành công.' })
        setTimeout(() => navigate('login'), 800)
      }
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setLoading(false)
    }
  }

  const resend = async (email: string) => {
    if (isActive) return
    try {
      await authApi.resendOtp(email)
      start(60)
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
          <Button
            variant="ghost"
            className="mt-2 w-full"
            disabled={isActive}
            onClick={() => {
              const email = (document.getElementById('email') as HTMLInputElement)?.value
              if (email) void resend(email)
            }}
          >
            {isActive ? `Gửi lại sau ${secondsLeft}s` : 'Gửi lại mã'}
          </Button>
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
  type Step = 'email' | 'otp' | 'reset'
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const { secondsLeft, isActive, start } = useOtpCountdown(60)

  const sendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const value = String(fd.get('email')).trim()
    if (!value) {
      setMsg({ type: 'error', text: 'Vui lòng nhập email.' })
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const data = await authApi.forgotPassword({ email: value })
      setEmail(value)
      setOtpCode('')
      setMsg({ type: 'info', text: formatSuccess(data) || 'Đã gửi mã OTP về email.' })
      setStep('otp')
      start(60)
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setLoading(false)
    }
  }

  const goToReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const code = String(fd.get('otpCode')).trim()
    if (!/^\d{6}$/.test(code)) {
      setMsg({ type: 'error', text: 'Mã OTP gồm 6 chữ số.' })
      return
    }
    setOtpCode(code)
    setMsg({ type: 'info', text: 'Đã nhận mã OTP. Hãy đặt mật khẩu mới.' })
    setStep('reset')
  }

  const submitNewPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const newPassword = String(fd.get('newPassword'))
    const confirmPassword = String(fd.get('confirmPassword'))
    if (newPassword.length < 8) {
      setMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'Xác nhận mật khẩu không khớp.' })
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      await authApi.resetPassword({ email, otpCode, newPassword, confirmPassword })
      setMsg({ type: 'success', text: 'Đặt lại mật khẩu thành công. Đang chuyển về trang đăng nhập...' })
      setTimeout(() => navigate('login'), 900)
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    if (isActive) return
    try {
      await authApi.resendOtp(email)
      start(60)
      setMsg({ type: 'success', text: 'Đã gửi lại mã OTP.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    }
  }

  const stepIndex = step === 'email' ? 1 : step === 'otp' ? 2 : 3

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Quên mật khẩu</CardTitle>
          <CardDescription>
            Khôi phục mật khẩu qua email — bước {stepIndex}/3:{' '}
            {step === 'email' ? 'nhập email' : step === 'otp' ? 'nhập mã OTP' : 'đặt mật khẩu mới'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' && (
            <form onSubmit={sendOtp} className="space-y-4">
              <FormField label="Địa chỉ email" htmlFor="email">
                <Input id="email" name="email" type="email" defaultValue={email} required autoFocus />
              </FormField>
              {msg && <Alert variant={msg.type === 'error' ? 'error' : msg.type === 'success' ? 'success' : 'info'}>{msg.text}</Alert>}
              <Button type="submit" className="w-full" variant="accent" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
              </Button>
              <AuthLinks prompt="" link="Quay lại đăng nhập" route="login" />
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={goToReset} className="space-y-4">
              <FormField label="Địa chỉ email" htmlFor="email-otp">
                <Input id="email-otp" name="email" type="email" value={email} readOnly className="bg-slate-50 dark:bg-slate-800/50" />
              </FormField>
              <FormField label="Mã OTP (6 số)" htmlFor="otpCode">
                <Input id="otpCode" name="otpCode" inputMode="numeric" maxLength={6} required autoFocus />
              </FormField>
              {msg && <Alert variant={msg.type === 'error' ? 'error' : msg.type === 'success' ? 'success' : 'info'}>{msg.text}</Alert>}
              <Button type="submit" className="w-full" variant="accent">
                Tiếp tục
              </Button>
              <Button type="button" variant="ghost" className="w-full" disabled={isActive} onClick={resendOtp}>
                {isActive ? `Gửi lại sau ${secondsLeft}s` : 'Gửi lại mã OTP'}
              </Button>
              <button
                type="button"
                className="block w-full text-center text-xs text-slate-500 hover:underline dark:text-slate-400"
                onClick={() => { setStep('email'); setMsg(null); setOtpCode('') }}
              >
                ← Đổi email khác
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={submitNewPassword} className="space-y-4">
              <FormField label="Địa chỉ email" htmlFor="email-reset">
                <Input id="email-reset" name="email" type="email" value={email} readOnly className="bg-slate-50 dark:bg-slate-800/50" />
              </FormField>
              <FormField label="Mật khẩu mới (tối thiểu 8 ký tự)" htmlFor="newPassword">
                <Input id="newPassword" name="newPassword" type="password" minLength={8} required autoFocus />
              </FormField>
              <FormField label="Xác nhận mật khẩu" htmlFor="confirmPassword">
                <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required />
              </FormField>
              {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
              <Button type="submit" className="w-full" variant="accent" disabled={loading}>
                {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </Button>
              <button
                type="button"
                className="block w-full text-center text-xs text-slate-500 hover:underline dark:text-slate-400"
                onClick={() => { setStep('otp'); setMsg(null) }}
              >
                ← Nhập lại OTP
              </button>
            </form>
          )}
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
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const currentPassword = String(fd.get('currentPassword'))
    const newPassword = String(fd.get('newPassword'))
    const confirmPassword = String(fd.get('confirmPassword'))
    if (newPassword.length < 8) {
      setMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'Xác nhận mật khẩu không khớp.' })
      return
    }
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmPassword })
      setMsg({ type: 'success', text: 'Đổi mật khẩu thành công.' })
      e.currentTarget.reset()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    }
  }
  return (
    <div>
      <PageCard className="max-w-md">
        <form className="space-y-4" onSubmit={submit}>
          <FormField label="Mật khẩu hiện tại" htmlFor="currentPassword"><Input id="currentPassword" name="currentPassword" type="password" required /></FormField>
          <FormField label="Mật khẩu mới (tối thiểu 8 ký tự)" htmlFor="newPassword"><Input id="newPassword" name="newPassword" type="password" minLength={8} required /></FormField>
          <FormField label="Xác nhận" htmlFor="confirmPassword"><Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required /></FormField>
          {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
          <Button type="submit">Cập nhật mật khẩu</Button>
        </form>
      </PageCard>
    </div>
  )
}
