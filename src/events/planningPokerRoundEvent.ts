import { StateEvent } from '@matrix-widget-toolkit/api';
import Joi from 'joi';
import { isValidEvent } from './validation';

export const PLANNING_POKER_ROUND_EVENT = 'weeman.planning_poker_round';

export type PlanningPokerRoundEvent = {
  active: boolean;
};

const planningPokerRoundEventSchema = Joi.object<PlanningPokerRoundEvent, true>({
  active: Joi.boolean().required(),
}).unknown();

export function isValidPlanningPokerRoundEvent(
  event: StateEvent<unknown>,
): event is StateEvent<PlanningPokerRoundEvent> {
  return isValidEvent(event, PLANNING_POKER_ROUND_EVENT, planningPokerRoundEventSchema);
}
