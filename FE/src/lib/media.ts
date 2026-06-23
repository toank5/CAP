/** Ảnh minh họa dự án — lưu cục bộ trong public/images */
export const GOV_IMAGES = {
  heroBanner: '/images/hero-banner.jpg',
  pattern: '/images/gov-pattern.svg',
  housing: {
    'an-binh': '/images/an-binh.jpg',
    'hoa-phat': '/images/hoa-phat.jpg',
    'song-xanh': '/images/song-xanh.jpg',
    'tan-phu': '/images/tan-phu.jpg',
  } as Record<string, string>,
} as const

export function housingImage(id: string, fallback = GOV_IMAGES.heroBanner): string {
  return GOV_IMAGES.housing[id] ?? fallback
}
