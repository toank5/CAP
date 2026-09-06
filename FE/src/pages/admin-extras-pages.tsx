import { useEffect, useState } from 'react'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  housingProjectStatusesApi,
  type PriorityGroupPointItemDto,
  type PriorityPointsTableDto,
} from '@/api/housing-project-statuses'
import { adminApi } from '@/api/admin'
import { issueReportsApi } from '@/api/issue-reports'
import { formatError } from '@/lib/format-error'


interface ProjectStatus {
  id: string
  statusName?: string
  statusCode?: string
  description?: string
  colorCode?: string
}

interface PolicyConfig {
  policyName: string
  policyValue: string
  description?: string
  unit?: string
  updatedAt?: string
}

const POLICY_DEFAULT_VALUES: Record<string, string> = {
  MAX_MONTHLY_INCOME: '15000000',
  MAX_AVG_HOUSE_AREA: '10',
  SMALL_HOUSE_AREA_THRESHOLD: '15',
  PRIORITY_GROUPS: '["REVOLUTIONARY_CONTRIBUTION","POOR_HOUSEHOLD","SINGLE_MOTHER","DISABILITY","ETHNIC_MINORITY"]',
}

export function SystemLogsPage() {
  const [logs, setLogs] = useState<Array<{
    id: string
    action?: string
    entityName?: string
    userFullName?: string
    userEmail?: string
    ipAddress?: string
    actionTime?: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [usedIssueReports, setUsedIssueReports] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const data = await adminApi.getAuditLogs({ page: 1, pageSize: 50 })
        const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
        const nested = (root.data ?? root.Data ?? root) as Record<string, unknown>
        const items = Array.isArray(nested)
          ? nested
          : ((nested.items ?? nested.Items ?? []) as unknown[])
        const parsed = items.map((it) => {
          const row = it as Record<string, unknown>
          return {
            id: String(row.auditId ?? row.AuditId ?? row.id ?? row.Id ?? ''),
            action: String(row.action ?? row.Action ?? ''),
            entityName: String(row.entityName ?? row.EntityName ?? ''),
            userFullName: (row.userFullName ?? row.UserFullName) as string | undefined,
            userEmail: (row.userEmail ?? row.UserEmail) as string | undefined,
            ipAddress: (row.ipAddress ?? row.IpAddress) as string | undefined,
            actionTime: (row.actionTime ?? row.ActionTime ?? row.createdAt ?? row.CreatedAt) as string | undefined,
          }
        }).filter((row) => row.id)

        if (parsed.length > 0) {
          setLogs(parsed)
          return
        }

        const reports = await issueReportsApi.getAllReports({ pageIndex: 1, pageSize: 50 })
        const reportItems = (reports && typeof reports === 'object' && 'items' in (reports as object)
          ? ((reports as { items?: unknown[] }).items ?? [])
          : []
        ).map((it) => it as Record<string, unknown>)
        setUsedIssueReports(true)
        setLogs(reportItems.map((it) => ({
          id: String(it.id ?? it.Id ?? ''),
          action: String(it.title ?? it.Title ?? it.description ?? 'Báo cáo sự cố'),
          entityName: String(it.category ?? it.Category ?? 'IssueReport'),
          userFullName: String(it.status ?? it.Status ?? ''),
          actionTime: (it.createdAt ?? it.CreatedAt) as string | undefined,
        })))
      } catch (err) {
        setError(formatError(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader routeId="admin-logs" />
      <PageCard className="p-6">
        <Alert variant="info" className="mb-4">
          <p className="font-semibold">Nhật ký kiểm toán</p>
          <p className="mt-1 text-sm">
            {usedIssueReports
              ? 'API audit-log chưa có dữ liệu — đang hiện báo cáo sự cố người dùng gửi lên.'
              : 'Danh sách hành động nhạy cảm (duyệt, từ chối, cập nhật) theo API /api/Admin/audit-logs.'}
          </p>
        </Alert>
        {error && <Alert variant="error">{error}</Alert>}
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có bản ghi nhật ký.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{l.action || '—'}</span>
                  <div className="flex gap-2">
                    {l.entityName && <Badge variant="secondary">{l.entityName}</Badge>}
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {l.userFullName || l.userEmail || 'Hệ thống'}
                  {l.ipAddress ? ` · IP ${l.ipAddress}` : ''}
                </p>
                {l.actionTime && (
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(l.actionTime).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </PageCard>
    </div>
  )
}

const DEFAULT_PRIORITY_POINTS: PriorityGroupPointItemDto[] = [

  { groupCode: 'MERIT_PERSON', groupName: 'Người có công với cách mạng', points: 10, description: 'Điểm tối đa theo Luật Nhà ở 2023' },
  { groupCode: 'URBAN_POOR', groupName: 'Hộ nghèo đô thị', points: 9, description: 'Hộ nghèo có xác nhận' },
  { groupCode: 'RURAL_POOR', groupName: 'Hộ nghèo nông thôn', points: 8, description: 'Hộ nghèo khu vực nông thôn' },
  { groupCode: 'DISABLED', groupName: 'Người khuyết tật', points: 8, description: 'Khuyết tật mức độ nặng hoặc đặc biệt nặng' },
  { groupCode: 'WORKER', groupName: 'Công nhân KCN/KCX', points: 7, description: 'Người lao động trực tiếp trong khu công nghiệp' },
  { groupCode: 'LOW_INCOME_URBAN', groupName: 'Người thu nhập thấp tại đô thị', points: 6, description: 'Thu nhập <= 15M/tháng' },
  { groupCode: 'MILITARY_PERSONNEL', groupName: 'Lực lượng vũ trang / Công an / Quân đội', points: 6, description: 'Cán bộ chiến sĩ LLVT' },
  { groupCode: 'CIVIL_SERVANT', groupName: 'Cán bộ, công chức, viên chức', points: 5, description: 'Công chức nhà nước' },
  { groupCode: 'LAND_RECOVERY_AFFECTED', groupName: 'Hộ bị thu hồi đất / giải tỏa', points: 5, description: 'Bị thu hồi đất chưa được bồi thường bằng nhà' },
]

export function CategoriesPage() {
  const [statuses, setStatuses] = useState<ProjectStatus[]>([])
  const [policies, setPolicies] = useState<PolicyConfig[]>([])
  const [priorityPoints, setPriorityPoints] = useState<PriorityGroupPointItemDto[]>(DEFAULT_PRIORITY_POINTS)
  const [loading, setLoading] = useState(true)
  const [savingPoints, setSavingPoints] = useState(false)
  const [error, setError] = useState('')
  const [editPolicyName, setEditPolicyName] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const s = await housingProjectStatusesApi.list()
      const sl = Array.isArray(s) ? s : ((s as { items?: ProjectStatus[] }).items ?? [])
      setStatuses(sl as ProjectStatus[])

      const policyNames = Object.keys(POLICY_DEFAULT_VALUES)
      const loaded: PolicyConfig[] = []
      for (const name of policyNames) {
        try {
          const p = await housingProjectStatusesApi.getPolicy(name)
          loaded.push({
            policyName: name,
            policyValue: String((p as { policyValue?: string }).policyValue ?? POLICY_DEFAULT_VALUES[name]),
            description: (p as { description?: string }).description,
            unit: (p as { unit?: string }).unit,
            updatedAt: (p as { updatedAt?: string }).updatedAt,
          })
        } catch {
          loaded.push({
            policyName: name,
            policyValue: POLICY_DEFAULT_VALUES[name],
          })
        }
      }
      setPolicies(loaded)

      try {
        const ptRes = await housingProjectStatusesApi.getPriorityPoints()
        const ptData = (ptRes && typeof ptRes === 'object' && 'data' in ptRes ? (ptRes as any).data : ptRes) as PriorityPointsTableDto
        if (ptData?.pointsTable && Array.isArray(ptData.pointsTable) && ptData.pointsTable.length > 0) {
          setPriorityPoints(ptData.pointsTable)
        }
      } catch {
        // use default fallback
      }
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const savePolicy = async (name: string) => {
    setMsg(null)
    try {
      await housingProjectStatusesApi.updatePolicy(name, { policyValue: editValue })
      setMsg({ type: 'success', text: `Đã cập nhật chính sách ${name}.` })
      setEditPolicyName(null)
      await load()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    }
  }

  const savePriorityPoints = async () => {
    setSavingPoints(true)
    setMsg(null)
    try {
      await housingProjectStatusesApi.updatePriorityPoints({ pointsTable: priorityPoints })
      setMsg({ type: 'success', text: 'Đã cập nhật bảng điểm ưu tiên NOXH thành công.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setSavingPoints(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader routeId="admin-categories" />
      <PageCard className="p-6">
        {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'} className="mb-3">{msg.text}</Alert>}
        {error && <Alert variant="error" className="mb-3">{error}</Alert>}
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>
        ) : (
          <>
            {/* Bảng điểm ưu tiên NOXH */}
            <div className="mb-8">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    🏆 Ma trận điểm ưu tiên NOXH (Điều 76 Luật Nhà ở 2023)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cấu hình trọng số điểm ưu tiên chấm tự động khi xét duyệt hồ sơ đăng ký.
                  </p>
                </div>
                <Button variant="accent" size="sm" disabled={savingPoints} onClick={() => void savePriorityPoints()}>
                  {savingPoints ? 'Đang lưu...' : '💾 Lưu bảng điểm ưu tiên'}
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Mã nhóm</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Nhóm đối tượng ưu tiên</th>
                      <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Mô tả quy định</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300">Điểm số</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {priorityPoints.map((item, idx) => (
                      <tr key={item.groupCode || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-mono font-medium text-slate-500">{item.groupCode}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{item.groupName}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{item.description || '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.points}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0
                              setPriorityPoints((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, points: val } : p)),
                              )
                            }}
                            className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-xs font-bold text-indigo-600 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <h3 className="mb-2 font-semibold">Trạng thái dự án</h3>
            <div className="mb-6 space-y-2">
              {statuses.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <div>
                    <p className="font-medium">{s.statusName ?? '—'}</p>
                    {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
                  </div>
                  <Badge variant="secondary">{s.statusCode ?? '—'}</Badge>
                </div>
              ))}
            </div>

            <h3 className="mb-2 font-semibold">Cấu hình chính sách NOXH</h3>
            <div className="space-y-2">
              {policies.map((p) => (
                <div key={p.policyName} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium">{p.policyName}</p>
                      {p.description && <p className="text-xs text-slate-500">{p.description}</p>}
                      {p.unit && <p className="text-xs text-slate-400">Đơn vị: {p.unit}</p>}
                    </div>
                    {editPolicyName === p.policyName ? (
                      <div className="flex gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-sm"
                        />
                        <Button variant="accent" size="sm" onClick={() => void savePolicy(p.policyName)}>Lưu</Button>
                        <Button variant="outline" size="sm" onClick={() => setEditPolicyName(null)}>Huỷ</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{p.policyValue}</code>
                        <Button variant="outline" size="sm" onClick={() => { setEditPolicyName(p.policyName); setEditValue(p.policyValue) }}>
                          Sửa
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </PageCard>
    </div>
  )
}

