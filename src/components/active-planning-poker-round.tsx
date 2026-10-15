import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { Box, Button } from '@mui/material';
import { t } from 'i18next';
import React from 'react';

import { PLANNING_POKER_CARD_EVENT } from '../events/planning-poker-card';
import { PLANNING_POKER_ROUND_EVENT } from '../events/planning-poker-round-event';
import { PlanningPokerStore } from '../stores/planning-poker-store';
import { useSubject } from '../stores/use-subject';
import { PlanningPokerCards } from './planning-poker-cards';

type ActivePlanningPokerRoundProps = {
  planningPokerStore: PlanningPokerStore;
  roundId: string;
};

export const ActivePlanningPokerRound: React.FC<ActivePlanningPokerRoundProps> = ({
  planningPokerStore,
  roundId,
}) => {
  const widgetApi = useWidgetApi();
  const cards = useSubject(planningPokerStore.planningPokerCardsSubject);
  const myCard = cards.find((c) => c.sender === widgetApi.widgetParameters.userId);
  const sendCardValues = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, '🤷', '☕'];
  const sendCardElements = sendCardValues.map((c) => {
    return (
      <Button
        key={c}
        onClick={() => sendCardEvent(c.toString())}
        variant={myCard?.value === c.toString() ? 'contained' : 'outlined'}
      >
        {c}
      </Button>
    );
  });

  const sendCardEvent = (value: string) => {
    void widgetApi.sendRoomEvent(PLANNING_POKER_CARD_EVENT, {
      value,
      'm.relates_to': {
        rel_type: 'm.reference',
        event_id: roundId,
      },
    });
  };

  const sendStopEvent = () => {
    void widgetApi.sendStateEvent(PLANNING_POKER_ROUND_EVENT, {
      active: false,
    });
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        {sendCardElements}
      </Box>
      <Box>
        <PlanningPokerCards cards={cards} />
      </Box>
      <Button onClick={sendStopEvent} variant='contained'>
        {t('reveal')}
      </Button>
    </>
  );
};
