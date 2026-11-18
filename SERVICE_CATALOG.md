# Danh mục chọn nhanh dịch vụ

Danh mục local được đóng gói trong `src/core/serviceCatalog.ts`. Đây là tập lựa chọn tiện dụng, không phải bảng xếp hạng thị phần hoặc cam kết dịch vụ hỗ trợ detection đặc thù. Không có API, CDN logo, giá gói, lịch thanh toán hoặc thời lượng trial trong danh mục.

Tên và website được đối chiếu với trang chính thức ngày 2026-11-18:

| Dịch vụ | Domain điền sẵn | Nguồn chính thức |
|---|---|---|
| Netflix | netflix.com | [Netflix](https://www.netflix.com/) |
| Spotify | spotify.com | [Spotify Premium](https://www.spotify.com/us/premium/) |
| YouTube Premium | youtube.com | [YouTube Premium](https://www.youtube.com/premium) |
| ChatGPT | chatgpt.com | [ChatGPT](https://chatgpt.com/) |
| Canva | canva.com | [Canva](https://www.canva.com/) |
| Google One | one.google.com | [Google One](https://one.google.com/about/) |
| iCloud+ | icloud.com | [Apple iCloud+](https://www.apple.com/icloud/), [iCloud](https://www.icloud.com/) |
| Microsoft 365 | microsoft.com | [Microsoft 365](https://www.microsoft.com/en-us/microsoft-365) |
| Adobe Creative Cloud | adobe.com | [Adobe Creative Cloud](https://www.adobe.com/creativecloud.html) |
| Claude | claude.ai | [Claude](https://claude.ai/) |
| Notion | notion.com | [Notion](https://www.notion.com/) |
| GitHub Copilot | github.com | [GitHub Copilot](https://github.com/features/copilot) |

## Hành vi

- Thêm dịch vụ mới thủ công bắt đầu ở danh sách chọn nhanh; sửa hồ sơ hiện có và luồng detection giữ giao diện xác nhận tương ứng.
- Tìm theo tên/domain/từ khóa; không phân biệt chữ hoa/thường và dấu tiếng Việt. Nhiều từ khóa được kết hợp bằng AND.
- Chọn preset chỉ đổi tên/domain. Thẻ, trạng thái, ngày do người dùng nhập, chi phí và ghi chú được giữ. URL billing của domain khác bị xóa để tránh liên kết nhầm.
- Không tự tạo hồ sơ, không tự cấp host permission, không tự mở website hoặc suy đoán ngày/giá. Người dùng vẫn chủ động bấm Lưu.
- Dịch vụ khác luôn cho phép nhập thủ công; không có kết quả tìm kiếm cũng hiển thị lựa chọn này.
- Chế độ chọn/nhập riêng và từ khóa tìm kiếm được giữ trong bản nháp mã hóa. Snapshot từ bản cũ thiếu các trường này được mở ở chế độ nhập thủ công, giữ tương thích các form đang nhập trước cập nhật.
- Mở rộng danh sách bằng một entry có ID duy nhất, tên, domain đã xác minh và keywords. Chạy `npm run test:catalog` sau khi sửa.
