import { Box, Button } from '@mui/material';
import type React from 'react';
import { useTranslation } from 'react-i18next';

interface RoundActionButtonsProps {
  roundActive: boolean;
  pending: boolean;
  onReveal: () => void;
  onStart: () => void;
}

export const RoundActionButtons: React.FC<RoundActionButtonsProps> = ({
  roundActive,
  pending,
  onReveal,
  onStart,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', width: '100%', gap: 2 }}>
      <Button
        variant='contained'
        sx={{ flex: 1, minWidth: 0 }}
        disabled={!roundActive || pending}
        onClick={onReveal}
      >
        {t('action.reveal')}
      </Button>
      <Button
        variant='contained'
        sx={{ flex: 1, minWidth: 0 }}
        disabled={roundActive || pending}
        onClick={onStart}
      >
        {t('action.startNewRound')}
      </Button>
    </Box>
  );
};
