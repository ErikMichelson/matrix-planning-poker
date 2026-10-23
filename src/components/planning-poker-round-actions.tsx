import { Box } from '@mui/material';
import { useState } from 'react';
import type React from 'react';
import { useStore } from 'zustand';

import type { PlanningPokerStore } from '../stores/planning-poker-store';
import { NewRoundDialog } from './new-round-dialog';
import { RoundActionButtons } from './round-action-buttons';
import { RoundActionFeedback } from './round-action-feedback';

interface PlanningPokerRoundActionsProps {
  planningPokerStore: PlanningPokerStore;
  roundActive: boolean;
}

export const PlanningPokerRoundActions: React.FC<PlanningPokerRoundActionsProps> = ({
  planningPokerStore,
  roundActive,
}) => {
  const store: PlanningPokerStore = planningPokerStore;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState(false);
  const pending = useStore(store, (state) => state.pendingRoundAction);
  const canModifyRounds = useStore(store, (state) => state.canModifyRounds);
  const reveal = () => {
    setError(false);
    void store
      .getState()
      .revealRound()
      .catch(() => setError(true));
  };
  const openDialog = () => {
    setError(false);
    setDialogOpen(true);
  };
  return (
    <Box>
      <RoundActionButtons
        roundActive={roundActive}
        pending={pending !== undefined}
        canModifyRounds={canModifyRounds}
        onReveal={reveal}
        onStart={openDialog}
      />
      <RoundActionFeedback pending={pending} error={error} onDismiss={() => setError(false)} />
      {dialogOpen && (
        <NewRoundDialog
          planningPokerStore={planningPokerStore}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </Box>
  );
};
