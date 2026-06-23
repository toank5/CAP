import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Lock,
  Mail,
  MoreHorizontal,
  Phone,
  Search,
  Shield,
  Unlock,
  UserPlus,
  Users,
} from 'lucide-react'
import { adminApi } from '@/api/admin'
import { GovHeroBanner } from '@/components/layout/gov-hero-banner'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FormField } from '@/components/ui/label'
import { Input, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import {
  isStaffActive,
  parseStaffDetail,
  parseStaffListResponse,
  STAFF_ROLE_OPTIONS,
  STAFF_STATUS_OPTIONS,
  staffRoleLabel,
  staffStatusLabel,
  type StaffRow,
} from '@/lib/admin'
import { formatError, formatSuccess } from '@/lib/format-error'

function StaffStatusBadge({ status }: { status: string }) {
  const active = isStaffActive(status)
  const suspended = status === 'Suspended'
  return (
    <Badge variant={active ? 'success' : suspended ? 'warning' : 'danger'}>
      {staffStatusLabel(status)}
    </Badge>
  )
}

function ResetPasswordPanel({ staffId, onDone }: { staffId: string; onDone: (msg: string) => void }) {
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (pwd.length < 8) {
      setError('Mật khẩu tối thiểu 8 ký tự.')
      return
    }
    if (pwd !== confirm) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    setLoading(true)
    try {
      await adminApi.resetPassword(staffId, pwd)
      setPwd('')
      setConfirm('')
      onDone('Đã đặt lại mật khẩu cho cán bộ. Thông báo mật khẩu mới qua kênh nội bộ.')
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="flex items-center gap-2 font-semibold text-[#003D7A]">
        <KeyRound className="h-4 w-4" />
        Đặt lại mật khẩu
      </p>
      <p className="mt-1 text-xs text-slate-500">Dùng khi cán bộ quên mật khẩu — cấp mật khẩu tạm mới.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FormField label="Mật khẩu mới" htmlFor="new-pwd">
          <Input id="new-pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} minLength={8} placeholder="Tối thiểu 8 ký tự" />
        </FormField>
        <FormField label="Xác nhận mật khẩu" htmlFor="confirm-pwd">
          <Input id="confirm-pwd" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} />
        </FormField>
      </div>
      {error && <Alert className="mt-3" variant="error">{error}</Alert>}
      <Button type="button" variant="outline" size="sm" className="mt-3" disabled={loading} onClick={() => void submit()}>
        {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
      </Button>
    </div>
  )
}

function AssignPermissionPanel({
  staff,
  onUpdated,
}: {
  staff: StaffRow
  onUpdated: (row: StaffRow, message: string) => void
}) {
  const [role, setRole] = useState(staff.roleName)
  const [status, setStatus] = useState(staff.status)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setRole(staff.roleName)
    setStatus(staff.status)
  }, [staff])

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await adminApi.assignPermission({
        staffId: staff.id,
        role,
        status,
        reason: reason.trim() || null,
      })
      const updated = parseStaffDetail(data)
      if (updated) onUpdated(updated, formatSuccess(data))
      else onUpdated({ ...staff, roleName: role, status }, 'Đã phân quyền thành công.')
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="flex items-center gap-2 font-semibold text-[#003D7A]">
        <Shield className="h-4 w-4" />
        Phân quyền truy cập
      </p>
      <p className="mt-1 text-xs text-slate-500">Gán vai trò Ward Manager / Verification Officer và trạng thái tài khoản.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FormField label="Vai trò" htmlFor="perm-role">
          <Select id="perm-role" value={role} onChange={(e) => setRole(e.target.value)}>
            {STAFF_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Trạng thái" htmlFor="perm-status">
          <Select id="perm-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STAFF_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="mt-3">
        <FormField label="Lý do (tùy chọn)" htmlFor="perm-reason">
          <Input id="perm-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ghi chú thay đổi quyền..." />
        </FormField>
      </div>
      {error && <Alert className="mt-3" variant="error">{error}</Alert>}
      <Button type="button" variant="accent" size="sm" className="mt-3" disabled={loading} onClick={() => void submit()}>
        {loading ? 'Đang lưu...' : 'Áp dụng phân quyền'}
      </Button>
    </div>
  )
}

