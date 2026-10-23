import type { WidgetApi } from '@matrix-widget-toolkit/api';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import { createStore } from 'zustand/vanilla';

import { createPlanningPokerStore } from '../stores/planning-poker-store';
import { EditablePlanningPokerRoundLabel } from './editable-planning-poker-round-label';
import { PlanningPokerRoundLabel } from './planning-poker-round-label';
import { RoundActionButtons } from './round-action-buttons';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

it.each([
  { active: false, pending: false, revealDisabled: true, startDisabled: false },
  { active: true, pending: false, revealDisabled: false, startDisabled: true },
  { active: false, pending: true, revealDisabled: true, startDisabled: true },
  { active: true, pending: true, revealDisabled: true, startDisabled: true },
])(
  'keeps round action positions fixed for state %j',
  ({ active, pending, revealDisabled, startDisabled }) => {
    const html = renderToStaticMarkup(
      createElement(RoundActionButtons, {
        roundActive: active,
        pending,
        canModifyRounds: true,
        onReveal: vi.fn(),
        onStart: vi.fn(),
      }),
    );
    const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];

    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toContain('action.reveal');
    expect(buttons[1]).toContain('action.startNewRound');
    expect(buttons[0]?.includes('disabled=""')).toBe(revealDisabled);
    expect(buttons[1]?.includes('disabled=""')).toBe(startDisabled);
    expect(html).toContain('flex:1');
  },
);

it.each([false, true])('disables both actions without permission (active: %s)', (roundActive) => {
  const html = renderToStaticMarkup(
    createElement(RoundActionButtons, {
      roundActive,
      pending: false,
      canModifyRounds: false,
      onReveal: vi.fn(),
      onStart: vi.fn(),
    }),
  );
  const buttons = html.match(/<button\b[^>]*>/g) ?? [];
  expect(buttons).toHaveLength(2);
  expect(buttons.every((button) => button.includes('disabled=""'))).toBe(true);
  expect(html).toContain('info.noRoundPermission');
});

it('hides the permission explanation when round actions are allowed', () => {
  const html = renderToStaticMarkup(
    createElement(RoundActionButtons, {
      roundActive: false,
      pending: false,
      canModifyRounds: true,
      onReveal: vi.fn(),
      onStart: vi.fn(),
    }),
  );
  expect(html).not.toContain('info.noRoundPermission');
});

it('linkifies round labels with safe external link attributes and preserves line breaks', () => {
  const html = renderToStaticMarkup(
    createElement(PlanningPokerRoundLabel, {
      label: 'Estimate this:\nhttps://example.org/ticket/123 and example.com/story',
    }),
  );

  expect(html).toContain('info.currentRound');
  expect(html).toContain('href="https://example.org/ticket/123"');
  expect(html).toContain('href="https://example.com/story"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain('white-space:pre-wrap');
});

it('treats round text as plain text and does not create unsafe-protocol links', () => {
  const html = renderToStaticMarkup(
    createElement(PlanningPokerRoundLabel, {
      label: '<img src=x onerror=alert(1)> javascript:alert(1) ftp://example.org/file',
    }),
  );

  expect(html).toContain('&lt;img');
  expect(html).not.toContain('<img');
  expect(html).not.toContain('href="javascript:');
  expect(html).not.toContain('href="ftp:');
});

it('shows a clear placeholder for rounds without a label', () => {
  const html = renderToStaticMarkup(createElement(PlanningPokerRoundLabel));
  expect(html).toContain('info.unlabeledRound');
});

it.each([false, true])('shows the pencil only with permission to edit: %s', (canModifyRounds) => {
  const store = createStore(() => ({
    ...createPlanningPokerStore({} as WidgetApi).getState(),
    canModifyRounds,
  }));
  const html = renderToStaticMarkup(
    createElement(EditablePlanningPokerRoundLabel, { planningPokerStore: store }),
  );
  expect(html.includes('aria-label="action.editRoundLabel"')).toBe(canModifyRounds);
});

it('disables the label editor while a round action is pending', () => {
  const store = createStore(() => ({
    ...createPlanningPokerStore({} as WidgetApi).getState(),
    canModifyRounds: true,
    pendingRoundAction: 'edit' as const,
  }));
  const html = renderToStaticMarkup(
    createElement(EditablePlanningPokerRoundLabel, { planningPokerStore: store }),
  );
  expect(html).toContain('aria-label="action.editRoundLabel"');
  expect(html).toContain('disabled=""');
});
