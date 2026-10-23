import type { StateEvent } from '@matrix-widget-toolkit/api';
import { expect, it } from 'vite-plus/test';

import {
  isValidPlanningPokerCardEvent,
  PLANNING_POKER_CARD_EVENT,
  PLANNING_POKER_CARD_VALUES,
} from './planning-poker-card';
import {
  isValidPlanningPokerRoundEvent,
  PLANNING_POKER_ROUND_EVENT,
} from './planning-poker-round-event';

const makeEvent = (type: string, content: unknown): StateEvent<unknown> => ({
  type,
  event_id: '$event',
  room_id: '!room:example.org',
  state_key: '',
  sender: '@alice:example.org',
  origin_server_ts: 1,
  content,
});

const reference = { rel_type: 'm.reference', event_id: '$round' };

it.each([undefined, '$original-round'])(
  'accepts an optional stable round reference %j',
  (round_id) => {
    expect(
      isValidPlanningPokerRoundEvent(
        makeEvent(PLANNING_POKER_ROUND_EVENT, { active: true, round_id }),
      ),
    ).toBe(true);
  },
);

it.each(['', null, 42, {}])('rejects an invalid stable round reference %j', (round_id) => {
  expect(
    isValidPlanningPokerRoundEvent(
      makeEvent(PLANNING_POKER_ROUND_EVENT, { active: true, round_id }),
    ),
  ).toBe(false);
});

it.each([undefined, '', 'Story 123', 'Estimate https://example.org/story/123'])(
  'accepts optional round label %j',
  (label) => {
    expect(
      isValidPlanningPokerRoundEvent(
        makeEvent(PLANNING_POKER_ROUND_EVENT, { active: true, label }),
      ),
    ).toBe(true);
  },
);

it.each([null, 42, {}, []])('rejects a non-string round label %j', (label) => {
  expect(
    isValidPlanningPokerRoundEvent(makeEvent(PLANNING_POKER_ROUND_EVENT, { active: true, label })),
  ).toBe(false);
});

it.each(PLANNING_POKER_CARD_VALUES)('accepts the UI card value %s', (value) => {
  expect(
    isValidPlanningPokerCardEvent(
      makeEvent(PLANNING_POKER_CARD_EVENT, { value, 'm.relates_to': reference }),
    ),
  ).toBe(true);
});

it.each(['100', '-1', 'NaN', 'Infinity', '0.50', ' 5', '5 ', '<script>alert(1)</script>'])(
  'rejects a card value not offered by the UI: %s',
  (value) => {
    expect(
      isValidPlanningPokerCardEvent(
        makeEvent(PLANNING_POKER_CARD_EVENT, { value, 'm.relates_to': reference }),
      ),
    ).toBe(false);
  },
);

it.each([null, undefined, 'invalid', 42, {}, [], { active: 'invalid' }])(
  'rejects malformed event content %j',
  (content) => {
    expect(isValidPlanningPokerCardEvent(makeEvent(PLANNING_POKER_CARD_EVENT, content))).toBe(
      false,
    );
    expect(isValidPlanningPokerRoundEvent(makeEvent(PLANNING_POKER_ROUND_EVENT, content))).toBe(
      false,
    );
  },
);

it.each([
  [true, true],
  [false, true],
  ['true', false],
  ['false', false],
  [1, false],
  [null, false],
  [undefined, false],
])('validates round active value %j without coercion', (active, expected) => {
  expect(isValidPlanningPokerRoundEvent(makeEvent(PLANNING_POKER_ROUND_EVENT, { active }))).toBe(
    expected,
  );
});

it.each([
  [{ value: '5', 'm.relates_to': reference }, true],
  [{ value: '☕', 'm.relates_to': reference }, true],
  [{ value: '', 'm.relates_to': reference }, false],
  [{ value: 5, 'm.relates_to': reference }, false],
  [{ value: '5' }, false],
  [{ 'm.relates_to': reference }, false],
  [{ value: '5', 'm.relates_to': null }, false],
  [{ value: '5', 'm.relates_to': { ...reference, rel_type: 'm.annotation' } }, false],
  [{ value: '5', 'm.relates_to': { ...reference, event_id: '' } }, false],
  [{ value: '5', 'm.relates_to': { rel_type: 'm.reference' } }, false],
])('validates card content %j', (content, expected) => {
  expect(isValidPlanningPokerCardEvent(makeEvent(PLANNING_POKER_CARD_EVENT, content))).toBe(
    expected,
  );
});

it('accepts extra Matrix fields without changing the original content', () => {
  const content = { value: '3', extra: 'keep', 'm.relates_to': { ...reference, extra: 'keep' } };
  const original = structuredClone(content);
  const event = makeEvent(PLANNING_POKER_CARD_EVENT, content);

  expect(isValidPlanningPokerCardEvent(event)).toBe(true);
  expect(event.content).toBe(content);
  expect(event.content).toEqual(original);
  expect(
    isValidPlanningPokerRoundEvent(
      makeEvent(PLANNING_POKER_ROUND_EVENT, { active: false, extra: 'keep' }),
    ),
  ).toBe(true);
});

it('rejects content with the wrong event type', () => {
  expect(
    isValidPlanningPokerCardEvent(
      makeEvent(PLANNING_POKER_ROUND_EVENT, { value: '5', 'm.relates_to': reference }),
    ),
  ).toBe(false);
  expect(
    isValidPlanningPokerRoundEvent(makeEvent(PLANNING_POKER_CARD_EVENT, { active: true })),
  ).toBe(false);
});
