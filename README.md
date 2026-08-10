
# 📱 IKV Device Master - Hệ thống Quản lý Thiết bị Doanh nghiệp

Ứng dụng web chuyên nghiệp giúp theo dõi và quản lý tài sản CNTT (Laptop, PC, Điện thoại di động) với tính năng đồng bộ đám mây và phân tích thông minh bằng AI.

## 🚀 Tính năng nổi bật

- **Zero-Configuration:** Cấu hình máy chủ được nhúng sẵn trong mã nguồn. Người dùng chỉ cần mở App và nhập Mã Khóa để sử dụng ngay trên mọi thiết bị mới mà không cần thiết lập URL hay Project ID.
- **Đồng bộ Đám mây:** Dữ liệu được lưu trữ tập trung tại máy chủ riêng, cho phép quản lý đồng nhất trên nhiều máy tính và điện thoại.
- **Đa ngôn ngữ (VI/EN):** Hỗ trợ đầy đủ tiếng Việt và tiếng Anh. Đặc biệt, hệ thống tự động xóa dấu tiếng Việt của các chi nhánh (ví dụ: "Hồ Chí Minh" -> "Ho Chi Minh") khi chuyển sang giao diện tiếng Anh.
- **Phân tích AI Gemini:** Tích hợp trí tuệ nhân tạo để phân tích vòng đời thiết bị, cảnh báo rủi ro bảo trì và đưa ra các đề xuất quản lý chuyên nghiệp.
- **Quản lý Chi nhánh:** Linh hoạt thêm/xóa chi nhánh quản lý ngay trong phần Cài đặt.
- **Nhập/Xuất Dữ liệu:** Hỗ trợ sao lưu ra file CSV và nhập dữ liệu từ Excel/CSV để triển khai nhanh chóng.

## 🔒 Bảo mật & Mã hóa Dữ liệu (Security First)

Ứng dụng ưu tiên bảo mật thông tin doanh nghiệp hàng đầu:
- **Mã hóa AES-GCM 256-bit:** Toàn bộ dữ liệu thiết bị được mã hóa bằng thuật toán quân sự trước khi gửi lên Cloud hoặc lưu vào bộ nhớ trình duyệt.
- **Master Key (Mã khóa gốc):** Chỉ người có mã khóa mới có thể giải mã dữ liệu. Server lưu trữ hoàn toàn không thể đọc được nội dung bên trong (Zero-Knowledge Storage).
- **PBKDF2 Key Derivation:** Mã khóa của bạn được bảo vệ bằng cơ chế băm 100,000 lượt, chống lại các cuộc tấn công dò mật khẩu.
- **An toàn trên GitHub:** Do dữ liệu đã được mã hóa và cấu hình API là tĩnh, bạn có thể công khai mã nguồn trên GitHub mà vẫn đảm bảo an toàn tuyệt đối cho dữ liệu doanh nghiệp.

## 🛠 Công nghệ sử dụng

- **Frontend:** React 19 (Hooks, Context), Tailwind CSS.
- **Icons & Charts:** Lucide React, Recharts.
- **AI:** Google Gemini 3 Flash API.
- **Storage:** LocalStorage (Cache) & MySQL (Cloud Sync via PHP API).
- **Encryption:** Web Crypto API (SubtleCrypto).

## 📁 Hướng dẫn sử dụng & Triển khai

1. **Đăng nhập:** Mã khóa mặc định cho lần đầu sử dụng (nếu chưa có dữ liệu) là `123456`. Sau đó hãy đổi mã khóa ngay trong tab **Cài đặt**.
2. **Cập nhật dữ liệu:** Mọi thay đổi (thêm/sửa/xóa) sẽ tự động đồng bộ lên máy chủ đám mây nếu có kết nối mạng.
3. **Đổi thiết bị:** Khi truy cập từ thiết bị mới, bạn chỉ cần nhập đúng Mã Khóa, App sẽ tự động tải dữ liệu mới nhất từ Cloud về.
4. **Deploy:** 
   - Upload toàn bộ source code lên một Repository trên GitHub.
   - Kết nối Repository đó với **Netlify** hoặc **Vercel**.
   - Ứng dụng sẽ tự động chạy (vì cấu hình server đã được tích hợp sẵn bên trong).

---
*Phát triển bởi Trần Đức Thuận*
