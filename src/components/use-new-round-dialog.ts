import { useState, type SubmitEventHandler, useCallback } from 'react';
import { useStore } from 'zustand';

import type { PlanningPokerStore } from '../stores/planning-poker-store';

/**
 * Keeps the round draft available until its confirmed submission succeeds.
 * @param store The room's planning poker store.
 * @param onClose Closes the dialog after confirmation.
 * @returns The form state and guarded submit handler.
 */
export const useNewRoundDialog = (store: PlanningPokerStore, onClose: () => void) => {
  const [label, setLabel] = useState('');
  const [error, setError] = useState(false);

  const pending = useStore(store, (state) => state.pendingRoundAction);
  const round = useStore(store, (state) => state.round);
  const canModifyRounds = useStore(store, (state) => state.canModifyRounds);
  const busy = pending !== undefined;
  const roundActive = round?.content.active === true;

  const submit: SubmitEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      if (busy || roundActive || !canModifyRounds) return;
      setError(false);
      void store
        .getState()
        .startRound(label)
        .then((started) => {
          if (started) {
            onClose();
          }
        })
        .catch(() => setError(true));
    },
    [busy, roundActive, canModifyRounds, store, label, onClose],
  );

  return {
    label,
    setLabel,
    error,
    busy,
    disabled: busy || roundActive || !canModifyRounds,
    roundAlreadyActive: roundActive && !busy,
    submit,
  };
};
