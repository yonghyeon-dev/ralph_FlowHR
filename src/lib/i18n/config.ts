export const defaultLocale = "ko" as const;

export const locales = ["ko", "en"] as const;

export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};

export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  ko: "ltr",
  en: "ltr",
};
