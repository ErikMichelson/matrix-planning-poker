import { useWidgetApi } from "@matrix-widget-toolkit/react";
import { useEffect, useMemo } from "react";
import { PlanningPokerStore } from "../stores/PlanningPokerStore";
import { useSubject } from "../stores/useSubject";
import { ActivePlanningPokerRound } from "./ActivePlanningPokerRound";
import { LastPlanningPokerRound } from "./LastPlanningPokerRound";
import { NoPlanningPokerRound } from "./NoPlanningPokerRound";

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
      <ActivePlanningPokerRound
        planningPokerStore={planningPokerStore}
        roundId={round.event_id}
      />
    );
  }

  if (round?.content.active === false) {
    return <LastPlanningPokerRound planningPokerStore={planningPokerStore} />;
  }

  return <NoPlanningPokerRound />;
};
