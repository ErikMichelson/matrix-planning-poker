import { RoomEvent, StateEvent, WidgetApi } from "@matrix-widget-toolkit/api";
import { BehaviorSubject, filter, Subject, takeUntil } from "rxjs";
import {
  isValidPlanningPokerCardEvent,
  PLANNING_POKER_CARD_EVENT,
  PlanningPokerCardEvent,
} from "../events/planningPokerCard";
import {
  isValidPlanningPokerRoundEvent,
  PLANNING_POKER_ROUND_EVENT,
  PlanningPokerRoundEvent,
} from "../events/planningPokerRoundEvent";

type PlanningPokerCard = {
  id: string;
  sender: string;
  value: string;
};

export class PlanningPokerStore {
  private destroySubject = new Subject<void>();
  public readonly planningPokerRoundEventSubject = new BehaviorSubject<
    StateEvent<PlanningPokerRoundEvent> | undefined
  >(undefined);
  public readonly planningPokerCardsSubject = new BehaviorSubject<
    PlanningPokerCard[]
  >([]);
  public readonly activeSubject = new BehaviorSubject(false);
  private planningPokerCards = new Map<
    string,
    Map<string, RoomEvent<PlanningPokerCardEvent>>
  >();

  constructor(private widgetApi: WidgetApi) {}

  public start() {
    this.observeEvents();
  }

  public destroy() {
    this.destroySubject.next();
    this.planningPokerRoundEventSubject.complete();
    this.planningPokerCardsSubject.complete();
  }

  private handlePlanningPokerRoundEvent = (
    event: StateEvent<PlanningPokerRoundEvent>,
  ) => {
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
    console.warn("Unhandled planning poker round event", event);
  };

  private handlePlanningPokerCardEvent = (
    event: RoomEvent<PlanningPokerCardEvent>,
  ) => {
    const planningPokerRoundId = event.content["m.relates_to"].event_id;
    const planningPokerCardEvents: Map<
      string,
      RoomEvent<PlanningPokerCardEvent>
    > = this.planningPokerCards.get(planningPokerRoundId) ?? new Map();

    const existingEvent = planningPokerCardEvents.get(event.sender);

    if (
      existingEvent === undefined ||
      existingEvent.origin_server_ts < event.origin_server_ts
    ) {
      planningPokerCardEvents.set(event.sender, event);
      this.planningPokerCards.set(
        planningPokerRoundId,
        planningPokerCardEvents,
      );
      this.emitCards();
      return;
    }
  };

  private observeEvents() {
    this.planningPokerRoundEventSubject
      .pipe(takeUntil(this.destroySubject))
      .subscribe((event) => {
        this.activeSubject.next(event?.content.active === true);
      });

    this.widgetApi
      .observeStateEvents(PLANNING_POKER_ROUND_EVENT)
      .pipe(
        takeUntil(this.destroySubject),
        filter(isValidPlanningPokerRoundEvent),
      )
      .subscribe(this.handlePlanningPokerRoundEvent);

    this.widgetApi
      .observeRoomEvents(PLANNING_POKER_CARD_EVENT)
      .pipe(
        takeUntil(this.destroySubject),
        filter(isValidPlanningPokerCardEvent),
      )
      .subscribe(this.handlePlanningPokerCardEvent);
  }

  private emitCards() {
    const planningPokerRoundEvent =
      this.planningPokerRoundEventSubject.getValue();

    if (planningPokerRoundEvent === undefined) {
      // No active round
      this.planningPokerCardsSubject.next([]);
      return;
    }

    if (planningPokerRoundEvent.content.active === true) {
      const eventsMap: Map<
        string,
        RoomEvent<PlanningPokerCardEvent>
      > = this.planningPokerCards.get(planningPokerRoundEvent.event_id) ??
      new Map();

      const events = Array.from(eventsMap.values());

      // Emit cards for current round
      this.planningPokerCardsSubject.next(events.map(mapToCard));
      return;
    }

    // Round ended. Emit events for previous round.
    if (
      "unsigned" in planningPokerRoundEvent &&
      typeof planningPokerRoundEvent.unsigned === "object" &&
      planningPokerRoundEvent.unsigned !== null &&
      "replaces_state" in planningPokerRoundEvent.unsigned &&
      typeof planningPokerRoundEvent.unsigned.replaces_state === "string"
    ) {
      const roundId = planningPokerRoundEvent.unsigned.replaces_state;
      const eventsMap: Map<
        string,
        RoomEvent<PlanningPokerCardEvent>
      > = this.planningPokerCards.get(roundId) ?? new Map();

      const events = Array.from(eventsMap.values());

      // Emit cards for current round
      this.planningPokerCardsSubject.next(events.map(mapToCard));
      return;
    }

    console.warn("Unhandled planning poker round state");
  }
}

const mapToCard = (
  event: RoomEvent<PlanningPokerCardEvent>,
): PlanningPokerCard => {
  return {
    id: event.event_id,
    sender: event.sender,
    value: event.content.value,
  };
};
