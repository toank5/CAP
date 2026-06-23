import { housingApplicationsApi, parsePagedApplications } from '../../api/housing-applications'
import { housingProjectsApi } from '../../api/housing-projects'
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
  SUBMITTED: 'Đã nộp',
  UNDER_REVIEW: 'Đang thẩm định',
  NEED_MORE_DOCUMENTS: 'Cần bổ sung',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
}

const ACTIONS: QuickAction[] = [
  { title: 'Hồ sơ chờ nhận', desc: 'Danh sách hồ sơ SUBMITTED cần nhận thẩm định.', route: 'applications' },
  { title: 'Hồ sơ đang xử lý', desc: 'Hồ sơ UNDER_REVIEW đang được bạn thẩm định.', route: 'applications' },
  { title: 'Dự án nhà ở', desc: 'Tra cứu thông tin dự án liên quan hồ sơ.', route: 'projects' },
  { title: 'Bảng điều phối', desc: 'Kiểm tra phiên và quyền truy cập.', route: 'dashboard' },
  { title: 'Hồ sơ cá nhân', desc: 'Thông tin tài khoản cán bộ.', route: 'profile' },
]

const STEPS: WorkflowStep[] = [
  { num: '1', title: 'Nhận hồ sơ', desc: 'Chuyển SUBMITTED → UNDER_REVIEW.' },
  { num: '2', title: 'Thẩm định', desc: 'Kiểm tra hồ sơ và tài liệu đính kèm.' },
  { num: '3', title: 'Kết luận', desc: 'Phê duyệt hoặc từ chối kèm ghi chú.' },
]

export function verifierHomeView(): HTMLElement {
  const statsHost = el('div', { class: 'role-stats-inner' },
    statCard('—', 'Chờ nhận', 'SUBMITTED'),
    statCard('—', 'Đang thẩm định', 'UNDER_REVIEW'),
    statCard('—', 'Cần bổ sung', 'NEED_MORE_DOCUMENTS'),
    statCard('—', 'Dự án', 'Tham chiếu'),
  )

  const queueRows = el('div', { class: 'role-activity-list' })
  const queueSection = activityPanel('Hàng đợi thẩm định', 'Không có hồ sơ chờ nhận.', queueRows)

  const page = buildRolePage(
    'home-verifier',
    'Tiếp nhận và thẩm định hồ sơ đăng ký nhà ở theo quy trình minh bạch.',
    statsHost,
    ACTIONS,
    [queueSection],
    workflowPanel(STEPS),
  )

  const welcome = page.querySelector('.role-welcome') as HTMLElement

  void (async () => {
    const [profile, submitted, underReview, needMore, projects, queue] = await Promise.allSettled([
      usersApi.getProfile(),
      housingApplicationsApi.getAll({ pageSize: 1, status: 'SUBMITTED' }),
      housingApplicationsApi.getAll({ pageSize: 1, status: 'UNDER_REVIEW' }),
      housingApplicationsApi.getAll({ pageSize: 1, status: 'NEED_MORE_DOCUMENTS' }),
      housingProjectsApi.list({ pageSize: 1 }),
      housingApplicationsApi.getAll({ pageSize: 6, status: 'SUBMITTED' }),
    ])

    if (profile.status === 'fulfilled') {
      const p = profile.value as Record<string, unknown>
      setWelcome(welcome, String(p.fullName ?? p.FullName ?? ''))
    } else {
      setWelcome(welcome)
    }

    statsHost.replaceChildren(
      statCard(submitted.status === 'fulfilled' ? countFromPaged(submitted.value) : 0, 'Chờ nhận', 'SUBMITTED'),
      statCard(underReview.status === 'fulfilled' ? countFromPaged(underReview.value) : 0, 'Đang thẩm định', 'UNDER_REVIEW'),
      statCard(needMore.status === 'fulfilled' ? countFromPaged(needMore.value) : 0, 'Cần bổ sung', 'NEED_MORE_DOCUMENTS'),
      statCard(projects.status === 'fulfilled' ? countFromPaged(projects.value) : 0, 'Dự án', 'Tham chiếu'),
    )

    if (queue.status === 'fulfilled') {
      const apps = parsePagedApplications(queue.value)
      if (apps.length === 0) {
        queueRows.replaceChildren(el('p', { class: 'role-empty' }, 'Không có hồ sơ SUBMITTED.'))
      } else {
        queueRows.replaceChildren(
          ...apps.map((a) =>
            activityRow(
              a.applicantFullName,
              `${a.projectName} · ${a.documentCount} tài liệu`,
              el('span', { class: 'role-tag is-info' }, STATUS[a.applicationStatus] ?? a.applicationStatus),
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
