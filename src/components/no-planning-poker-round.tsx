import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { Button } from '@mui/material';
import { t } from 'i18next';
import React from 'react';

import { PLANNING_POKER_ROUND_EVENT } from '../events/planning-poker-round-event';

export const NoPlanningPokerRound: React.FC = () => {
  const widgetApi = useWidgetApi();

  const sendStartEvent = () => {
    void widgetApi.sendStateEvent(PLANNING_POKER_ROUND_EVENT, {
      active: true,
    });
  };

  return (
    <div>
      {t('No planning poker round, yet')}
      <Button onClick={sendStartEvent} variant='outlined'>
        {t('new round')}
      </Button>
    </div>
  );
};
