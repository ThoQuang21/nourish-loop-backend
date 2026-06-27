# Phác thảo REST API — Nourish-Loop

> Bản nháp hợp đồng API. Base URL: `/api`. Auth: `Authorization: Bearer <JWT>` (trừ public).
> ✅ = đã có skeleton · 🟡 = stub · ⬜ = chưa làm (TODO cho team).

## Quy ước
- JSON request/response. Lỗi trả `{ statusCode, message, error }` (chuẩn NestJS).
- Thời gian ISO-8601. ID dạng UUID.

---

## Auth — `/api/auth`

| Method | Path | Mô tả | Trạng thái |
|--------|------|-------|-----------|
| POST | `/auth/register` | Đăng ký (email, password, fullName, role, org?, phone?, address?) | 🟡 |
| POST | `/auth/login` | Đăng nhập → `{ accessToken }` | 🟡 |
| POST | `/auth/google` | OAuth Google | ⬜ |
| GET  | `/auth/me` | Thông tin user hiện tại | ⬜ |

```jsonc
// POST /api/auth/register
{
  "email": "minhanh@lotussaigon.vn",
  "password": "secret123",
  "fullName": "Minh Anh",
  "role": "PROVIDER",
  "org": "Lotus Saigon Hotel",
  "phone": "0901234567",
  "address": "Quận 1, TP.HCM"
}
// → 201 { "accessToken": "eyJ..." }
```

---

## Food Posts — `/api/posts`

| Method | Path | Mô tả | Trạng thái |
|--------|------|-------|-----------|
| GET  | `/posts` | Danh sách + lọc (`search`, `category`, `status`, `minKg`, `maxDistanceKm`) | ✅ |
| GET  | `/posts/:id` | Chi tiết tin + provider | ✅ |
| POST | `/posts` | Tạo tin (Provider) | ✅ (cần gắn auth) |
| PATCH | `/posts/:id` | Sửa tin | ⬜ |
| DELETE | `/posts/:id` | Xoá / đóng tin | ⬜ |

```jsonc
// POST /api/posts
{
  "title": "Buffet trưa khách sạn (suất ăn)",
  "category": "PREPARED_MEAL",
  "weightKg": 12,
  "description": "Còn nóng, đóng hộp sẵn",
  "address": "Quận 1, TP.HCM",
  "district": "Quận 1",
  "pickupWindow": "14:30 – 16:00 hôm nay",
  "expiresInHours": 3
}
```

---

## Requests — `/api/requests` ⬜

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/requests` | Receiver gửi yêu cầu nhận (`postId`) |
| GET  | `/requests` | Yêu cầu của tôi (lọc theo status) |
| GET  | `/requests/incoming` | Yêu cầu đến tin của tôi (Provider) |
| PATCH | `/requests/:id` | Chấp nhận / từ chối / huỷ (`status`) |

---

## Transactions — `/api/transactions` ⬜

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/transactions/:id/confirm` | Xác nhận giao/nhận bằng QR (`qrCode`) |
| GET  | `/transactions/history` | Lịch sử giao dịch |

---

## Reviews — `/api/reviews` ⬜

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/reviews` | Đánh giá sau giao dịch (`transactionId`, `score`, `comment`) |
| GET  | `/users/:id/reviews` | Đánh giá nhận được |

---

## Stories — `/api/stories` ⬜

| Method | Path | Mô tả |
|--------|------|-------|
| GET  | `/stories` | Feed câu chuyện tác động |
| POST | `/stories` | Đăng story (`text`, `imageUrl?`, `thanksToProviderId?`) |
| POST | `/stories/:id/like` | Thích |

---

## Notifications — `/api/notifications` ⬜

| Method | Path | Mô tả |
|--------|------|-------|
| GET  | `/notifications` | Danh sách (lọc unread) |
| PATCH | `/notifications/:id/read` | Đánh dấu đã đọc |

---

## Impact / ESG — `/api/impact` ⬜

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/impact/summary` | Tổng kg, CO₂, deals, người hưởng lợi |
| GET | `/impact/weekly` | Số liệu theo ngày trong tuần (cho chart ESG) |

---

## Health — `/api/health` ✅
`GET /api/health` → `{ "status": "ok", "service": "nourish-loop-backend", "timestamp": "..." }`
