import { WidgetApiImpl } from "@matrix-widget-toolkit/api";
import { EventDirection, WidgetEventCapability } from "matrix-widget-api";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.tsx";
import { PLANNING_POKER_CARD_EVENT } from "./events/planningPokerCard.ts";
import { PLANNING_POKER_ROUND_EVENT } from "./events/planningPokerRoundEvent.ts";
import "./i18n";
import "./index.css";

const widgetApiPromise = WidgetApiImpl.create({
  // You can specify which capabilities should be requested at startup. One
  // can also request capabilities after the application started.
  capabilities: [
    WidgetEventCapability.forStateEvent(
      EventDirection.Send,
      PLANNING_POKER_ROUND_EVENT,
    ),
    WidgetEventCapability.forStateEvent(
      EventDirection.Receive,
      PLANNING_POKER_ROUND_EVENT,
    ),
    WidgetEventCapability.forRoomEvent(
      EventDirection.Send,
      PLANNING_POKER_CARD_EVENT,
    ),
    WidgetEventCapability.forRoomEvent(
      EventDirection.Receive,
      PLANNING_POKER_CARD_EVENT,
    ),
  ],
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App widgetApiPromise={widgetApiPromise} />
  </React.StrictMode>,
);
