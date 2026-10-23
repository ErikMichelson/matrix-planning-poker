import type { RoomEvent, StateEvent, WidgetApi } from '@matrix-widget-toolkit/api';
import { of, Subject } from 'rxjs';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';

import {
  PLANNING_POKER_CARD_EVENT,
  type PlanningPokerCardEvent,
} from '../events/planning-poker-card';
import {
  PLANNING_POKER_ROUND_EVENT,
  type PlanningPokerRoundEvent,
} from '../events/planning-poker-round-event';
import { createPlanningPokerStore, type PlanningPokerStore } from './planning-poker-store';

const roundEvent = (
  eventId: string,
  active: boolean,
  timestamp: number,
): StateEvent<PlanningPokerRoundEvent> => ({
  type: PLANNING_POKER_ROUND_EVENT,
  event_id: eventId,
  room_id: '!room:example.org',
  state_key: '',
  sender: '@alice:example.org',
  origin_server_ts: timestamp,
  content: { active },
});

const cardEvent = (
  roundId: string,
  value: PlanningPokerCardEvent['value'],
): RoomEvent<PlanningPokerCardEvent> => ({
  type: PLANNING_POKER_CARD_EVENT,
  event_id: '$card',
  room_id: '!room:example.org',
  sender: '@alice:example.org',
  origin_server_ts: 2,
  content: {
    value,
    'm.relates_to': { rel_type: 'm.reference', event_id: roundId },
  },
});

let stateEvents: Subject<StateEvent<unknown>>;
let roomEvents: Subject<RoomEvent<unknown>>;
let store: PlanningPokerStore;
let disconnect: () => void;

beforeEach(() => {
  stateEvents = new Subject();
  roomEvents = new Subject();
  const widgetApi = {
    widgetParameters: { userId: '@alice:example.org' },
    observeStateEvents: vi.fn().mockReturnValue(stateEvents),
    observeRoomEvents: vi.fn().mockReturnValue(roomEvents),
  } as unknown as WidgetApi;
  store = createPlanningPokerStore(widgetApi);
  disconnect = store.getState().connect();
});

afterEach(() => {
  disconnect();
  vi.restoreAllMocks();
});

it('keeps cards hidden until their round arrives and clears them for a new round', () => {
  roomEvents.next(cardEvent('$round', '5'));
  expect(store.getState().cards).toEqual([]);

  stateEvents.next(roundEvent('$round', true, 1));
  expect(store.getState().cards).toEqual([
    { id: '$card', sender: '@alice:example.org', displayName: '@alice:example.org', value: '5' },
  ]);

  stateEvents.next(roundEvent('$next-round', true, 3));
  expect(store.getState().cards).toEqual([]);
});

it('ignores injected card values instead of replacing a valid vote', () => {
  stateEvents.next(roundEvent('$round', true, 1));
  const validCard = cardEvent('$round', '5');
  roomEvents.next(validCard);
  const cards = store.getState().cards;

  roomEvents.next({
    ...validCard,
    event_id: '$injected-card',
    origin_server_ts: 3,
    content: { ...validCard.content, value: '<img src=x onerror=alert(1)>' },
  });

  expect(store.getState().cards).toBe(cards);
  expect(cards[0]?.value).toBe('5');
});

it('shows the replaced round cards after the round is closed', () => {
  stateEvents.next(roundEvent('$round', true, 1));
  roomEvents.next(cardEvent('$round', '8'));
  const closedRound = {
    ...roundEvent('$closed-round', false, 3),
    unsigned: { replaces_state: '$round' },
  };
  stateEvents.next(closedRound);

  expect(store.getState().cards).toEqual([
    { id: '$card', sender: '@alice:example.org', displayName: '@alice:example.org', value: '8' },
  ]);
});

it('keeps votes associated with the original round through edits, reveals, and history replay', () => {
  stateEvents.next(roundEvent('$round', true, 1));
  roomEvents.next(cardEvent('$round', '8'));
  for (const [eventId, active, timestamp] of [
    ['$edited', true, 3],
    ['$edited-again', true, 4],
    ['$closed', false, 5],
    ['$closed-edited', false, 6],
  ] as const) {
    stateEvents.next({
      ...roundEvent(eventId, active, timestamp),
      content: { active, label: 'Updated topic', round_id: '$round' },
    });
    expect(store.getState().cards[0]?.value).toBe('8');
  }
  stateEvents.next(roundEvent('$new-round', true, 7));
  expect(store.getState().cards).toEqual([]);
});

