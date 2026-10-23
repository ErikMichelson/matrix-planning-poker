import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';

import { PlanningPokerCards } from './planning-poker-cards';

const cards = [{ id: '$card', sender: '@alice:example.org', displayName: 'Alice', value: '13' }];

it('renders a valid check icon instead of the unrevealed card value', () => {
  const html = renderToStaticMarkup(createElement(PlanningPokerCards, { cards }));

  expect(html).toContain('<svg');
  expect(html).not.toContain('>13<');
  expect(html).toContain('Alice');
  expect(html).toContain('@alice:example.org');
});

it('renders the card value after revealing the round', () => {
  const html = renderToStaticMarkup(createElement(PlanningPokerCards, { cards, revealed: true }));

  expect(html).toContain('>13<');
  expect(html).not.toContain('<svg');
});
