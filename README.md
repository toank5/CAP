# CAP — Resilience Housing Supply (Frontend)

Cổng thông tin điều phối & thẩm định nhà ở xã hội — **Intelligent Social Housing Coordination & Vetting Platform**.

## Thư mục

- `FE/` — Ứng dụng Vite + TypeScript
- `swagger.json` — OpenAPI spec (tham chiếu API)

## Chạy FE

```bash
cd FE
npm install
cp .env.example .env.development
npm run dev
```

Cấu hình `VITE_API_BASE_URL` và `VITE_GOOGLE_CLIENT_ID` trong `.env.development`.
