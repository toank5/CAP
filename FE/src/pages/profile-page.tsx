import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneSaved, setPhoneSaved] = useState('')
  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [citizenId, setCitizenId] = useState('')
  const [address, setAddress] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void refreshProfile().then(() => {
      void usersApi.getProfile().then((data) => {
        const u = (data as { user?: Record<string, unknown> })?.user
        if (!u) return
        const phone = String(u.phoneNumber ?? u.PhoneNumber ?? '')
        setPhoneNumber(phone)
        setPhoneSaved(phone)
        setPhoneDraft(phone)
        setCitizenId(String(u.citizenId ?? u.CitizenId ?? ''))
        setAddress(String(u.address ?? u.Address ?? ''))
        const dobRaw = u.dateOfBirth ?? u.DateOfBirth
        if (dobRaw) {
          const d = new Date(String(dobRaw))
          setDateOfBirth(Number.isNaN(d.getTime()) ? String(dobRaw) : d.toLocaleDateString('vi-VN'))
        } else {
          setDateOfBirth('')
        }
      })
    })
  }, [refreshProfile])

  const hasPhoneChanged = phoneDraft !== phoneSaved

  const savePhone = async () => {
    try {
      const data = await usersApi.updateProfile({
        fullName,
        phoneNumber: phoneDraft || null,
      })
      setPhoneNumber(phoneDraft)
      setPhoneSaved(phoneDraft)
      setIsEditingPhone(false)
      setMsg({ type: 'success', text: formatSuccess(data) || 'Cập nhật số điện thoại thành công.' })
    } catch (err) { setMsg({ type: 'error', text: formatError(err) }) }
  }

  const logout = async () => {
    const refresh = sessionStorage.getItem('refreshToken') ?? ''
    try { await authApi.logout({ refreshToken: refresh }) } catch { /* ignore */ }
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    clearRole()
    updateProfile({ fullName: '', avatarUrl: null })
    navigate('login')
  }

  const displayRole = roleLabel || labelRole(getRole())
  const hasEkyc = !!citizenId.trim()
  // eKYC chỉ dành cho công dân (Applicant). Chủ đầu tư & Sở Xây dựng không có dữ liệu eKYC.
  const showEkyc = getRole() === 'Applicant'

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-slate-200/80 p-6 dark:border-slate-800">
        <h2 className="text-2xl font-bold">Hồ sơ cá nhân</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {showEkyc
            ? 'Thông tin định danh lấy từ eKYC (chỉ đọc). Bạn chỉ có thể cập nhật số điện thoại và ảnh đại diện.'
            : 'Thông tin tài khoản cán bộ. Bạn có thể cập nhật số điện thoại và ảnh đại diện.'}
        </p>
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
            // Các trường eKYC chỉ đọc, không cần submit form
          }}>
            <FormField label="Địa chỉ email đăng ký" htmlFor="email">
              <Input id="email" name="email" readOnly className="opacity-70" value={email} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Vai trò" htmlFor="role">
                <Input id="role" name="role" readOnly className="opacity-70" value={displayRole} />
              </FormField>
            </div>
            {showEkyc && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Họ và tên (eKYC)" htmlFor="fullName">
                    <Input
                      id="fullName"
                      name="fullName"
                      readOnly
                      className="opacity-70"
                      title="Họ tên lấy từ CCCD / eKYC — không thể thay đổi tại đây"
                      value={fullName}
                    />
                  </FormField>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Số CCCD (eKYC)" htmlFor="citizenId">
                    <Input
                      id="citizenId"
                      readOnly
                      className="font-mono opacity-70"
                      value={citizenId || 'Chưa xác minh'}
                      title="Lấy từ eKYC"
                    />
                  </FormField>
                  <FormField label="Ngày sinh (eKYC)" htmlFor="dateOfBirth">
                    <Input
                      id="dateOfBirth"
                      readOnly
                      className="opacity-70"
                      value={dateOfBirth || '—'}
                    />
                  </FormField>
                </div>
                <FormField label="Địa chỉ thường trú (eKYC)" htmlFor="address">
                  <Input
                    id="address"
                    readOnly
                    className="opacity-70"
                    value={address || '—'}
                    title="Lấy từ eKYC"
                  />
                </FormField>
                {!hasEkyc && (
                  <Alert variant="warning">
                    Chưa có dữ liệu eKYC.{' '}
                    <button type="button" className="font-semibold underline" onClick={() => navigate('verify-identity')}>
                      Xác minh danh tính
                    </button>
                  </Alert>
                )}
              </>
            )}
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Số điện thoại
                </span>
                {!isEditingPhone && (
                  <button
                    type="button"
                    onClick={() => { setIsEditingPhone(true); setPhoneDraft(phoneNumber) }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Chỉnh sửa
                  </button>
                )}
                {isEditingPhone && (
                  <button
                    type="button"
                    onClick={() => { setIsEditingPhone(false); setPhoneDraft(phoneNumber) }}
                    className="text-xs font-semibold text-slate-500 hover:underline"
                  >
                    Hủy
                  </button>
                )}
              </div>
              {isEditingPhone ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  <Button
                    variant="accent"
                    size="sm"
                    disabled={!hasPhoneChanged}
                    onClick={() => void savePhone()}
                  >
                    Lưu thay đổi
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {phoneNumber || <span className="italic font-normal text-slate-400">Chưa cập nhật</span>}
                </p>
              )}
            </div>
            {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
          </form>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowPasswordForm((v) => !v)}
              aria-expanded={showPasswordForm}
              aria-controls="change-password-panel"
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-semibold">Bảo mật tài khoản</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">Đổi mật khẩu</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${showPasswordForm ? 'rotate-180' : ''}`}
              />
            </button>
            {showPasswordForm && (
              <form
                id="change-password-panel"
                className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const currentPassword = String(fd.get('currentPassword'))
                  const newPassword = String(fd.get('newPassword'))
                  const confirmPassword = String(fd.get('confirmPassword'))

                  if (!currentPassword || !newPassword || !confirmPassword) {
                    setPwMsg({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin.' })
                    return
                  }
                  if (newPassword.length < 8) {
                    setPwMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' })
                    return
                  }
                  if (newPassword !== confirmPassword) {
                    setPwMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' })
                    return
                  }
                  if (currentPassword === newPassword) {
                    setPwMsg({ type: 'error', text: 'Mật khẩu mới phải khác mật khẩu hiện tại.' })
                    return
                  }

                  try {
                    const res = await authApi.changePassword({ currentPassword, newPassword, confirmPassword })
                    console.info('[change-password] success', res)
                    setPwMsg({ type: 'success', text: 'Đổi mật khẩu thành công.' })
                    setShowPasswordForm(false)
                  } catch (err) {
                    console.error('[change-password] failed', err)
                    setPwMsg({ type: 'error', text: formatError(err) })
                  }
                }}
              >
                <FormField label="Mật khẩu hiện tại" htmlFor="currentPassword">
                  <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
                </FormField>
                <FormField label="Mật khẩu mới" htmlFor="newPassword">
                  <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
                </FormField>
                <FormField label="Xác nhận mật khẩu" htmlFor="confirmPassword">
                  <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
                </FormField>
                <Button type="submit">Xác nhận đổi mật khẩu</Button>
              </form>
            )}
          </div>
          {pwMsg && (
            <div data-testid="pw-msg" className="mt-4">
              <Alert variant={pwMsg.type === 'error' ? 'error' : 'success'}>{pwMsg.text}</Alert>
            </div>
          )}

          {/* Xóa tài khoản */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Xóa tài khoản</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Tài khoản và toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                </span>
              </div>
              <DeleteAccountButton />
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200/80 p-6 dark:border-slate-800">
        <Button variant="ghost" className="text-red-600" onClick={() => void logout()}>Đăng xuất</Button>
      </div>
    </div>
  )
}

function DeleteAccountButton() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleDelete = async () => {
    if (!password) {
      setMsg({ type: 'error', text: 'Vui lòng nhập mật khẩu để xác nhận.' })
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      await usersApi.deleteAccount({
        password,
        reason: reason.trim() || undefined,
      })
      // Xóa local storage và chuyển về trang login
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
      clearRole()
      navigate('login')
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        onClick={() => setOpen(true)}
      >
        Xóa tài khoản
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Xóa tài khoản</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Bạn có chắc chắn muốn xóa tài khoản này? Tất cả dữ liệu sẽ bị mất vĩnh viễn.
            </p>
            <div className="mt-4 space-y-3">
              <FormField label="Nhập mật khẩu để xác nhận" htmlFor="delete-password">
                <Input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu của bạn"
                />
              </FormField>
              <FormField label="Lý do (tùy chọn)" htmlFor="delete-reason">
                <Input
                  id="delete-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Cho chúng tôi biết lý do..."
                />
              </FormField>
            </div>
            {msg && (
              <Alert variant={msg.type === 'error' ? 'error' : 'success'} className="mt-3">
                {msg.text}
              </Alert>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); setPassword(''); setReason(''); setMsg(null) }}>
                Hủy
              </Button>
              <Button
                variant="accent"
                className="bg-red-600 hover:bg-red-700"
                disabled={loading}
                onClick={() => void handleDelete()}
              >
                {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
