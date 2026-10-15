import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { useEffect, useMemo } from 'react';

import { PlanningPokerStore } from '../stores/planning-poker-store';
import { useSubject } from '../stores/use-subject';
import { ActivePlanningPokerRound } from './active-planning-poker-round';
import { LastPlanningPokerRound } from './last-planning-poker-round';
import { NoPlanningPokerRound } from './no-planning-poker-round';

export const PlanningPoker = () => {
  const widgetApi = useWidgetApi();

  const planningPokerStore = useMemo(() => {
    const store = new PlanningPokerStore(widgetApi);
    store.start();
    return store;
  }, [widgetApi]);

  useEffect(() => {
    return () => {
      // to-do
      // planningPokerStore.destroy();
    };
  }, [planningPokerStore]);

  const round = useSubject(planningPokerStore.planningPokerRoundEventSubject);

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
