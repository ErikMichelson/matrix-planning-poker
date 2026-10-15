import { StateEvent } from '@matrix-widget-toolkit/api';
import * as z from 'zod/mini';

export const PLANNING_POKER_ROUND_EVENT = 'weeman.planning_poker_round';

const planningPokerRoundEventSchema = z.compile(z.looseObject({ active: z.boolean() }));

export type PlanningPokerRoundEvent = z.infer<typeof planningPokerRoundEventSchema>;

export function isValidPlanningPokerRoundEvent(
  event: StateEvent<unknown>,
): event is StateEvent<PlanningPokerRoundEvent> {
  return (
    event.type === PLANNING_POKER_ROUND_EVENT &&
    z.validate(planningPokerRoundEventSchema, event.content)
  );
}
