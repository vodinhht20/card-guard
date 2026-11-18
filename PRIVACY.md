# Chính sách riêng tư CardGuard

CardGuard không có máy chủ, tài khoản, đồng bộ, analytics, quảng cáo hoặc telemetry. Extension không gửi dữ liệu người dùng qua mạng. Chỉ mở website billing khi chính người dùng bấm. Website đó có chính sách riêng.

## Dữ liệu được lưu

Vault mã hóa trên thiết bị gồm: biệt danh/loại/trạng thái/màu thẻ, **4 số cuối** (dữ liệu cũ có thể còn 3 số đầu; bị bỏ khi sửa/lưu thẻ), dịch vụ/domain/ngày dùng thử/ngày gia hạn/chu kỳ/chi phí dự kiến/URL billing/ghi chú/trạng thái hủy và gỡ thẻ, cài đặt và tối đa 500 mục lịch sử hoạt động. Không đọc/sử dụng PAN đầy đủ, CVV/CVC, PIN, OTP, 3DS, hạn vật lý, tên chủ thẻ, token/session thanh toán.

Ngoài vault mã hóa có bản sao preference ngôn ngữ (`uiLanguage`: vi/en), cỡ chữ (`uiTextSize`: comfortable/large) và header mã hóa (version, KDF, salt, IV, ciphertext), ID/group nhắc ẩn danh, timestamps nhắc/đến hạn/snooze, cờ đã gửi, các ID của lần thông báo gần nhất, múi giờ dùng dựng lịch. Metadata dùng để worker nhắc khi khóa, đổi múi giờ và chống lặp; người có quyền truy cập profile có thể biết tần suất/thời điểm. Không có tên dịch vụ/domain/chữ số thẻ trong lịch. Origin website đã cho phép được Chrome quản lý.

Gợi ý detection chứa domain, confidence và một trong 3/7/14/30 ngày nếu thấy nhãn rõ ràng. Chỉ sau khi người dùng bấm Lưu liên kết hoặc nút lưu thẻ cạnh ô nhập mới chuyển gợi ý sang trusted session storage, UI bỏ qua sau 10 phút; session mất khi browser restart. Nút lưu thẻ chỉ đọc thuộc tính loại/tên/ID/autocomplete của ô nhập để xác định vị trí hiển thị, không đọc giá trị, PAN, CVV hoặc nội dung form. Không đọc iframe, traffic hoặc bất kỳ khóa vault nào. Tín hiệu lưu thẻ chỉ có domain, loại gợi ý và độ tin cậy; người dùng nhập 4 số cuối trong extension. Thu hồi quyền sẽ bỏ script đã đăng ký, dừng observer/hint còn sống và xóa gợi ý. Detection mặc định tắt.

## Quyền Chrome

| Quyền | Mục đích |
|---|---|
| storage | Vault mã hóa + lịch ẩn danh, session hint; không dùng sync |
| alarms | Nhắc gần nhất và khôi phục định kỳ |
| notifications | Thông báo chung, không tên hay dữ liệu thẻ |
| sidePanel | Quản lý ngay bên cạnh trang web |
| scripting | Đăng ký detector top-frame trên origin đã được cấp |
| optional https://*/* | Chỉ là phạm vi có thể yêu cầu, **không được cấp khi cài**; người dùng có thể cấp riêng origin hoặc toàn bộ website HTTPS bằng nút riêng |

Không có tabs/activeTab/cookies/webRequest/debugger/history/clipboard permission. tabs.create chỉ mở link người dùng chọn; tabs.query/sendMessage dùng để dừng detector resident khi thu hồi quyền mà không đọc URL tab không được cấp. Không cho phép Incognito (`not_allowed`).

Bản nháp thao tác gồm màn hình, bộ lọc, form thẻ/dịch vụ, phần tùy chọn và bước xem trước được mã hóa AES-GCM trong trusted session storage, riêng cho popup/side panel. Không có mật khẩu hoặc khóa trong snapshot. Khi popup đóng do bấm ra website, mở lại sẽ tiếp tục bản nháp đã ghi thành công sau khi mở khóa tự động hoặc nhập mật khẩu. Bản nháp mất khi Chrome khởi động lại; nếu vault đã thay đổi thì bản cũ bị bỏ để tránh ghi đè dữ liệu mới. Form cài đặt chưa lưu, file import và mật khẩu không được giữ.

## Quyền kiểm soát

Người dùng có thể sửa/xóa/lưu trữ hồ sơ, thu hồi origin, khóa ngay, export file mã hóa, import merge/replace hoặc gỡ extension để Chrome xóa storage thuộc extension. File backup đã xuất nằm ngoài Chrome storage và phải được người dùng tự quản lý/xóa. Xóa hồ sơ không bảo đảm ghi đè vật lý các byte từng lưu trên ổ đĩa. Không có phục hồi mật khẩu. Không chuyển dữ liệu tới bên thứ ba.

## Ghi nhớ mở khóa, chỉ khi tự chọn

Tích Ghi nhớ tôi sẽ lưu khóa thiết bị AES không cho xuất, khóa vault đã bọc mã hóa và thời hạn trong IndexedDB local của extension. Không lưu mật khẩu, không gửi lên mạng, không xuất dữ liệu này vào backup. Thời hạn cấu hình 1–14 ngày, mặc định 7, tính từ lần bật ghi nhớ. Chrome profile đang giữ phiên có thể mở vault mà không nhập mật khẩu, kể cả sau khi khởi động lại trình duyệt. Đây không phải bảo vệ bằng phần cứng/kho khóa hệ điều hành; không dùng trên máy chung và xem giới hạn chiếm quyền profile trong SECURITY.md.

Hủy phiên ghi nhớ, Khóa ngay, hết hạn hoặc tự khóa khi giao diện mở sẽ xóa grant. Đóng popup chỉ xóa khóa trong bộ nhớ; không hủy grant còn hạn. Đếm thời gian không thao tác chỉ áp dụng khi giao diện mở. Gỡ extension xóa dữ liệu local do Chrome quản lý; không cam kết xóa vật lý byte trên ổ đĩa.

Preference hiển thị không được mã hóa để áp dụng trước khi mở khóa, không chứa bản ghi cá nhân. Content script chỉ có thể xin ngôn ngữ thông qua worker sau khi kiểm tra extension sender, top frame, HTTPS origin và quyền website; không nhận cỡ chữ, bản ghi hay khóa. Ảnh store dùng dữ liệu minh họa trong profile tạm; không lấy từ vault của người dùng.

Logo dịch vụ, hình giới thiệu và font Noto Sans được đóng gói cùng extension; không tải logo/font từ website bên ngoài khi sử dụng.

## Trang chính sách trong extension

Có thể mở `privacy.html` từ màn hình mật khẩu hoặc cuối phần Cài đặt. Trang có mục lục và tiếng Việt/Anh, chỉ đọc tùy chọn hiển thị, không cần mở khóa vault hoặc truy cập website bên ngoài. Đây là bản trình bày chính sách đi kèm gói cài đặt, không phải trang đã xuất bản trên Internet.
