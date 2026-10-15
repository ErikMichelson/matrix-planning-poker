import { RoomEvent } from '@matrix-widget-toolkit/api';
import * as z from 'zod/mini';

export const PLANNING_POKER_CARD_EVENT = 'weeman.planning_poker_card';

export const PLANNING_POKER_CARD_VALUES = [
  '0',
  '0.5',
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '20',
  '🤷',
  '☕',
] as const;

const planningPokerCardEventSchema = z.compile(
  z.looseObject({
    value: z.enum(PLANNING_POKER_CARD_VALUES),
    'm.relates_to': z.looseObject({
      rel_type: z.literal('m.reference'),
      event_id: z.string().check(z.minLength(1)),
    }),
  }),
);

export type PlanningPokerCardEvent = z.infer<typeof planningPokerCardEventSchema>;

export function isValidPlanningPokerCardEvent(
  event: RoomEvent<unknown>,
): event is RoomEvent<PlanningPokerCardEvent> {
  return (
    event.type === PLANNING_POKER_CARD_EVENT &&
    z.validate(planningPokerCardEventSchema, event.content)
  );
}
