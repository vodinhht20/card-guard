import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { I18nProvider } from "react-aria-components";
import { translator, type Language } from "./i18n";
const LocaleContext = createContext({
  language: "vi" as Language,
  t: translator("vi"),
  setLanguage: (_language: Language) => {},
});
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setState] = useState<Language>("vi");
  useEffect(() => {
    let active = true;
    void chrome.storage.local
      .get(["uiLanguage", "uiTextSize"])
      .then(({ uiLanguage, uiTextSize }) => {
        if (active) {
          if (uiLanguage === "vi" || uiLanguage === "en") setState(uiLanguage);
          document.documentElement.dataset.textSize =
            uiTextSize === "large" ? "large" : "comfortable";
        }
      });
    const changed = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      const value = changes.uiLanguage?.newValue;
      if (area === "local" && (value === "vi" || value === "en"))
        setState(value);
      if (area === "local" && changes.uiTextSize)
        document.documentElement.dataset.textSize =
          changes.uiTextSize.newValue === "large" ? "large" : "comfortable";
    };
    chrome.storage.onChanged.addListener(changed);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(changed);
    };
  }, []);
  const setLanguage = (value: Language) => {
    setState(value);
    void chrome.storage.local.set({ uiLanguage: value });
  };
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return (
    <LocaleContext.Provider
      value={{ language, t: translator(language), setLanguage }}
    >
      <I18nProvider locale={language === "vi" ? "vi-VN" : "en-US"}>
        {children}
      </I18nProvider>
    </LocaleContext.Provider>
  );
}
export const useLocale = () => useContext(LocaleContext);
