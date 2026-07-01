// i18next setup. Loads the bundled locales, detects the initial language from
// localStorage / the browser, and falls back to English. Importing this module
// for its side effect (in main.tsx) initialises the singleton before render.
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { fr } from "./locales/fr";

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const;

export const supportedLngs = ["en", "fr"] as const;
export type Language = (typeof supportedLngs)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: [...supportedLngs],
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
