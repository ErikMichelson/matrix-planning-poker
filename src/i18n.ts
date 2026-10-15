import { extractWidgetParameters } from '@matrix-widget-toolkit/api';
import i18n, { type LanguageDetectorModule } from 'i18next';
import { initReactI18next } from 'react-i18next';

// The pinned toolkit ships these resources but does not export their paths.
import toolkitDe from '../node_modules/@matrix-widget-toolkit/mui/build/locales/de/widget-toolkit.json';
import toolkitEn from '../node_modules/@matrix-widget-toolkit/mui/build/locales/en/widget-toolkit.json';
import de from './locales/de/translation.json';
import en from './locales/en/translation.json';

const languageDetector: LanguageDetectorModule = {
  type: 'languageDetector',
  detect: () => {
    const { clientLanguage } = extractWidgetParameters();
    return clientLanguage ? [clientLanguage, ...navigator.languages] : [...navigator.languages];
  },
};

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

void i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en, 'widget-toolkit': toolkitEn },
      de: { translation: de, 'widget-toolkit': toolkitDe },
    },
    initAsync: false,
    ns: ['translation', 'widget-toolkit'],
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
