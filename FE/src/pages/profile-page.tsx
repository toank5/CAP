import { useEffect, useRef, useState } from 'react'
import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { navigate } from '@/hooks/useHashRoute'
import { clearRole, getRole } from '@/router'
import { formatError, formatSuccess } from '@/lib/format-error'
import { labelRole } from '@/lib/labels'
import { extractProfileImageUrl } from '@/lib/user-display'
import { useUserProfile } from '@/providers/user-profile-provider'

export function ProfilePage() {
  const { fullName, email, avatarUrl, roleLabel, initials, updateProfile, refreshProfile } = useUserProfile()
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void refreshProfile().then(() => {
      void usersApi.getProfile().then((data) => {
        const u = (data as { user?: Record<string, unknown> })?.user
        if (!u) return
        setPhoneNumber(String(u.phoneNumber ?? u.PhoneNumber ?? ''))
      })
    })
  }, [refreshProfile])

  const logout = async () => {
    const refresh = localStorage.getItem('refreshToken') ?? ''
    try { await authApi.logout({ refreshToken: refresh }) } catch { /* ignore */ }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    clearRole()
    navigate('login')
  }

  const displayRole = roleLabel || labelRole(getRole())

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-slate-200/80 p-6 dark:border-slate-800">
        <h2 className="text-2xl font-bold">Hồ sơ cá nhân</h2>
        <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin và ảnh đại diện của bạn.</p>
      </div>
      <div className="grid gap-8 p-6 lg:grid-cols-[220px_1fr]">
        <aside className="text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {avatarUrl ? <img src={avatarUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" /> : initials}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const preview = URL.createObjectURL(file)
            updateProfile({ avatarUrl: preview })
            try {
              const data = await usersApi.uploadProfileImage(file)
              setMsg({ type: 'success', text: formatSuccess(data) })
              const url = extractProfileImageUrl(data)
              updateProfile({ avatarUrl: url })
            } catch (err) {
              void refreshProfile()
              setMsg({ type: 'error', text: formatError(err) })
            } finally {
              URL.revokeObjectURL(preview)
            }
          }} />
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Chọn ảnh</Button>
            {avatarUrl && (
              <Button variant="ghost" size="sm" className="text-red-600" onClick={async () => {
                if (!confirm('Xóa ảnh đại diện?')) return
                try {
                  await usersApi.deleteProfileImage()
                  updateProfile({ avatarUrl: null })
                  setMsg({ type: 'success', text: 'Đã xóa ảnh.' })
                } catch (err) { setMsg({ type: 'error', text: formatError(err) }) }
              }}>Xóa ảnh</Button>
            )}
          </div>
        </aside>
        <div className="space-y-6">
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            try {
              const data = await usersApi.updateProfile({
                fullName: String(fd.get('fullName')),
                phoneNumber: String(fd.get('phoneNumber') || '') || null,
              })
              setMsg({ type: 'success', text: formatSuccess(data) })
              const u = (data as { user?: Record<string, unknown> })?.user
              if (u) {
                updateProfile({ fullName: String(u.fullName ?? u.FullName ?? fd.get('fullName')) })
              }
            } catch (err) { setMsg({ type: 'error', text: formatError(err) }) }
          }}>
            <FormField label="Địa chỉ email đăng ký" htmlFor="email">
              <Input id="email" name="email" readOnly className="opacity-70" value={email} />
            </FormField>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1">
                <FormField label="Vai trò" htmlFor="role">
                  <Input id="role" name="role" readOnly className="opacity-70" value={displayRole} />
                </FormField>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPw((v) => !v)}>{showPw ? 'Ẩn' : 'Đổi mật khẩu'}</Button>
            </div>
            <FormField label="Họ và tên" htmlFor="fullName">
              <Input
                id="fullName"
                name="fullName"
                required
                value={fullName}
                onChange={(e) => updateProfile({ fullName: e.target.value })}
              />
            </FormField>
            <FormField label="Số điện thoại" htmlFor="phoneNumber">
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </FormField>
            {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
            <Button type="submit" variant="accent">Lưu thay đổi</Button>
          </form>
          {showPw && (
            <form className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700" onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              try {
                await authApi.changePassword({
                  currentPassword: String(fd.get('currentPassword')),
                  newPassword: String(fd.get('newPassword')),
                  confirmPassword: String(fd.get('confirmPassword')),
                })
                setPwMsg({ type: 'success', text: 'Đổi mật khẩu thành công.' })
                e.currentTarget.reset()
              } catch (err) { setPwMsg({ type: 'error', text: formatError(err) }) }
            }}>
              <p className="text-sm font-semibold">Bảo mật tài khoản</p>
              <FormField label="Mật khẩu hiện tại" htmlFor="currentPassword"><Input id="currentPassword" name="currentPassword" type="password" required /></FormField>
              <FormField label="Mật khẩu mới" htmlFor="newPassword"><Input id="newPassword" name="newPassword" type="password" required /></FormField>
              <FormField label="Xác nhận mật khẩu" htmlFor="confirmPassword"><Input id="confirmPassword" name="confirmPassword" type="password" required /></FormField>
              {pwMsg && <Alert variant={pwMsg.type === 'error' ? 'error' : 'success'}>{pwMsg.text}</Alert>}
              <Button type="submit">Xác nhận đổi mật khẩu</Button>
            </form>
          )}
        </div>
      </div>
      <div className="border-t border-slate-200/80 p-6 dark:border-slate-800">
        <Button variant="ghost" className="text-red-600" onClick={() => void logout()}>Đăng xuất</Button>
      </div>
    </div>
  )
}
