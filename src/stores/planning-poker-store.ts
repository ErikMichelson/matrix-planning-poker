import {
  getRoomMemberDisplayName,
  isValidRoomMemberStateEvent,
  RoomEvent,
  RoomMemberStateEventContent,
  StateEvent,
  WidgetApi,
} from '@matrix-widget-toolkit/api';
import { BehaviorSubject, filter, Subject, takeUntil } from 'rxjs';

import {
  isValidPlanningPokerCardEvent,
  PLANNING_POKER_CARD_EVENT,
  PlanningPokerCardEvent,
} from '../events/planning-poker-card';
import {
  isValidPlanningPokerRoundEvent,
  PLANNING_POKER_ROUND_EVENT,
  PlanningPokerRoundEvent,
} from '../events/planning-poker-round-event';

export type PlanningPokerCard = {
  id: string;
  sender: string;
  displayName: string;
  value: string;
};

export class PlanningPokerStore {
  private destroySubject = new Subject<void>();
  public readonly planningPokerRoundEventSubject = new BehaviorSubject<
    StateEvent<PlanningPokerRoundEvent> | undefined
  >(undefined);
  public readonly planningPokerCardsSubject = new BehaviorSubject<PlanningPokerCard[]>([]);
  public readonly activeSubject = new BehaviorSubject(false);
  private planningPokerCards = new Map<string, Map<string, RoomEvent<PlanningPokerCardEvent>>>();

  private roomMembers = new Map<string, StateEvent<RoomMemberStateEventContent>>();

  constructor(private widgetApi: WidgetApi) {}

  public start() {
    this.observeEvents();
  }

  public destroy() {
    this.destroySubject.next();
  }

  private handlePlanningPokerRoundEvent = (event: StateEvent<PlanningPokerRoundEvent>) => {
    const currentEvent = this.planningPokerRoundEventSubject.getValue();

    if (currentEvent === undefined) {
      // First event
      this.planningPokerRoundEventSubject.next(event);
      this.emitCards();
      return;
    }

    if (currentEvent.origin_server_ts < event.origin_server_ts) {
      // More recent event
      this.planningPokerRoundEventSubject.next(event);
      this.emitCards();
      return;
    }

    // Ignore older events
    console.warn('Unhandled planning poker round event', event);
  };

  private handlePlanningPokerCardEvent = (event: RoomEvent<PlanningPokerCardEvent>) => {
    const planningPokerRoundId = event.content['m.relates_to'].event_id;
    const planningPokerCardEvents: Map<
      string,
      RoomEvent<PlanningPokerCardEvent>
    > = this.planningPokerCards.get(planningPokerRoundId) ?? new Map();

    const existingEvent = planningPokerCardEvents.get(event.sender);

    if (existingEvent === undefined || existingEvent.origin_server_ts < event.origin_server_ts) {
      planningPokerCardEvents.set(event.sender, event);
      this.planningPokerCards.set(planningPokerRoundId, planningPokerCardEvents);
      this.emitCards();
      return;
    }
  };

  private observeEvents() {
    this.planningPokerRoundEventSubject.pipe(takeUntil(this.destroySubject)).subscribe((event) => {
      this.activeSubject.next(event?.content.active === true);
    });

    this.widgetApi
      .observeStateEvents(PLANNING_POKER_ROUND_EVENT)
      .pipe(takeUntil(this.destroySubject), filter(isValidPlanningPokerRoundEvent))
      .subscribe(this.handlePlanningPokerRoundEvent);

    this.widgetApi
      .observeRoomEvents(PLANNING_POKER_CARD_EVENT)
      .pipe(takeUntil(this.destroySubject), filter(isValidPlanningPokerCardEvent))
      .subscribe(this.handlePlanningPokerCardEvent);
    this.widgetApi
      .observeStateEvents('m.room.member')
      .pipe(takeUntil(this.destroySubject), filter(isValidRoomMemberStateEvent))
      .subscribe((event) => {
        this.roomMembers.set(event.state_key, event);
        this.emitCards();
      });
  }

  private emitCards() {
    const planningPokerRoundEvent = this.planningPokerRoundEventSubject.getValue();

    if (planningPokerRoundEvent === undefined) {
      // No active round
      this.planningPokerCardsSubject.next([]);
      return;
    }

    const roundId = getRoundId(planningPokerRoundEvent);
    if (roundId === undefined) {
      console.warn('Unhandled planning poker round state');
      return;
    }

    const eventsMap =
      this.planningPokerCards.get(roundId) ?? new Map<string, RoomEvent<PlanningPokerCardEvent>>();
    const events = Array.from(eventsMap.values());
    this.planningPokerCardsSubject.next(events.map((event) => mapToCard(event, this.roomMembers)));
  }
}

const getRoundId = (event: StateEvent<PlanningPokerRoundEvent>): string | undefined => {
  if (event.content.active) {
    return event.event_id;
  }

  return getReplacedRoundId('unsigned' in event ? event.unsigned : undefined);
};

const getReplacedRoundId = (unsigned: unknown): string | undefined => {
  if (typeof unsigned !== 'object' || unsigned === null) {
    return undefined;
  }

  const roundId: unknown = Reflect.get(unsigned, 'replaces_state');
  return typeof roundId === 'string' ? roundId : undefined;
};

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