it('resolves cached votes when an edited round is the first state received', () => {
  roomEvents.next(cardEvent('$original', '13'));
  stateEvents.next({
    ...roundEvent('$edited', true, 3),
    content: { active: true, label: 'Updated topic', round_id: '$original' },
  });
  expect(store.getState().cards[0]?.value).toBe('13');
});

it.each([undefined, null, 42, 'invalid', {}, { replaces_state: 42 }])(
  'ignores malformed replacement metadata: %j',
  (unsigned) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stateEvents.next(roundEvent('$round', true, 1));
    roomEvents.next(cardEvent('$round', '3'));
    const cards = store.getState().cards;

    const closedRound = { ...roundEvent('$closed-round', false, 3), unsigned };
    stateEvents.next(closedRound);

    expect(store.getState().cards).toBe(cards);
    expect(warn).toHaveBeenCalledWith('Unhandled planning poker round state');
  },
);

it('unsubscribes on cleanup and can restart during a React StrictMode effect replay', () => {
  disconnect();
  expect(stateEvents.observed).toBe(false);
  expect(roomEvents.observed).toBe(false);

  disconnect = store.getState().connect();
  stateEvents.next(roundEvent('$round', true, 1));
  roomEvents.next(cardEvent('$round', '13'));

  expect(store.getState().cards[0]?.value).toBe('13');
  expect(stateEvents.observed).toBe(true);
  expect(roomEvents.observed).toBe(true);
});

it('publishes the round and its cached cards in one consistent snapshot', () => {
  roomEvents.next(cardEvent('$round', '5'));
  const snapshots: { roundId: string | undefined; values: string[] }[] = [];
  const unsubscribe = store.subscribe((state) => {
    snapshots.push({
      roundId: state.round?.event_id,
      values: state.cards.map((card) => card.value),
    });
  });

  stateEvents.next(roundEvent('$round', true, 1));

  expect(snapshots).toEqual([{ roundId: '$round', values: ['5'] }]);
  unsubscribe();
});

it('keeps independent room stores isolated', () => {
  const otherEvents = new Subject<StateEvent<unknown>>();
  const otherApi = {
    observeStateEvents: vi.fn().mockReturnValue(otherEvents),
    observeRoomEvents: vi.fn().mockReturnValue(new Subject<RoomEvent<unknown>>()),
  } as unknown as WidgetApi;
  const otherStore = createPlanningPokerStore(otherApi);
  const disconnectOther = otherStore.getState().connect();

  stateEvents.next(roundEvent('$round', true, 1));
  roomEvents.next(cardEvent('$round', '8'));
  otherEvents.next(roundEvent('$other-round', true, 2));

  expect(store.getState().round?.event_id).toBe('$round');
  expect(store.getState().cards[0]?.value).toBe('8');
  expect(otherStore.getState().round?.event_id).toBe('$other-round');
  expect(otherStore.getState().cards).toEqual([]);
  disconnectOther();
});

it('does not duplicate subscriptions and makes old cleanup safe after reconnecting', () => {
  const oldDisconnect = disconnect;
  expect(store.getState().connect()).toBe(oldDisconnect);
  expect(stateEvents.observers).toHaveLength(4);
  expect(roomEvents.observers).toHaveLength(1);

  oldDisconnect();
  disconnect = store.getState().connect();
  oldDisconnect();

  expect(stateEvents.observers).toHaveLength(4);
  expect(roomEvents.observers).toHaveLength(1);
  stateEvents.next(roundEvent('$round', true, 1));
  expect(store.getState().round?.event_id).toBe('$round');
});

