import type { StateEvent, WidgetApi } from '@matrix-widget-toolkit/api';
import { EMPTY, Subject } from 'rxjs';
import { afterEach, beforeEach, expect, it, vi, type Mock } from 'vite-plus/test';

import {
  PLANNING_POKER_ROUND_EVENT,
  type PlanningPokerRoundEvent,
} from '../events/planning-poker-round-event';
import { createPlanningPokerStore, type PlanningPokerStore } from './planning-poker-store';

type SendResult = Awaited<ReturnType<WidgetApi['sendStateEvent']>>;

const deferredResponse = () => {
  let resolve: (value: SendResult) => void = () => {};
  const promise = new Promise<SendResult>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

const roundEvent = (
  id: string,
  content: PlanningPokerRoundEvent,
  timestamp = 1,
): StateEvent<PlanningPokerRoundEvent> => ({
  type: PLANNING_POKER_ROUND_EVENT,
  event_id: id,
  room_id: '!room:example.org',
  sender: '@alice:example.org',
  state_key: '',
  origin_server_ts: timestamp,
  content,
});

let events: Subject<StateEvent<unknown>>;
let store: PlanningPokerStore;
let disconnect: () => void;
let sendStateEvent: Mock<WidgetApi['sendStateEvent']>;

beforeEach(() => {
  events = new Subject();
  sendStateEvent = vi.fn<WidgetApi['sendStateEvent']>();
  const widgetApi = {
    widgetParameters: { userId: '@alice:example.org' },
    observeStateEvents: vi.fn().mockReturnValue(events),
    observeRoomEvents: vi.fn().mockReturnValue(EMPTY),
    sendStateEvent,
  } as unknown as WidgetApi;
  store = createPlanningPokerStore(widgetApi);
  disconnect = store.getState().connect();
  events.next({
    ...roundEvent('$power', { active: false }),
    type: 'm.room.power_levels',
    content: { users: { '@alice:example.org': 50 } },
  });
});

afterEach(() => {
  disconnect();
  vi.restoreAllMocks();
});

it('locks immediately, trims the optional label, and waits for the matching state event', async () => {
  sendStateEvent.mockResolvedValue({ room_id: '!room:example.org', event_id: '$new' });
  const request = store.getState().startRound('  Story https://example.org/123  ');

  expect(store.getState().pendingRoundAction).toBe('start');
  expect(await store.getState().startRound('duplicate')).toBe(false);
  expect(sendStateEvent).toHaveBeenCalledExactlyOnceWith(PLANNING_POKER_ROUND_EVENT, {
    active: true,
    label: 'Story https://example.org/123',
  });

  events.next(roundEvent('$unrelated', { active: true, label: 'Story https://example.org/123' }));
  expect(store.getState().pendingRoundAction).toBe('start');
  events.next(roundEvent('$new', { active: true, label: 'Story https://example.org/123' }, 2));

  expect(await request).toBe(true);
  expect(store.getState().pendingRoundAction).toBeUndefined();
});

it('also waits for the send response when the state event arrives first', async () => {
  const response = deferredResponse();
  sendStateEvent.mockReturnValue(response.promise);
  const request = store.getState().startRound();
  await vi.waitFor(() => expect(sendStateEvent).toHaveBeenCalledOnce());
  events.next(roundEvent('$new', { active: true }));

  expect(store.getState().pendingRoundAction).toBe('start');
  expect(await store.getState().revealRound()).toBe(false);
  response.resolve({ room_id: '!room:example.org', event_id: '$new' });

  expect(await request).toBe(true);
  expect(store.getState().pendingRoundAction).toBeUndefined();
  expect(sendStateEvent).toHaveBeenCalledTimes(1);
});

it('preserves the label while revealing and blocks a new round until the reveal is observed', async () => {
  const content = { active: true, label: 'Ticket 123', extension: 'preserve' };
  events.next(roundEvent('$round', content));
  sendStateEvent.mockResolvedValue({ room_id: '!room:example.org', event_id: '$closed' });
  const request = store.getState().revealRound();
  expect(await store.getState().revealRound()).toBe(false);

  expect(sendStateEvent).toHaveBeenCalledExactlyOnceWith(PLANNING_POKER_ROUND_EVENT, {
    ...content,
    active: false,
  });
  events.next(roundEvent('$another-closed', { ...content, active: false }, 2));
  expect(await store.getState().startRound()).toBe(false);
  expect(store.getState().pendingRoundAction).toBe('reveal');
  const closedRound = {
    ...roundEvent('$closed', { ...content, active: false }, 3),
    unsigned: { replaces_state: '$round' },
  };
  events.next(closedRound);

  expect(await request).toBe(true);
  expect(store.getState().round?.content.label).toBe('Ticket 123');
  expect(store.getState().pendingRoundAction).toBeUndefined();
});

it('omits a blank label and refuses inapplicable actions', async () => {
  expect(await store.getState().revealRound()).toBe(false);
  sendStateEvent.mockResolvedValue({ room_id: '!room:example.org', event_id: '$new' });
  const request = store.getState().startRound('   ');
  await vi.waitFor(() =>
    expect(sendStateEvent).toHaveBeenCalledExactlyOnceWith(PLANNING_POKER_ROUND_EVENT, {
      active: true,
    }),
  );
  events.next(roundEvent('$new', { active: true }));
  expect(await request).toBe(true);
  expect(await store.getState().startRound('not allowed')).toBe(false);
  expect(sendStateEvent).toHaveBeenCalledTimes(1);
});

it('unlocks after a failed request and allows an explicit retry', async () => {
  sendStateEvent.mockRejectedValueOnce(new Error('Homeserver unavailable'));
  await expect(store.getState().startRound('Retry me')).rejects.toThrow('Homeserver unavailable');
  expect(store.getState().pendingRoundAction).toBeUndefined();
  expect(store.getState().round).toBeUndefined();

  sendStateEvent.mockResolvedValue({ room_id: '!room:example.org', event_id: '$retry' });
  const retry = store.getState().startRound('Retry me');
  events.next(roundEvent('$retry', { active: true, label: 'Retry me' }));
  expect(await retry).toBe(true);
});

it('keeps the active round and its cards when revealing fails', async () => {
  const round = roundEvent('$round', { active: true, label: 'Keep this topic' });
  events.next(round);
  sendStateEvent.mockRejectedValue(new Error('Send failed'));

  await expect(store.getState().revealRound()).rejects.toThrow('Send failed');

  expect(store.getState().round).toBe(round);
  expect(store.getState().pendingRoundAction).toBeUndefined();
});

it('accepts its confirmation without rolling back a newer round from another client', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  events.next(roundEvent('$round', { active: true }));
  sendStateEvent.mockResolvedValue({ room_id: '!room:example.org', event_id: '$closed' });
  const request = store.getState().revealRound();
  await vi.waitFor(() => expect(sendStateEvent).toHaveBeenCalledOnce());
  events.next(roundEvent('$newer', { active: true, label: 'Another client started this' }, 3));
  events.next(roundEvent('$closed', { active: false }, 2));

  expect(await request).toBe(true);
  expect(store.getState().pendingRoundAction).toBeUndefined();
  expect(store.getState().round?.event_id).toBe('$newer');
});

