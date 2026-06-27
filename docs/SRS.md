# Đặc tả Yêu cầu Phần mềm (SRS) — Nourish-Loop / Food Life

> Phiên bản: 0.1 (bản nháp) · Phạm vi: Backend API · Đối tượng đọc: nhóm phát triển & giảng viên đánh giá

---

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu mô tả yêu cầu cho **backend** của Nourish-Loop ("Food Life") — nền tảng kết nối
thực phẩm dư thừa với nơi cần, nhằm **giảm lãng phí thực phẩm** và tạo tác động xã hội/môi trường.
Backend cung cấp REST API cho frontend React (`../nourish-loop`).

### 1.2 Phạm vi sản phẩm
- Cho phép **Provider** đăng tin thực phẩm dư; **Receiver** tìm kiếm và đăng ký nhận.
- Quản lý vòng đời: đăng tin → yêu cầu → chấp nhận → xác nhận giao/nhận (QR) → đánh giá.
- Theo dõi tác động: kg đã chia sẻ, CO₂ giảm, số giao dịch, số người hưởng lợi.
- Hồ sơ uy tín (trust score), xác thực tài khoản, thông báo, câu chuyện tác động (stories).

### 1.3 Định nghĩa & thuật ngữ
| Thuật ngữ | Ý nghĩa |
|-----------|---------|
| Provider | Người/tổ chức cung cấp thực phẩm dư (nhà hàng, khách sạn, tiệm bánh, siêu thị, cá nhân) |
| Receiver | Người/tổ chức nhận (bếp từ thiện, NGO, mái ấm, trại động vật) |
| Food Post | Tin đăng một lô thực phẩm dư |
| Request | Yêu cầu nhận do Receiver gửi tới một Food Post |
| Transaction | Giao dịch giao/nhận đã xác nhận qua QR |
| Trust score | Điểm uy tín 0–5 tính từ lịch sử giao dịch & đánh giá |

---

## 2. Mô tả tổng thể

### 2.1 Tác nhân (Actors)
- **Provider** — đăng/quản lý tin, xử lý yêu cầu, xác nhận giao, xem báo cáo ESG.
- **Receiver** — tìm kiếm trên bản đồ, đăng ký nhận, xác nhận đã nhận, đánh giá, đăng story.
- **Admin** — xác thực tài khoản (cấp badge "verified"), kiểm duyệt (giai đoạn sau).

### 2.2 Ràng buộc & giả định
- Dữ liệu hiển thị bằng tiếng Việt; tập trung khu vực TP.HCM.
- Cần geocoding/toạ độ để tính khoảng cách và hiển thị pin bản đồ.
- Triển khai trên Render (web service + Postgres).
- Giai đoạn này: nền tảng + thiết kế DB + skeleton; nhiều nghiệp vụ còn TODO.

---

## 3. Yêu cầu chức năng (Functional Requirements)

### FR-1 Xác thực & tài khoản (Auth)
- FR-1.1 Đăng ký bằng email/mật khẩu, chọn vai trò Provider/Receiver, kèm tên & tổ chức.
- FR-1.2 Đăng nhập trả JWT; FE đính kèm token cho các request cần xác thực.
- FR-1.3 (Sau) Đăng nhập Google OAuth.
- FR-1.4 Mật khẩu lưu dạng hash (bcrypt), không lưu plaintext.

### FR-2 Hồ sơ & uy tín (Profile)
- FR-2.1 Mỗi user có hồ sơ: tổ chức, địa chỉ, quận, toạ độ, mức xác thực, trust score, tổng kg, tổng deals.
- FR-2.2 Hiển thị badge "verified" hoặc "community".
- FR-2.3 Trust score cập nhật theo đánh giá sau giao dịch.

### FR-3 Tin đăng thực phẩm (Food Posts)
- FR-3.1 Provider tạo tin: tên, danh mục, khối lượng (kg), mô tả, ảnh, địa điểm, khung giờ lấy, hạn dùng.
- FR-3.2 Tin có trạng thái: OPEN → MATCHED → COMPLETED / EXPIRED.
- FR-3.3 Receiver xem danh sách + bản đồ, lọc theo: từ khoá, danh mục, khối lượng, khoảng cách (≤20km), chỉ verified.
- FR-3.4 Xem chi tiết tin kèm thông tin Provider và vị trí.
- FR-3.5 Tin tự hết hạn theo `expiresAt`.

