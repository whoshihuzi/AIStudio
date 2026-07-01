// ============================================================
// LanguageProvider — React context for locale state.
// Persists selection to workspace/config.json via IPC.
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import en from "./en";
import zhCN from "./zh-CN";
import type { Translations } from "./types";

export type Locale = "en" | "zh-CN";

const LOCALES: Record<Locale, Translations> = {
  en,
  "zh-CN": zhCN,
};

const SUPPORTED_LOCALES: Locale[] = ["en", "zh-CN"];

interface LanguageContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => Promise<void>;
  available: Locale[];
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  t: en,
  setLocale: async () => {},
  available: SUPPORTED_LOCALES,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  // Restore saved locale on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await window.api.config.get("language");
        if (saved && SUPPORTED_LOCALES.includes(saved as Locale)) {
          setLocaleState(saved as Locale);
        }
      } catch {
        // No saved config — stay on default "en"
      }
      setReady(true);
    })();
  }, []);

  // Listen for menu-triggered language changes from main process
  useEffect(() => {
    const unsub = window.api.config.onLanguageChange((newLocale: string) => {
      if (SUPPORTED_LOCALES.includes(newLocale as Locale)) {
        setLocaleState(newLocale as Locale);
      }
    });
    return unsub;
  }, []);

  const setLocale = async (next: Locale) => {
    // Optimistic local update for instant feedback
    setLocaleState(next);
    try {
      // Execute through the Command system — SettingsHandler persists
      // and broadcasts via IPC. The onLanguageChange listener below
      // will confirm the change (no-op if already set).
      await window.api.command.execute("settings.language", { query: next });
    } catch {
      // Best-effort — command execution failures are logged in Main
    }
  };

  if (!ready) return null;

  return (
    <LanguageContext.Provider
      value={{ locale, t: LOCALES[locale], setLocale, available: SUPPORTED_LOCALES }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
