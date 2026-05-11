import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { LANGUAGES, TRANSLATIONS, type LanguageCode } from "./translations";

const STORAGE_KEY = "farmsync.language";

interface Ctx {
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
  t: (text: string) => string;
}

const I18nContext = createContext<Ctx | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    return stored && stored in TRANSLATIONS ? stored : "en";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {}
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    const dict = TRANSLATIONS[lang] || {};
    return {
      lang,
      setLang: setLangState,
      t: (text: string) => dict[text] ?? text,
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): Ctx => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback so any component used outside provider still works (returns English)
    return { lang: "en", setLang: () => {}, t: (s) => s };
  }
  return ctx;
};

export const useT = () => useI18n().t;

export { LANGUAGES };
export type { LanguageCode };
