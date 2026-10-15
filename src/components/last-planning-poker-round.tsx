import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { Avatar, Button, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import { t } from 'i18next';
import React from 'react';

import { PLANNING_POKER_ROUND_EVENT } from '../events/planning-poker-round-event';
import { PlanningPokerStore } from '../stores/planning-poker-store';
import { useSubject } from '../stores/use-subject';

type LastPlanningPokerRoundProps = {
  planningPokerStore: PlanningPokerStore;
};

export const LastPlanningPokerRound: React.FC<LastPlanningPokerRoundProps> = ({
  planningPokerStore,
}) => {
  const widgetApi = useWidgetApi();
  const cards = useSubject(planningPokerStore.planningPokerCardsSubject);
  const cardElements = cards.map((c) => {
    return (
      <ListItem key={c.id}>
        <ListItemAvatar>
          <Avatar variant='square'>{c.value}</Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={c.displayName}
          secondary={c.displayName !== c.sender ? c.sender : undefined}
        />
      </ListItem>
    );
  });

  const sendStartEvent = () => {
    void widgetApi.sendStateEvent(PLANNING_POKER_ROUND_EVENT, {
      active: true,
    });
  };

  return (
    <div>
      <div>
        <List>{cardElements}</List>
      </div>
      <Button onClick={sendStartEvent} variant='outlined'>
        {t('new round')}
      </Button>
    </div>
  );
};
