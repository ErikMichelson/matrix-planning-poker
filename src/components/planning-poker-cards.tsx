import { Check as CheckIcon } from '@mui/icons-material';
import {
  Avatar,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import type React from 'react';
import { useTranslation } from 'react-i18next';

import type { PlanningPokerCard } from '../stores/planning-poker-store';

interface PlanningPokerCardsProps {
  cards: readonly PlanningPokerCard[];
  joinedMemberCount: number;
  revealed?: boolean;
}

export const PlanningPokerCards: React.FC<PlanningPokerCardsProps> = ({
  cards,
  joinedMemberCount,
  revealed = false,
}) => {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant='body2' color='text.secondary' align='right' aria-live='polite'>
        {t('info.voteCount', { count: cards.length, total: joinedMemberCount })}
      </Typography>
      <List>
        {cards.map((card) => (
          <ListItem key={card.id}>
            <ListItemAvatar>
              <Avatar variant='square'>{revealed ? card.value : <CheckIcon />}</Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={card.displayName}
              secondary={card.displayName !== card.sender ? card.sender : undefined}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
