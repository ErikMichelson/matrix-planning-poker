import CheckIcon from '@mui/icons-material/Check';
import { Avatar, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import type React from 'react';

import type { PlanningPokerCard } from '../stores/planning-poker-store';

interface PlanningPokerCardsProps {
  cards: readonly PlanningPokerCard[];
  revealed?: boolean;
}

export const PlanningPokerCards: React.FC<PlanningPokerCardsProps> = ({
  cards,
  revealed = false,
}) => (
  <>
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
  </>
);