it('supports clients which acknowledge without returning an event ID', async () => {
  sendStateEvent.mockResolvedValue({ room_id: '!room:example.org' });
  const request = store.getState().startRound('Expected topic');
  await vi.waitFor(() => expect(sendStateEvent).toHaveBeenCalledOnce());
  events.next(roundEvent('$other', { active: true, label: 'Different topic' }));
  expect(store.getState().pendingRoundAction).toBe('start');
  events.next(roundEvent('$matching', { active: true, label: 'Expected topic' }, 2));

  expect(await request).toBe(true);
  expect(store.getState().pendingRoundAction).toBeUndefined();
});

it('blocks starting and revealing if permission is revoked while the controls are open', async () => {
  events.next({
    ...roundEvent('$power-revoked', { active: false }),
    type: 'm.room.power_levels',
    content: { users: { '@alice:example.org': 0 } },
  });
  expect(await store.getState().startRound('Not allowed')).toBe(false);
  events.next(roundEvent('$active', { active: true }));
  expect(await store.getState().revealRound()).toBe(false);
  expect(await store.getState().updateRoundLabel('Not allowed', '$active')).toBe(false);
  expect(sendStateEvent).not.toHaveBeenCalled();
  expect(store.getState().pendingRoundAction).toBeUndefined();
});

