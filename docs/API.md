# Phác thảo REST API — Nourish-Loop

> Bản nháp hợp đồng API. Base URL: `/api`. Auth: `Authorization: Bearer <JWT>` (trừ public).
> ✅ = đã có skeleton · 🟡 = stub · ⬜ = chưa làm (TODO cho team).

## Quy ước
- JSON request/response. Lỗi trả `{ statusCode, message, error }` (chuẩn NestJS).
- Thời gian ISO-8601. ID dạng UUID.

---

## Auth — `/api/auth`

Auth dùng **session token (không JWT)**: login trả `sessionToken`, client gửi lại qua
header `Authorization: Bearer <sessionToken>` cho `/auth/me` và `/auth/logout`.

| Method | Path | Mô tả | Trạng thái |
|--------|------|-------|-----------|
| POST | `/auth/register` | Đăng ký (tất cả field bắt buộc) | ✅ |
| POST | `/auth/login` | Đăng nhập → `{ user, sessionToken, expiresAt }` | ✅ |
| POST | `/auth/logout` | Đăng xuất (header Bearer) → `{ success: true }` | ✅ |
| GET  | `/auth/me` | User hiện tại (header Bearer) | ✅ |
| POST | `/auth/google` | OAuth Google | ⬜ |

```jsonc
// POST /api/auth/register  (tất cả field bắt buộc)
{
  "email": "minhanh@lotussaigon.vn",
  "password": "secret123",
  "fullName": "Minh Anh",
  "role": "PROVIDER",
  "org": "Lotus Saigon Hotel",
  "phone": "0901234567",
  "address": "Quận 1, TP.HCM"
}
// → 201: user (không có passwordHash)

// POST /api/auth/login
{ "email": "minhanh@lotussaigon.vn", "password": "secret123" }
// → 200: { "user": { ...user, profile }, "sessionToken": "c8af...", "expiresAt": "2026-07-04T..." }

// GET /api/auth/me        Header: Authorization: Bearer <sessionToken>   → 200: user | 401
// POST /api/auth/logout   Header: Authorization: Bearer <sessionToken>   → 200: { "success": true }
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

## Requests — `/api/requests`

Phía **receiver** đã làm (định danh tạm qua `receiverId` trong body/query, sẽ chuyển sang token).

| Method | Path | Mô tả | Trạng thái |
|--------|------|-------|-----------|
| POST | `/requests` | Receiver đăng ký nhận (`postId`, `receiverId`, `distanceKm?`, `message?`) | ✅ |
| GET  | `/requests` | Yêu cầu của tôi (lọc `receiverId`, `status`) | ✅ |
| GET  | `/requests/:id` | Chi tiết yêu cầu (kèm tin + provider) | ✅ |
| PATCH | `/requests/:id/cancel` | Receiver huỷ (chỉ khi `PENDING`) | ✅ |
| GET  | `/requests/incoming` | Yêu cầu đến tin của tôi (Provider) | ⬜ |
| PATCH | `/requests/:id` | Provider chấp nhận / từ chối (`status`) | ⬜ |

```jsonc
// POST /api/requests
{ "postId": "uuid...", "receiverId": "uuid...", "distanceKm": 2.5, "message": "Xin nhận cho bữa tối" }
// → 201: request (status PENDING)
// Lỗi: 404 tin không tồn tại · 409 tin không OPEN hoặc đã gửi yêu cầu rồi

// GET   /api/requests?receiverId=uuid&status=PENDING        → mảng request (kèm post)
// GET   /api/requests/:id                                   → request | 404
// PATCH /api/requests/:id/cancel   → request (CANCELLED) | 400 nếu không PENDING

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