it('cleans up a partial connection if the SDK throws and allows reconnecting', () => {
  const observeRoomEvents = vi
    .fn()
    .mockImplementationOnce(() => {
      throw new Error('Cannot subscribe');
    })
    .mockReturnValue(roomEvents);
  const otherApi = {
    observeStateEvents: vi.fn().mockReturnValue(stateEvents),
    observeRoomEvents,
  } as unknown as WidgetApi;
  const otherStore = createPlanningPokerStore(otherApi);
  const initialObservers = stateEvents.observers.length;

  expect(() => otherStore.getState().connect()).toThrow('Cannot subscribe');
  expect(stateEvents.observers).toHaveLength(initialObservers);
  const stop = otherStore.getState().connect();
  expect(stateEvents.observers).toHaveLength(initialObservers + 4);
  stop();
  expect(stateEvents.observers).toHaveLength(initialObservers);
});

it('updates member names without mutating a previously published card snapshot', () => {
  stateEvents.next(roundEvent('$round', true, 1));
  roomEvents.next(cardEvent('$round', '5'));
  const previousCards = store.getState().cards;

  stateEvents.next({
    ...roundEvent('$member', true, 3),
    type: 'm.room.member',
    state_key: '@alice:example.org',
    content: { membership: 'join', displayname: 'Alice' },
  });

  expect(previousCards[0]?.displayName).toBe('@alice:example.org');
  expect(store.getState().cards[0]?.displayName).toBe('Alice');
  expect(store.getState().cards).not.toBe(previousCards);
});

const powerEvent = (content: unknown): StateEvent<unknown> => ({
  ...roundEvent('$power', false, 1),
  type: 'm.room.power_levels',
  content,
});

it('starts with disabled controls until permission state arrives and reacts to updates', () => {
  expect(store.getState().canModifyRounds).toBe(false);
  stateEvents.next(powerEvent({ users: { '@alice:example.org': 50 } }));
  expect(store.getState().canModifyRounds).toBe(true);
  stateEvents.next(powerEvent({ users: { '@alice:example.org': 49 } }));
  expect(store.getState().canModifyRounds).toBe(false);
  stateEvents.next(powerEvent({ users_default: 75, state_default: 75 }));
  expect(store.getState().canModifyRounds).toBe(true);
});

it.each([
  [{}, false],
  [{ users_default: 50 }, true],
  [{ users_default: 50, users: { '@alice:example.org': 0 } }, false],
  [{ state_default: 0 }, true],
  [{ events_default: 0 }, false],
  [{ users_default: 50, events: { [PLANNING_POKER_ROUND_EVENT]: 51 } }, false],
  [{ state_default: 100, events: { [PLANNING_POKER_ROUND_EVENT]: 0 } }, true],
])(
  'compares initial power levels using Matrix defaults and event overrides: %j',
  (content, allowed) => {
    const api = {
      widgetParameters: { userId: '@alice:example.org' },
      observeStateEvents: vi.fn((type: string) =>
        type === 'm.room.power_levels' ? of(powerEvent(content)) : new Subject(),
      ),
      observeRoomEvents: vi.fn().mockReturnValue(new Subject()),
    } as unknown as WidgetApi;
    const initialStore = createPlanningPokerStore(api);
    const stop = initialStore.getState().connect();
    expect(initialStore.getState().canModifyRounds).toBe(allowed);
    stop();
  },
);

it.each(['@alice:example.org', '@bob:example.org'])(
  'recognizes room version 12 creators, including additional creators: %s',
  (creator) => {
    stateEvents.next(powerEvent({ state_default: 1000 }));
    expect(store.getState().canModifyRounds).toBe(false);
    stateEvents.next({
      ...roundEvent('$create', false, 1),
      type: 'm.room.create',
      sender: creator,
      content: { room_version: '12', additional_creators: ['@alice:example.org'] },
    });
    expect(store.getState().canModifyRounds).toBe(true);
  },
);

it('does not infer permission without the current user ID', () => {
  const api = {
    widgetParameters: {},
    observeStateEvents: vi.fn().mockReturnValue(of(powerEvent({ state_default: 0 }))),
    observeRoomEvents: vi.fn().mockReturnValue(new Subject()),
  } as unknown as WidgetApi;
  const anonymousStore = createPlanningPokerStore(api);
  const stop = anonymousStore.getState().connect();
  expect(anonymousStore.getState().canModifyRounds).toBe(false);
  stop();
});
