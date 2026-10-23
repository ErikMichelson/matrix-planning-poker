import { Box, Button, Dialog, DialogActions, DialogTitle } from '@mui/material';
import { useId } from 'react';
import type React from 'react';
import { useTranslation } from 'react-i18next';

import type { PlanningPokerStore } from '../stores/planning-poker-store';
import { NewRoundDialogContent } from './new-round-dialog-content';
import { useNewRoundDialog } from './use-new-round-dialog';

interface NewRoundDialogProps {
  planningPokerStore: PlanningPokerStore;
  onClose: () => void;
  mode?: 'start' | 'edit';
}

export const NewRoundDialog: React.FC<NewRoundDialogProps> = ({
  planningPokerStore,
  onClose,
  mode = 'start',
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const { label, setLabel, error, busy, disabled, roundAlreadyActive, roundChanged, submit } =
    useNewRoundDialog(planningPokerStore, onClose, mode);
  const editing = mode === 'edit';
  const close = () => {
    if (!busy) onClose();
  };
  return (
    <Dialog
      open
      fullWidth
      maxWidth='sm'
      aria-labelledby={titleId}
      disableEscapeKeyDown={busy}
      onClose={close}
    >
      <Box component='form' onSubmit={submit}>
        <DialogTitle id={titleId}>
          {t(editing ? 'dialog.editRoundTitle' : 'dialog.newRoundTitle')}
        </DialogTitle>
        <NewRoundDialogContent
          label={label}
          onLabelChange={setLabel}
          disabled={disabled}
          error={error}
          roundAlreadyActive={roundAlreadyActive}
          roundChanged={roundChanged}
          editing={editing}
        />
        <DialogActions>
          <Button onClick={close} disabled={busy}>
            {t('action.cancel')}
          </Button>
          <Button type='submit' variant='contained' disabled={disabled} aria-busy={busy}>
            {editing
              ? t(busy ? 'status.updatingRoundLabel' : 'action.saveRoundLabel')
              : t(busy ? 'status.startingRound' : 'action.startNewRound')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
