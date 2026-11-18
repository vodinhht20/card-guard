# CardGuard — Chrome Web Store artwork

Bộ ảnh dùng giao diện thật, dữ liệu minh họa trong profile Chrome tạm. Ảnh được tạo từ phiên bản giao diện trước; cần tạo lại và đối chiếu với bản hiện tại trước khi submit. Không chứa thẻ, dịch vụ hoặc mật khẩu của người dùng. Không tải bộ ảnh này vào phần upload mã nguồn extension.

- Upload mã extension: [CardGuard v1.2.0](../cardguard-1.2.0.zip).
- Upload ảnh listing: chọn bộ `vi/` hoặc `en/` theo ngôn ngữ listing.
- Mỗi ngôn ngữ có 5 screenshot 1280×800 PNG RGB (Overview, Cards, Calendar, Settings, Unlock), 1 small promo 440×280, 1 marquee 1400×560.
- Icon PNG có 16/32/48/128 px, nền trong suốt; artwork SVG gốc kèm theo. Bản extension đã khai báo đủ icon trong manifest. Icon toolbar 16/32/48 px phủ hết khung để không bị nhỏ; icon store 128 px giữ khoảng đệm.
- Screenshot là ảnh giao diện 400×600 nằm trong khung trình bày 1280×800. Chữ trên giao diện mặc định 16 px, không phải ảnh UI dựng giả. Lịch trong ảnh có thể đang xem tháng khác tháng hiện tại.

Tham chiếu kích thước: [Chrome Web Store — Supplying images](https://developer.chrome.com/docs/webstore/images). Không có tuyên bố đã được duyệt, chứng nhận bảo mật hoặc kết nối chính thức với các dịch vụ minh họa.

## Tạo lại

Từ thư mục project, dùng Chromium đã có sẵn:

```
CARDGUARD_CHROMIUM=/path/to/chrome npm run build:icons
npm run build
CARDGUARD_CHROMIUM=/path/to/chrome npm run build:store-assets
```

Script import backup tổng hợp qua UI thật, kiểm tra VI/EN, font 16/18, màn hình nhỏ 320/400 px rồi render ảnh local. Profile thử nghiệm bị xóa sau khi xong. Vui lòng tạo lại ảnh khi giao diện thay đổi.

Trước khi submit: cung cấp tên publisher, liên hệ hỗ trợ và URL chính sách riêng tư của Anh; kiểm tra thông báo hệ điều hành, quyền website và popup/sidepanel native theo RELEASE_CHECKLIST.md. Gói này chỉ chuẩn bị file, chưa upload/submit lên store.
