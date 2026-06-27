# Nourish-Loop Backend (Food Life API)

Backend cho nền tảng **chia sẻ thực phẩm dư thừa** Nourish-Loop ("Food Life") — kết nối
**Provider** (nơi có thực phẩm dư) với **Receiver** (bếp ăn từ thiện, NGO, mái ấm...) tại TP.HCM.

Frontend (React + TanStack) nằm ở `../nourish-loop` và hiện chạy bằng mock data
(`nourish-loop/src/lib/mock-data.ts`). Repo này thay thế lớp mock đó bằng API thật.

## Stack

| Thành phần | Lựa chọn |
|-----------|----------|
| Framework | NestJS 10 |
| Ngôn ngữ  | TypeScript |
| Database  | PostgreSQL |
| ORM       | Prisma |
| Auth      | JWT (`@nestjs/jwt`, bcrypt) — *đang stub* |
| Deploy    | Render (Blueprint `render.yaml`) |

## Cấu trúc thư mục

```
nourish-loop-backend/
├── prisma/
│   └── schema.prisma          # Thiết kế DB (nguồn sự thật)
├── src/
│   ├── main.ts                # Bootstrap (prefix /api, CORS, validation)
│   ├── app.module.ts          # Root module
│   ├── prisma/                # PrismaService + PrismaModule (global)
│   ├── health/                # GET /api/health
│   └── modules/
│       ├── auth/              # STUB: register/login (khung JWT)
│       └── food-posts/        # MẪU đầy đủ: controller + service + DTO
├── docs/
│   ├── SRS.md                 # Đặc tả yêu cầu phần mềm
│   ├── DATABASE.md            # Mô tả DB + ERD + business rules
│   └── API.md                 # Phác thảo REST endpoints
├── render.yaml                # Cấu hình deploy Render
└── .env.example
```

## Chạy local

Yêu cầu: Node ≥ 20 và một Postgres đang chạy (local hoặc cloud).

```bash
# 1. Cài deps
npm install

# 2. Tạo .env từ mẫu, điền DATABASE_URL + JWT_SECRET
cp .env.example .env

# 3. Sinh Prisma client + tạo bảng
npx prisma generate
npx prisma migrate dev --name init

# 4. Chạy dev (watch)
npm run start:dev
```

Kiểm tra: `GET http://localhost:3000/api/health` → `{ "status": "ok", ... }`

Xem DB trực quan: `npx prisma studio`

## Deploy Render

1. Đẩy repo lên GitHub.
2. Render Dashboard → **New** → **Blueprint** → chọn repo (Render đọc `render.yaml`).
3. Render tự tạo Postgres (`nourish-loop-db`) + web service, tự set `DATABASE_URL` và sinh `JWT_SECRET`.
4. Sau khi FE deploy xong, set biến `CORS_ORIGIN` = URL frontend.

> Migration chạy tự động khi khởi động (`prisma migrate deploy` trong `startCommand`).

## Trạng thái & TODO (chia việc cho team)

| Module | Trạng thái | Ghi chú |
|--------|-----------|---------|
| `prisma/schema.prisma` | ✅ Bản nháp | Review & chỉnh field nếu cần |
| `health` | ✅ Xong | |
| `auth` | 🟡 Stub | Implement bcrypt + JWT + JwtStrategy/Guard |
| `food-posts` | 🟡 Mẫu | CRUD cơ bản có, cần guard + lọc khoảng cách |
| `users` / `profiles` | ⬜ Chưa | Hồ sơ, trust score |
| `receiver` | 🟡 Đang làm | CRUD yêu cầu nhận (tạo/xem/huỷ) ✅ tại route `/requests`; tính năng receiver khác ⬜ |
| `transactions` | ⬜ Chưa | Xác nhận QR, tính CO₂ |
| `reviews` | ⬜ Chưa | Đánh giá 2 chiều → trust score |
| `stories` | ⬜ Chưa | Feed câu chuyện tác động |
| `notifications` | ⬜ Chưa | Thông báo trong app |

Chi tiết yêu cầu: xem [`docs/SRS.md`](docs/SRS.md), [`docs/DATABASE.md`](docs/DATABASE.md), [`docs/API.md`](docs/API.md).
