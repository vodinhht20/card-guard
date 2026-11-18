import {
  ShieldCheck,
  LockKeyhole,
  HardDrive,
  Globe,
  Bell,
  Database,
  KeyRound,
} from "lucide-react";
import { useLocale } from "./Locale";
export function Privacy() {
  const { t, language, setLanguage } = useLocale();
  const sections = [
    {
      id: "data",
      icon: Database,
      title: "Dữ liệu được lưu",
      detail:
        "CardGuard lưu biệt danh, loại thẻ và 4 số cuối; dịch vụ liên kết, lịch dùng thử/gia hạn, chi phí do bạn nhập, ghi chú, cài đặt và lịch sử thao tác. Dữ liệu thẻ cũ có thể còn 3 số đầu, được bỏ khi sửa và lưu lại. Không lưu số thẻ đầy đủ, CVV, PIN, OTP hoặc thông tin xác thực thanh toán.",
    },
    {
      id: "encryption",
      icon: LockKeyhole,
      title: "Mã hóa trên thiết bị",
      detail:
        "Vault được mã hóa bằng AES-256-GCM; khóa được tạo từ mật khẩu qua PBKDF2-SHA256 với 600.000 vòng khi tạo mới. Mật khẩu không được lưu. Không có máy chủ, tài khoản, đồng bộ, quảng cáo hoặc công cụ theo dõi. Logo, font và hình minh họa được đóng gói cùng extension.",
    },
    {
      id: "session",
      icon: KeyRound,
      title: "Phiên ghi nhớ",
      detail:
        "Ghi nhớ tôi là tùy chọn. Khóa mở vault được bọc mã hóa và lưu cùng khóa thiết bị trong IndexedDB của extension, có thời hạn 1–14 ngày. Người dùng chung hồ sơ Chrome có thể mở vault khi phiên còn hiệu lực. Bạn có thể hủy phiên hoặc khóa ngay trong Cài đặt. Không có cơ chế khôi phục mật khẩu.",
    },
    {
      id: "websites",
      icon: Globe,
      title: "Quyền truy cập website",
      detail:
        "Quyền website mặc định tắt. Bạn chọn cấp từng website hoặc tất cả website HTTPS và có thể thu hồi bất cứ lúc nào. Extension nhận diện ngữ cảnh qua đường dẫn, nhãn ngắn và thuộc tính ô nhập thẻ; không đọc giá trị bạn nhập, dữ liệu thanh toán hoặc iframe. Chỉ khi bạn bấm gợi ý hoặc nút lưu thẻ, domain và loại gợi ý mới được chuyển vào bộ nhớ phiên; giao diện bỏ qua gợi ý sau 10 phút. Gợi ý không phải xác nhận đăng ký.",
    },
    {
      id: "reminders",
      icon: Bell,
      title: "Thông báo và dữ liệu phụ",
      detail:
        "Để nhắc lịch khi vault khóa, extension lưu ID ẩn danh, thời điểm đến hạn, trạng thái gửi và hoãn nhắc bên ngoài vault. Metadata này có thể cho biết tần suất và thời điểm, không chứa tên dịch vụ hoặc chữ số thẻ. Ngôn ngữ, cỡ chữ và các website đã cấp quyền cũng được lưu riêng. Chrome và hệ điều hành cần hoạt động để gửi thông báo.",
    },
    {
      id: "backup",
      icon: HardDrive,
      title: "Sao lưu và bản nháp",
      detail:
        "Bản sao lưu JSON được mã hóa bằng mật khẩu file do bạn chọn, giới hạn nhập 5 MB. File đã xuất nằm ngoài extension; bạn tự quản lý nơi lưu và mật khẩu. Bản nháp form thẻ/dịch vụ được mã hóa trong bộ nhớ phiên và mất khi Chrome khởi động lại. Mật khẩu, file nhập và form Cài đặt chưa lưu không được giữ trong bản nháp.",
    },
    {
      id: "control",
      icon: ShieldCheck,
      title: "Quyền kiểm soát của bạn",
      detail:
        "Bạn có thể xem, sửa, xóa hồ sơ; xuất bản sao lưu; thu hồi quyền website; hủy phiên ghi nhớ hoặc gỡ extension để Chrome xóa dữ liệu thuộc extension. Việc xóa không bảo đảm ghi đè vật lý trên ổ đĩa. CardGuard không gửi dữ liệu cho bên thứ ba. Khi bạn chủ động mở link thanh toán, website đó áp dụng chính sách riêng.",
    },
  ];
  return (
    <main className="privacy-page">
      <header className="privacy-top">
        <a href="#top" className="privacy-brand">
          <ShieldCheck size={22} />
          CardGuard
        </a>
        <div className="privacy-language" aria-label={t("Ngôn ngữ")}>
          <button
            aria-pressed={language === "vi"}
            onClick={() => setLanguage("vi")}
          >
            VI
          </button>
          <button
            aria-pressed={language === "en"}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
        </div>
      </header>
      <section className="privacy-hero" id="top">
        <span className="privacy-emblem">
          <ShieldCheck size={34} />
        </span>
        <span className="eyebrow">{t("DỮ LIỆU CỦA BẠN, BẠN KIỂM SOÁT")}</span>
        <h1>{t("Chính sách bảo mật")}</h1>
        <p>{t("Minh bạch về dữ liệu. Riêng tư từ thiết kế.")}</p>
        <div className="privacy-facts">
          <span>
            <HardDrive size={16} />
            {t("Lưu trên thiết bị")}
          </span>
          <span>
            <LockKeyhole size={16} />
            AES-256-GCM
          </span>
          <span>
            <ShieldCheck size={16} />
            {t("Không theo dõi")}
          </span>
        </div>
        <small>
          {t("Cập nhật ngày 18/11/2026")} · v
          {chrome.runtime.getManifest().version}
        </small>
      </section>
      <div className="privacy-layout">
        <nav className="privacy-toc" aria-label={t("Nội dung chính sách")}>
          <strong>{t("Nội dung")}</strong>
          {sections.map((section, index) => (
            <a href={`#${section.id}`} key={section.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {t(section.title)}
            </a>
          ))}
        </nav>
        <div className="privacy-sections">
          {sections.map(({ id, icon: Icon, title, detail }, index) => (
            <section id={id} key={id} className="privacy-section">
              <div className="privacy-section-title">
                <span>
                  <Icon size={20} />
                </span>
                <h2>{t(title)}</h2>
                <small>{String(index + 1).padStart(2, "0")}</small>
              </div>
              <p>{t(detail)}</p>
            </section>
          ))}
        </div>
      </div>
      <footer className="privacy-footer">
        CardGuard · {t("Quản lý thẻ và lịch gia hạn trên thiết bị.")}
      </footer>
    </main>
  );
}
