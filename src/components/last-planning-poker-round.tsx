import React from 'react';
import { useStore } from 'zustand';

import type { PlanningPokerStore } from '../stores/planning-poker-store';
import { PlanningPokerCards } from './planning-poker-cards';

type LastPlanningPokerRoundProps = {
  planningPokerStore: PlanningPokerStore;
};

export const LastPlanningPokerRound: React.FC<LastPlanningPokerRoundProps> = ({
  planningPokerStore,
}) => {
  const cards = useStore(planningPokerStore, (state) => state.cards);
  const joinedMemberCount = useStore(planningPokerStore, (state) => state.joinedMemberCount);

  return <PlanningPokerCards cards={cards} joinedMemberCount={joinedMemberCount} revealed />;
};
