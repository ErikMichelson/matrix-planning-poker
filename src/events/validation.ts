import { RoomEvent, StateEvent } from "@matrix-widget-toolkit/api";
import Joi from "joi";

export function isValidEvent(
  event: RoomEvent<unknown> | StateEvent<unknown>,
  eventType: string,
  schema: Joi.AnySchema,
): boolean {
  if (event.type !== eventType) {
    return false;
  }

  if (!event.content || typeof event.content !== "object") {
    return false;
  }

  const result = schema.validate(event.content);

  if (result.error) {
    return false;
  }

  return true;
}
