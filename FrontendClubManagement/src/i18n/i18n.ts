import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: "vi",
    fallbackLng: "vi",
    supportedLngs: ["en", "vi"],
    detection: {
      order: ["queryString", "cookie", "localStorage", "navigator"],
      caches: ["localStorage", "cookie"],
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    react: {
      useSuspense: true,
    },
    interpolation: {
      escapeValue: false,
    },

    debug: import.meta.env.DEV,
  });

export default i18n;
