import {
  getRoomMemberDisplayName,
  isValidRoomMemberStateEvent,
  type RoomEvent,
  type RoomMemberStateEventContent,
  type StateEvent,
  type WidgetApi,
} from '@matrix-widget-toolkit/api';
import { createStore, type StoreApi } from 'zustand/vanilla';

import {
  isValidPlanningPokerCardEvent,
  PLANNING_POKER_CARD_EVENT,
  type PlanningPokerCardEvent,
} from '../events/planning-poker-card';
import {
  isValidPlanningPokerRoundEvent,
  PLANNING_POKER_ROUND_EVENT,
  type PlanningPokerRoundEvent,
} from '../events/planning-poker-round-event';

export type PlanningPokerCard = {
  id: string;
  sender: string;
  displayName: string;
  value: string;
};

interface PlanningPokerState {
  round: StateEvent<PlanningPokerRoundEvent> | undefined;
  cards: readonly PlanningPokerCard[];
  connect: () => () => void;
}

export type PlanningPokerStore = StoreApi<PlanningPokerState>;

interface PlanningPokerContext {
  widgetApi: WidgetApi;
  store: PlanningPokerStore;
  cardEvents: Map<string, Map<string, RoomEvent<PlanningPokerCardEvent>>>;
  roomMembers: Map<string, StateEvent<RoomMemberStateEventContent>>;
  disconnect?: () => void;
}

/**
 * Creates an isolated room store without subscribing during React rendering.
 * @param widgetApi The API for this widget's Matrix room.
 * @returns A vanilla Zustand store with a restartable connection.
 */
export const createPlanningPokerStore = (widgetApi: WidgetApi): PlanningPokerStore => {
  const store = createStore<PlanningPokerState>()(() => ({
    round: undefined,
    cards: [],
    connect: () => connect(context),
  }));
  const context: PlanningPokerContext = {
    widgetApi,
    store,
    cardEvents: new Map(),
    roomMembers: new Map(),
  };
  return store;
};

/**
 * Subscribes to round, card, and member events.
 * @param context The room store and its event caches.
 * @returns The existing or newly created cleanup function.
 * @throws Error If the SDK cannot subscribe.
 */
const connect = (context: PlanningPokerContext): (() => void) => {
  if (context.disconnect) {
    return context.disconnect;
  }

  const subscriptions: { unsubscribe: () => void }[] = [];
  /** Stops these subscriptions without detaching a newer connection. */
  const disconnect = () => {
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    if (context.disconnect === disconnect) context.disconnect = undefined;
  };
  context.disconnect = disconnect;

  try {
    subscriptions.push(
      context.widgetApi.observeStateEvents(PLANNING_POKER_ROUND_EVENT).subscribe((event) => {
        if (isValidPlanningPokerRoundEvent(event)) receiveRound(context, event);
      }),
    );
    subscriptions.push(
      context.widgetApi.observeRoomEvents(PLANNING_POKER_CARD_EVENT).subscribe((event) => {
        if (isValidPlanningPokerCardEvent(event)) receiveCard(context, event);
      }),
    );
    subscriptions.push(
      context.widgetApi.observeStateEvents('m.room.member').subscribe((event) => {
        if (isValidRoomMemberStateEvent(event)) {
          context.roomMembers.set(event.state_key, event);
          context.store.setState({ cards: getCards(context, context.store.getState().round) });
        }
      }),
    );
  } catch (error) {
    disconnect();
    throw error;
  }
  return disconnect;
};

/**
 * Records action confirmations and applies newer round state.
 * @param context The room store and its event caches.
 * @param event The validated round event.
 */
const receiveRound = (
  context: PlanningPokerContext,
  event: StateEvent<PlanningPokerRoundEvent>,
) => {
  const current = context.store.getState().round;
  if (current !== undefined && current.origin_server_ts >= event.origin_server_ts) {
    console.warn('Unhandled planning poker round event', event);
    return;
  }
  context.store.setState({ round: event, cards: getCards(context, event) });
};

/**
 * Keeps each sender's latest vote and refreshes the displayed cards.
 * @param context The room store and its event caches.
 * @param event The validated card event.
 */
const receiveCard = (context: PlanningPokerContext, event: RoomEvent<PlanningPokerCardEvent>) => {
  const roundId = event.content['m.relates_to'].event_id;
  const events =
    context.cardEvents.get(roundId) ?? new Map<string, RoomEvent<PlanningPokerCardEvent>>();
  const existing = events.get(event.sender);
  if (existing !== undefined && existing.origin_server_ts >= event.origin_server_ts) {
    return;
  }
  events.set(event.sender, event);
  context.cardEvents.set(roundId, events);
  context.store.setState({ cards: getCards(context, context.store.getState().round) });
};

/**
 * Builds cards for the active round or the revealed last one.
 * @param context The room store and its event caches.
 * @param round The current round state, if available.
 * @returns The cards to display.
 */
const getCards = (
  context: PlanningPokerContext,
  round: StateEvent<PlanningPokerRoundEvent> | undefined,
): readonly PlanningPokerCard[] => {
  if (round === undefined) {
    return [];
  }
  const roundId = getRoundId(round);
  if (roundId === undefined) {
    console.warn('Unhandled planning poker round state');
    return context.store.getState().cards;
  }
  const events =
    context.cardEvents.get(roundId) ?? new Map<string, RoomEvent<PlanningPokerCardEvent>>();
  return Array.from(events.values(), (event) => mapToCard(event, context.roomMembers));
};

/**
 * Selects the event ID whose cards belong to the displayed round.
 * @param event The current round state.
 * @returns The active or replaced event ID, if available.
 */
const getRoundId = (event: StateEvent<PlanningPokerRoundEvent>): string | undefined => {
  if (event.content.active) {
    return event.event_id;
  }
  return getReplacedRoundId('unsigned' in event ? event.unsigned : undefined);
};

/**
 * Reads the previous round ID from Matrix's unsigned metadata.
 * @param unsigned The event's unvalidated unsigned metadata.
 * @returns The replaced state event ID, if present.
 */
const getReplacedRoundId = (unsigned: unknown): string | undefined => {
  if (typeof unsigned !== 'object' || unsigned === null) {
    return undefined;
  }
  const roundId: unknown = Reflect.get(unsigned, 'replaces_state');
  return typeof roundId === 'string' ? roundId : undefined;
};

/**
 * Maps a vote to a card with the sender's room display name.
 * @param event The validated card event.
 * @param roomMembers The known room member state events.
 * @returns The card to display.
 */
const mapToCard = (
  event: RoomEvent<PlanningPokerCardEvent>,
  roomMembers: Map<string, StateEvent<RoomMemberStateEventContent>>,
): PlanningPokerCard => {
  const member = roomMembers.get(event.sender);
  return {
    id: event.event_id,
    sender: event.sender,
    displayName: member
      ? getRoomMemberDisplayName(member, [...roomMembers.values()])
      : event.sender,
    value: event.content.value,
  };
};
