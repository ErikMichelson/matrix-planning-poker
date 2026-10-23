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
}

export const NewRoundDialog: React.FC<NewRoundDialogProps> = ({ planningPokerStore, onClose }) => {
  const { t } = useTranslation();
  const titleId = useId();
  const { label, setLabel, error, busy, disabled, roundAlreadyActive, submit } = useNewRoundDialog(
    planningPokerStore,
    onClose,
  );
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
        <DialogTitle id={titleId}>{t('dialog.newRoundTitle')}</DialogTitle>
        <NewRoundDialogContent
          label={label}
          onLabelChange={setLabel}
          disabled={disabled}
          error={error}
          roundAlreadyActive={roundAlreadyActive}
        />
        <DialogActions>
          <Button onClick={close} disabled={busy}>
            {t('action.cancel')}
          </Button>
          <Button type='submit' variant='contained' disabled={disabled} aria-busy={busy}>
            {t(busy ? 'status.startingRound' : 'action.startNewRound')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
