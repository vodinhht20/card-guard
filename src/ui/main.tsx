import { LocaleProvider, useLocale } from "./Locale";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
function ErrorPage() {
  const { t } = useLocale();
  return (
    <main className="gate">
      <h1>CardGuard</h1>
      <p>
        {t("Không thể mở giao diện. Đóng rồi mở lại extension để thử lại.")}
      </p>
    </main>
  );
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <ErrorPage /> : this.props.children;
  }
}
createRoot(document.getElementById("root")!).render(
  <LocaleProvider>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </LocaleProvider>,
);
