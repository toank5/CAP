export interface FeaturedHouse {
  id: string
  name: string
  location: string
  address: string
  price: string
  units: string
  color: string
  type: string
  area: string
  bedrooms: string
  floors: string
  developer: string
  status: string
  handover: string
  description: string
  paymentAmount: number
  imageUrl: string
}

export const FEATURED_HOUSES: FeaturedHouse[] = [
  {
    id: 'an-binh',
    name: 'Khu nhà ở An Bình',
    location: 'Quận 9, TP.HCM',
    address: 'Khu nhà ở An Bình, Phường Long Bình, Quận 9, TP.HCM',
    price: '850 triệu',
    units: 'Còn 12 căn',
    color: '#e63946',
    type: 'Nhà liền kề',
    area: '60 m²',
    bedrooms: '2 phòng ngủ',
    floors: '2 tầng',
    developer: 'Công ty TNHH An Bình Housing',
    status: 'Đang mở bán',
    handover: 'Quý IV/2026',
    description: 'Khu nhà ở xã hội ven sông, không gian xanh, gần trường học và bệnh viện.',
    paymentAmount: 100_000,
    imageUrl: '/images/an-binh.jpg',
  },
  {
    id: 'hoa-phat',
    name: 'Chung cư Hòa Phát',
    location: 'Thủ Đức, TP.HCM',
    address: 'Chung cư Hòa Phát, Phường Linh Trung, TP. Thủ Đức, TP.HCM',
    price: '1,2 tỷ',
    units: 'Còn 8 căn',
    color: '#0077c8',
    type: 'Căn hộ chung cư',
    area: '72 m²',
    bedrooms: '2 phòng ngủ',
    floors: 'Tầng 5–18',
    developer: 'Hòa Phát Land',
    status: 'Đang mở bán',
    handover: 'Quý I/2027',
    description: 'Chung cư hiện đại, hệ thống an ninh 24/7, tiện ích nội khu đầy đủ.',
    paymentAmount: 150_000,
    imageUrl: '/images/hoa-phat.jpg',
  },
  {
    id: 'song-xanh',
    name: 'Nhà ở Sông Xanh',
    location: 'Quận 7, TP.HCM',
    address: 'Nhà ở Sông Xanh, Phường Tân Phong, Quận 7, TP.HCM',
    price: '980 triệu',
    units: 'Còn 20 căn',
    color: '#2a9d8f',
    type: 'Nhà phố thương mại',
    area: '68 m²',
    bedrooms: '3 phòng ngủ',
    floors: '3 tầng',
    developer: 'Sông Xanh Development',
    status: 'Đang mở bán',
    handover: 'Quý III/2026',
    description: 'Vị trí mặt tiền sông, thuận tiện di chuyển về trung tâm và khu công nghiệp.',
    paymentAmount: 120_000,
    imageUrl: '/images/song-xanh.jpg',
  },
  {
    id: 'tan-phu',
    name: 'Khu dân cư Tân Phú',
    location: 'Tân Phú, TP.HCM',
    address: 'Khu dân cư Tân Phú, Phường Tân Quý, Quận Tân Phú, TP.HCM',
    price: '760 triệu',
    units: 'Còn 5 căn',
    color: '#fb8500',
    type: 'Nhà liền kề',
    area: '55 m²',
    bedrooms: '2 phòng ngủ',
    floors: '2 tầng',
    developer: 'Tân Phú Urban',
    status: 'Sắp hết suất',
    handover: 'Quý II/2026',
    description: 'Giá hợp lý, phù hợp hộ gia đình trẻ, gần chợ và trung tâm hành chính quận.',
    paymentAmount: 100_000,
    imageUrl: '/images/tan-phu.jpg',
  },
]

const FAV_KEY = 'favoriteHouses'

export function getFavorites(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]')
    return Array.isArray(raw) ? (raw as string[]) : []
  } catch {
    return []
  }
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id)
}

export function toggleFavorite(id: string): boolean {
  const favs = getFavorites()
  const idx = favs.indexOf(id)
  if (idx >= 0) {
    favs.splice(idx, 1)
    localStorage.setItem(FAV_KEY, JSON.stringify(favs))
    return false
  }
  favs.push(id)
  localStorage.setItem(FAV_KEY, JSON.stringify(favs))
  return true
}
