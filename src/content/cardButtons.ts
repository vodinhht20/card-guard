import { isCardNumberField } from "../core/detection";
import { readLanguage } from "../core/locale";

// These controls open CardGuard; payment data never leaves the page's fields.
export function cardButtons() {
  const controls = new Map<
    HTMLInputElement,
    { host: HTMLElement; button: HTMLButtonElement }
  >();
  let stopped = false;
  let english = false;
  const label = () =>
    english ? "Save card in CardGuard" : "Lưu thẻ vào CardGuard";
  const position = () => {
    for (const [input, { host }] of controls) {
      const rect = input.getBoundingClientRect();
      const visible =
        input.isConnected &&
        !input.disabled &&
        !input.readOnly &&
        input.checkVisibility() &&
        rect.width >= 100 &&
        rect.height >= 24 &&
        rect.bottom > 0 &&
        rect.top < innerHeight;
      host.style.display = visible ? "block" : "none";
      host.style.left = `${Math.max(0, Math.min(innerWidth - 38, rect.right + 42 <= innerWidth ? rect.right + 4 : rect.right - 36))}px`;
      host.style.top = `${Math.max(0, Math.min(innerHeight - 34, rect.top + (rect.height - 30) / 2))}px`;
    }
  };
  void chrome.runtime
    .sendMessage({ type: "UI_LANGUAGE" })
    .then((response) => {
      english = readLanguage(response?.language) === "en";
      if (!stopped)
        for (const { button } of controls.values()) {
          button.title = label();
          button.setAttribute("aria-label", label());
        }
    })
    .catch(() => undefined);
  const eligible = (input: HTMLInputElement) =>
    isCardNumberField({
      autocomplete: input.getAttribute("autocomplete"),
      name: input.getAttribute("name"),
      id: input.id,
      type: input.type,
    });
  const scan = () => {
    if (stopped) return;
    for (const [input, { host }] of controls)
      if (!input.isConnected || !eligible(input)) {
        host.remove();
        controls.delete(input);
      }
    for (const input of Array.from(document.querySelectorAll("input")).slice(
      0,
      300,
    )) {
      if (controls.size >= 12) break;
      if (
        controls.has(input) ||
        !eligible(input) ||
        input.disabled ||
        input.readOnly ||
        !input.checkVisibility()
      )
        continue;
      const host = document.createElement("div");
      host.setAttribute("data-cardguard-control", "");
      const root = host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent =
        ":host{all:initial;position:fixed;z-index:2147483646}button{display:grid;place-items:center;width:32px;height:30px;padding:5px;border:1px solid #b5c9e6;border-radius:8px;background:#f0f6ff;color:#245cbe;box-shadow:0 2px 8px #16365b20;cursor:pointer}button:hover{background:#dae9ff}button:focus-visible{outline:3px solid #245cbe;outline-offset:2px}svg{width:20px;height:20px;pointer-events:none}";
      const button = document.createElement("button");
      button.type = "button";
      button.title = label();
      button.setAttribute("aria-label", label());
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.8");
      svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute(
        "d",
        "M20 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8M2 9h18M16 17h6m-3-3v6M6 15h3",
      );
      svg.append(path);
      button.append(svg);
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        button.disabled = true;
        void chrome.runtime
          .sendMessage({
            type: "DETECTION",
            domain: location.hostname,
            confidence: "high",
            kind: "card",
            trialDays: null,
          })
          .then((response) => {
            if (!response?.ok) throw new Error();
            button.title = english
              ? "Continue in CardGuard"
              : "Tiếp tục trong CardGuard";
          })
          .catch(() => {
            button.title = english
              ? "Unable to open. Reload the page and try again."
              : "Chưa mở được. Tải lại trang và thử lại.";
          })
          .finally(() => {
            button.disabled = false;
          });
      };
      root.append(style, button);
      controls.set(input, { host, button });
      document.documentElement.append(host);
    }
    position();
  };
  window.addEventListener("scroll", position, true);
  window.addEventListener("resize", position);
  document.addEventListener("focusin", scan);
  return {
    scan,
    stop() {
      stopped = true;
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
      document.removeEventListener("focusin", scan);
      for (const { host } of controls.values()) host.remove();
      controls.clear();
    },
  };
}
