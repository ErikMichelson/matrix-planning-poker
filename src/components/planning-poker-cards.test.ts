import { createInstance } from 'i18next';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, expect, it } from 'vite-plus/test';

import de from '../locales/de/translation.json';
import en from '../locales/en/translation.json';
import { PlanningPokerCards } from './planning-poker-cards';

const cards = [{ id: '$card', sender: '@alice:example.org', displayName: 'Alice', value: '13' }];
const translations = createInstance();

beforeAll(async () => {
  await translations.init({
    lng: 'en',
    resources: { en: { translation: en }, de: { translation: de } },
  });
});

const renderCards = (props: ComponentProps<typeof PlanningPokerCards>) =>
  renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n: translations },
      createElement(PlanningPokerCards, props),
    ),
  );

it('renders a valid check icon instead of the unrevealed card value', () => {
  const html = renderCards({ cards, joinedMemberCount: 2 });

  expect(html).toContain('<svg');
  expect(html).not.toContain('>13<');
  expect(html).toContain('Alice');
  expect(html).toContain('@alice:example.org');
});

it('renders the card value after revealing the round', () => {
  const html = renderCards({ cards, joinedMemberCount: 2, revealed: true });

  expect(html).toContain('>13<');
  expect(html).not.toContain('<svg');
});

it.each([
  { language: 'en', votes: 0, members: 0, revealed: false, text: '0 / 0 votes' },
  { language: 'en', votes: 0, members: 3, revealed: false, text: '0 / 3 votes' },
  { language: 'en', votes: 1, members: 3, revealed: false, text: '1 / 3 votes' },
  { language: 'en', votes: 2, members: 3, revealed: true, text: '2 / 3 votes' },
  { language: 'de', votes: 1, members: 3, revealed: false, text: '1 / 3 Stimmen' },
  { language: 'de', votes: 2, members: 3, revealed: true, text: '2 / 3 Stimmen' },
])(
  'renders the translated counter above the voter list: $text',
  async ({ language, votes, members, revealed, text }) => {
    await translations.changeLanguage(language);
    const html = renderCards({
      cards: Array.from({ length: votes }, (_, index) => ({
        id: `$card-${index}`,
        sender: `@user${index}:example.org`,
        displayName: `Voter ${index}`,
        value: '5',
      })),
      joinedMemberCount: members,
      revealed,
    });
    expect(html).toContain(text);
    expect(html).toContain('text-align:right');
    expect(html.indexOf(text)).toBeLessThan(html.indexOf('<ul'));
    expect(html.match(/<li\b/g) ?? []).toHaveLength(votes);
  },
);
