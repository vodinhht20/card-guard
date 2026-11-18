import type { Language } from "../core/locale";
export { readLanguage, type Language } from "../core/locale";
export const en: Readonly<Record<string, string>> = {
  "Chính sách bảo mật": "Privacy policy",
  "Mở trong tab mới": "Opens in a new tab",
  "DỮ LIỆU CỦA BẠN, BẠN KIỂM SOÁT": "YOUR DATA, YOUR CONTROL",
  "Minh bạch về dữ liệu. Riêng tư từ thiết kế.":
    "Clear about your data. Private by design.",
  "Lưu trên thiết bị": "Stored on your device",
  "Không theo dõi": "No tracking",
  "Cập nhật ngày 18/11/2026": "Updated November 18, 2026",
  "Nội dung chính sách": "Policy contents",
  "Nội dung": "Contents",
  "Dữ liệu được lưu": "Data we store",
  "Mã hóa trên thiết bị": "On-device encryption",
  "Phiên ghi nhớ": "Remembered sessions",
  "Quyền truy cập website": "Website access",
  "Thông báo và dữ liệu phụ": "Notifications and metadata",
  "Sao lưu và bản nháp": "Backups and drafts",
  "Quyền kiểm soát của bạn": "Your controls",
  "Quản lý thẻ và lịch gia hạn trên thiết bị.":
    "Manage cards and renewals on your device.",
  "CardGuard lưu biệt danh, loại thẻ và 4 số cuối; dịch vụ liên kết, lịch dùng thử/gia hạn, chi phí do bạn nhập, ghi chú, cài đặt và lịch sử thao tác. Dữ liệu thẻ cũ có thể còn 3 số đầu, được bỏ khi sửa và lưu lại. Không lưu số thẻ đầy đủ, CVV, PIN, OTP hoặc thông tin xác thực thanh toán.":
    "CardGuard stores card nicknames, networks and last 4 digits; linked services, trial and renewal dates, costs you enter, notes, settings and activity history. Older card records may retain the first 3 digits, which are removed when edited and saved. Full card numbers, CVV, PIN, OTP and payment credentials are never stored.",
  "Vault được mã hóa bằng AES-256-GCM; khóa được tạo từ mật khẩu qua PBKDF2-SHA256 với 600.000 vòng khi tạo mới. Mật khẩu không được lưu. Không có máy chủ, tài khoản, đồng bộ, quảng cáo hoặc công cụ theo dõi. Logo, font và hình minh họa được đóng gói cùng extension.":
    "Your vault is encrypted with AES-256-GCM. New vaults derive their key from your password using PBKDF2-SHA256 with 600,000 iterations. Passwords are not stored. There is no server, account, sync, advertising or tracking. Logos, fonts and illustrations are bundled with the extension.",
  "Ghi nhớ tôi là tùy chọn. Khóa mở vault được bọc mã hóa và lưu cùng khóa thiết bị trong IndexedDB của extension, có thời hạn 1–14 ngày. Người dùng chung hồ sơ Chrome có thể mở vault khi phiên còn hiệu lực. Bạn có thể hủy phiên hoặc khóa ngay trong Cài đặt. Không có cơ chế khôi phục mật khẩu.":
    "Remember me is optional. The vault key is encrypted and stored with a device key in the extension's IndexedDB for 1–14 days. Anyone using the same Chrome profile may open your vault while this session is valid. Revoke the session or lock immediately in Settings. Password recovery is not available.",
  "Quyền website mặc định tắt. Bạn chọn cấp từng website hoặc tất cả website HTTPS và có thể thu hồi bất cứ lúc nào. Extension nhận diện ngữ cảnh qua đường dẫn, nhãn ngắn và thuộc tính ô nhập thẻ; không đọc giá trị bạn nhập, dữ liệu thanh toán hoặc iframe. Chỉ khi bạn bấm gợi ý hoặc nút lưu thẻ, domain và loại gợi ý mới được chuyển vào bộ nhớ phiên; giao diện bỏ qua gợi ý sau 10 phút. Gợi ý không phải xác nhận đăng ký.":
    "Website access is off by default. Allow individual websites or all HTTPS websites, and revoke access at any time. The extension detects context from paths, short labels and card-field attributes without reading typed values, payment data or iframes. Only clicking a suggestion or save-card button sends the domain and suggestion type to session storage. The interface ignores suggestions after 10 minutes. Suggestions do not confirm a subscription.",
  "Để nhắc lịch khi vault khóa, extension lưu ID ẩn danh, thời điểm đến hạn, trạng thái gửi và hoãn nhắc bên ngoài vault. Metadata này có thể cho biết tần suất và thời điểm, không chứa tên dịch vụ hoặc chữ số thẻ. Ngôn ngữ, cỡ chữ và các website đã cấp quyền cũng được lưu riêng. Chrome và hệ điều hành cần hoạt động để gửi thông báo.":
    "To send reminders while your vault is locked, the extension stores anonymous IDs, due times, delivery and snooze states outside the vault. This metadata can reveal timing and frequency, but contains no service names or card digits. Language, text size and approved websites are also stored separately. Chrome and operating-system notification support are required.",
  "Bản sao lưu JSON được mã hóa bằng mật khẩu file do bạn chọn, giới hạn nhập 5 MB. File đã xuất nằm ngoài extension; bạn tự quản lý nơi lưu và mật khẩu. Bản nháp form thẻ/dịch vụ được mã hóa trong bộ nhớ phiên và mất khi Chrome khởi động lại. Mật khẩu, file nhập và form Cài đặt chưa lưu không được giữ trong bản nháp.":
    "JSON backups are encrypted with a file password you choose. Imports are limited to 5 MB. Exported files are outside the extension; you manage their location and password. Card and service drafts are encrypted in session storage and disappear when Chrome restarts. Passwords, import files and unsaved Settings forms are not kept in drafts.",
  "Bạn có thể xem, sửa, xóa hồ sơ; xuất bản sao lưu; thu hồi quyền website; hủy phiên ghi nhớ hoặc gỡ extension để Chrome xóa dữ liệu thuộc extension. Việc xóa không bảo đảm ghi đè vật lý trên ổ đĩa. CardGuard không gửi dữ liệu cho bên thứ ba. Khi bạn chủ động mở link thanh toán, website đó áp dụng chính sách riêng.":
    "You can view, edit or delete records, export backups, revoke website access, end remembered sessions or uninstall the extension so Chrome removes its data. Deletion does not guarantee physical overwriting on disk. CardGuard does not send your data to third parties. Billing websites you choose to open apply their own policies.",

  "Đã qua": "Past",
  "mốc đến hạn": "due events",
  "Mốc đến hạn": "Due events",
  "CHỦ ĐỘNG MỖI NGÀY": "PLAN AHEAD, EVERY DAY",
  "Nắm rõ lịch hẹn. Không bỏ lỡ gia hạn.":
    "See what's next. Stay ahead of renewals.",
  "Tổng quan tháng": "Month overview",
  "Chú thích lịch": "Calendar legend",
  "Lọc lịch": "Filter calendar",
  "Tìm trong lịch": "Search calendar",
  "Tìm tên dịch vụ, website…": "Search services or websites…",
  "Xóa tìm kiếm": "Clear search",
  "Không có lịch phù hợp với bộ lọc.": "No events match these filters.",
  "Sẵn sàng cho những ngày tới": "Coming up on your calendar",

  "Thẻ gọn một nơi. Không quên lịch gia hạn.":
    "Your cards together. Every renewal remembered.",
  "Chỉ hoạt động trên website Anh cấp quyền. Nhận diện ô thẻ qua thuộc tính, không đọc dữ liệu Anh nhập.":
    "Only runs on websites you allow. Detects card fields from attributes without reading what you type.",
  "Cho phép tất cả website HTTPS": "Allow all HTTPS websites",
  "Đã cho phép tất cả website HTTPS": "All HTTPS websites allowed",
  "Tất cả website HTTPS": "All HTTPS websites",
  "Áp dụng cả website mới truy cập. Có thể thu hồi bên dưới. Tải lại trang đang mở để hiện nút lưu thẻ.":
    "Includes future websites. Revoke access below. Reload open pages to show the save card button.",

  Chính: "Home",
  Thẻ: "Cards",
  Gói: "Plans",
  Lịch: "Dates",
  Nhắc: "Alerts",

  " · Chờ hủy": " · Cancellation pending",
  " · Đã gỡ thẻ": " · Card removed",
  ". Gợi ý chưa xác nhận đăng ký.":
    ". This suggestion does not confirm a subscription.",
  "· Chưa xác nhận đăng ký": "· Subscription not confirmed",
  "＋ Tùy chọn thêm": "＋ More options",
  "− Thu gọn": "− Show less",
  "30 ngày tới": "Next 30 days",
  "4 số cuối": "Last 4 digits",
  "Ẩn mật khẩu": "Hide password",
  "Bạn có đăng ký cần kiểm tra trong CardGuard.":
    "You have subscriptions to review in CardGuard.",
  "Bảo mật": "Security",
  "Bảo mật & dữ liệu": "Security & data",
  "Bắt đầu với dịch vụ đầu tiên": "Add your first service",
  "Biệt danh thẻ": "Card nickname",
  "Biểu đồ tổng quan": "Overview charts",
  blue: "Blue",
  "Bỏ qua": "Dismiss",
  "Bỏ qua nhắc này": "Dismiss reminder",
  "Cả tháng": "All month",
  "Các mốc mới sẽ xuất hiện tại đây.": "Upcoming dates will appear here.",
  "Cách nhập": "Import mode",
  "Cài đặt": "Settings",
  "Cần bạn chú ý": "Needs your attention",
  "CẦN KIỂM TRA": "NEEDS ATTENTION",
  "Cần ngày gia hạn cho lịch định kỳ.":
    "Recurring plans require a renewal date.",
  "Cấp quyền website": "Allow website",
  "CardGuard · Ghi nhớ dịch vụ?": "CardGuard · Remember this service?",
  "Chào mừng trở lại": "Welcome back",
  "Chế độ riêng tư": "Privacy mode",
  "Chỉ chấp nhận URL HTTPS không có thông tin đăng nhập.":
    "Use an HTTPS URL without credentials.",
  "Chỉ hoạt động trên website Anh cấp quyền. Không đọc form thanh toán hoặc giá trị input.":
    "Only runs on websites you allow. Never reads payment forms or input values.",
  "Chỉ là gợi ý từ website. Vui lòng kiểm tra lại trước khi lưu.":
    "Website suggestion only. Review it before saving.",
  "Chi phí dự kiến": "Expected cost",
  "Chi tiết": "Details",
  "Chờ hủy": "Pending cancellation",
  "Chờ xác nhận hủy": "Cancellation pending",
  "Chọn các mốc theo số ngày trước hạn.":
    "Choose how many days before the due date.",
  "Chọn dịch vụ": "Choose a service",
  "Chọn dịch vụ để nhận nhắc trước ngày gia hạn.":
    "Add a service to receive renewal reminders.",
  "Chọn dịch vụ phổ biến": "Choose a popular service",
  "Chọn Ghi nhớ tôi khi mở khóa.": "Select Remember me when unlocking.",
  "Chọn từ danh sách": "Choose from the list",
  "Chu kỳ": "Billing cycle",
  "Chưa bật ghi nhớ": "Remember me is off",
  "Chưa cấp quyền cho website nào.": "No websites allowed yet.",
  "Chưa chọn thẻ": "No linked card",
  "Chưa có dịch vụ": "No services yet",
  "Chưa có dữ liệu. Bắt đầu bằng một thẻ hoặc dịch vụ.":
    "Start with a card or subscription.",
  "Chưa có lịch đến hạn": "Nothing due soon",
  "Chưa có thẻ": "No cards yet",
  "Chưa đặt ngày nhắc": "No due date set",
  "Chưa được cấp quyền website.": "Website permission was not granted.",
  "Chưa giữ được bản nháp. Thử lại.": "Draft could not be saved. Retry.",
  "Chưa xác định": "Unknown",
  "Chưa xác định cửa sổ Chrome. Hãy thử lại.":
    "Chrome window unavailable. Retry.",
  "Cỡ chữ": "Text size",
  "Đã cho phép": "Allowed",
  "Đã ghi nhớ": "Remembered",
  "Đã giữ bản nháp": "Draft saved",
  "Đã gỡ phương thức thanh toán": "Payment method removed",
  "Đã gửi thông báo thử tới Chrome.": "Test notification sent to Chrome.",
  "Đã hủy": "Cancelled",
  "Đã kết thúc": "Ended",
  "Đã lưu an toàn.": "Saved securely.",
  "Đã lưu trữ": "Archived",
  "Đã lưu vault; chưa cập nhật lịch nhắc. Mở lại để thử lại.":
    "Vault saved; reminders could not be refreshed. Reopen to retry.",
  "Đã phát hiện dấu hiệu dịch vụ. Kiểm tra trước khi lưu.":
    "A possible subscription was detected. Review before saving.",
  "Đã tắt ghi nhớ trên hồ sơ Chrome này.":
    "Remember me is off on this Chrome profile.",
  "Đã yêu cầu hủy": "Cancellation requested",
  "Đang bị chặn": "Blocked",
  "Đang dùng thử": "Free trials",
  "Đang hoạt động": "Active",
  "Đang lưu nháp…": "Saving draft…",
  "Đang mở…": "Unlocking…",
  "Đang xử lý…": "Working…",
  "Đánh dấu đã gỡ thẻ": "Mark card removed",
  "Dễ đọc": "Standard",
  "dịch vụ": "services",
  "Dịch vụ": "Services",
  "dịch vụ ·": "services ·",
  "Dịch vụ của bạn": "Your services",
  "dịch vụ đến hạn": "services due",
  "Dịch vụ khác": "Other service",
  "Dịch vụ mới": "New service",
  "Điều hướng": "Navigation",
  "Định dạng mã hóa không hợp lệ.": "Invalid encrypted file format.",
  "Đổi cài đặt": "Settings changed",
  "Đổi dịch vụ": "Change service",
  Đóng: "Close",
  "Đóng thông báo": "Dismiss message",
  "Dữ liệu": "Data",
  "Dữ liệu chỉ ở trên thiết bị của bạn.": "Your data stays on this device.",
  "Dùng 6 ký tự, gồm chữ hoặc số": "Use 6 letters or numbers",
  "Đúng ngày": "On due date",
  "Dùng thử": "Trial",
  English: "English",
  "File JSON được bảo vệ bằng mật khẩu riêng, tối đa 5 MB.":
    "Password-protected JSON file, up to 5 MB.",
  "File quá lớn.": "File is too large.",
  "File vượt quá 5 MB.": "File exceeds 5 MB.",
  "Ghi chú": "Notes",
  "Ghi nhớ cho phép mở vault không cần mật khẩu trên hồ sơ Chrome này, kể cả sau khi khởi động lại. Người sử dụng chung hồ sơ cũng có thể mở vault trong thời hạn. Mật khẩu không được lưu; khóa mở phiên được bảo vệ bằng khóa thiết bị local. Có thể hủy phiên bất cứ lúc nào.":
    "Remember me unlocks the vault on this Chrome profile, including after restart. Anyone sharing this profile can open it until expiry. Your password is never saved. A local device key protects the unlock grant; you can revoke it anytime.",
  "Ghi nhớ tôi": "Remember me",
  "Gia hạn": "Renewal",
  "Giao diện": "Appearance",
  "Gỡ thẻ không đồng nghĩa đã hủy subscription. CardGuard không thực hiện hủy gói thay bạn.":
    "Removing a card does not cancel a subscription. CardGuard cannot cancel it for you.",
  "Gợi ý trên website": "Website suggestions",
  "Gợi ý từ website": "Website suggestions",
  "Gộp giữ bản ghi hiện có nếu trùng ID. Thay thế xóa dữ liệu hiện tại; hãy giữ một bản sao lưu trước.":
    "Merge keeps existing records with matching IDs. Replace deletes current data; keep a backup first.",
  "Gộp, giữ bản hiện có khi trùng ID": "Merge, keep existing IDs",
  "Gửi thông báo thử": "Send test notification",
  "Hàng năm": "Yearly",
  "Hàng tháng": "Monthly",
  "Hết dùng thử": "Trial ends",
  "Hết hạn": "Expired",
  "Hiện mật khẩu": "Show password",
  "Hiển thị": "Display",
  "hoạt động": "activities",
  "Hoạt động": "Active",
  "Hôm nay": "Today",
  Hủy: "Cancel",
  "Hủy phiên ghi nhớ": "Forget this session",
  JCB: "JCB",
  "Khóa ngay": "Lock now",
  "Không bắt buộc; để trống để dùng domain.":
    "Optional; leave blank to use the domain.",
  "Không có dịch vụ đến hạn trong 30 ngày.":
    "No services due in the next 30 days.",
  "Không có kết quả phù hợp.": "No matching results.",
  "Không lặp": "One time",
  "Không nhập dữ liệu thanh toán hoặc thông tin bí mật.":
    "Do not enter payment details or secrets.",
  "Không nhập số thẻ đầy đủ hoặc dữ liệu bí mật.":
    "Do not enter full card numbers or secrets.",
  "Không thể cập nhật lịch nhắc.": "Unable to update reminders.",
  "Không thể hủy phiên ghi nhớ.": "Unable to revoke this session.",
  "Không thể hủy phiên ghi nhớ. Hãy thử lại.":
    "Unable to revoke this session. Retry.",
  "Không thể lưu. Dữ liệu cũ được giữ nguyên.":
    "Unable to save. Your previous data was preserved.",
  "Không thể mở giao diện. Đóng rồi mở lại extension để thử lại.":
    "Unable to open. Close and reopen the extension to retry.",
  "Không thể mở khóa. Mật khẩu sai hoặc dữ liệu không hợp lệ.":
    "Unable to unlock. Incorrect password or invalid data.",
  "Không thể mở khóa. Mật khẩu sai, phiên không khả dụng hoặc dữ liệu không hợp lệ.":
    "Unable to unlock. Incorrect password, unavailable session or invalid data.",
  "Không thể mở Side Panel.": "Unable to open the side panel.",
  "Không thể tự mở phiên. Hãy nhập mật khẩu để tiếp tục.":
    "Automatic unlock failed. Enter your password to continue.",
  "Không tìm thấy dịch vụ.": "Service not found.",
  "Không tìm thấy dịch vụ. Bạn có thể tạo dịch vụ riêng.":
    "No matching service. Create a custom service below.",
  "Không tự khóa": "Never",
  "Kiểm tra 4 số cuối và thử lại. Không nhập số thẻ đầy đủ.":
    "Check the last 4 digits and retry. Do not enter a full card number.",
  "Kiểm tra website, ngày dùng thử/gia hạn và các thông tin tùy chọn.":
    "Check the website, due dates and optional details.",
  "lần gia hạn": "renewals",
  "Lịch 4 tuần tới": "Next 4 weeks",
  "Lịch của bạn đang ổn": "You are all caught up",
  "Lịch dịch vụ": "Service calendar",
  "Lịch nhắc": "Calendar",
  "Lịch nhắc trống": "No scheduled reminders",
  "Lịch sử gần đây": "Recent history",
  "Lịch tháng": "Monthly calendar",
  "Loại thẻ": "Network",
  "Lớn hơn": "Larger",
  Lưu: "Save",
  "Lưu cài đặt": "Save settings",
  "Lưu dịch vụ": "Service saved",
  "Lưu liên kết": "Save link",
  "Lưu thẻ": "Card saved",
  "Lưu trữ": "Archive",
  MASTERCARD: "MASTERCARD",
  "Mật khẩu": "Password",
  "Mật khẩu chưa khớp.": "Passwords do not match.",
  "Mật khẩu file sao lưu": "Backup password",
  "Mật khẩu phải có 6–256 ký tự.": "Password must contain 6–256 characters.",
  "Màu thẻ": "Card color",
  mint: "Teal",
  "Mở khóa": "Unlock",
  "Mở lịch": "Open calendar",
  "Mở Side Panel": "Open side panel",
  "Mở trang billing": "Open billing page",
  "Mọi thứ trong tầm kiểm soát.": "Everything under control.",
  Năm: "Year",
  "Nền tảng": "Platforms",
  ngày: "days",
  Ngày: "Date",
  "Ngày gia hạn": "Renewal date",
  "Ngày kết thúc dùng thử": "Trial end date",
  "Ngày không hợp lệ (2000–2100).": "Invalid date (2000–2100).",
  "Ngày này không có dịch vụ đến hạn.": "No services due on this day.",
  "Ngôn ngữ": "Language",
  "Nguồn: tín hiệu website": "Source: website context",
  "Nhắc gần nhất": "Recent reminders",
  "Nhắc lại sau 1 giờ": "Snooze for 1 hour",
  "Nhắc lịch": "Reminders",
  "Nhắc lúc 09:00 theo múi giờ thiết bị. Chrome cần chạy và được hệ điều hành cho phép thông báo. Lịch gia hạn tính sẵn 730 ngày; mở vault để làm mới.":
    "Reminders use 09:00 device time. Chrome must be running and OS notifications allowed. Renewals are planned for 730 days; open the vault to refresh.",
  "Nhập bản sao lưu": "Import backup",
  "Nhập domain hoặc dán URL HTTPS. Tên dịch vụ được điền từ domain.":
    "Enter a domain or HTTPS URL. The domain is used as the default name.",
  "Nhập domain, ví dụ example.com.": "Enter a domain, e.g. example.com.",
  "Nhập mật khẩu 6 ký tự": "Enter your 6-character password",
  "Nhập origin HTTPS hợp lệ, ví dụ https://example.com":
    "Enter a valid HTTPS origin, e.g. https://example.com",
  "Nhóm cài đặt": "Settings categories",
  OTHER: "Other",
  "Phiên đã khóa.": "Session locked.",
  "Phiên mở khóa": "Unlock session",
  "Quá hạn": "Overdue",
  "Quay lại": "Back",
  "Quyền thông báo:": "Notifications:",
  "Riêng tư trên thiết bị": "Private on this device",
  Sáng: "Light",
  "Sao lưu mã hóa": "Encrypted backups",
  "Sắp đến hạn": "Due soon",
  "Sắp gia hạn": "Due soon",
  Sửa: "Edit",
  "Tạo mật khẩu": "Create password",
  "Tạo vault": "Create vault",
  "Tạo vault riêng của bạn": "Create your private vault",
  "Tất cả": "All",
  "Tên dịch vụ": "Service name",
  "Tên, website hoặc nhóm dịch vụ…": "Name, website or category…",
  Tháng: "Month",
  "Tháng này": "This month",
  "Tháng này không có dịch vụ đến hạn.": "No services due this month.",
  "Tháng sau": "Next month",
  "Tháng trước": "Previous month",
  "Thao tác không thành công. Kiểm tra dữ liệu và thử lại.":
    "Unable to complete. Check your input and retry.",
  "Thao tác không thành công. Kiểm tra dữ liệu, mật khẩu hoặc quyền và thử lại.":
    "Unable to complete. Check your data, password or permissions and retry.",
  "Thao tác này không thể hoàn tác.": "This action cannot be undone.",
  "Thay thế toàn bộ vault": "Replace entire vault",
  thẻ: "cards",
  "thẻ ·": "cards ·",
  "Thẻ còn liên kết dịch vụ. Hãy gỡ liên kết hoặc lưu trữ thẻ.":
    "This card still has linked services. Unlink them or archive the card.",
  "Thẻ của tôi": "My cards",
  "Thẻ liên kết": "Linked card",
  "Thêm dịch vụ": "Add service",
  "Thêm thẻ": "Add card",
  "Theo dõi hôm nay, an tâm ngày mai.":
    "Stay on top today. Worry less tomorrow.",
  "Theo hệ thống": "System",
  "Thời hạn ghi nhớ": "Remember for",
  "Thông báo thử: nhắc lịch đã sẵn sàng.":
    "Test notification: reminders are ready.",
  "Thu hồi": "Revoke",
  "Tiếng Việt": "Tiếng Việt",
  Tím: "Violet",
  "Tìm dịch vụ": "Search services",
  "Tìm tên hoặc domain…": "Search name or domain…",
  Tối: "Dark",
  Tổng: "Total",
  "Tổng quan": "Overview",
  "Tổng số thẻ": "Cards",
  "Trạng thái": "Status",
  "Trong 30 ngày": "Within 30 days",
  "Trong 7 ngày": "Within 7 days",
  "Tự khóa": "Auto-lock",
  "Tự khóa khi giao diện mở. Hạn ghi nhớ tính từ lần đăng nhập.":
    "Auto-lock applies while the interface is open. Remember duration starts at sign-in.",
  "Tự khóa sau (phút)": "Auto-lock after (minutes)",
  "Tuần này": "This week",
  "Vault chưa được lưu.": "Vault has not been saved.",
  "Vault đã khóa.": "Vault locked.",
  "Vault đã mở; chưa cập nhật được lịch nhắc. Mở lại để thử lại.":
    "Vault unlocked; reminders could not be refreshed. Reopen to retry.",
  "Vault đã thay đổi ở cửa sổ khác. Hãy mở khóa lại.":
    "Vault changed in another window. Unlock it again.",
  "Vault đã tồn tại. Hãy mở khóa.":
    "A vault already exists. Unlock it to continue.",
  "Vault vượt giới hạn 5 MB. Hãy giảm dữ liệu trước khi lưu.":
    "Vault exceeds 5 MB. Reduce its data before saving.",
  "Về ghi nhớ": "About Remember me",
  violet: "Violet",
  VISA: "VISA",
  Website: "Website",
  "Website HTTPS": "HTTPS website",
  "Xác nhận đã hủy": "Confirm cancellation",
  "Xác nhận lưu": "Confirm save",
  "Xác nhận mật khẩu": "Confirm password",
  "Xác nhận nhập": "Confirm import",
  "Xác nhận xóa": "Confirm deletion",
  "Xanh dương": "Blue",
  "Xanh ngọc": "Teal",
  "Xem dịch vụ": "View services",
  "Xem tất cả": "View all",
  "Xem trước": "Preview",
  "Xem trước bản nhập": "Preview import",
  Xóa: "Delete",
  "Xóa dịch vụ": "Service deleted",
  "Xóa ngày": "Clear date",
  "Xóa thẻ": "Card deleted",
  "Xuất bản sao lưu": "Export backup",
};
export const translator =
  (language: Language) =>
  (value: string): string => {
    if (language === "vi") return value;
    if (en[value] !== undefined) return en[value];
    let match = value.match(/^(\d+) (ngày|phút|dịch vụ|thẻ|hoạt động)$/);
    if (match) {
      const unit: Record<string, string> = {
        ngày: "day",
        phút: "minute",
        "dịch vụ": "service",
        thẻ: "card",
        "hoạt động": "activity",
      };
      const word = unit[match[2]];
      return `${match[1]} ${Number(match[1]) === 1 ? word : word === "activity" ? "activities" : word + "s"}`;
    }
    match = value.match(/^Tháng (\d{1,2})$/);
    if (match && +match[1] >= 1 && +match[1] <= 12)
      return new Intl.DateTimeFormat("en-US", { month: "long" }).format(
        new Date(2026, +match[1] - 1, 1),
      );
    match = value.match(/^Tuần (\d+)$/);
    if (match) return `Week ${match[1]}`;
    match = value.match(/^Ngày (\d{2})\/(\d{2})$/);
    if (match) return `Date ${match[2]}/${match[1]}`;
    match = value.match(/^Trong tháng · (\d+)$/);
    if (match) return `This month · ${match[1]}`;
    match = value.match(/^(\d+) dịch vụ quá hạn$/);
    if (match)
      return `${match[1]} overdue ${+match[1] === 1 ? "service" : "services"}`;
    if (value.startsWith("Hết hạn ")) return `Expires ${value.slice(8)}`;
    match = value.match(/^Gợi ý (\d+) ngày, hãy kiểm tra trước khi lưu\.$/);
    if (match) return `Suggested ${match[1]} days. Review before saving.`;
    return value;
  };
export const statuses: Record<string, string> = {
  trial: "Dùng thử",
  active: "Đang hoạt động",
  expiring: "Sắp đến hạn",
  cancellation_pending: "Chờ xác nhận hủy",
  cancelled: "Đã hủy",
  expired: "Hết hạn",
  archived: "Đã lưu trữ",
  overdue: "Quá hạn",
};
