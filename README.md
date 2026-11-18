# CardGuard

Quản lý thẻ liên kết với các dịch vụ, theo dõi thời gian dùng thử và nhắc lịch gia hạn ngay trong Chrome. Dữ liệu được lưu trên thiết bị; không cần tài khoản, máy chủ đồng bộ hoặc dịch vụ phân tích hành vi.

**Phiên bản:** 1.2.0 · **Trình duyệt:** Chrome 120+ · **Giấy phép mã nguồn:** MIT

## Tính năng

- **Thẻ và dịch vụ:** nhận biết thẻ bằng biệt danh, loại thẻ và 4 số cuối; quản lý các dịch vụ liên kết, chu kỳ, chi phí dự kiến và ghi chú.
- **Lịch gia hạn:** lịch tháng, danh sách 30 ngày tới, phân biệt hết dùng thử/gia hạn, tìm kiếm và lọc theo loại sự kiện.
- **Nhắc lịch:** chọn mốc trước hạn, hoãn nhắc một giờ và xem các dịch vụ cần kiểm tra trên dashboard.
- **Gợi ý trên website:** tùy chọn nhận diện ngữ cảnh dùng thử/thanh toán và hiển thị nút mở luồng lưu thẻ cạnh các ô nhập số thẻ được hỗ trợ.
- **Làm việc trong trình duyệt:** popup và Side Panel, bản nháp mã hóa, tùy chọn ghi nhớ mở khóa 1–14 ngày.
- **Hiển thị:** tiếng Việt/Anh, giao diện sáng/tối/theo hệ thống, hai cỡ chữ và logo dịch vụ đóng gói sẵn.
- **Sao lưu:** xuất/nhập JSON mã hóa, xem trước và lựa chọn gộp hoặc thay thế dữ liệu.

CardGuard ghi nhận thông tin do người dùng xác nhận. Extension không tự thanh toán, hủy đăng ký hoặc gỡ thẻ khỏi dịch vụ. **Gỡ thẻ không đồng nghĩa với hủy gói.**

## Cài đặt từ gói phát hành

1. Tải [CardGuard v1.2.0](release/cardguard-1.2.0.zip) và giải nén vào một thư mục riêng.
2. Mở `chrome://extensions` trong Chrome và bật **Developer mode**.
3. Chọn **Load unpacked**, trỏ đến thư mục đã giải nén chứa `manifest.json`.
4. Ghim CardGuard lên thanh công cụ và tạo mật khẩu gồm đúng **6 ký tự**. Nhập lại để xác nhận; các lần mở khóa sau tự gửi khi nhập đủ 6 ký tự.

Khi cập nhật thủ công, giải nén bản mới vào thư mục cài đặt hiện có rồi bấm **Reload** trong `chrome://extensions`. Không gỡ extension nếu cần giữ dữ liệu; nên xuất bản sao lưu mã hóa trước khi cập nhật.

## Bắt đầu sử dụng

1. **Thêm thẻ:** chọn loại thẻ và nhập 4 số cuối; biệt danh, màu và trạng thái nằm trong **Tùy chọn thêm**. Không nhập số thẻ đầy đủ, CVV, PIN, OTP hoặc thông tin xác thực.
2. **Thêm dịch vụ:** chọn dịch vụ có sẵn hoặc nhập website riêng; chọn thẻ liên kết, ngày hết dùng thử/ngày gia hạn và chu kỳ phù hợp.
3. **Kiểm tra lịch:** mở **Lịch nhắc**, chọn ngày để xem chi tiết hoặc dùng bộ lọc và tìm kiếm. Bấm vào dịch vụ để cập nhật thông tin.
4. **Cấu hình nhắc:** vào **Cài đặt → Nhắc** và cho phép thông báo trong Chrome/hệ điều hành.
5. **Sao lưu:** vào **Cài đặt → Dữ liệu**, đặt mật khẩu file rồi xuất bản sao lưu. File nhập tối đa 5 MB; chỉ thay đổi dữ liệu sau khi xác nhận bản xem trước.

Trong **Cài đặt**, biểu tượng mở Side Panel cho phép quản lý thông tin bên cạnh website. Chờ trạng thái **Đã giữ bản nháp** trước khi đóng popup để tiếp tục thao tác sau khi mở khóa lại.

### Bật gợi ý trên website

Vào **Cài đặt → Website**, cấp quyền cho một website HTTPS hoặc chọn **Cho phép tất cả website HTTPS**. Chấp nhận yêu cầu của Chrome, sau đó tải lại các trang đang mở. Có thể thu hồi quyền tại cùng màn hình hoặc trong phần quản lý extension của Chrome.

Nút lưu thẻ chỉ nhận diện thuộc tính ô nhập; không đọc giá trị thẻ. Bấm nút để mở Side Panel, mở khóa nếu cần, rồi chọn **Thêm thẻ** từ gợi ý và nhập 4 số cuối trong extension. Gợi ý dịch vụ cần được kiểm tra trước khi lưu.

## Bảo mật và quyền riêng tư

Vault sử dụng **AES-256-GCM**; khóa của vault mới được tạo từ mật khẩu bằng **PBKDF2-SHA256 với 600.000 vòng**. Mật khẩu không được lưu. Dữ liệu không được gửi tới máy chủ của CardGuard; logo, font và mã thực thi đều được đóng gói cục bộ.

