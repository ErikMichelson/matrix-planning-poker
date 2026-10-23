import { Typography } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const NoPlanningPokerRound: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Typography align='center' sx={{ py: 3 }}>
      {t('info.noActiveRound')}
    </Typography>
  );
};
