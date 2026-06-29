import { Building2, FileCheck, Home, ShieldCheck } from 'lucide-react'

export type LandingStat = {
  icon: typeof Building2
  value: string
  label: string
  sub: string
}

export const LANDING_STATS: LandingStat[] = [
  {
    icon: Building2,
    value: '48',
    label: 'Dự án nhà ở xã hội',
    sub: 'Đang triển khai trên toàn quốc',
  },
  {
    icon: Home,
    value: '2.400+',
    label: 'Căn hộ đang quản lý',
    sub: 'Phân bổ theo đối tượng ưu tiên',
  },
  {
    icon: FileCheck,
    value: '8.200+',
    label: 'Hồ sơ công dân',
    sub: 'Đã xử lý và phản hồi minh bạch',
  },
  {
    icon: ShieldCheck,
    value: '99,2%',
    label: 'Minh bạch quy trình',
    sub: 'Theo dõi trạng thái theo thời gian thực',
  },
]

export type LandingNews = {
  title: string
  date: string
  tag: string
}

export const LANDING_NEWS: LandingNews[] = [
  {
    title: 'Mở đợt đăng ký nhà ở xã hội Quý II/2026',
    date: '01/06/2026',
    tag: 'Đợt mở bán',
  },
  {
    title: 'Hướng dẫn nộp hồ sơ trực tuyến qua cổng RHS',
    date: '28/05/2026',
    tag: 'Hướng dẫn',
  },
  {
    title: 'Danh sách dự án ưu tiên hỗ trợ hộ nghèo, cận nghèo',
    date: '15/05/2026',
    tag: 'Chính sách',
  },
]
