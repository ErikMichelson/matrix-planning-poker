import { useState } from 'react';
import type React from 'react';
import { useStore } from 'zustand';

import type { PlanningPokerStore } from '../stores/planning-poker-store';
import { NewRoundDialog } from './new-round-dialog';
import { PlanningPokerRoundLabel } from './planning-poker-round-label';

interface EditablePlanningPokerRoundLabelProps {
  planningPokerStore: PlanningPokerStore;
}

export const EditablePlanningPokerRoundLabel: React.FC<EditablePlanningPokerRoundLabelProps> = ({
  planningPokerStore,
}) => {
  const [editing, setEditing] = useState(false);
  const round = useStore(planningPokerStore, (state) => state.round);
  const canModifyRounds = useStore(planningPokerStore, (state) => state.canModifyRounds);
  const pending = useStore(planningPokerStore, (state) => state.pendingRoundAction);
  return (
    <>
      <PlanningPokerRoundLabel
        label={round?.content.label}
        onEdit={canModifyRounds ? () => setEditing(true) : undefined}
        editDisabled={pending !== undefined}
      />
      {editing && (
        <NewRoundDialog
          mode='edit'
          planningPokerStore={planningPokerStore}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
};
