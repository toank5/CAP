import type { HousingProjectDto } from '@/types'

/**
 * Nghiệp vụ trạng thái dự án nhà ở — đồng bộ giữa FE và BE.
 *
 * Flow:
 *   CĐT tạo xong          → PENDING (chờ SXD duyệt, KHÔNG hiển thị cho người dân)
 *   SXD duyệt              → UPCOMING (Sắp mở bán — publicAnnounceAt được set)
 *   Sau 30 ngày từ duyệt   → OPEN (Đang mở đăng ký)  — tính theo FE dựa vào publicAnnounceAt
 *   Hoặc SXD bấm nút       → OPEN ngay                — BE set status trực tiếp
 *   Sau khi kết thúc        → CLOSED / FULL            — sự kiện khác không thuộc file này
 *
 * Lý do tính 30 ngày ở FE:
 *   - Tránh phụ thuộc vào BE scheduler / cron job
 *   - Nếu BE chưa tự động cập nhật status, FE vẫn hiển thị đúng cho người dân
 *   - Khi SXD gọi PATCH action=open, BE sẽ set status=OPEN thật → FE đọc lại sẽ tự đồng bộ
 */

export const AUTO_OPEN_AFTER_DAYS = 30
export const DAY_MS = 24 * 60 * 60 * 1000

/** Chuẩn hoá status string từ BE về key in hoa (PENDING / UPCOMING / OPEN / CLOSED / FULL / REJECTED) */
export function normalizeStatus(status?: string | null): string {
  if (!status) return ''
  const s = String(status).trim().toUpperCase()
  // Map label tiếng Việt → key tiếng Anh
  const map: Record<string, string> = {
    'ĐANG CHỜ': 'PENDING',
    'CHỜ DUYỆT': 'PENDING',
    'SẮP MỞ BÁN': 'UPCOMING',
    'ĐANG MỞ ĐĂNG KÝ': 'OPEN',
    'MỞ BÁN': 'OPEN',
    'ĐÃ KẾT THÚC': 'CLOSED',
    'HẾT CĂN': 'FULL',
    'TỪ CHỐI': 'REJECTED',
    'ĐÃ TỪ CHỐI': 'REJECTED',
  }
  return map[s] ?? s
}

/**
 * Trả về trạng thái "hiệu dụng" mà user thấy được:
 *  - Nếu BE đã set OPEN/CLOSED/FULL/REJECTED → trả về đúng giá trị BE
 *  - Nếu BE đang UPCOMING + đã quá 30 ngày từ publicAnnounceAt → trả OPEN
 *  - Còn lại → trả status gốc
 */
export function effectiveProjectStatus(p: HousingProjectDto | null | undefined): string {
  const raw = normalizeStatus(p?.status)
  // Các trạng thái kết thúc: tin tưởng tuyệt đối BE
  if (raw === 'OPEN' || raw === 'CLOSED' || raw === 'FULL' || raw === 'REJECTED') return raw
  if (raw !== 'UPCOMING') return raw // PENDING / rỗng / không xác định → giữ nguyên

  // UPCOMING: kiểm tra đã đủ 30 ngày từ publicAnnounceAt chưa
  const announced = parseDateSafe(p?.publicAnnounceAt)
  if (!announced) return raw
  const elapsedDays = (Date.now() - announced.getTime()) / DAY_MS
  return elapsedDays >= AUTO_OPEN_AFTER_DAYS ? 'OPEN' : raw
}

/** Số ngày còn lại trước khi tự mở đăng ký. Âm = đã quá hạn. null = không xác định */
export function daysUntilAutoOpen(p: HousingProjectDto | null | undefined): number | null {
  const announced = parseDateSafe(p?.publicAnnounceAt)
  if (!announced) return null
  const elapsedDays = (Date.now() - announced.getTime()) / DAY_MS
  return AUTO_OPEN_AFTER_DAYS - elapsedDays
}

/** Project có đang trong trạng thái chờ SXD duyệt (CĐT vừa tạo)? */
export function isPending(p: HousingProjectDto | null | undefined): boolean {
  return effectiveProjectStatus(p) === 'PENDING'
}

/** Project đã được SXD duyệt, đang chờ 30 ngày (Sắp mở bán)? */
export function isUpcoming(p: HousingProjectDto | null | undefined): boolean {
  return effectiveProjectStatus(p) === 'UPCOMING'
}

/** Project đang mở đăng ký cho người dân nộp hồ sơ */
export function isOpenForRegistration(p: HousingProjectDto | null | undefined): boolean {
  return effectiveProjectStatus(p) === 'OPEN'
}

/** Project đã bị SXD từ chối */
export function isRejected(p: HousingProjectDto | null | undefined): boolean {
  return effectiveProjectStatus(p) === 'REJECTED'
}

function parseDateSafe(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}