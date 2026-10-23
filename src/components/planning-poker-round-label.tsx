import { Edit as EditIcon } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';
import Linkify from 'linkify-react';
import type { Opts } from 'linkifyjs';
import type React from 'react';
import { useTranslation } from 'react-i18next';

interface PlanningPokerRoundLabelProps {
  label?: string;
  onEdit?: () => void;
  editDisabled?: boolean;
}

const linkOptions: Opts = {
  defaultProtocol: 'https',
  target: '_blank',
  rel: 'noopener noreferrer',
  validate: (_value, type, token) => type === 'url' && /^https?:\/\//i.test(token.toHref('https')),
};

export const PlanningPokerRoundLabel: React.FC<PlanningPokerRoundLabelProps> = ({
  label,
  onEdit,
  editDisabled,
}) => {
  const { t } = useTranslation();
  return (
    <Typography
      component='div'
      align='center'
      sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', '& a': { color: 'primary.main' } }}
    >
      <Box component='strong'>{t('info.currentRound')}</Box>{' '}
      <Linkify options={linkOptions}>{label?.trim() || t('info.unlabeledRound')}</Linkify>
      {onEdit && (
        <IconButton
          size='small'
          aria-label={t('action.editRoundLabel')}
          title={t('action.editRoundLabel')}
          disabled={editDisabled}
          onClick={onEdit}
          sx={{ ml: 0.5 }}
        >
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Typography>
  );
};
