"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { defaultLocale, type Locale } from "./config";
import koMessages from "./messages/ko.json";
import enMessages from "./messages/en.json";

type Messages = typeof koMessages;
type MessageKey = string;

const messagesMap: Record<Locale, Messages> = {
  ko: koMessages,
  en: enMessages,
};

interface I18nContextType {
  locale: Locale;
  /* eslint-disable no-unused-vars */
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
  /* eslint-enable no-unused-vars */
}

const I18nContext = createContext<I18nContextType>({
  locale: defaultLocale,
  setLocale: (_locale: Locale) => {},
  t: (_key: MessageKey) => _key,
});

/**
 * 번역 키를 중첩 객체에서 조회 (예: "common.save" → koMessages.common.save)
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (key: MessageKey): string => {
      return getNestedValue(
        messagesMap[locale] as unknown as Record<string, unknown>,
        key
      );
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

function useTranslation() {
  return useContext(I18nContext);
}

export { I18nProvider, useTranslation };
