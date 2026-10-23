import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { Stack, Typography } from '@mui/material';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';

import { createPlanningPokerStore, type PlanningPokerStore } from '../stores/planning-poker-store';
import { ActivePlanningPokerRound } from './active-planning-poker-round';
import { LastPlanningPokerRound } from './last-planning-poker-round';
import { NoPlanningPokerRound } from './no-planning-poker-round';
import { PlanningPokerRoundActions } from './planning-poker-round-actions';
import { PlanningPokerRoundLabel } from './planning-poker-round-label';

export const PlanningPoker = () => {
  const widgetApi = useWidgetApi();
  const { t } = useTranslation();

  const planningPokerStore: PlanningPokerStore = useMemo(
    () => createPlanningPokerStore(widgetApi),
    [widgetApi],
  );

  useEffect(() => planningPokerStore.getState().connect(), [planningPokerStore]);

  const round = useStore(planningPokerStore, (state) => state.round);

  return (
    <Stack spacing={2}>
      <Typography component='h1' variant='h4' align='center' fontWeight='bold'>
        {t('heading.planningPoker')}
      </Typography>
      {round ? <PlanningPokerRoundLabel label={round.content.label} /> : <NoPlanningPokerRound />}
      <PlanningPokerRoundActions
        planningPokerStore={planningPokerStore}
        roundActive={round?.content.active === true}
      />
      {round?.content.active === true && (
        <ActivePlanningPokerRound
          planningPokerStore={planningPokerStore}
          roundId={round.event_id}
        />
      )}
      {round?.content.active === false && (
        <LastPlanningPokerRound planningPokerStore={planningPokerStore} />
      )}
    </Stack>
  );
};
