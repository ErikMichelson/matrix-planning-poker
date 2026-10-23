import {
  getRoomMemberDisplayName,
  hasStateEventPower,
  isValidCreateEventSchema,
  isValidPowerLevelStateEvent,
  isValidRoomMemberStateEvent,
  type PowerLevelsStateEvent,
  type RoomEvent,
  type RoomMemberStateEventContent,
  type StateEvent,
  type StateEventCreateContent,
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

export type RoundAction = 'start' | 'reveal' | 'edit';

interface PlanningPokerState {
  round: StateEvent<PlanningPokerRoundEvent> | undefined;
  cards: readonly PlanningPokerCard[];
  joinedMemberCount: number;
  pendingRoundAction: RoundAction | undefined;
  canModifyRounds: boolean;
  connect: () => () => void;
  startRound: (label?: string) => Promise<boolean>;
  revealRound: () => Promise<boolean>;
  updateRoundLabel: (label: string, expectedEventId: string) => Promise<boolean>;
}

export type PlanningPokerStore = StoreApi<PlanningPokerState>;

interface PendingRoundAction {
  content: PlanningPokerRoundEvent;
  previousEventId: string | undefined;
  observedEvents: Map<string, StateEvent<PlanningPokerRoundEvent>>;
  acknowledged: boolean;
  responseEventId?: string;
  resolve: () => void;
}

interface PlanningPokerContext {
  widgetApi: WidgetApi;
  store: PlanningPokerStore;
  cardEvents: Map<string, Map<string, RoomEvent<PlanningPokerCardEvent>>>;
  roomMembers: Map<string, StateEvent<RoomMemberStateEventContent>>;
  powerLevels?: PowerLevelsStateEvent;
  roomCreate?: StateEvent<StateEventCreateContent>;
  pendingRoundAction?: PendingRoundAction;
  disconnect?: () => void;
}

/**
 * Creates an isolated room store without subscribing during React rendering.
 * @param widgetApi The API for this widget's Matrix room.
 * @returns A vanilla Zustand store with round actions and a restartable connection.
 */
export const createPlanningPokerStore = (widgetApi: WidgetApi): PlanningPokerStore => {
  const store = createStore<PlanningPokerState>()(() => ({
    round: undefined,
    cards: [],
    joinedMemberCount: 0,
    pendingRoundAction: undefined,
    canModifyRounds: false,
    connect: () => connect(context),
    startRound: (label = '') => startRound(context, label),
    revealRound: () => revealRound(context),
    updateRoundLabel: (label, expectedEventId) => updateRoundLabel(context, label, expectedEventId),
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
      context.widgetApi.observeStateEvents('m.room.power_levels').subscribe((event) => {
        if (isValidPowerLevelStateEvent(event)) {
          context.powerLevels = event.content;
          updateRoundPermission(context);
        }
      }),
    );
    subscriptions.push(
      context.widgetApi.observeStateEvents('m.room.create').subscribe((event) => {
        if (isValidCreateEventSchema(event)) {
          context.roomCreate = event;
          updateRoundPermission(context);
        }
      }),
    );
    subscriptions.push(
      context.widgetApi.observeStateEvents('m.room.member').subscribe((event) => {
        if (isValidRoomMemberStateEvent(event)) {
          context.roomMembers.set(event.state_key, event);
          context.store.setState({
            cards: getCards(context, context.store.getState().round),
            joinedMemberCount: [...context.roomMembers.values()].filter(
              (member) => member.content.membership === 'join',
            ).length,
          });
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
 * Rechecks the user's power for the poker round state event, including room creators.
 * @param context The room store and its observed permission state.
 */
const updateRoundPermission = (context: PlanningPokerContext) => {
  const userId = context.widgetApi.widgetParameters?.userId;
  context.store.setState({
    canModifyRounds:
      userId !== undefined &&
      hasStateEventPower(
        context.powerLevels,
        context.roomCreate,
        userId,
        PLANNING_POKER_ROUND_EVENT,
      ),
  });
};

/**
 * Starts a round and waits for its state confirmation.
 * @param context The room store and its event caches.
 * @param label The round topic. If left blank it is omitted.
 * @returns True when confirmed, or false if a round or action is already active.
 * @throws Error If sending the state event fails.
 */
const startRound = (context: PlanningPokerContext, label: string): Promise<boolean> => {
  if (context.store.getState().round?.content.active === true) {
    return Promise.resolve(false);
  }
  const trimmedLabel = label.trim();
  const content = trimmedLabel ? { active: true, label: trimmedLabel } : { active: true };
  return sendRoundState(context, 'start', content);
};

/**
 * Reveals the active round while preserving its label and other fields.
 * @param context The room store and its event caches.
 * @returns True when confirmed, or false if inactive or another action is pending.
 * @throws Error If sending the state event fails.
 */
const revealRound = (context: PlanningPokerContext): Promise<boolean> => {
  const round = context.store.getState().round;
  if (round?.content.active !== true) {
    return Promise.resolve(false);
  }
  return sendRoundState(context, 'reveal', { ...round.content, active: false });
};

/**
 * Updates the displayed round's label without moving its votes to a new round.
 * @param context The room store and its event caches.
 * @param label The edited topic, trimmed before sending.
 * @param expectedEventId The state event shown when the editor opened.
 * @returns True when confirmed, or false when the round changed or editing is unavailable.
 * @throws Error If sending the state event fails.
 */
const updateRoundLabel = (
  context: PlanningPokerContext,
  label: string,
  expectedEventId: string,
): Promise<boolean> => {
  const round = context.store.getState().round;
  if (!round || round.event_id !== expectedEventId) return Promise.resolve(false);
  const roundId = getRoundId(round);
  if (!roundId) return Promise.resolve(false);
  return sendRoundState(context, 'edit', {
    ...round.content,
    label: label.trim() || undefined,
    round_id: roundId,
  });
};

/**
 * Sends a state update and waits for both its response and matching event.
 * @param context The room store and its event caches.
 * @param kind The action shown as pending in the UI.
 * @param content The round state to send.
 * @returns True when confirmed, or false if another action is pending.
 * @throws Error If sending the state event fails.
 */
const sendRoundState = (
  context: PlanningPokerContext,
  kind: RoundAction,
  content: PlanningPokerRoundEvent,
): Promise<boolean> => {
  if (context.pendingRoundAction || !context.store.getState().canModifyRounds) {
    return Promise.resolve(false);
  }
  return new Promise((resolve, reject) => {
    const action: PendingRoundAction = {
      content,
      previousEventId: context.store.getState().round?.event_id,
      observedEvents: new Map(),
      acknowledged: false,
      resolve: () => resolve(true),
    };
    context.pendingRoundAction = action;
    context.store.setState({ pendingRoundAction: kind });
    void Promise.resolve()
      .then(() => context.widgetApi.sendStateEvent(PLANNING_POKER_ROUND_EVENT, content))
      .then((response) => {
        action.responseEventId = response.event_id;
        action.acknowledged = true;
        finishRoundAction(context);
      })
      .catch((error: unknown) => {
        context.pendingRoundAction = undefined;
        context.store.setState({ pendingRoundAction: undefined });
        reject(error);
      });
  });
};

/**
 * Clears a pending action once its response and matching event have arrived.
 * @param context The room store and its event caches.
 */
const finishRoundAction = (context: PlanningPokerContext) => {
  const action = context.pendingRoundAction;
  if (!action?.acknowledged) {
    return;
  }
  const received = action.responseEventId
    ? action.observedEvents.has(action.responseEventId)
    : [...action.observedEvents.values()].some((event) => matchesRoundAction(event, action));
  if (!received) {
    return;
  }
  context.pendingRoundAction = undefined;
  context.store.setState({ pendingRoundAction: undefined });
  action.resolve();
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
  // A confirmation can arrive after another client has already advanced the room state.
  context.pendingRoundAction?.observedEvents.set(event.event_id, event);
  const current = context.store.getState().round;
  if (current !== undefined && current.origin_server_ts >= event.origin_server_ts) {
    console.warn('Unhandled planning poker round event', event);
    finishRoundAction(context);
    return;
  }
  context.store.setState({ round: event, cards: getCards(context, event) });
  finishRoundAction(context);
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
 * Matches a confirmation when the send response contains no event ID.
 * @param event The received round state.
 * @param action The pending state update.
 * @returns Whether a new event matches the requested active flag and label.
 */
const matchesRoundAction = (
  event: StateEvent<PlanningPokerRoundEvent>,
  action: PendingRoundAction,
): boolean =>
  event.event_id !== action.previousEventId &&
  event.content.active === action.content.active &&
  event.content.label === action.content.label &&
  event.content.round_id === action.content.round_id;

/**
 * Resolves the stable event ID used by votes while a round is active.
 * @param event The active round state, which may include a label edit.
 * @returns The original round event ID.
 */
export const getActiveRoundId = (event: StateEvent<PlanningPokerRoundEvent>): string =>
  event.content.round_id ?? event.event_id;

/**
 * Selects the event ID whose cards belong to the displayed round.
 * @param event The current round state.
 * @returns The active or replaced event ID, if available.
 */
const getRoundId = (event: StateEvent<PlanningPokerRoundEvent>): string | undefined => {
  if (event.content.round_id) return event.content.round_id;
  if (event.content.active) {
    return getActiveRoundId(event);
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