it('edits an active label while preserving round identity and extension fields', async () => {
  events.next(roundEvent('$round', { active: true, label: 'Old topic', extension: 'keep' }));
  sendStateEvent.mockResolvedValue({ room_id: '!room:example.org', event_id: '$edited' });
  const request = store.getState().updateRoundLabel('  New topic  ', '$round');
  expect(store.getState().pendingRoundAction).toBe('edit');
  expect(await store.getState().updateRoundLabel('Duplicate', '$round')).toBe(false);
  await vi.waitFor(() =>
    expect(sendStateEvent).toHaveBeenCalledExactlyOnceWith(PLANNING_POKER_ROUND_EVENT, {
      active: true,
      label: 'New topic',
      extension: 'keep',
      round_id: '$round',
    }),
  );
  events.next(
    roundEvent(
      '$edited',
      { active: true, label: 'New topic', extension: 'keep', round_id: '$round' },
      2,
    ),
  );
  expect(await request).toBe(true);
  expect(store.getState().pendingRoundAction).toBeUndefined();

  sendStateEvent.mockResolvedValue({ room_id: '!room:example.org', event_id: '$closed' });
  const reveal = store.getState().revealRound();
  await vi.waitFor(() =>
    expect(sendStateEvent).toHaveBeenLastCalledWith(PLANNING_POKER_ROUND_EVENT, {
      active: false,
      label: 'New topic',
      extension: 'keep',
      round_id: '$round',
    }),
  );
  events.next(
    roundEvent(
      '$closed',
      { active: false, label: 'New topic', extension: 'keep', round_id: '$round' },
      3,
    ),
  );
  expect(await reveal).toBe(true);
});

it('allows clearing a revealed round label without restarting the round', async () => {
  const closedRound = {
    ...roundEvent('$closed', { active: false, label: 'Old topic' }),
    unsigned: { replaces_state: '$round' },
  };
  events.next(closedRound);
  sendStateEvent.mockResolvedValue({ room_id: '!room:example.org', event_id: '$edited' });
  const request = store.getState().updateRoundLabel('   ', '$closed');
  await vi.waitFor(() =>
    expect(sendStateEvent).toHaveBeenCalledExactlyOnceWith(PLANNING_POKER_ROUND_EVENT, {
      active: false,
      label: undefined,
      round_id: '$round',
    }),
  );
  events.next(roundEvent('$edited', { active: false, round_id: '$round' }, 2));
  expect(await request).toBe(true);
  expect(store.getState().round?.content.active).toBe(false);
});

it('refuses edits if no round exists or the editor refers to an older state', async () => {
  expect(await store.getState().updateRoundLabel('Topic', '$missing')).toBe(false);
  events.next(roundEvent('$new-round', { active: true }));
  expect(await store.getState().updateRoundLabel('Old draft', '$old-round')).toBe(false);
  expect(sendStateEvent).not.toHaveBeenCalled();
});

it('preserves the original label after a failed edit and allows retrying', async () => {
  const round = roundEvent('$round', { active: true, label: 'Old topic' });
  events.next(round);
  sendStateEvent.mockRejectedValueOnce(new Error('Send failed'));
  await expect(store.getState().updateRoundLabel('New topic', '$round')).rejects.toThrow(
    'Send failed',
  );
  expect(store.getState().pendingRoundAction).toBeUndefined();
  expect(store.getState().round).toBe(round);
  sendStateEvent.mockResolvedValue({ room_id: '!room:example.org', event_id: '$retry' });
  const retry = store.getState().updateRoundLabel('New topic', '$round');
  events.next(roundEvent('$retry', { active: true, label: 'New topic', round_id: '$round' }, 2));
  expect(await retry).toBe(true);
});

it('requires the original round reference when confirming an edit without a response event ID', async () => {
  events.next(roundEvent('$round', { active: true }));
  sendStateEvent.mockResolvedValue({ room_id: '!room:example.org' });
  const request = store.getState().updateRoundLabel('Topic', '$round');
  await vi.waitFor(() => expect(sendStateEvent).toHaveBeenCalledOnce());
  events.next(roundEvent('$unrelated', { active: true, label: 'Topic' }, 2));
  expect(store.getState().pendingRoundAction).toBe('edit');
  events.next(roundEvent('$edited', { active: true, label: 'Topic', round_id: '$round' }, 3));
  expect(await request).toBe(true);
});
