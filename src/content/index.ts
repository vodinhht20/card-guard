import { cardButtons } from "./cardButtons";
import { detectionCopy, readLanguage } from "../core/locale";
import { detect } from "../core/detection";
// Content bundle must remain self-contained (no module imports after bundling).
(() => {
  if (window.top !== window || location.protocol !== "https:") return;
  const cards = cardButtons();
  let stopped = false;
  let shown = false;
  let observer: MutationObserver | undefined;
  const host = document.createElement("div");
  const shutdown = () => {
    stopped = true;
    observer?.disconnect();
    cards.stop();
    host.remove();
  };
  chrome.runtime.onMessage.addListener((message: unknown, sender) => {
    if (
      sender.id === chrome.runtime.id &&
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      message.type === "STOP_DETECTION"
    )
      shutdown();
  });
  async function scan() {
    if (stopped) return;
    cards.scan();
    if (shown) return;
    // Only short visible headings/buttons, excluding forms/editable regions. Never inspect input values.
    const labels: string[] = [];
    for (const el of Array.from(
      document.querySelectorAll("h1,h2,button"),
    ).slice(0, 80)) {
      if (
        el.closest("form,[contenteditable],#cardguard-hint") ||
        !(el instanceof HTMLElement) ||
        !el.checkVisibility()
      )
        continue;
      const label = el.innerText.trim();
      if (label.length <= 160 && !/\d{3}/.test(label)) labels.push(label);
      if (labels.length >= 30) break;
    }
    const result = detect({ pathname: location.pathname, labels });
    if (!result || result.confidence === "low") return;
    shown = true;
    let language: unknown;
    try {
      const response = await chrome.runtime.sendMessage({
        type: "UI_LANGUAGE",
      });
      if (response?.ok) language = response.language;
    } catch {
      /* Optional UI preference only. */
    }
    if (stopped) return;
    const copy = detectionCopy(readLanguage(language));
    const signal = { type: "DETECTION", domain: location.hostname, ...result };
    host.id = "cardguard-hint";
    const root = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent =
      ":host{all:initial;position:fixed;z-index:2147483647;right:16px;bottom:16px}section{font:16px/1.5 system-ui;background:#164991;color:#fff;padding:16px;border-radius:16px;box-shadow:0 8px 40px #0003;max-width:285px}button{font:inherit;border:0;border-radius:8px;padding:7px 12px;cursor:pointer;background:#e8f0ff;color:#164991;margin:8px 8px 0 0}p{margin:4px 0}";
    const box = document.createElement("section");
    const title = document.createElement("strong");
    title.textContent = copy.title;
    const p = document.createElement("p");
    p.textContent = copy.detail;
    const save = document.createElement("button");
    save.textContent = copy.save;
    save.onclick = () => {
      void chrome.runtime
        .sendMessage(signal)
        .then(() => host.remove())
        .catch(() => shutdown());
    };
    const dismiss = document.createElement("button");
    dismiss.textContent = copy.dismiss;
    dismiss.onclick = () => host.remove();
    box.append(title, p, save, dismiss);
    root.append(style, box);
    document.documentElement.append(host);
  }
  // Debounced, bounded scans support payment fields mounted later by SPAs.
  let queued = false;
  observer = new MutationObserver(() => {
    if (queued || stopped) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      void scan();
    }, 1000);
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "autocomplete",
      "name",
      "id",
      "type",
      "disabled",
      "readonly",
    ],
  });

  void scan();
})();
