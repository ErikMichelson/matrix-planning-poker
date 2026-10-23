import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';

import { createPlanningPokerStore, type PlanningPokerStore } from '../stores/planning-poker-store';
import { ActivePlanningPokerRound } from './active-planning-poker-round';
import { LastPlanningPokerRound } from './last-planning-poker-round';
import { NoPlanningPokerRound } from './no-planning-poker-round';

export const PlanningPoker = () => {
  const widgetApi = useWidgetApi();

  const planningPokerStore: PlanningPokerStore = useMemo(
    () => createPlanningPokerStore(widgetApi),
    [widgetApi],
  );

  useEffect(() => planningPokerStore.getState().connect(), [planningPokerStore]);

  const round = useStore(planningPokerStore, (state) => state.round);

  if (round?.content.active === true) {
    return (
      <ActivePlanningPokerRound planningPokerStore={planningPokerStore} roundId={round.event_id} />
    );
  }

  if (round?.content.active === false) {
    return <LastPlanningPokerRound planningPokerStore={planningPokerStore} />;
  }

  return <NoPlanningPokerRound />;
};