export function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async (p = page) => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.getStaffList({
        pageNumber: p,
        pageSize,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        searchTerm: search.trim() || undefined,
      })
      const result = parseStaffListResponse(data)
      setStaff(result.items)
      setTotalCount(result.totalCount)
      setPage(result.pageNumber)
      setTotalPages(result.totalPages)
    } catch (err) {
      setError(formatError(err))
      setStaff([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, roleFilter, statusFilter, search])

  useEffect(() => { void load(page) }, [load, page])

  const activeCount = staff.filter((s) => isStaffActive(s.status)).length

  const toggleActive = async (row: StaffRow) => {
    setActionId(row.id)
    try {
      if (isStaffActive(row.status)) {
        const reason = window.prompt('Lý do khóa tài khoản (tùy chọn):') ?? undefined
        await adminApi.deactivateStaff(row.id, reason)
      } else {
        await adminApi.activateStaff(row.id)
      }
      await load(page)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <GovHeroBanner
        badge="FE-24 · Quản trị nhân sự"
        title="Quản lý cán bộ"
        subtitle={`${totalCount} tài khoản trong hệ thống`}
        compact
      />

      <div className="gov-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-bold text-[#003D7A] dark:text-white">Danh sách cán bộ</h2>
              <p className="text-xs text-slate-500">{activeCount} đang hoạt động trên trang này</p>
            </div>
          </div>
          <Button variant="accent" onClick={() => navigate('create-staff')}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Thêm cán bộ mới
          </Button>
        </div>

        <form
          className="grid gap-3 border-b border-slate-100 bg-secondary/20 px-5 py-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault()
            setPage(1)
            void load(1)
          }}
        >
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Tất cả vai trò</option>
            {STAFF_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {STAFF_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">Lọc</Button>
        </form>

        {error && <div className="px-5 pt-4"><Alert variant="error">{error}</Alert></div>}

        {loading ? (
          <div className="p-5"><Skeleton className="h-64 w-full" /></div>
        ) : staff.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Chưa có cán bộ"
              description="Tạo tài khoản Quản lý phường hoặc Cán bộ thẩm định để tiếp nhận hồ sơ."
              actionLabel="Thêm cán bộ"
              onAction={() => navigate('create-staff')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3">Họ và tên</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Điện thoại</th>
                  <th className="px-5 py-3">Vai trò</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Ngày tạo</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-slate-50 hover:bg-secondary/30 dark:border-slate-800"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {s.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[#003D7A] dark:text-white">{s.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{s.email}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {s.phoneNumber ? (
                        <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{s.phoneNumber}</span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3">{staffRoleLabel(s.roleName)}</td>
                    <td className="px-5 py-3"><StaffStatusBadge status={s.status} /></td>
                    <td className="px-5 py-3 text-slate-500">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Chi tiết"
                          onClick={() => {
                            sessionStorage.setItem('staffId', s.id)
                            navigate('staff-detail')
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={isStaffActive(s.status) ? 'Khóa tài khoản' : 'Kích hoạt'}
                          disabled={actionId === s.id}
                          onClick={() => void toggleActive(s)}
                        >
                          {isStaffActive(s.status) ? <Lock className="h-4 w-4 text-red-600" /> : <Unlock className="h-4 w-4 text-emerald-600" />}
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm dark:border-slate-800">
            <span className="text-slate-500">Trang {page}/{totalPages} · {totalCount} cán bộ</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function CreateStaffPage() {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="space-y-6">
      <GovHeroBanner
        badge="Tạo tài khoản"
        title="Thêm cán bộ mới"
        subtitle="Tạo tài khoản Ward Manager hoặc Verification Officer với mật khẩu tạm."
        compact
      />

      <div className="gov-card mx-auto max-w-lg p-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate('admin-staff')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại danh sách
        </Button>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setLoading(true)
            setMsg(null)
            const fd = new FormData(e.currentTarget)
            try {
              const data = await adminApi.createStaff({
                email: String(fd.get('email')),
                fullName: String(fd.get('fullName')),
                phoneNumber: String(fd.get('phoneNumber') || '') || null,
                role: String(fd.get('role')),
                temporaryPassword: String(fd.get('temporaryPassword')),
              })
              setMsg({ type: 'success', text: formatSuccess(data) })
              setTimeout(() => navigate('admin-staff'), 1000)
            } catch (err) {
              setMsg({ type: 'error', text: formatError(err) })
            } finally {
              setLoading(false)
            }
          }}
        >
          <FormField label="Họ và tên" htmlFor="fullName">
            <Input id="fullName" name="fullName" required placeholder="Nguyễn Văn A" />
          </FormField>
          <FormField label="Email công vụ" htmlFor="email">
            <Input id="email" name="email" type="email" required placeholder="canbo@fecaps.vn" />
          </FormField>
          <FormField label="Số điện thoại" htmlFor="phoneNumber">
            <Input id="phoneNumber" name="phoneNumber" type="tel" placeholder="0901234567" />
          </FormField>
          <FormField label="Vai trò" htmlFor="role">
            <Select id="role" name="role" required defaultValue="Ward Manager">
              {STAFF_ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Mật khẩu tạm thời" htmlFor="temporaryPassword">
            <Input id="temporaryPassword" name="temporaryPassword" type="password" required minLength={8} placeholder="Tối thiểu 8 ký tự" />
          </FormField>
          {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
          <Button type="submit" variant="accent" className="w-full" disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo tài khoản cán bộ'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export function StaffDetailPage() {
  const staffId = sessionStorage.getItem('staffId')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [staff, setStaff] = useState<StaffRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const reload = useCallback(() => {
    if (!staffId) return
    setLoading(true)
    void adminApi.getStaff(staffId)
      .then((data) => setStaff(parseStaffDetail(data)))
      .catch((err) => setMsg({ type: 'error', text: formatError(err) }))
      .finally(() => setLoading(false))
  }, [staffId])

  useEffect(() => { reload() }, [reload])

  if (!staffId) {
    return (
      <div className="gov-card p-6">
        <Alert variant="error">Không tìm thấy cán bộ. Quay lại danh sách.</Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate('admin-staff')}>← Danh sách cán bộ</Button>
      </div>
    )
  }

  const active = staff ? isStaffActive(staff.status) : true

  return (
    <div className="space-y-6">
      <GovHeroBanner
        badge="Chi tiết cán bộ"
        title={staff?.fullName ?? 'Đang tải...'}
        subtitle={staff ? `${staffRoleLabel(staff.roleName)} · ${staff.email}` : undefined}
        compact
      />

      <div className="gov-card mx-auto max-w-2xl p-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate('admin-staff')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Danh sách cán bộ
        </Button>

        {loading && <Skeleton className="h-64 w-full" />}

        {!loading && staff && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <StaffStatusBadge status={staff.status} />
              <span className="gov-official-badge">
                <Shield className="h-3 w-3" />
                {staffRoleLabel(staff.roleName)}
              </span>
            </div>

            <AssignPermissionPanel
              staff={staff}
              onUpdated={(row, message) => {
                setStaff(row)
                setMsg({ type: 'success', text: message })
              }}
            />

            <form
              className="space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800"
              onSubmit={async (e) => {
                e.preventDefault()
                setSaving(true)
                setMsg(null)
                const fd = new FormData(e.currentTarget)
                try {
                  const data = await adminApi.updateStaff(staffId, {
                    fullName: String(fd.get('fullName')),
                    phoneNumber: String(fd.get('phoneNumber') || '') || null,
                    role: String(fd.get('role')),
                    status: String(fd.get('status')),
                  })
                  const updated = parseStaffDetail(data)
                  if (updated) setStaff(updated)
                  setMsg({ type: 'success', text: formatSuccess(data) })
                } catch (err) {
                  setMsg({ type: 'error', text: formatError(err) })
                } finally {
                  setSaving(false)
                }
              }}
            >
              <p className="font-semibold text-[#003D7A]">Thông tin cán bộ</p>
              <FormField label="Họ và tên" htmlFor="fullName">
                <Input id="fullName" name="fullName" required defaultValue={staff.fullName} key={`name-${staff.id}`} />
              </FormField>
              <FormField label="Email">
                <Input value={staff.email} disabled className="bg-slate-50" />
              </FormField>
              <FormField label="Số điện thoại" htmlFor="phoneNumber">
                <Input id="phoneNumber" name="phoneNumber" type="tel" defaultValue={staff.phoneNumber ?? ''} key={`phone-${staff.id}`} />
              </FormField>
              <FormField label="Vai trò" htmlFor="role">
                <Select id="role" name="role" required defaultValue={staff.roleName} key={`role-${staff.id}`}>
                  {STAFF_ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Trạng thái" htmlFor="status">
                <Select id="status" name="status" defaultValue={staff.status} key={`status-${staff.id}`}>
                  {STAFF_STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </Select>
              </FormField>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="accent" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu thông tin'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={active ? 'text-red-600' : 'text-emerald-700'}
                  onClick={async () => {
                    const action = active ? 'khóa' : 'kích hoạt'
                    if (!confirm(`Bạn có chắc muốn ${action} tài khoản này?`)) return
                    try {
                      if (active) {
                        const reason = window.prompt('Lý do khóa (tùy chọn):') ?? undefined
                        await adminApi.deactivateStaff(staffId, reason)
                      } else {
                        await adminApi.activateStaff(staffId)
                      }
                      reload()
                      setMsg({ type: 'success', text: active ? 'Đã khóa tài khoản.' : 'Đã kích hoạt tài khoản.' })
                    } catch (err) {
                      setMsg({ type: 'error', text: formatError(err) })
                    }
                  }}
                >
                  {active ? <><Lock className="mr-1.5 h-4 w-4" />Khóa tài khoản</> : <><Unlock className="mr-1.5 h-4 w-4" />Kích hoạt</>}
                </Button>
              </div>
            </form>

            <ResetPasswordPanel staffId={staffId} onDone={(text) => setMsg({ type: 'success', text })} />

            {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}
          </div>
        )}
      </div>
    </div>
  )
}
