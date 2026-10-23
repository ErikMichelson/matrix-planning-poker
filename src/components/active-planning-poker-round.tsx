import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { Box, Button } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';

import {
  PLANNING_POKER_CARD_EVENT,
  PLANNING_POKER_CARD_VALUES,
  type PlanningPokerCardEvent,
} from '../events/planning-poker-card';
import { PLANNING_POKER_ROUND_EVENT } from '../events/planning-poker-round-event';
import type { PlanningPokerStore } from '../stores/planning-poker-store';
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
  const { t } = useTranslation();
  const cards = useStore(planningPokerStore, (state) => state.cards);
  const myCard = cards.find((c) => c.sender === widgetApi.widgetParameters.userId);
  const sendCardElements = PLANNING_POKER_CARD_VALUES.map((value) => {
    return (
      <Button
        key={value}
        onClick={() => sendCardEvent(value)}
        variant={myCard?.value === value ? 'contained' : 'outlined'}
      >
        {value}
      </Button>
    );
  });

  const sendCardEvent = (value: PlanningPokerCardEvent['value']) => {
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
        {t('action.reveal')}
      </Button>
    </>
  );
};
