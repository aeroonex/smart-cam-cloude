import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { dict, type Lang, type TKey } from "@/lib/i18n";

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
};

const STORAGE_KEY = "hammabop_lang";

const I18nContext = createContext<I18nContextValue | null>(null);

function loadLang(): Lang {
  if (typeof window === "undefined") return "uz";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "ru" || v === "uz" ? v : "uz";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: TKey) => dict[key]?.[lang] ?? key, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
