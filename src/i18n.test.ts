import { afterAll, afterEach, expect, it, vi } from 'vite-plus/test';

import i18n from './i18n';
import de from './locales/de/translation.json';
import en from './locales/en/translation.json';

const translationEntries = (dictionary: object): [string, unknown][] =>
  Object.entries(dictionary).flatMap(([key, value]: [string, unknown]): [string, unknown][] => {
    if (value !== null && typeof value === 'object') {
      return translationEntries(value).map(([nestedKey, translation]) => [
        `${key}.${nestedKey}`,
        translation,
      ]);
    }
    return [[key, value]];
  });

const { location, browserNavigator, documentElement } = vi.hoisted(() => {
  const location = new URL('https://widget.example.org/');
  const browserNavigator = { languages: ['en-US'] };
  const documentElement = { lang: '' };
  vi.stubGlobal('window', { location });
  vi.stubGlobal('navigator', browserNavigator);
  vi.stubGlobal('document', { documentElement });
  return { location, browserNavigator, documentElement };
});

afterEach(async () => {
  location.search = '';
  location.hash = '';
  browserNavigator.languages = ['en-US'];
  await i18n.changeLanguage('en');
});

afterAll(() => {
  vi.unstubAllGlobals();
});

it('initializes both namespaces synchronously from bundled resources', () => {
  expect(i18n.isInitialized).toBe(true);
  expect(i18n.t('action.startNewRound')).toBe('Start new round');
  expect(i18n.t('info.noActiveRound')).toBe("There's no active planning poker round yet.");
  expect(i18n.t('outside-client.title', { ns: 'widget-toolkit' })).toBe('Only runs as a widget');
  expect(documentElement.lang).toBe('en-US');
});

it('prefers the Matrix client language over the browser language', async () => {
  location.search = '?matrix_client_language=de-DE';
  await i18n.changeLanguage();

  expect(i18n.resolvedLanguage).toBe('de');
  expect(i18n.t('action.startNewRound')).toBe('Neue Runde starten');
  expect(i18n.t('info.noActiveRound')).toBe('Es ist noch keine Planning Poker Runde aktiv.');
  expect(i18n.t('outside-client.title', { ns: 'widget-toolkit' })).toBe(
    'Nur als Widget ausführbar',
  );
  expect(documentElement.lang).toBe('de-DE');
});

it('also reads Matrix client language parameters from the URL fragment', async () => {
  location.hash = '#?matrix_client_language=de';
  await i18n.changeLanguage();

  expect(i18n.t('action.reveal')).toBe('Ergebnisse aufdecken');
});

it('uses a supported browser language when no Matrix client language is provided', async () => {
  browserNavigator.languages = ['fr-FR', 'de-DE'];
  await i18n.changeLanguage();

  expect(i18n.resolvedLanguage).toBe('de');
  expect(i18n.t('action.reveal')).toBe('Ergebnisse aufdecken');
});

it('falls back to English for unsupported languages', async () => {
  location.search = '?matrix_client_language=fr';
  browserNavigator.languages = ['fr-FR'];
  await i18n.changeLanguage();

  expect(i18n.resolvedLanguage).toBe('en');
  expect(i18n.t('action.reveal')).toBe('Reveal results');
  expect(i18n.t('outside-client.title', { ns: 'widget-toolkit' })).toBe('Only runs as a widget');
});

it('changes the app, toolkit, and document language together without loading resources', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await i18n.changeLanguage('de');

  expect(i18n.t('action.reveal')).toBe('Ergebnisse aufdecken');
  expect(i18n.t('outside-client.title', { ns: 'widget-toolkit' })).toBe(
    'Nur als Widget ausführbar',
  );
  expect(documentElement.lang).toBe('de');

  await i18n.changeLanguage('en');
  expect(i18n.t('action.reveal')).toBe('Reveal results');
  expect(documentElement.lang).toBe('en');
  expect(fetch).not.toHaveBeenCalled();
});

it('keeps both app dictionaries complete and nonempty without an extraction tool', () => {
  const englishEntries = translationEntries(en);
  const germanEntries = translationEntries(de);
  expect(germanEntries.map(([key]) => key).sort()).toEqual(
    englishEntries.map(([key]) => key).sort(),
  );
  for (const [, value] of [...englishEntries, ...germanEntries]) {
    expect(value).toEqual(expect.stringMatching(/\S/));
  }
});
