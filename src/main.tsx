import { WidgetApiImpl } from '@matrix-widget-toolkit/api';
import { MuiThemeProvider, MuiWidgetApiProvider } from '@matrix-widget-toolkit/mui';
import { Box } from '@mui/material';
import { EventDirection, WidgetEventCapability } from 'matrix-widget-api';
import { StrictMode, Suspense } from 'react';
import ReactDOM from 'react-dom/client';

import { PlanningPoker } from './components/planning-poker';
import { PLANNING_POKER_CARD_EVENT } from './events/planning-poker-card.ts';
import { PLANNING_POKER_ROUND_EVENT } from './events/planning-poker-round-event.ts';
import './i18n';

const widgetApiPromise = WidgetApiImpl.create({
  // You can specify which capabilities should be requested at startup. One
  // can also request capabilities after the application started.
  capabilities: [
    WidgetEventCapability.forStateEvent(EventDirection.Send, PLANNING_POKER_ROUND_EVENT),
    WidgetEventCapability.forStateEvent(EventDirection.Receive, PLANNING_POKER_ROUND_EVENT),
    WidgetEventCapability.forRoomEvent(EventDirection.Send, PLANNING_POKER_CARD_EVENT),
    WidgetEventCapability.forRoomEvent(EventDirection.Receive, PLANNING_POKER_CARD_EVENT),
    WidgetEventCapability.forStateEvent(EventDirection.Receive, 'm.room.member'),
    WidgetEventCapability.forStateEvent(EventDirection.Receive, 'm.room.power_levels'),
    WidgetEventCapability.forStateEvent(EventDirection.Receive, 'm.room.create'),
  ],
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MuiThemeProvider>
      <Suspense fallback={<></>}>
        <MuiWidgetApiProvider
          widgetApiPromise={widgetApiPromise}
          widgetRegistration={{
            name: 'Planning Poker',
            type: 'info.weeman.planning_poker',
          }}
        >
          <Box sx={{ padding: '8px' }}>
            <PlanningPoker />
          </Box>
        </MuiWidgetApiProvider>
      </Suspense>
    </MuiThemeProvider>
  </StrictMode>,
);
