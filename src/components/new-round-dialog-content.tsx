import { Alert, DialogContent, DialogContentText, TextField } from '@mui/material';
import type React from 'react';
import { useTranslation } from 'react-i18next';

interface NewRoundDialogContentProps {
  label: string;
  onLabelChange: (label: string) => void;
  disabled: boolean;
  error: boolean;
  roundAlreadyActive: boolean;
}

export const NewRoundDialogContent: React.FC<NewRoundDialogContentProps> = ({
  label,
  onLabelChange,
  disabled,
  error,
  roundAlreadyActive,
}) => {
  const { t } = useTranslation();
  return (
    <DialogContent>
      <DialogContentText>{t('dialog.newRoundDescription')}</DialogContentText>
      <TextField
        autoFocus
        fullWidth
        multiline
        minRows={2}
        margin='normal'
        label={t('dialog.roundLabel')}
        value={label}
        disabled={disabled}
        onChange={(event) => onLabelChange(event.target.value)}
      />
      {error && <Alert severity='error'>{t('error.updateRound')}</Alert>}
      {roundAlreadyActive && <Alert severity='info'>{t('info.roundAlreadyActive')}</Alert>}
    </DialogContent>
  );
};
