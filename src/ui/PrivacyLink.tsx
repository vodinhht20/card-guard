import { ShieldCheck, ArrowUpRight } from "lucide-react";
import { useLocale } from "./Locale";
export function PrivacyLink() {
  const { t } = useLocale();
  return (
    <a
      className="privacy-link"
      href={chrome.runtime.getURL("privacy.html")}
      target="_blank"
      rel="noopener noreferrer"
    >
      <ShieldCheck size={15} aria-hidden="true" />
      {t("Chính sách bảo mật")}
      <ArrowUpRight size={13} aria-hidden="true" />
      <span className="sr-only">{t("Mở trong tab mới")}</span>
    </a>
  );
}
