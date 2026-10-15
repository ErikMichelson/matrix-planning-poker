import { useWidgetApi } from "@matrix-widget-toolkit/react";
import {
  Avatar,
  Box,
  Button,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
import { t } from "i18next";
import React from "react";
import { PLANNING_POKER_CARD_EVENT } from "../events/planningPokerCard";
import { PLANNING_POKER_ROUND_EVENT } from "../events/planningPokerRoundEvent";
import { PlanningPokerStore } from "../stores/PlanningPokerStore";
import { useSubject } from "../stores/useSubject";
import CheckIcon from '@mui/icons-material/Check';

type ActivePlanningPokerRoundProps = {
  planningPokerStore: PlanningPokerStore;
  roundId: string;
};

export const ActivePlanningPokerRound: React.FC<
  ActivePlanningPokerRoundProps
> = ({ planningPokerStore, roundId }) => {
  const widgetApi = useWidgetApi();
  const cards = useSubject(planningPokerStore.planningPokerCardsSubject);
  const myCard = cards.find(
    (c) => c.sender === widgetApi.widgetParameters.userId,
  );
  const sendCardValues = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, "🤷", "☕"];
  const sendCardElements = sendCardValues.map((c) => {
    return (
      <Button
        key={c}
        onClick={() => sendCardEvent(c.toString())}
        variant={myCard?.value === c.toString() ? "contained" : "outlined"}
      >
        {c}
      </Button>
    );
  });

  const cardElements = cards.map((c) => {
    return (
      <ListItem key={c.id}>
        <ListItemAvatar>
          <Avatar variant="square">
            <CheckIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={c.displayName}
          secondary={c.displayName !== c.sender ? c.sender : undefined}
        />
      </ListItem>
    );
  });

  const sendCardEvent = (value: string) => {
    void widgetApi.sendRoomEvent(PLANNING_POKER_CARD_EVENT, {
      value,
      "m.relates_to": {
        rel_type: "m.reference",
        event_id: roundId,
      },
    });
  };

  const sendStopEvent = () => {
    void widgetApi.sendStateEvent(PLANNING_POKER_ROUND_EVENT, {
      active: false,
    });
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        {sendCardElements}
      </Box>
      <Box>{cardElements}</Box>
      <Button onClick={sendStopEvent} variant="contained">
        {t("reveal")}
      </Button>
    </>
  );
};
