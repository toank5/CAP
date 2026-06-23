import { housingApplicationsApi, parsePagedApplications } from '../../api/housing-applications'
import { housingProjectsApi } from '../../api/housing-projects'
import { paymentApi } from '../../api/payment'
import { usersApi } from '../../api/users'
import { navigate } from '../../router'
import { el } from '../../ui/helpers'
import {
  activityPanel,
  activityRow,
  buildRolePage,
  countFromPaged,
  setWelcome,
  statCard,
  workflowPanel,
  type QuickAction,
  type WorkflowStep,
} from './shared'

const STATUS: Record<string, string> = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã nộp',
  UNDER_REVIEW: 'Đang thẩm định',
  NEED_MORE_DOCUMENTS: 'Cần bổ sung',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
}

const ACTIONS: QuickAction[] = [
  { title: 'Hồ sơ chờ duyệt', desc: 'Xét duyệt hồ sơ đang thẩm định trên địa bàn.', route: 'applications' },
  { title: 'Dự án phường', desc: 'Quản lý dự án nhà ở trên địa bàn.', route: 'projects' },
  { title: 'Tạo dự án mới', desc: 'Khởi tạo dự án nhà ở xã hội mới.', route: 'create-project', cta: 'Tạo →' },
  { title: 'Thanh toán', desc: 'Theo dõi giao dịch liên quan dự án.', route: 'payments' },
  { title: 'Hồ sơ cá nhân', desc: 'Thông tin tài khoản quản lý phường.', route: 'profile' },
]

const STEPS: WorkflowStep[] = [
  { num: '1', title: 'Tiếp nhận hồ sơ', desc: 'Cán bộ thẩm định xử lý hồ sơ đã nộp.' },
  { num: '2', title: 'Xét duyệt', desc: 'Phê duyệt, từ chối hoặc yêu cầu bổ sung giấy tờ.' },
  { num: '3', title: 'Quản lý dự án', desc: 'Cập nhật dự án và theo dõi thanh toán.' },
]

export function wardHomeView(): HTMLElement {
  const statsHost = el('div', { class: 'role-stats-inner' },
    statCard('—', 'Chờ duyệt', 'UNDER_REVIEW'),
    statCard('—', 'Đã nộp', 'SUBMITTED'),
    statCard('—', 'Dự án', 'Trên địa bàn'),
    statCard('—', 'Thanh toán', 'Giao dịch'),
  )

  const appRows = el('div', { class: 'role-activity-list' })
  const appSection = activityPanel('Hồ sơ cần xử lý', 'Không có hồ sơ đang chờ.', appRows)

  const page = buildRolePage(
    'home-ward',
    'Điều phối dự án và phê duyệt hồ sơ đăng ký nhà ở trên địa bàn phường.',
    statsHost,
    ACTIONS,
    [appSection],
    workflowPanel(STEPS),
  )

  const welcome = page.querySelector('.role-welcome') as HTMLElement

  void (async () => {
    const [profile, underReview, submitted, projects, payments, recent] = await Promise.allSettled([
      usersApi.getProfile(),
      housingApplicationsApi.getAll({ pageSize: 1, status: 'UNDER_REVIEW' }),
      housingApplicationsApi.getAll({ pageSize: 1, status: 'SUBMITTED' }),
      housingProjectsApi.list({ pageSize: 1 }),
      paymentApi.getMyPayments(),
      housingApplicationsApi.getAll({ pageSize: 5, status: 'UNDER_REVIEW' }),
    ])

    if (profile.status === 'fulfilled') {
      const p = profile.value as Record<string, unknown>
      setWelcome(welcome, String(p.fullName ?? p.FullName ?? ''))
    } else {
      setWelcome(welcome)
    }

    statsHost.replaceChildren(
      statCard(
        underReview.status === 'fulfilled' ? countFromPaged(underReview.value) : 0,
        'Chờ duyệt',
        'Đang thẩm định',
      ),
      statCard(
        submitted.status === 'fulfilled' ? countFromPaged(submitted.value) : 0,
        'Đã nộp',
        'Chờ nhận hồ sơ',
      ),
      statCard(
        projects.status === 'fulfilled' ? countFromPaged(projects.value) : 0,
        'Dự án',
        'Trên địa bàn',
      ),
      statCard(
        payments.status === 'fulfilled' ? countFromPaged(payments.value) : 0,
        'Thanh toán',
        'Giao dịch',
      ),
    )

    if (recent.status === 'fulfilled') {
      const apps = parsePagedApplications(recent.value)
      if (apps.length === 0) {
        appRows.replaceChildren(el('p', { class: 'role-empty' }, 'Chưa có hồ sơ UNDER_REVIEW.'))
      } else {
        appRows.replaceChildren(
          ...apps.map((a) =>
            activityRow(
              a.applicantFullName,
              `${a.projectName} · ${a.citizenId}`,
              el('span', { class: 'role-tag is-warn' }, STATUS[a.applicationStatus] ?? a.applicationStatus),
              () => {
                sessionStorage.setItem('applicationId', a.applicationId)
                navigate('application-detail')
              },
            ),
          ),
        )
      }
    }
  })()

  return page
}
