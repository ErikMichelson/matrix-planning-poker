import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { Box, Button } from '@mui/material';
import React from 'react';
import { useStore } from 'zustand';

import {
  PLANNING_POKER_CARD_EVENT,
  PLANNING_POKER_CARD_VALUES,
  type PlanningPokerCardEvent,
} from '../events/planning-poker-card';
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
  const cards = useStore(planningPokerStore, (state) => state.cards);
  const joinedMemberCount = useStore(planningPokerStore, (state) => state.joinedMemberCount);
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
      <PlanningPokerCards cards={cards} joinedMemberCount={joinedMemberCount} />
    </>
  );
};
