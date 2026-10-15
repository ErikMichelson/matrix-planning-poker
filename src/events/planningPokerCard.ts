import { RoomEvent } from '@matrix-widget-toolkit/api';
import Joi from 'joi';

import { isValidEvent } from './validation';

export const PLANNING_POKER_CARD_EVENT = 'weeman.planning_poker_card';

export type PlanningPokerCardEvent = {
  value: string;
  'm.relates_to': {
    rel_type: 'm.reference';
    event_id: string;
  };
};

const planningPokerCardEventSchema = Joi.object<PlanningPokerCardEvent, true>({
  value: Joi.string().required(),
  'm.relates_to': Joi.object({
    rel_type: Joi.string().valid('m.reference').required(),
    event_id: Joi.string().required(),
  }).unknown(),
}).unknown();

export function isValidPlanningPokerCardEvent(
  event: RoomEvent<unknown>,
): event is RoomEvent<PlanningPokerCardEvent> {
  return isValidEvent(event, PLANNING_POKER_CARD_EVENT, planningPokerCardEventSchema);
}