- CardGuard không đọc hoặc lưu số thẻ đầy đủ, CVV, PIN, OTP hay thông tin xác thực thanh toán. Dữ liệu thẻ cũ có thể còn 3 số đầu; phần này được bỏ khi sửa và lưu lại thẻ.
- Lịch nhắc lưu ID ẩn danh, thời điểm và trạng thái gửi bên ngoài vault để hoạt động khi vault khóa. Metadata có thể cho biết tần suất/thời điểm, không chứa tên dịch vụ hay chữ số thẻ.
- Ngôn ngữ, cỡ chữ và quyền website được lưu riêng. Bản nháp thẻ/dịch vụ được mã hóa trong bộ nhớ phiên và mất khi Chrome khởi động lại.
- **Ghi nhớ tôi** là tùy chọn. Người dùng chung hồ sơ Chrome có thể mở vault trong thời hạn ghi nhớ. Có thể **Hủy phiên ghi nhớ** hoặc **Khóa ngay** trong Cài đặt.
- Không có cơ chế khôi phục mật khẩu. Người dùng tự quản lý file sao lưu và mật khẩu file; file đã xuất nằm ngoài extension.

Đọc [Chính sách riêng tư](PRIVACY.md) và [Mô hình bảo mật](SECURITY.md). Trang chính sách Việt/Anh cũng có sẵn từ màn hình mật khẩu và cuối phần Cài đặt. Bản đóng gói này không tự cung cấp một URL chính sách công khai trên Internet.

### Quyền Chrome

| Quyền | Mục đích |
| --- | --- |
| `storage` | Lưu vault mã hóa, bản nháp và metadata nhắc lịch. |
| `alarms` | Lên lịch và khôi phục kiểm tra nhắc hạn. |
| `notifications` | Hiển thị thông báo nhắc chung. |
| `sidePanel` | Mở giao diện quản lý cạnh website. |
| `scripting` | Đăng ký mã gợi ý trên website đã được cấp quyền. |
| Quyền website HTTPS tùy chọn | Chỉ được cấp sau thao tác chấp thuận của người dùng; hỗ trợ từng website hoặc toàn bộ HTTPS. |

## Giới hạn

- Thông báo phụ thuộc vào Chrome, quyền thông báo và hệ điều hành; máy ngủ hoặc trình duyệt đóng có thể làm trễ nhắc.
- Các kỳ gia hạn được tính trước tối đa 730 ngày khi mở khóa/lưu dữ liệu. Nên mở vault ít nhất mỗi năm để làm mới lịch.
- Nhận diện website không hỗ trợ iframe, shadow DOM của website hoặc trang HTTP; có thể bỏ sót biểu mẫu và không xác nhận việc đăng ký thành công.
- Các hồ sơ và thiết bị Chrome không đồng bộ dữ liệu với nhau. Incognito không được hỗ trợ.
- Mã hóa không bảo vệ được vault đang mở trước thiết bị, trình duyệt hoặc hồ sơ Chrome đã bị chiếm quyền. Không có tuyên bố chứng nhận PCI-DSS hoặc đã được Chrome Web Store phê duyệt.

## Phát triển từ mã nguồn

Yêu cầu **Node.js 20.19+** và npm. Project không cần database hoặc biến môi trường bí mật.

```sh
git clone https://github.com/vodinhht20/card-guard.git
cd card-guard
npm ci --ignore-scripts
npm run build
```

Kết quả build nằm trong `dist/`. Dùng **Load unpacked** với thư mục này để chạy đầy đủ Chrome APIs. `npm run dev` chỉ phục vụ xem trước giao diện, không thay thế môi trường extension.

### Kiểm tra theo phạm vi

Chọn lệnh phù hợp với phần thay đổi; không cần chạy toàn bộ test cho mỗi chỉnh sửa.

```sh
npm run test:security
npm run test:calendar
npm run test:calendar-presentation
npm run test:dashboard
npm run test:browser:calendar
```

Unit test dùng dữ liệu giả và bộ nhớ cách ly. Browser test dùng profile tạm, cần Chromium tương thích đã được cài sẵn. Có thể chỉ định đường dẫn qua `CARDGUARD_CHROMIUM`. Kết quả tạm nằm trong `test-results/` và không được đưa vào Git.

Xem [TESTING.md](TESTING.md) cho các nhóm kiểm tra, [ARCHITECTURE.md](ARCHITECTURE.md) cho cấu trúc mã nguồn và [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) cho các bước xác minh trước khi phát hành. Kiểm thử tự động không thay thế kiểm tra toolbar popup, Side Panel và thông báo hệ điều hành thực tế.

## Tài liệu và phát hành

- [Danh mục dịch vụ và nguồn tham chiếu](SERVICE_CATALOG.md).
- [Ảnh và nội dung Chrome Web Store](release/store-assets/README.md). Ảnh dùng dữ liệu giả; cần tạo lại và đối chiếu với giao diện hiện tại trước khi upload.
- [Báo lỗi và đề xuất tính năng](https://github.com/vodinhht20/card-guard/issues). Không đăng dữ liệu thẻ, mật khẩu, token hoặc file vault thật trong issue công khai; xem [SECURITY.md](SECURITY.md) để báo lỗi bảo mật.

## Giấy phép và ghi công

Mã nguồn CardGuard được phát hành theo [MIT License](LICENSE). Font Noto Sans sử dụng giấy phép riêng tại [public/fonts/LICENSE.txt](public/fonts/LICENSE.txt); logo dịch vụ và nguồn tham chiếu được ghi tại [public/services/README.txt](public/services/README.txt). Thông tin tác giả trong các giấy phép bên thứ ba được giữ nguyên.

Tên và logo của dịch vụ thuộc chủ sở hữu tương ứng. Việc hiển thị không thể hiện quan hệ đối tác hoặc sự chứng thực dành cho CardGuard.
