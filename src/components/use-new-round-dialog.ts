import { useState, type SubmitEventHandler, useCallback } from 'react';
import { useStore } from 'zustand';

import type { PlanningPokerStore } from '../stores/planning-poker-store';

/**
 * Keeps the round draft available until its confirmed submission succeeds.
 * @param store The room's planning poker store.
 * @param onClose Closes the dialog after confirmation.
 * @param mode Whether to start a round or edit the displayed round's label.
 * @returns The form state and guarded submit handler.
 */
export const useNewRoundDialog = (
  store: PlanningPokerStore,
  onClose: () => void,
  mode: 'start' | 'edit',
) => {
  const [editedRound] = useState(() => (mode === 'edit' ? store.getState().round : undefined));
  const [label, setLabel] = useState(editedRound?.content.label ?? '');
  const [error, setError] = useState(false);

  const pending = useStore(store, (state) => state.pendingRoundAction);
  const round = useStore(store, (state) => state.round);
  const canModifyRounds = useStore(store, (state) => state.canModifyRounds);
  const busy = pending !== undefined;
  const roundActive = round?.content.active === true;
  const roundChanged =
    mode === 'edit' && (!editedRound || round?.event_id !== editedRound.event_id);
  const disabled = busy || !canModifyRounds || (mode === 'edit' ? roundChanged : roundActive);

  const submit: SubmitEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault();
      if (disabled) return;
      setError(false);
      const action =
        mode === 'edit' && editedRound
          ? store.getState().updateRoundLabel(label, editedRound.event_id)
          : store.getState().startRound(label);
      void action
        .then((started) => {
          if (started) {
            onClose();
          }
        })
        .catch(() => setError(true));
    },
    [disabled, mode, editedRound, store, label, onClose],
  );

  return {
    label,
    setLabel,
    error,
    busy,
    disabled,
    roundAlreadyActive: mode === 'start' && roundActive && !busy,
    roundChanged: roundChanged && !busy,
    submit,
  };
};
