import React from "react"; // explicit import ensures React is in the same chunk as react-i18next
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "@/locales/en.json";
import sq from "@/locales/sq.json";

// Lazy-loaded locale imports — add new languages here as they are created
const loadLocale = async (lang: string) => {
  switch (lang) {
    case "de":
      return (await import("@/locales/de.json")).default;
    case "fr":
      return (await import("@/locales/fr.json")).default;
    case "it":
      return (await import("@/locales/it.json")).default;
    case "es":
      return (await import("@/locales/es.json")).default;
    case "pt":
      return (await import("@/locales/pt.json")).default;
    case "nl":
      return (await import("@/locales/nl.json")).default;
    case "pl":
      return (await import("@/locales/pl.json")).default;
    default:
      return null;
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sq: { translation: sq },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "sq", "de", "fr", "it", "es", "pt", "nl", "pl"],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

// Dynamically load locale bundle when language changes (keeps main bundle small)
i18n.on("languageChanged", async (lng) => {
  const code = lng.split("-")[0];
  if (!i18n.hasResourceBundle(code, "translation")) {
    const translations = await loadLocale(code);
    if (translations) {
      i18n.addResourceBundle(code, "translation", translations, true, true);
    }
  }
});

export default i18n;
