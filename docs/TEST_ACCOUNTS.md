# Tài khoản test & Hướng dẫn kiểm thử nhanh

> Dữ liệu từ `prisma/seed.ts`. Chạy seed trước: `npx prisma db seed`.
> **Mật khẩu chung cho mọi tài khoản: `123456`** (đã hash bcrypt trong DB).

## 1. Tài khoản demo

| Vai trò | Email | Tổ chức | Mức xác thực |
|--------|-------|---------|--------------|
| Provider | `minhanh@lotussaigon.vn` | Lotus Saigon Hotel | VERIFIED |
| Provider | `huong@tiembanhmai.vn` | Tiệm bánh Mai | COMMUNITY |
| Provider | `tuan@sieuthixanh.vn` | Siêu thị Xanh | VERIFIED |
| Receiver | `lan@bepanhoasen.vn` | Bếp ăn từ thiện Hoa Sen | VERIFIED |
| Receiver | `phuc@maiamtinhthuong.vn` | Mái ấm Tình Thương | COMMUNITY |
| Admin | `admin@foodlife.vn` | — | — |

## 2. Chuẩn bị

```bash
# 1. DATABASE_URL phải connect được (Supabase: dùng chuỗi pooler IPv4)
# 2. Tạo bảng + seed dữ liệu
npx prisma db push
npx prisma db seed
# 3. Chạy server
npm run start:dev
```

Server chạy ở `http://localhost:3000`, mọi route có tiền tố `/api`.

## 3. Endpoint đang hoạt động

| Method | Endpoint | Mô tả | Cần body |
|--------|----------|-------|----------|
| GET | `/api/health` | Kiểm tra server sống | — |
| POST | `/api/auth/register` | Đăng ký tài khoản mới (đủ field) | ✅ |
| POST | `/api/auth/login` | Đăng nhập → trả `sessionToken` | ✅ |
| GET | `/api/auth/me` | User hiện tại (header `Bearer <token>`) | ✅ |
| POST | `/api/auth/logout` | Đăng xuất (header `Bearer <token>`) | ✅ |
| GET | `/api/posts` | Danh sách tin (lọc `search`, `category`, `status`, `minKg`) | — |
| GET | `/api/posts/:id` | Chi tiết tin | — |
| POST | `/api/posts` | Tạo tin thực phẩm | ✅ |

> Các module khác (requests, transactions, reviews, stories, notifications) **chưa implement** — xem `docs/API.md`.

## 4. Test nhanh bằng curl

**Đăng nhập (tài khoản seed):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lan@bepanhoasen.vn","password":"123456"}'
```
→ Trả `{ user, sessionToken, expiresAt }` (user **không có** `passwordHash`).

**Dùng token cho `/me` và đăng xuất:**
```bash
TOKEN="<sessionToken lấy từ login>"
curl http://localhost:3000/api/auth/me      -H "Authorization: Bearer $TOKEN"   # → user
curl -X POST http://localhost:3000/api/auth/logout -H "Authorization: Bearer $TOKEN"  # → {"success":true}
# Gọi lại /me với token cũ sau khi logout → 401
```

**Đăng ký mới** (email phải chưa tồn tại — dùng email seed sẽ trả `409 Conflict`):
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@test.vn","password":"123456","fullName":"Người Mới","role":"RECEIVER","org":"NGO Test","phone":"0903000000","address":"Quận 7, TP.HCM"}'
```

**Danh sách tin đang mở:**
```bash
curl "http://localhost:3000/api/posts?status=OPEN"
```

**Lọc theo danh mục + khối lượng tối thiểu:**
```bash
curl "http://localhost:3000/api/posts?category=VEGETABLES&minKg=10"
```

## 5. Test bằng Postman

Import 2 file trong thư mục [`postman/`](../postman):
1. `nourish-loop.postman_collection.json` — bộ request.
2. `nourish-loop.local.postman_environment.json` — biến môi trường (`baseUrl`).

Chọn environment **"Nourish-Loop Local"** rồi chạy. Xem hướng dẫn chi tiết trong [`postman/README.md`](../postman/README.md).

## 6. Kết quả mong đợi (sai số trạng thái thường gặp)

| Tình huống | HTTP | Ý nghĩa |
|-----------|------|---------|
| Đăng nhập đúng | 200/201 | Trả user |
| Sai email/mật khẩu | 401 | `Email hoặc mật khẩu không đúng` |
| Đăng ký email đã tồn tại | 409 | `Email đã được sử dụng` |
| Body thiếu/sai kiểu (vd thiếu `email`) | 400 | Lỗi validation từ class-validator |
| `GET /posts/:id` id không tồn tại | 404 | `Không tìm thấy tin đăng ...` |
