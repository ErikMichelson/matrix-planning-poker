import { Box, Button, Typography } from '@mui/material';
import type React from 'react';
import { useTranslation } from 'react-i18next';

interface RoundActionButtonsProps {
  roundActive: boolean;
  pending: boolean;
  canModifyRounds: boolean;
  onReveal: () => void;
  onStart: () => void;
}

export const RoundActionButtons: React.FC<RoundActionButtonsProps> = ({
  roundActive,
  pending,
  canModifyRounds,
  onReveal,
  onStart,
}) => {
  const { t } = useTranslation();
  return (
    <Box>
      <Box sx={{ display: 'flex', width: '100%', gap: 2 }}>
        <Button
          variant='contained'
          sx={{ flex: 1, minWidth: 0 }}
          disabled={!canModifyRounds || !roundActive || pending}
          onClick={onReveal}
        >
          {t('action.reveal')}
        </Button>
        <Button
          variant='contained'
          sx={{ flex: 1, minWidth: 0 }}
          disabled={!canModifyRounds || roundActive || pending}
          onClick={onStart}
        >
          {t('action.startNewRound')}
        </Button>
      </Box>
      {!canModifyRounds && (
        <Typography variant='body2' color='text.secondary' align='center' sx={{ mt: 1 }}>
          {t('info.noRoundPermission')}
        </Typography>
      )}
    </Box>
  );
};
