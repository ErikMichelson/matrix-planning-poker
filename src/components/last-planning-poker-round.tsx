import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { Button, List } from '@mui/material';
import { t } from 'i18next';
import React from 'react';

import { PLANNING_POKER_ROUND_EVENT } from '../events/planning-poker-round-event';
import { PlanningPokerStore } from '../stores/planning-poker-store';
import { useSubject } from '../stores/use-subject';
import { PlanningPokerCards } from './planning-poker-cards';

type LastPlanningPokerRoundProps = {
  planningPokerStore: PlanningPokerStore;
};

export const LastPlanningPokerRound: React.FC<LastPlanningPokerRoundProps> = ({
  planningPokerStore,
}) => {
  const widgetApi = useWidgetApi();
  const cards = useSubject(planningPokerStore.planningPokerCardsSubject);
  const sendStartEvent = () => {
    void widgetApi.sendStateEvent(PLANNING_POKER_ROUND_EVENT, {
      active: true,
    });
  };

  return (
    <div>
      <div>
        <List>
          <PlanningPokerCards cards={cards} revealed />
        </List>
      </div>
      <Button onClick={sendStartEvent} variant='outlined'>
        {t('new round')}
      </Button>
    </div>
  );
};
