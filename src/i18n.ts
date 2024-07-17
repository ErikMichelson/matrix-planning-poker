import i18n from 'i18next';
import ChainedBackend from 'i18next-chained-backend';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';
import { setLocale } from './lib/locale';

i18n
  .use(ChainedBackend)
  .use(initReactI18next)
  .init({
    backend: {
      backends: [HttpBackend],
      backendOptions: [{ loadPath: `/locales/{{lng}}/{{ns}}.json` }],
    },
    debug: import.meta.env.NODE_ENV === 'development',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    supportedLngs: ['en', 'de'],
    nonExplicitSupportedLngs: true,
  });

setLocale(i18n.language);

i18n.on('languageChanged', () => {
  setLocale(i18n.language);
});

export default i18n;
