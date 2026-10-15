import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { Button } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PLANNING_POKER_ROUND_EVENT } from '../events/planning-poker-round-event';

export const NoPlanningPokerRound: React.FC = () => {
  const widgetApi = useWidgetApi();
  const { t } = useTranslation();

  const sendStartEvent = () => {
    void widgetApi.sendStateEvent(PLANNING_POKER_ROUND_EVENT, {
      active: true,
    });
  };

  return (
    <div>
      {t('info.noActiveRound')}
      <Button onClick={sendStartEvent} variant='outlined'>
        {t('action.startNewRound')}
      </Button>
    </div>
  );
};
