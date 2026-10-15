import { WidgetApi } from '@matrix-widget-toolkit/api';
import { MuiThemeProvider, MuiWidgetApiProvider } from '@matrix-widget-toolkit/mui';
import { Box } from '@mui/material';
import { Suspense } from 'react';

import { PlanningPoker } from './components/planning-poker';

type AppParams = {
  widgetApiPromise: Promise<WidgetApi>;
};

export const App: React.FC<AppParams> = ({ widgetApiPromise }) => {
  return (
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
  );
};
