# Postman — Nourish-Loop API

## Cài đặt

1. Mở Postman → **Import** → kéo thả 2 file:
   - `nourish-loop.postman_collection.json` (bộ request)
   - `nourish-loop.local.postman_environment.json` (biến môi trường)
2. Góc trên bên phải, chọn environment **"Nourish-Loop Local"**.
3. Đảm bảo backend đang chạy: `npm run start:dev` và đã `npx prisma db seed`.

> `baseUrl` mặc định `http://localhost:3000/api`. Khi test bản deploy, đổi `baseUrl`
> trong environment thành `https://<app>.onrender.com/api`.

## Thứ tự chạy gợi ý

Collection có test-script tự lưu biến giữa các request, nên chạy theo thứ tự:

1. **Health → GET /health** — chắc server sống.
2. **Auth → Login (Provider - Lotus)** — lưu `providerId`.
3. **Food Posts → POST /posts** — tạo tin (dùng `{{providerId}}`), lưu `postId`.
4. **Food Posts → GET /posts/:id** — đọc lại tin vừa tạo (dùng `{{postId}}`).
5. Các request còn lại (login receiver, sai mật khẩu, lọc danh sách, 404...) chạy độc lập.

Hoặc dùng **Collection Runner** để chạy cả bộ một lượt — các request đã có `pm.test`
kiểm tra status code và một vài field, sẽ hiện pass/fail.

## Biến (Variables)

| Biến | Nguồn | Dùng ở |
|------|-------|--------|
| `baseUrl` | environment | mọi request |
| `providerId` | set bởi *Login (Provider - Lotus)* | *POST /posts* |
| `receiverId` | set bởi *Login (Receiver - Hoa Sen)* | (dành cho module sau) |
| `postId` | set bởi *POST /posts* | *GET /posts/:id* |
| `userId` | set bởi *Register* | (dành cho module sau) |

## Ghi chú

- Tài khoản & mật khẩu test: xem [`../docs/TEST_ACCOUNTS.md`](../docs/TEST_ACCOUNTS.md) (mật khẩu chung `123456`).
- `POST /posts` hiện nhận `providerId` trong body để test (tạm thời) — khi gắn JWT sẽ
  lấy từ token và bỏ field này khỏi body.
- Module requests / transactions / reviews / stories / notifications **chưa implement**;
  sẽ bổ sung request tương ứng khi code xong.