### FR-4 Yêu cầu nhận (Requests)
- FR-4.1 Receiver gửi yêu cầu nhận cho một tin (mỗi receiver tối đa 1 yêu cầu/tin).
- FR-4.2 Provider xem danh sách yêu cầu, **Chấp nhận** hoặc **Từ chối**.
- FR-4.3 Trạng thái: PENDING → ACCEPTED/REJECTED → COMPLETED/CANCELLED.
- FR-4.4 (Sau) Tự hết hạn yêu cầu nếu quá thời gian không xử lý.

### FR-5 Giao dịch & xác nhận QR (Transactions)
- FR-5.1 Khi chấp nhận yêu cầu, sinh giao dịch kèm mã QR.
- FR-5.2 Provider hiển thị QR; Receiver quét QR (hoặc nhập mã) để xác nhận.
- FR-5.3 Cần xác nhận từ cả hai phía → giao dịch COMPLETED, tin chuyển COMPLETED.
- FR-5.4 Tính `co2SavedKg = weightKg × hệ số carbon`; cộng dồn vào totalKg/totalDeals.

### FR-6 Đánh giá (Reviews)
- FR-6.1 Sau giao dịch, hai bên đánh giá nhau (điểm 1–5 + nhận xét).
- FR-6.2 Đánh giá cập nhật trust score của người được đánh giá.

### FR-7 Câu chuyện tác động (Stories)
- FR-7.1 Receiver đăng story (văn bản + ảnh, có thể cảm ơn Provider).
- FR-7.2 Người dùng xem feed, thích (like) story.

### FR-8 Thông báo (Notifications)
- FR-8.1 Sinh thông báo cho sự kiện: yêu cầu mới, được chấp nhận, nhắc nhở, sắp hết hạn.
- FR-8.2 Đánh dấu đã đọc/chưa đọc.

### FR-9 Báo cáo tác động / ESG
- FR-9.1 Tổng hợp kg chia sẻ, CO₂ giảm, số deals theo ngày/tuần cho dashboard ESG.

---

## 4. Yêu cầu phi chức năng (NFR)

- **NFR-1 Bảo mật**: hash mật khẩu (bcrypt), JWT, validate input (class-validator), CORS giới hạn theo origin FE.
- **NFR-2 Hiệu năng**: phản hồi truy vấn danh sách < 500ms ở mức dữ liệu demo; có index cho cột lọc thường dùng.
- **NFR-3 Khả năng bảo trì**: kiến trúc module hoá theo NestJS; Prisma làm nguồn schema duy nhất.
- **NFR-4 Triển khai**: deploy 1 lệnh qua Render Blueprint; migration tự chạy khi khởi động.
- **NFR-5 Quan sát**: endpoint `/api/health` cho health check.
- **NFR-6 i18n**: nội dung nghiệp vụ tiếng Việt.

---

## 5. Use case chính (tóm tắt)

| ID | Use case | Tác nhân |
|----|----------|----------|
| UC-1 | Đăng ký / Đăng nhập | Provider, Receiver |
| UC-2 | Đăng tin thực phẩm dư | Provider |
| UC-3 | Tìm kiếm & lọc thực phẩm trên bản đồ | Receiver |
| UC-4 | Gửi yêu cầu nhận | Receiver |
| UC-5 | Chấp nhận / từ chối yêu cầu | Provider |
| UC-6 | Xác nhận giao/nhận qua QR | Provider + Receiver |
| UC-7 | Đánh giá sau giao dịch | Provider, Receiver |
| UC-8 | Đăng & xem câu chuyện tác động | Receiver |
| UC-9 | Xem báo cáo ESG | Provider |

### Luồng chính UC-6 (xác nhận QR)
1. Provider chấp nhận yêu cầu → hệ thống sinh `Transaction` + `qrCode`.
2. Provider hiển thị QR cho Receiver tại điểm lấy.
3. Receiver quét QR / nhập mã → `confirmedByReceiver = true`.
4. Provider bấm xác nhận giao → `confirmedByProvider = true`.
5. Khi đủ hai xác nhận: `completedAt` set, tin → COMPLETED, cập nhật trust/CO₂.

---

## 6. Tham chiếu
- Mô hình dữ liệu chi tiết: [`DATABASE.md`](DATABASE.md)
- Hợp đồng API: [`API.md`](API.md)
- Nguồn field gốc từ FE: `../nourish-loop/src/lib/mock-data.ts`
