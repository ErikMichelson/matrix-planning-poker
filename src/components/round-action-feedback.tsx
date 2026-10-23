import { Alert, Box, Typography } from '@mui/material';
import type React from 'react';
import { useTranslation } from 'react-i18next';

import type { RoundAction } from '../stores/planning-poker-store';

interface RoundActionFeedbackProps {
  pending: RoundAction | undefined;
  error: boolean;
  onDismiss: () => void;
}

export const RoundActionFeedback: React.FC<RoundActionFeedbackProps> = ({
  pending,
  error,
  onDismiss,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ mt: 1 }}>
      {pending && (
        <Typography role='status' align='center'>
          {t(pending === 'start' ? 'status.startingRound' : 'status.revealingResults')}
        </Typography>
      )}
      {error && (
        <Alert severity='error' onClose={onDismiss}>
          {t('error.updateRound')}
        </Alert>
      )}
    </Box>
  );
};
