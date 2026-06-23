# CAP — Resilience Housing Supply (Frontend)

Nền tảng kết nối và điều phối nguồn cung nhà ở xã hội thông minh — **GovTech · Smart City 2026**.

## Thư mục

- `FE/` — Ứng dụng **Vite + React + TypeScript + Tailwind + Framer Motion**

## Chạy FE

```bash
cd FE
npm install
npm run dev
```

Mở `http://localhost:5173` → `#/landing`

## Stack UI

- React 19, Tailwind CSS v4, Framer Motion
- TanStack Query, Recharts
- Dark mode, Bento grid, glass cards, KPI dashboard

## Trang chính (hash router)

| Route | Mô tả |
|-------|--------|
| `#/landing` | Landing Smart City — hero, stats, timeline, FAQ |
| `#/tra-cuu` | Tra cứu hồ sơ + timeline |
| `#/login` | Đăng nhập |
| `#/dashboard` | Control Center — KPI, charts, activity feed |

Chỉnh `VITE_API_BASE_URL` trong `FE/.env` (proxy `/api` → backend HTTPS).
