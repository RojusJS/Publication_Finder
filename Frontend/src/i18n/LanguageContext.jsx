import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setApiLanguage } from "../api/client";
import { createTranslator, DICTIONARIES, LOCALES } from "./translator";

const STORAGE_KEY = "pf_language";

const LanguageContext = createContext(null);

function initialLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && DICTIONARIES[stored]) return stored;
  } catch {
    /* storage unavailable (private mode, blocked cookies) */
  }
  return (navigator.language || "").toLowerCase().startsWith("lt") ? "lt" : "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(initialLanguage);

  // Keep the API language in sync before any request of this render is sent.
  setApiLanguage(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable */
    }
  }, [lang]);

  const value = useMemo(() => {
    const locale = LOCALES[lang];
    const numberFormat = new Intl.NumberFormat(locale);
    const compactFormat = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
    return {
      lang,
      locale,
      setLang,
      t: createTranslator(lang),
      formatNumber: (number) => (number == null ? "—" : numberFormat.format(number)),
      formatCompact: (number) => (number == null ? "—" : compactFormat.format(number)),
      formatDate: (input, options = { year: "numeric", month: "short", day: "numeric" }) => {
        if (!input) return "";
        const date = new Date(input);
        return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(locale, options);
      },
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT() {
  return useLanguage().t;
}
