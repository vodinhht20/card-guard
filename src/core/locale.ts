export type Language = "vi" | "en";
export function readLanguage(value: unknown): Language {
  return value === "en" ? "en" : "vi";
}
export function notificationCopy(language: Language) {
  return language === "en"
    ? {
        message: "You have subscriptions to review in CardGuard.",
        snooze: "Snooze for 1 hour",
        dismiss: "Dismiss",
      }
    : {
        message: "Bạn có đăng ký cần kiểm tra trong CardGuard.",
        snooze: "Nhắc lại sau 1 giờ",
        dismiss: "Bỏ qua",
      };
}
export function detectionCopy(language: Language) {
  return language === "en"
    ? {
        title: "CardGuard · Remember this service?",
        detail:
          "Possible trial or payment context. This does not confirm a subscription.",
        save: "Save link",
        dismiss: "Dismiss",
      }
    : {
        title: "CardGuard · Ghi nhớ dịch vụ?",
        detail:
          "Có tín hiệu dùng thử / thanh toán. Đây chưa phải xác nhận đăng ký.",
        save: "Lưu liên kết",
        dismiss: "Bỏ qua",
      };
}
